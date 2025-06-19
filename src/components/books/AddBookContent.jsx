import { useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Helper function to safely parse content for ReactQuill.
// It handles content that is already a Delta object or a JSON string.
const parseBodyContent = (body) => {
  if (!body) return "";
  if (typeof body === "object" && body !== null) {
    return body; // It's already a Delta object
  }
  if (typeof body === "string") {
    try {
      // Try to parse it as JSON, in case it's a stored Delta string
      const parsed = JSON.parse(body);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch (error) {
      // If it fails, it's plain text. Let Quill handle it.
      return body;
    }
  }
  return body;
};

export const AddBookContent = ({ content, setContent }) => {
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Add new chapter
  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      heading: "",
      body: "", // Start with an empty body
    };
    setContent((prev) => [...prev, newChapter]);
    setSelectedChapter(newChapter.id); // Select the new chapter automatically
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

  // Configuration for the ReactQuill toolbar
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ color: [] }],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      [{ align: [] }],
      ["link", "image"],
      ["clean"],
    ],
  };
  return (
    <div className="flex gap-6 h-screen">
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
            {/* Replace textarea with ReactQuill */}
            <ReactQuill
              key={current.id} // This forces re-mount when chapter changes
              theme="snow"
              value={parseBodyContent(current.body)}
              onChange={(contentValue, delta, source, editor) => {
                // Update the state with the full Delta object from the editor
                updateChapter(current.id, "body", editor.getContents());
              }}
              modules={quillModules}
              className="flex-1 mb-4" // Use flex-1 to fill available space
              style={{ display: "flex", flexDirection: "column" }} // Ensure Quill editor expands correctly
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
            Select a chapter to edit or add a new one.
          </div>
        )}
      </div>
    </div>
  );
};
