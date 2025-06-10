// BookManagement.jsx
import { useEffect, useState } from "react";
import { BookFormModal } from "../components/books/BookFormModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import BookTable from "../components/books/BookTable";
import { db, seedOrders, seedUsers } from "../utils/firebase";
import { toast } from "react-toastify"; // Import toast

import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  getDocs,
  writeBatch,
  Timestamp,
  query, // Import query
  where, // Import where
} from "firebase/firestore";

import { CategoryModal } from "../components/books/CategoryModal";
import { fetchBooks, uploadFileToFirebase } from "../utils";
import { getCategories } from "../utils/firebaseApis";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "../components/Loader";

export const BookManagement = () => {
  // const [books, setBooks] = useState([]);
  // const [categories, setCategories] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [isCategoryModalOpened, setIsCategoryModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  console.log("categoriesQuery", categoriesQuery.isLoading);

  // const fetchBooks = () => {
  //   const unsubscribe = onSnapshot(collection(db, "books"), (snapshot) => {
  //     console.log("snapshot", snapshot.docs);

  //     const booksData = snapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));
  //     setBooks(booksData);
  //   });
  //   return unsubscribe;
  // };
  // useEffect(() => {
  //   const unsubscribe = fetchBooks();
  //   return () => unsubscribe();
  // }, []);

  const {
    data: books,
    isLoading: booksLoading,
    error,
  } = useQuery({
    queryKey: ["books"],
    queryFn: fetchBooks,
  });

  console.log("books", books);

  if (booksLoading) {
    return <Loader />;
  }

  const upsertBookToFirestore = async (formData) => {
    try {
      setIsLoading(true);
      let coverUrl = formData.coverUrl;
      let bookId = formData.id ?? null;
      let oldCategories = [];

      // 1. Handle Cover Image Upload
      if (formData.coverImage && typeof formData.coverImage !== "string") {
        try {
          const result = await uploadFileToFirebase(formData.coverImage);
          coverUrl = result.url;
        } catch (error) {
          console.error("Image upload failed:", error);
          toast.error("Failed to upload cover image.", {
            style: { backgroundColor: "var(--color-error)", color: "white" },
          });
          throw new Error("Failed to upload cover image");
        }
      }

      // 2. Get Old Categories if Updating
      if (bookId) {
        const bookDoc = await getDoc(doc(db, "books", bookId));
        if (bookDoc.exists()) {
          oldCategories = bookDoc.data().categories || [];
        }
      }

      console.log("-------oldCategories-------", oldCategories);

      // 3. Prepare Book Data
      const bookData = {
        name: formData.name,
        writer: formData.writer,
        description: formData.description,
        categories: formData.categories || [],
        language: formData.language,
        releaseDate: Timestamp.fromDate(new Date(formData.releaseDate)),
        prices: {
          pkr: formData.pricePkr,
          usd: formData.priceUsd,
          discountedPkr: formData.discountedPricePkr || formData.pricePkr,
        },
        discount: {
          type: formData.discountType,
          value: formData.discountValue,
        },
        contentRestriction: formData.contentRestriction,
        tag: formData.tag,
        keywords: formData.keywords,
        coverUrl,
        content: formData.content,
        tableOfContents: formData.tableOfContents,
        status: formData.status || "published",
        featured: formData.featured || false,
        updatedAt: serverTimestamp(),
        ...(!bookId && { createdAt: serverTimestamp() }),
        ...(!bookId && {
          stats: {
            views: 0,
            purchases: 0,
            ratingsCount: 0,
            averageRating: 0,
          },
        }),
      };

      // 4. Create/Update Book Document
      let newBookId;
      if (bookId) {
        await setDoc(doc(db, "books", bookId), bookData, { merge: true });
        newBookId = bookId;
      } else {
        const newBookRef = await addDoc(collection(db, "books"), bookData);
        newBookId = newBookRef.id;
      }

      // 5. Sync Categories
      // 5. SYNC CATEGORIES BY NAME (NEW IMPLEMENTATION)
      const newCategories = formData.categories || [];

      // Convert names to lowercase for case-insensitive comparison
      const normalize = (name) => name.toLowerCase().trim();

      const addedCategories = bookId
        ? newCategories.filter(
            (newCat) =>
              !oldCategories.some(
                (oldCat) => normalize(oldCat) === normalize(newCat)
              )
          )
        : newCategories;

      const removedCategories = bookId
        ? oldCategories.filter(
            (oldCat) =>
              !newCategories.some(
                (newCat) => normalize(newCat) === normalize(oldCat)
              )
          )
        : [];

      // Get all existing categories first
      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      const existingCategories = new Set(
        categoriesSnapshot.docs.map((doc) => normalize(doc.data().name))
      );

      // Process updates
      const batch = writeBatch(db);

      // ADD to new categories
      for (const categoryName of addedCategories) {
        // Find the category doc with matching name
        const categoryDoc = categoriesSnapshot.docs.find(
          (doc) => normalize(doc.data().name) === normalize(categoryName)
        );

        if (categoryDoc) {
          batch.update(categoryDoc.ref, {
            books: arrayUnion(newBookId),
            updatedAt: serverTimestamp(),
          });
        } else {
          console.warn(
            `Category "${categoryName}" doesn't exist in categories collection`
          );
          toast.warn(`Category "${categoryName}" does not exist.`, {
            style: {
              backgroundColor: "var(--color-warning)",
              color: "white",
            },
          });
          // Option 1: Skip (current behavior)
          // Option 2: Create new category automatically:
          // const newCatRef = doc(collection(db, "categories"));
          // batch.set(newCatRef, {
          //   name: categoryName,
          //   books: [newBookId],
          //   createdAt: serverTimestamp(),
          //   updatedAt: serverTimestamp()
          // });
        }
      }

      // REMOVE from old categories
      for (const categoryName of removedCategories) {
        const categoryDoc = categoriesSnapshot.docs.find(
          (doc) => normalize(doc.data().name) === normalize(categoryName)
        );

        if (categoryDoc) {
          batch.update(categoryDoc.ref, {
            books: arrayRemove(newBookId),
            updatedAt: serverTimestamp(),
          });
        } else {
          console.warn(`Category "${categoryName}" not found during removal`);
          toast.warn(`Category "${categoryName}" not found during removal.`, {
            style: {
              backgroundColor: "var(--color-warning)",
              color: "white",
            },
          });
        }
      }

      await batch.commit();

      // fetchBooks();
      queryClient.invalidateQueries(["books"]);
      toast.success(`Book ${bookId ? "updated" : "added"} successfully!`, {
        style: {
          backgroundColor: "var(--color-success)",
          color: "white",
        },
      });
      return { success: true, bookId: newBookId };
    } catch (error) {
      console.error("Error in upsertBookToFirestore:", error);
      toast.error(
        `Failed to ${formData.id ? "update" : "add"} book: ${error.message}`,
        {
          style: { backgroundColor: "var(--color-error)", color: "white" },
        }
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = async (data) => {
    try {
      if (editingBook) {
        await upsertBookToFirestore(data);
      } else {
        await upsertBookToFirestore(data);
      }
    } catch (error) {
      // Error handling is already done in upsertBookToFirestore
      setIsLoading(false);
      console.error("Error submitting form: ", error);
    }
    setEditingBook(null);
    setIsModalOpened(false);
  };
  const handleEdit = (book) => {
    setEditingBook(book);
    setIsModalOpened(true);
  };

  const handleDelete = async (id) => {
    try {
      setIsLoading(true);

      // 1. First get the book document to find its categories
      const bookRef = doc(db, "books", id);
      const bookSnap = await getDoc(bookRef);

      if (!bookSnap.exists()) {
        toast.error("Book not found.", {
          style: { backgroundColor: "var(--color-error)", color: "white" },
        });
        throw new Error("Book not found");
      }

      const bookCategories = bookSnap.data().categories || [];

      // 2. Prepare batch operation
      const batch = writeBatch(db);

      // 3. Add book deletion to batch
      batch.delete(bookRef);

      // 4. Remove book reference from all its categories
      if (bookCategories.length > 0) {
        // Get all categories that might contain this book
        const categoriesQueryRef = query(
          // Renamed to avoid conflict
          collection(db, "categories"),
          where("books", "array-contains", id)
        );
        const categoriesSnapshot = await getDocs(categoriesQueryRef); // Used renamed query

        categoriesSnapshot.forEach((doc) => {
          batch.update(doc.ref, {
            books: arrayRemove(id),
            updatedAt: serverTimestamp(),
          });
        });
      }

      // 5. Execute batch
      await batch.commit();

      // 6. Refresh data
      // fetchBooks();
      queryClient.invalidateQueries(["books"]); // Invalidate books query
      queryClient.invalidateQueries(["categories"]); // Invalidate categories query as well

      // Optional: Show success message
      toast.success("Book deleted successfully!", {
        style: { backgroundColor: "var(--color-success)", color: "white" },
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error(`Failed to delete book: ${error.message}`, {
        style: { backgroundColor: "var(--color-error)", color: "white" },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary">Book Management</h1>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* <button
            onClick={seedOrders}
            className="inline-flex items-center justify-center px-4 py-2 cursor-pointer rounded-md shadow-sm text-sm font-medium text-primary bg-secondary hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors"
          >
            Seed Orders
          </button> */}
          <button
            onClick={() => setIsCategoryModalOpened(true)}
            className="inline-flex items-center justify-center px-4 py-2 cursor-pointer rounded-md shadow-sm text-sm font-medium text-primary bg-secondary hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors"
          >
            Manage Categories
          </button>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsModalOpened(true);
            }}
            className="inline-flex items-center cursor-pointer justify-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add New Book
          </button>
        </div>
      </div>

      {/* Content Section */}
      {books.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center border border-grey-200">
          <h3 className="text-lg font-medium text-grey-900 mb-2">
            No books added yet
          </h3>
          <p className="text-grey-600 mb-4">
            Get started by adding your first book
          </p>
          <button
            onClick={() => setIsModalOpened(true)}
            className="inline-flex items-center cursor-pointer justify-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Book
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-grey-200">
          <BookTable
            books={books}
            categories={categoriesQuery.data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Modals */}
      {isModalOpened && (
        <BookFormModal
          isOpen={isModalOpened}
          onClose={() => {
            setEditingBook(null);
            setIsModalOpened(false);
          }}
          isLoading={isLoading}
          initialData={editingBook}
          categories={categoriesQuery.data}
          onSubmit={handleSubmit}
        />
      )}
      {isCategoryModalOpened && (
        <CategoryModal
          isOpen={isCategoryModalOpened}
          onClose={() => setIsCategoryModalOpened(false)}
          existingCategories={categoriesQuery.data}
          isLoading={isLoading || categoriesQuery.isLoading}
        />
      )}
    </div>
  );
};
