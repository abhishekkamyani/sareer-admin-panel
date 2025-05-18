import { useEffect, useState } from "react";
import { BookFormModal } from "../components/books/BookFormModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import BookTable from "../components/books/BookTable";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "../utils/firebase";
import { onSnapshot } from "firebase/firestore";

import {
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { CategoryModal } from "../components/books/CategoryModal";

export const BookManagement = () => {
  const [books, setBooks] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const [isCategoryModalOpened, setIsCategoryModalOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  console.log("Books data:", books);

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
      // Upload cover image if it's a new file
      // if (formData.coverImage && typeof formData.coverImage !== "string") {
      //   const storageRef = ref(
      //     storage,
      //     `book-covers/${Date.now()}-${formData.coverImage.name}`
      //   );
      //   await uploadBytes(storageRef, formData.coverImage);
      //   coverUrl = await getDownloadURL(storageRef);
      // }

      if (formData.coverImage && typeof formData.coverImage !== "string") {
        try {
          const storageRef = ref(
            storage,
            `book-covers/${Date.now()}-${formData.coverImage.name}`
          );

          // Add metadata for cache and content type
          const metadata = {
            contentType: formData.coverImage.type,
            cacheControl: "public, max-age=31536000", // 1-year cache
          };

          // Upload with metadata
          const snapshot = await uploadBytes(
            storageRef,
            formData.coverImage,
            metadata
          );

          // Get persistent URL
          coverUrl = await getDownloadURL(snapshot.ref);
          console.log("Upload successful:", coverUrl);
        } catch (error) {
          console.error("Upload failed:", error);
          throw new Error("Image upload failed. Please try again.");
        }
      }

      // if (formData.coverImage && typeof formData.coverImage !== "string") {
      //   const storageRef = ref(storage, `book-covers/${Date.now()}-${formData.coverImage.name}`);
      //   const uploadTask = uploadBytesResumable(storageRef, formData.coverImage);

      //   uploadTask.on(
      //     "state_changed",
      //     (snapshot) => {
      //       const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      //       console.log("Upload is " + progress + "% done");
      //     },
      //     (error) => {
      //       console.error("Upload error:", error);
      //     },
      //     async () => {
      //       const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      //       console.log("File available at", downloadURL);
      //       coverUrl = downloadURL;
      //     }
      //   );
      // }

      const bookData = {
        name: formData.name,
        writer: formData.writer,
        description: formData.description,
        categories: formData.categories,
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
        ...(bookId ? {} : { createdAt: serverTimestamp() }),
        ...(bookId
          ? {}
          : {
              stats: {
                views: 0,
                purchases: 0,
                ratingsCount: 0,
                averageRating: 0,
              },
            }),
      };

      if (bookId) {
        const bookRef = doc(db, "books", bookId);
        await setDoc(bookRef, bookData, { merge: true }); // update
      } else {
        await addDoc(collection(db, "books"), bookData); // create
      }

      fetchBooks();
    } catch (error) {
      setIsLoading(false);
      console.error("Error in upsertBookToFirestore: ", error);
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
  console.log("editing book", editingBook);

  const handleDelete = async (id) => {
    // Implement delete logic
    await deleteDoc(doc(db, "books", id));
    fetchBooks();
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
