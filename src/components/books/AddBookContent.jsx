import { useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Select } from "antd";
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
} from "@ant-design/icons";

const alignmentOptions = [
  { value: "left", label: "Left Align", icon: <AlignLeftOutlined /> },
  { value: "center", label: "Center Align", icon: <AlignCenterOutlined /> },
  { value: "right", label: "Right Align", icon: <AlignRightOutlined /> },
];

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
            className="bg-primary text-white p-2 rounded"
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
                  ? "bg-grey-300"
                  : "hover:bg-grey-200"
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
            <div className=" ms-auto">
              <label
                htmlFor="alignment-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Text Alignment
              </label>
              <Select
                id="alignment-select"
                value={current?.alignment ?? "left"}
                onChange={(value) =>
                  updateChapter(current?.id, "alignment", value)
                }
                style={{ width: "100%" }}
                aria-label="Text Alignment Selector"
              >
                {alignmentOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="w-full">
              <label
                htmlFor="heading"
                className="text-sm font-medium text-gray-700 mb-2"
              >
                Chapter Heading
              </label>
              <input
                type="text"
                id="heading"
                value={current.heading}
                onChange={(e) =>
                  updateChapter(current.id, "heading", e.target.value)
                }
                style={{ textAlign: current?.alignment ?? "left" }}
                placeholder="Chapter Heading"
                className="mb-4 w-full p-2 border rounded"
              />
            </div>
            <label
              htmlFor="content"
              className="text-sm font-medium text-gray-700 mb-2"
            >
              Chapter Content
            </label>
            <textarea
              value={current.body}
              id="content"
              onChange={(e) =>
                updateChapter(current.id, "body", e.target.value)
              }
              className="flex-1 p-4 border rounded resize-none"
              placeholder="Enter chapter content..."
              style={{ textAlign: current?.alignment ?? "left" }}
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
