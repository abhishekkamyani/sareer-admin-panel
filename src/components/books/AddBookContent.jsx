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
      // Use a temporary ID for client-side keying. Firestore will generate the permanent one.
      id: `temp_${Date.now()}`,
      heading: "",
      body: "",
      alignment: "left",
      // Set the order based on the current number of chapters
      order: content.length,
    };
    setContent((prev) => [...prev, newChapter]);
    // Automatically select the new chapter for editing
    setSelectedChapter(newChapter.id);
  };

  // Update chapter fields
  const updateChapter = (id, field, value) => {
    setContent((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Delete chapter
  const deleteChapter = (id) => {
    // Filter out the chapter and then re-order the remaining ones
    setContent((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          order: index,
        }))
    );
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
          {/* Sort content by order for display */}
          {content
            .sort((a, b) => a.order - b.order)
            .map((item) => (
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
                    {`Ch ${item.order + 1}: ${item.heading || "Untitled"}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChapter(item.id);
                    }}
                    className="text-error hover:text-red-700 ml-2"
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
            <div className="flex justify-between items-center mb-4">
              {/* <div className="w-1/3">
                    <label
                        htmlFor="chapter-order"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Chapter Order
                    </label>
                    <input
                        type="number"
                        id="chapter-order"
                        value={current.order}
                        onChange={(e) =>
                            updateChapter(current.id, "order", parseInt(e.target.value, 10))
                        }
                        className="w-full p-2 border rounded"
                    />
                </div> */}
              {/* <div className="w-1/3">
                    <label
                        htmlFor="alignment-select"
                        className="block text-sm font-medium text-gray-700 mb-1"
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
                </div> */}
            </div>
            <div className="w-full flex mb-4 items-center justify-between flex-row-reverse">
              <div className="w-1/3">
                <label
                  htmlFor="alignment-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
              <div>
                <label
                  htmlFor="heading"
                  className="text-sm font-medium text-gray-700 mb-1"
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
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <label
              htmlFor="content"
              className="text-sm font-medium text-gray-700 mb-1"
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
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a chapter to edit or add a new one
          </div>
        )}
      </div>
    </div>
  );
};
