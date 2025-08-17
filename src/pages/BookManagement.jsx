// BookManagement.jsx
import { useEffect, useState } from "react";
import { BookFormModal } from "../components/books/BookFormModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import BookTable from "../components/books/BookTable";
import { db } from "../utils/firebase";
import { toast } from "react-toastify";

import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs,
  writeBatch,
  Timestamp,
  query,
  where,
} from "firebase/firestore";

import { CategoryModal } from "../components/books/CategoryModal";
import { fetchBooks, uploadFileToFirebase, getCategories } from "../utils/APIs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "../components/Loader";
import { CouponManagementModal } from "../components/books/CouponManagementModal";

export const BookManagement = () => {
  const [editingBookId, setEditingBookId] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [isCategoryModalOpened, setIsCategoryModalOpened] = useState(false);
  const [isCouponModalOpened, setIsCouponModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    refetchOnWindowFocus: false,
  });

  const {
    data: books,
    isLoading: booksLoading,
    error,
  } = useQuery({
    queryKey: ["books"],
    queryFn: fetchBooks,
    refetchOnWindowFocus: false,
  });

  if (booksLoading) {
    return <Loader />;
  }

  const upsertBookToFirestore = async (formData) => {
    setIsLoading(true);
    try {
      let coverUrl = formData.coverUrl;
      let bookId = formData.id ?? null;
      let frontPageUrl = formData.frontPageUrl;
      let backPageUrl = formData.backPageUrl;
      let oldCategories = [];

      // --- Handle image uploads in parallel ---
      const uploadPromises = [];
      const imageFields = ["coverImage", "frontPageImage", "backPageImage"];
      imageFields.forEach((fieldName) => {
        if (formData[fieldName] && typeof formData[fieldName] !== "string") {
          uploadPromises.push(
            uploadFileToFirebase(formData[fieldName], `book-assets/${Date.now()}_${formData[fieldName].name}`)
              .then(result => ({ fieldName, url: result.url }))
          );
        }
      });

      if (uploadPromises.length > 0) {
        const uploadResults = await Promise.all(uploadPromises);
        uploadResults.forEach(({ fieldName, url }) => {
          if (fieldName === "coverImage") coverUrl = url;
          if (fieldName === "frontPageImage") frontPageUrl = url;
          if (fieldName === "backPageImage") backPageUrl = url;
        });
      }

      // --- Get Old Categories if Updating ---
      if (bookId) {
        const bookDoc = await getDoc(doc(db, "books", bookId));
        if (bookDoc.exists()) {
          oldCategories = bookDoc.data().categories || [];
        }
      }

      // --- Prepare Book Metadata (without content) ---
      const bookData = {
        name: formData.name,
        writer: formData.writer,
        description: formData.description,
        categories: formData.categories || [],
        language: formData.language,
        // *** FIX: Only add releaseDate if it's a valid date ***
        ...(formData.releaseDate && { releaseDate: Timestamp.fromDate(new Date(formData.releaseDate)) }),
        prices: {
          pkr: formData.pricePkr,
          usd: formData.priceUsd,
          discountedPkr: formData.discountedPricePkr || formData.pricePkr,
        },
        discount: { type: formData.discountType, value: formData.discountValue },
        contentRestriction: formData.contentRestriction,
        tag: formData.tag,
        keywords: formData.keywords,
        coverUrl,
        frontPageUrl: frontPageUrl || null,
        backPageUrl: backPageUrl || null,
        status: formData.status || "published",
        featured: formData.featuredCategoryNames?.length > 0,
        standardCategoryNames: formData.standardCategoryNames,
        featuredCategoryNames: formData.featuredCategoryNames,
        coupon: formData.coupon || { code: null, discountPercentage: 0 },
        updatedAt: serverTimestamp(),
        ...(!bookId && { createdAt: serverTimestamp() }),
      };

      // --- Create/Update Book Document ---
      let newBookId;
      if (bookId) {
        await setDoc(doc(db, "books", bookId), bookData, { merge: true });
        newBookId = bookId;
      } else {
        const newBookRef = await addDoc(collection(db, "books"), bookData);
        newBookId = newBookRef.id;
      }

      // --- NEW: Handle Book Content in 'book_contents' collection ---
      const batch = writeBatch(db);

      // 1. Delete old content if it's an update
      if (bookId) {
        const oldContentQuery = query(collection(db, "book_contents"), where("bookId", "==", bookId));
        const oldContentSnapshot = await getDocs(oldContentQuery);
        oldContentSnapshot.forEach(doc => batch.delete(doc.ref));
      }

      // 2. Add new content
      formData.content.forEach((chapter, index) => {
        const chapterRef = doc(collection(db, "book_contents"));
        const chapterData = {
          bookId: newBookId,
          heading: chapter.heading,
          body: chapter.body,
          alignment: chapter.alignment || 'left',
          order: chapter.order || index,
        };
        batch.set(chapterRef, chapterData);
      });

      // --- Sync Categories ---
      const newCategories = formData.categories || [];
      const normalize = (name) => name.toLowerCase().trim();
      const addedCategories = bookId ? newCategories.filter(newCat => !oldCategories.some(oldCat => normalize(oldCat) === normalize(newCat))) : newCategories;
      const removedCategories = bookId ? oldCategories.filter(oldCat => !newCategories.some(newCat => normalize(newCat) === normalize(oldCat))) : [];
      
      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      
      for (const categoryName of addedCategories) {
        const categoryDoc = categoriesSnapshot.docs.find(doc => normalize(doc.data().name) === normalize(categoryName));
        if (categoryDoc) {
          batch.update(categoryDoc.ref, { books: arrayUnion(newBookId), updatedAt: serverTimestamp() });
        }
      }
      
      for (const categoryName of removedCategories) {
        const categoryDoc = categoriesSnapshot.docs.find(doc => normalize(doc.data().name) === normalize(categoryName));
        if (categoryDoc) {
          batch.update(categoryDoc.ref, { books: arrayRemove(newBookId), updatedAt: serverTimestamp() });
        }
      }

      // --- Commit all batched writes at once ---
      await batch.commit();

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book', newBookId] });
      toast.success(`Book ${bookId ? "updated" : "added"} successfully!`);
      return { success: true, bookId: newBookId };

    } catch (error) {
      console.error("Error in upsertBookToFirestore:", error);
      toast.error(`Failed to ${formData.id ? "update" : "add"} book: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    await upsertBookToFirestore(data);
    setEditingBookId(null);
    setIsModalOpened(false);
  };
  
  const handleEdit = (book) => {
    setEditingBookId(book.id);
    setIsModalOpened(true);
  };

  const handleDelete = async (id) => {
    setIsLoading(true);
    try {
        const batch = writeBatch(db);

        const bookRef = doc(db, "books", id);
        batch.delete(bookRef);

        const contentQuery = query(collection(db, "book_contents"), where("bookId", "==", id));
        const contentSnapshot = await getDocs(contentQuery);
        contentSnapshot.forEach(doc => batch.delete(doc.ref));

        const categoriesQueryRef = query(collection(db, "categories"), where("books", "array-contains", id));
        const categoriesSnapshot = await getDocs(categoriesQueryRef);
        categoriesSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                books: arrayRemove(id),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();

        queryClient.invalidateQueries({ queryKey: ['books'] });
        toast.success("Book deleted successfully!");
    } catch (error) {
        console.error("Error deleting book:", error);
        toast.error(`Failed to delete book: ${error.message}`);
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
          <button
            onClick={() => setIsCategoryModalOpened(true)}
            className="inline-flex items-center justify-center px-4 py-2 cursor-pointer rounded-md shadow-sm text-sm font-medium text-primary bg-secondary hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setIsCouponModalOpened(true)}
            className="inline-flex items-center justify-center px-4 py-2 cursor-pointer rounded-md shadow-sm text-sm font-medium text-primary bg-secondary hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors"
          >
            Manage Coupons
          </button>
          <button
            onClick={() => {
              setEditingBookId(null);
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
            onClick={() => {
              setEditingBookId(null);
              setIsModalOpened(true);
            }}
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
            categories={categoriesQuery.data?.map((cat) => cat.name)}
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
            setEditingBookId(null);
            setIsModalOpened(false);
          }}
          isLoading={isLoading}
          editingBookId={editingBookId}
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
      {isCouponModalOpened && (
        <CouponManagementModal
          isOpen={isCouponModalOpened}
          onClose={() => setIsCouponModalOpened(false)}
        />
      )}
    </div>
  );
};
