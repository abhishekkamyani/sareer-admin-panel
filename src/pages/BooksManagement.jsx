import { useEffect, useState } from "react";
import { BookFormModal } from "../components/books/BookFormModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import BookTable from "../components/books/BookTable";
import { db } from "../utils/firebase";

import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { CategoryModal } from "../components/books/CategoryModal";
import { uploadFileToFirebase } from "../utils";

export const BooksManagement = () => {
  const [books, setBooks] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [isCategoryModalOpened, setIsCategoryModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBooks = () => {
    const unsubscribe = onSnapshot(collection(db, "books"), (snapshot) => {
      const booksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBooks(booksData);
    });
    return unsubscribe;
  };
  useEffect(() => {
    const unsubscribe = fetchBooks();
    return () => unsubscribe();
  }, []);

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
        releaseDate: formData.releaseDate,
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
        }
      }

      await batch.commit();

      fetchBooks();
      return { success: true, bookId: newBookId };
    } catch (error) {
      console.error("Error in upsertBookToFirestore:", error);
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
      // Handle error
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
        const categoriesQuery = query(
          collection(db, "categories"),
          where("books", "array-contains", id)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);

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
      fetchBooks();

      // Optional: Show success message
      toast.success("Book deleted successfully");
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error(`Failed to delete book: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book Management</h1>
        <div className="flex space-x-6">
          <button
            onClick={() => {
              // setEditingBook(null);
              setIsCategoryModalOpened(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {/* <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> */}
            Manage Categories
          </button>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsModalOpened(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add New Book
          </button>
        </div>
      </div>

      {/* Placeholder for BookList component */}
      {books.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No books added yet
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by adding your first book
          </p>
          <button
            onClick={() => setIsModalOpened(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Book
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <BookTable
            books={books}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      )}

      {isModalOpened && (
        <BookFormModal
          isOpen={isModalOpened}
          onClose={() => {
            setEditingBook(null);
            setIsModalOpened(false);
          }}
          isLoading={isLoading}
          initialData={editingBook}
          onSubmit={handleSubmit}
        />
      )}
      {isCategoryModalOpened && (
        <CategoryModal
          isOpen={isCategoryModalOpened}
          onClose={() => {
            // setEditingBook(null);
            setIsCategoryModalOpened(false);
          }}
          isLoading={isLoading}
          // initialData={editingBook}
          // onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};
