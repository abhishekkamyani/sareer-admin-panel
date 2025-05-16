import { useState } from "react";
import BookForm from "../components/books/BookForm";
import { BookFormModal } from "../components/books/BookFormModal";
// import BookList from '../components/BookList';

export const BookManagement = () => {
  const [books, setBooks] = useState([]);
  const [editingBook, setEditingBook] = useState(null);
  const [isModalOpened, setIsModalOpened] = useState(true);

  const handleSubmit = (data) => {
    if (editingBook) {
      // Update existing book
      setBooks(
        books.map((book) =>
          book.id === editingBook.id ? { ...data, id: book.id } : book
        )
      );
    } else {
      // Add new book
      setBooks([...books, { ...data, id: Date.now() }]);
    }
    setEditingBook(null);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
  };

  const handleDelete = (id) => {
    setBooks(books.filter((book) => book.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Book Management</h1>
      <button onClick={() => setIsModalOpened(true)}>Add new book</button>

      {/* <BookList 
        books={books} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      /> */}
      {isModalOpened && (
        <BookFormModal
          isOpen={isModalOpened}
          onClose={() => setIsModalOpened(false)}
          initialData={editingBook}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};
