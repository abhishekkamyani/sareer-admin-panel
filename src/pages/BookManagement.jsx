import { useEffect, useState } from "react";
import { BookFormModal } from "../components/books/BookFormModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../utils/firebase";
import { getAuth, signInAnonymously } from "firebase/auth";

// Before upload attempt
const auth = getAuth();

// Option 1: Sign in anonymously (if you don't need user accounts)

export const BookManagement = () => {
  const [books, setBooks] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const user = await signInAnonymously(auth);
      console.log("user", user);

    }
    fetch();


  }, []);

  // Function to add a new book
  const addBookToFirestore = async (formData) => {
    try {
      // 1. Upload cover image if exists
      let coverUrl = null;
      if (formData.coverImage && typeof formData.coverImage !== "string") {
        const storageRef = ref(
          storage,
          `book-covers/${Date.now()}-${formData.coverImage.name}`
        );
        await uploadBytes(storageRef, formData.coverImage);
        coverUrl = await getDownloadURL(storageRef);
      }

      // 2. Prepare book data with proper schema
      const bookData = {
        name: formData.name,
        writer: formData.writer,
        description: formData.description,
        category: formData.category,
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
        tags: formData.tags,
        coverUrl: coverUrl || null,
        content: formData.content,
        status: "published", // or "draft"
        featured: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stats: {
          views: 0,
          purchases: 0,
          ratingsCount: 0,
          averageRating: 0,
        },
      };

      // 3. Add to Firestore
      const docRef = await addDoc(collection(db, "books"), bookData);

      console.log("Book added with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding book: ", error);
      throw error;
    }
  };

  const handleSubmit = async (data) => {
    console.log(data);

    if (editingBook) {
      // Update existing book
      setBooks(
        books.map((book) =>
          book.id === editingBook.id ? { ...data, id: book.id } : book
        )
      );
    } else {
      // Add new book with current timestamp as ID
      try {
        setBooks([...books, { ...data, id: Date.now() }]);
        const bookId = await addBookToFirestore(data);
        console.log("IDDD", bookId);

        // Handle success (show notification, redirect, etc.)
      } catch (error) {
        // Handle error
      }
    }
    setEditingBook(null);
    setIsModalOpened(false);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setIsModalOpened(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      setBooks(books.filter((book) => book.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book Management</h1>
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
          {/* <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cover
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Author
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {books.map((book) => (
                <tr key={book.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {book.coverImage ? (
                      <img
                        src={
                          typeof book.coverImage === "string"
                            ? book.coverImage
                            : URL.createObjectURL(book.coverImage)
                        }
                        alt="Book cover"
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">No cover</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {book.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {book.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {book.writer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ₨{book.pricePkr?.toFixed(2)}
                    </div>
                    {book.discountValue > 0 && (
                      <div className="text-xs text-green-600">
                        {book.discountType === "percentage"
                          ? `${book.discountValue}% off`
                          : `₨${book.discountValue} off`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(book)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table> */}
        </div>
      )}

      <BookFormModal
        isOpen={isModalOpened}
        onClose={() => {
          setEditingBook(null);
          setIsModalOpened(false);
        }}
        initialData={editingBook}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
