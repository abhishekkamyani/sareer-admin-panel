import { useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

export const AddBookContent = ({ content, setContent }) => {
  const [selectedChapter, setSelectedChapter] = useState(null);


  // Add new chapter
  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      heading: "",
      body: "",
    };
    setContent((prev) => [...prev, newChapter]);
  };

  // Update chapter fields
  const updateChapter = (id, field, value) => {
    setContent((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Delete chapter
  const deleteChapter = (id) => {
    setContent((prev) => prev.filter((item) => item.id !== id));
    if (selectedChapter === id) setSelectedChapter(null);
  };

  const current = content.find((item) => item.id === selectedChapter);

  return (
    <div className="flex gap-6 h-screen">
      {/* Table of Contents */}
      <div className="w-1/3 bg-gray-50 p-4 border-r overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Table of Contents</h3>
          <button
            onClick={addChapter}
            type="button"
            className="bg-blue-500 text-white p-2 rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {content.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded cursor-pointer ${
                selectedChapter === item.id
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedChapter(item.id)}
            >
              <div className="flex justify-between items-center">
                <span className="flex-1">
                  {item.heading || "Untitled Chapter"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChapter(item.id);
                  }}
                  className="text-red-600 hover:text-red-700"
                  type="button"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 flex flex-col">
        {current ? (
          <>
            <input
              type="text"
              value={current.heading}
              onChange={(e) =>
                updateChapter(current.id, "heading", e.target.value)
              }
              placeholder="Chapter Heading"
              className="mb-4 p-2 border rounded"
            />
            <textarea
              value={current.body}
              onChange={(e) =>
                updateChapter(current.id, "body", e.target.value)
              }
              className="flex-1 p-4 border rounded resize-none"
              placeholder="Enter chapter content..."
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedChapter(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
                type="button"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a chapter to edit
          </div>
        )}
      </div>
    </div>
  );
};
