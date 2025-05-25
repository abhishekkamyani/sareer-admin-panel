import ReactDOM from "react-dom";
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../../utils/firebase";
import { useQueryClient } from "@tanstack/react-query";

export const CategoryModal = ({ isOpen, onClose, existingCategories }) => {
  const [input, setInput] = useState("");
  const [categories, setCategories] = useState(existingCategories ?? []); // all categories
  const [newCategories, setNewCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [removedCategories, setRemovedCategories] = useState([]);
  const queryClient = useQueryClient();

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.includes(",")) {
      const parts = value
        .split(",")
        .map((item) => item.trim())
        .filter(
          (item) =>
            item && !categories.includes(item) && !newCategories.includes(item)
        );

      if (parts.length) {
        setNewCategories([...newCategories, ...parts]);
      }
      setInput("");
    }
  };

  const handleRemove = (name, isNew) => {
    if (isNew) {
      setNewCategories(newCategories.filter((cat) => cat !== name));
    } else {
      setCategories(categories.filter((cat) => cat !== name));
      setRemovedCategories([...removedCategories, name]);
    }
  };

  const handleSubmit = async () => {
    if (!newCategories.length && !removedCategories.length) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Add new categories
      for (const name of newCategories) {
        await addDoc(collection(db, "categories"), {
          name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          books: [], // Initialize as empty array (will store book IDs)
        });
      }

      // Delete removed categories
      for (const name of removedCategories) {
        const q = query(
          collection(db, "categories"),
          where("name", "==", name)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      queryClient.invalidateQueries(["categories"]);

      onClose();
    } catch (err) {
      console.error("Error submitting categories:", err);
      setError("Failed to update categories. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-grey-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-grey-900">
            Manage Categories
          </h3>
          <button
            onClick={onClose}
            className="text-grey-400 hover:text-grey-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <PerfectScrollbar
          className="max-h-[80vh]"
          options={{
            suppressScrollX: true,
          }}
        >
          <div className="p-6">
            <label
              htmlFor="category-input"
              className="block text-sm font-medium text-grey-700 mb-1"
            >
              Add categories (comma separated)
            </label>
            <input
              id="category-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="e.g., Fiction, Biography"
              className="w-full mb-4 rounded-md border border-grey-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            {/* Existing Categories */}
            {categories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  Existing Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1 bg-grey-200 px-2 py-1 rounded-full text-sm"
                    >
                      {cat}
                      <button
                        onClick={() => handleRemove(cat, false)}
                        className="text-grey-500 hover:text-error"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* New Categories */}
            {newCategories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  New Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {newCategories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1 bg-indigo-100 text-primary px-2 py-1 rounded-full text-sm"
                    >
                      {cat}
                      <button
                        onClick={() => handleRemove(cat, true)}
                        className="text-primary hover:error"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2 bg-red-100 text-error rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-grey-300 rounded-md text-sm text-grey-700 hover:bg-grey-50 cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md text-sm text-white bg-primary hover:bg-success cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save Categories"}
              </button>
            </div>
          </div>
        </PerfectScrollbar>
      </div>
    </div>,
    document.getElementById("root")
  );
};
