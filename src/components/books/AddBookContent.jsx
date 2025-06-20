import { useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
// Import all the necessary utilities from your utility file
import {
  quillModules,
  parseRichText,
  generateQuillFontCss,
} from "../../utils/utility"; // Make sure this path is correct

export const AddBookContent = ({ content, setContent }) => {
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Call the function to get the CSS string
  const fontCss = generateQuillFontCss();

  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      heading: "",
      body: "",
    };
    setContent((prev) => [...prev, newChapter]);
    setSelectedChapter(newChapter.id);
  };

  const updateChapter = (id, field, value) => {
    setContent((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const deleteChapter = (id) => {
    setContent((prev) => prev.filter((item) => item.id !== id));
    if (selectedChapter === id) setSelectedChapter(null);
  };

  const current = content.find((item) => item.id === selectedChapter);

  return (
    <div className="flex gap-6 h-screen">
      {/* Inject the CSS string into the style tag */}
      <style>{fontCss}</style>

      {/* Table of Contents */}
      <div className="w-1/3 bg-gray-50 p-4 border-r overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Table of Contents</h3>
          <button
            onClick={addChapter}
            type="button"
            className="bg-primary text-white p-2 rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {Array.isArray(content) &&
            content.map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedChapter === item.id
                    ? "bg-grey-300"
                    : "hover:bg-grey-200"
                }`}
                onClick={() => setSelectedChapter(item.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="flex-1 truncate">
                    {item.heading || "Untitled Chapter"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChapter(item.id);
                    }}
                    className="text-error hover:text-red-700"
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
            <ReactQuill
              key={current.id}
              theme="snow"
              value={parseRichText(current.body)}
              onChange={(contentValue, delta, source, editor) => {
                updateChapter(current.id, "body", editor.getContents());
              }}
              modules={quillModules}
              className="flex-1 mb-4"
              style={{ display: "flex", flexDirection: "column" }}
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
