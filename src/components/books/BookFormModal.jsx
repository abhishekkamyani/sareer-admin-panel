import ReactDOM from "react-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const BookFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {
      name: "",
      writer: "",
      description: "",
      category: "",
      language: "English",
      releaseDate: "",
      pricePkr: 0,
      priceUsd: 0,
      discountType: "percentage",
      discountValue: 0,
      tags: [],
      keywords: [],
      coverImage: null,
      contentRestriction: 5,
      content: "",
      tableOfContents: [],
    },
  });

  const [coverPreview, setCoverPreview] = useState(null);
  const [selectedTags, setSelectedTags] = useState(initialData?.tags || []);
  const [fileUploadError, setFileUploadError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tableOfContents, setTableOfContents] = useState(
    initialData?.tableOfContents || []
  );
  const discountType = watch("discountType");
  const pricePkr = watch("pricePkr");
  const discountValue = watch("discountValue");

  // Extract headings from content to auto-generate TOC
  const extractHeadings = (content) => {
    if (!content) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];

    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const hashes = match[1]; // e.g. "##"
      const text = match[2].trim(); // Heading text
      const anchor = `${hashes} ${text}`; // e.g. "## Chapter 1"

      headings.push({ title: text, anchor });
    }

    return headings;
  };

  // Update TOC when content changes
  useEffect(() => {
    const content = watch("content");
    if (content) {
      const headings = extractHeadings(content);
      if (headings.length > 0) {
        setTableOfContents(headings);
      }
    }
  }, [watch("content")]);

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("writer", initialData.writer);
      setValue("content", initialData.content);
      setValue("description", initialData.description);
      setValue("category", initialData.category);
      setValue("language", initialData.language || "English");
      setValue("releaseDate", initialData.releaseDate);
      setValue("pricePkr", Number(initialData.prices?.pkr || 0));
      setValue("priceUsd", Number(initialData.prices?.usd || 0));
      setValue("discountType", initialData.discount?.type || "percentage");
      setValue("discountValue", Number(initialData.discount?.value || 0));
      setValue(
        "contentRestriction",
        Number(initialData.contentRestriction || 5)
      );
      setValue("tags", initialData.tags || []);
      setValue("keywords", initialData.keywords || []);
      setSelectedTags(initialData.tags || []);
      setCoverPreview(initialData.coverUrl || null);
      setTableOfContents(initialData.tableOfContents || []);
    }
  }, [initialData, setValue]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const fetched = querySnapshot.docs.map((doc) => doc.data().name);
        if (fetched?.length > 0) {
          setCategories(fetched);
          // setValue("category", initialData?.category || "");
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (categories.length > 0) {
      setValue("category", initialData?.category || "");
    }
  }, [categories]);

  // Calculate discounted price
  useEffect(() => {
    if (discountType === "percentage") {
      const discountAmount = (pricePkr * discountValue) / 100;
      setValue("discountedPricePkr", pricePkr - discountAmount);
    } else {
      setValue("discountedPricePkr", pricePkr - discountValue);
    }
  }, [pricePkr, discountValue, discountType, setValue]);

  // Handle cover image upload
  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      setFileUploadError("Please upload an image file (PNG/JPG)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileUploadError("File size should be less than 2MB");
      return;
    }

    setValue("coverImage", file);
    setCoverPreview(URL.createObjectURL(file));
    setFileUploadError(null);
  };

  // Handle tag selection
  const toggleTag = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setValue("tags", newTags);
  };

  // Handle TOC changes
  const handleTocChange = (index, field, value) => {
    const updatedToc = [...tableOfContents];
    updatedToc[index][field] = value;
    setTableOfContents(updatedToc);
  };

  const addTocEntry = () => {
    setTableOfContents([...tableOfContents, { title: "", anchor: "" }]);
  };

  const removeTocEntry = (index) => {
    const updatedToc = [...tableOfContents];
    updatedToc.splice(index, 1);
    setTableOfContents(updatedToc);
  };

  const languages = ["English", "Urdu"];
  const availableTags = [
    "Bestseller",
    "New",
    "Limited Edition",
    "Award Winning",
    "Staff Pick",
  ];

  const keywords = watch("keywords") || [];

  const handleKeyDown = (e) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value && !keywords.includes(value)) {
        setValue("keywords", [...keywords, value]);
        e.target.value = "";
      }
    }
  };

  const handleBlur = (e) => {
    const value = e.target.value.trim();
    if (value && !keywords.includes(value)) {
      setValue("keywords", [...keywords, value]);
      e.target.value = "";
    }
  };

  const removeKeyword = (index) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    setValue("keywords", newKeywords);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="h-full w-full absolute bg-gray-700 opacity-80"></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {initialData ? "Edit Book" : "Add New Book"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ height: "85%" }}>
          <PerfectScrollbar
            className="p-6 overflow-hidden"
            options={{
              suppressScrollX: true,
            }}
          >
            <form
              onSubmit={handleSubmit((data) => {
                const formData = {
                  ...data,
                  tableOfContents: tableOfContents.filter(
                    (item) => item.title && item.anchor
                  ),
                };
                onSubmit(formData);
              })}
              className="space-y-4 h-full"
            >
              {/* First Row - Book Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Book Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Name*
                  </label>
                  <input
                    type="text"
                    {...register("name", { required: "Required" })}
                    className={`w-full rounded-md border ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Writer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Writer*
                  </label>
                  <input
                    type="text"
                    {...register("writer", { required: "Required" })}
                    className={`w-full rounded-md border ${
                      errors.writer ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {errors.writer && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.writer.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Second Row - Category, Language, Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <select
                    {...register("category", { required: "Required" })}
                    className={`w-full rounded-md border ${
                      errors.category ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    {...register("language")}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release Date*
                  </label>
                  <input
                    type="date"
                    {...register("releaseDate", { required: "Required" })}
                    className={`w-full rounded-md border ${
                      errors.releaseDate ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {errors.releaseDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.releaseDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Third Row - Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price PKR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (PKR)*
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      ₨
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      {...register("pricePkr", {
                        required: "Required",
                        min: { value: 0, message: "Must be ≥ 0" },
                      })}
                      className={`w-full pl-8 rounded-md border ${
                        errors.pricePkr ? "border-red-500" : "border-gray-300"
                      } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                  </div>
                  {errors.pricePkr && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.pricePkr.message}
                    </p>
                  )}
                </div>

                {/* Price USD */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD)*
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register("priceUsd", {
                        required: "Required",
                        min: { value: 0, message: "Must be ≥ 0" },
                      })}
                      className={`w-full pl-8 rounded-md border ${
                        errors.priceUsd ? "border-red-500" : "border-gray-300"
                      } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                  </div>
                  {errors.priceUsd && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.priceUsd.message}
                    </p>
                  )}
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register("discountType")}
                      className="w-1/3 rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">PKR</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      {...register("discountValue", {
                        min: { value: 0, message: "Must be ≥ 0" },
                      })}
                      className={`w-2/3 rounded-md border ${
                        errors.discountValue
                          ? "border-red-500"
                          : "border-gray-300"
                      } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                  </div>
                  {errors.discountValue && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.discountValue.message}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    Discounted Price: ₨
                    {watch("discountedPricePkr")?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>

              {/* Fourth Row - Content Restriction & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Preview Pages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview Pages Limit*
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register("contentRestriction", {
                      required: "Required",
                      min: { value: 0, message: "Must be ≥ 0" },
                    })}
                    className={`w-full rounded-md border ${
                      errors.contentRestriction
                        ? "border-red-500"
                        : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Pages visible to unauthorized users
                  </p>
                  {errors.contentRestriction && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contentRestriction.message}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`flex items-center px-3 py-1 rounded-full text-xs ${
                          selectedTags.includes(tag)
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tag}
                        {selectedTags.includes(tag) && (
                          <CheckIcon className="ml-1 h-3 w-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keywords
                    <span className="ml-2 text-gray-500 font-normal">
                      (Press enter or comma to add)
                    </span>
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className={`w-full rounded-md border ${
                      errors.keywords ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                    placeholder="e.g. science, fiction, AI"
                  />

                  {/* Keywords badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map((keyword, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="ml-1 text-indigo-600 hover:text-indigo-900"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fifth Row - Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  rows={3}
                  {...register("description", { required: "Required" })}
                  className={`w-full rounded-md border ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Sixth Row - Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Cover*
                </label>
                <div
                  className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                    errors.coverImage ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  {coverPreview ? (
                    <div className="relative">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="h-48 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverPreview(null);
                          setValue("coverImage", null);
                        }}
                        className="absolute top-0 right-0 bg-red-500 rounded-full p-1 text-white"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <div className="flex justify-center">
                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400" />
                      </div>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="cover-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="cover-upload"
                            type="file"
                            accept="image/png, image/jpeg"
                            className="sr-only"
                            onChange={handleCoverUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  )}
                </div>
                {fileUploadError && (
                  <p className="mt-1 text-sm text-red-600">{fileUploadError}</p>
                )}
                {errors.coverImage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.coverImage.message}
                  </p>
                )}
              </div>

              {/* Seventh Row - Book Content */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Content (Text)*
                  <span className="ml-2 text-gray-500 font-normal">
                    Use ## Heading for chapters (will auto-generate TOC)
                  </span>
                </label>
                <textarea
                  rows={8}
                  {...register("content", { required: "Required" })}
                  className={`w-full rounded-md border ${
                    errors.content ? "border-red-500" : "border-gray-300"
                  } p-2 focus:ring-indigo-500 focus:border-indigo-500`}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.content.message}
                  </p>
                )}
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Content (Text)*
                  <span className="ml-2 text-gray-500 font-normal">
                    Use <code>#</code>, <code>##</code>, etc. for
                    chapters/sections (TOC auto-generated)
                  </span>
                </label>
                <textarea
                  rows={10}
                  {...register("content", { required: "Required" })}
                  placeholder={`# Chapter 1\n## Introduction\nContent here...`}
                  className={`w-full rounded-md border ${
                    errors.content ? "border-red-500" : "border-gray-300"
                  } p-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono`}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.content.message}
                  </p>
                )}
              </div>

              {/* Eighth Row - Table of Contents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table of Contents
                </label>
                <div className="space-y-2 mb-2">
                  {tableOfContents.length > 0 ? (
                    <ul className="border rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
                      {tableOfContents.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 mb-1 last:mb-0"
                        >
                          <input
                            type="text"
                            placeholder="Chapter title"
                            value={item.title}
                            onChange={(e) =>
                              handleTocChange(index, "title", e.target.value)
                            }
                            className="flex-1 rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Anchor (e.g., #chapter1)"
                            value={item.anchor}
                            onChange={(e) =>
                              handleTocChange(index, "anchor", e.target.value)
                            }
                            className="flex-1 rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeTocEntry(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 p-2">
                      Add headings to your content (like ## Chapter 1) or
                      manually add chapters below
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={addTocEntry}
                    className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Chapter Manually
                  </button>
                </div>
              </div>

              {/* Footer with Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t pb-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-indigo-700"
                >
                  Save Book
                </button>
              </div>
            </form>
          </PerfectScrollbar>
        </div>
      </div>
    </div>,
    document.getElementById("root")
  );
};
