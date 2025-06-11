import ReactDOM from "react-dom";
import { useState, useEffect } from "react";
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
  updateDoc, // Import updateDoc
  doc, // Import doc
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify"; // Assuming react-toastify is already configured globally

export const CategoryModal = ({ isOpen, onClose, existingCategories }) => {
  const [input, setInput] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("standard"); // 'standard' or 'featured'
  const [standardCategories, setStandardCategories] = useState([]);
  
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [newStandardCategories, setNewStandardCategories] = useState([]);
  const [newFeaturedCategories, setNewFeaturedCategories] = useState([]);
  const [categoriesToUpdate, setCategoriesToUpdate] = useState({}); // {categoryId: {name, type}}
  const [removedCategories, setRemovedCategories] = useState([]); // {categoryId, name, type}
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (existingCategories) {
      setStandardCategories(
        existingCategories.filter((cat) => cat.type === "standard")
      );
      setFeaturedCategories(
        existingCategories.filter((cat) => cat.type === "featured")
      );
    }
  }, [existingCategories]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.includes(",")) {
      const parts = value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item); // Ensure no empty strings

      if (parts.length) {
        parts.forEach((part) => {
          // Check if category already exists in existing or new lists
          const alreadyExists =
            standardCategories.some(
              (cat) => cat.name.toLowerCase() === part.toLowerCase()
            ) ||
            featuredCategories.some(
              (cat) => cat.name.toLowerCase() === part.toLowerCase()
            ) ||
            newStandardCategories.some(
              (cat) => cat.name.toLowerCase() === part.toLowerCase()
            ) ||
            newFeaturedCategories.some(
              (cat) => cat.name.toLowerCase() === part.toLowerCase()
            );

          if (!alreadyExists) {
            if (newCategoryType === "standard") {
              setNewStandardCategories((prev) => [
                ...prev,
                { name: part, type: "standard" },
              ]);
            } else {
              setNewFeaturedCategories((prev) => [
                ...prev,
                { name: part, type: "featured" },
              ]);
            }
          } else {
            toast.warn(`Category "${part}" already exists.`, {
              style: {
                backgroundColor: "var(--color-warning)",
                color: "white",
              },
            });
          }
        });
      }
      setInput("");
    }
  };

  const handleRemove = (category, isNew) => {
    // category object: {id, name, type} if existing, or just {name, type} if new
    if (isNew) {
      if (category.type === "standard") {
        setNewStandardCategories(
          newStandardCategories.filter((cat) => cat.name !== category.name)
        );
      } else {
        setNewFeaturedCategories(
          newFeaturedCategories.filter((cat) => cat.name !== category.name)
        );
      }
    } else {
      if (category.type === "standard") {
        setStandardCategories(
          standardCategories.filter((cat) => cat.id !== category.id)
        );
      } else {
        setFeaturedCategories(
          featuredCategories.filter((cat) => cat.id !== category.id)
        );
      }
      setRemovedCategories((prev) => [...prev, category]);
    }
  };

  const handleMoveCategory = (category, targetType) => {
    // category object: {id, name, type}
    const currentType = category.type;

    if (currentType === targetType) return; // No change needed

    if (currentType === "standard") {
      setStandardCategories(
        standardCategories.filter((cat) => cat.id !== category.id)
      );
      setFeaturedCategories((prev) => [
        ...prev,
        { ...category, type: targetType },
      ]);
    } else {
      setFeaturedCategories(
        featuredCategories.filter((cat) => cat.id !== category.id)
      );
      setStandardCategories((prev) => [
        ...prev,
        { ...category, type: targetType },
      ]);
    }

    // Mark for update in Firestore
    setCategoriesToUpdate((prev) => ({
      ...prev,
      [category.id]: { name: category.name, type: targetType },
    }));
  };

  const handleSubmit = async () => {
    if (
      !newStandardCategories.length &&
      !newFeaturedCategories.length &&
      !removedCategories.length &&
      Object.keys(categoriesToUpdate).length === 0
    ) {
      toast.info("No changes to save.", {
        style: { backgroundColor: "var(--color-info)", color: "white" },
      });
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Add new categories
      for (const cat of newStandardCategories) {
        await addDoc(collection(db, "categories"), {
          name: cat.name,
          type: "standard",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // books: [],
        });
      }
      for (const cat of newFeaturedCategories) {
        await addDoc(collection(db, "categories"), {
          name: cat.name,
          type: "featured",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // books: [],
        });
      }

      // Update category types
      for (const categoryId in categoriesToUpdate) {
        const { type } = categoriesToUpdate[categoryId];
        await updateDoc(doc(db, "categories", categoryId), {
          type: type,
          updatedAt: serverTimestamp(),
        });
      }

      // Delete removed categories
      for (const cat of removedCategories) {
        // Ensure that we only delete if the category is not being re-added or moved
        // (This check might be redundant if UI prevents re-adding removed ones easily)
        const q = query(
          collection(db, "categories"),
          where("name", "==", cat.name)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docRef) => {
          // Additional check: ensure the ID matches if the original category object had an ID
          if (cat.id && docRef.id === cat.id) {
            await deleteDoc(docRef.ref);
          } else if (!cat.id) {
            // For new categories that might have been added and then removed before saving
            await deleteDoc(docRef.ref);
          }
        });
      }

      queryClient.invalidateQueries(["categories"]);
      toast.success("Categories updated successfully!", {
        style: { backgroundColor: "var(--color-success)", color: "white" },
      });
      onClose();
    } catch (err) {
      console.error("Error submitting categories:", err);
      setError("Failed to update categories. Please try again.");
      toast.error("Failed to update categories. Please try again.", {
        style: { backgroundColor: "var(--color-error)", color: "white" },
      });
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
              Add new categories (comma separated)
            </label>
            <input
              id="category-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="e.g., Fiction, Biography"
              className="w-full mb-2 rounded-md border border-grey-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="newCategoryType"
                  value="standard"
                  checked={newCategoryType === "standard"}
                  onChange={() => setNewCategoryType("standard")}
                  className="mr-2 text-primary focus:ring-primary"
                />
                <span className="text-sm text-grey-700">Standard</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="newCategoryType"
                  value="featured"
                  checked={newCategoryType === "featured"}
                  onChange={() => setNewCategoryType("featured")}
                  className="mr-2 text-primary focus:ring-primary"
                />
                <span className="text-sm text-grey-700">Featured</span>
              </label>
            </div>

            {/* New Standard Categories */}
            {newStandardCategories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  New Standard Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {newStandardCategories.map((cat) => (
                    <span
                      key={cat.name}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() => handleRemove(cat, true)}
                        className="text-blue-800 hover:text-red-500"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* New Featured Categories */}
            {newFeaturedCategories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  New Featured Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {newFeaturedCategories.map((cat) => (
                    <span
                      key={cat.name}
                      className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() => handleRemove(cat, true)}
                        className="text-yellow-800 hover:text-red-500"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Standard Categories */}
            {(standardCategories.length > 0 ||
              newStandardCategories.length > 0) && (
              <div className="mb-4 border-t pt-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  Standard Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {standardCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="flex items-center gap-1 bg-grey-200 px-2 py-1 rounded-full text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() => handleMoveCategory(cat, "featured")}
                        className="ml-1 px-1 py-0.5 rounded-full bg-secondary text-primary text-xs hover:bg-secondary-light"
                        title="Move to Featured"
                      >
                        M-F
                      </button>
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

            {/* Existing Featured Categories */}
            {(featuredCategories.length > 0 ||
              newFeaturedCategories.length > 0) && (
              <div className="mb-4 border-t pt-4">
                <p className="text-sm text-grey-700 font-medium mb-1">
                  Featured Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {featuredCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="flex items-center gap-1 bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() => handleMoveCategory(cat, "standard")}
                        className="ml-1 px-1 py-0.5 rounded-full bg-blue-200 text-blue-900 text-xs hover:bg-blue-300"
                        title="Move to Standard"
                      >
                        M-S
                      </button>
                      <button
                        onClick={() => handleRemove(cat, false)}
                        className="text-yellow-900 hover:text-error"
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
