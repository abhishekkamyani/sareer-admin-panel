import ReactDOM from "react-dom";
import { useState, useEffect, useRef } from "react"; // Import useRef
import { useForm, Controller } from "react-hook-form";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Select from "react-select";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { AddBookContent } from "./AddBookContent";
import dayjs from "dayjs";

const availableTags = [
  "Bestseller",
  "New",
  "Limited Edition",
  "Award Winning",
  "Staff Pick",
];


const ImageUploader = ({ label, previewUrl, onFileChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div
      className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
        error ? "border-red-500" : "border-gray-300"
      }`}
    >
      {previewUrl ? (
        <div className="relative">
          <img src={previewUrl} alt="Preview" className="h-48 object-contain" />
          <button
            type="button"
            onClick={() => onFileChange(null)}
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
              htmlFor={label.toLowerCase().replace(" ", "-")}
              className="relative ml-3 cursor-pointer bg-white rounded-md font-medium text-success hover:text-primary"
            >
              <span>Upload a file</span>
              <input
                id={label.toLowerCase().replace(" ", "-")}
                type="file"
                accept="image/png, image/jpeg"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files[0])}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
        </div>
      )}
    </div>
    {error && <p className="mt-1 text-sm text-error">{error}</p>}
  </div>
);

export const BookFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData, // This now contains all categories with 'id' and 'type'
  categories, // Renamed to allCategories for clarity, as it contains both types
  isLoading,
}) => {

  // Separate categories into standard and featured upon receiving the prop
  const allStandardCategories =
    categories?.filter((cat) => cat.type === "standard") || [];
  const allFeaturedCategories =
    categories?.filter((cat) => cat.type === "featured") || [];

  // Helper to process initial categories into standard and featured names
  const getInitialCategoryNames = (data) => {
    if (!data || !data.categories || !Array.isArray(data.categories)) {
      return { standardCategoryNames: [], featuredCategoryNames: [] };
    }

    const initialBookCategoryNames = data.categories;
    const initialStandardCategoryNames = initialBookCategoryNames.filter(
      (name) => allStandardCategories.some((cat) => cat.name === name)
    );
    const initialFeaturedCategoryNames = initialBookCategoryNames.filter(
      (name) => allFeaturedCategories.some((cat) => cat.name === name)
    );
    return { initialStandardCategoryNames, initialFeaturedCategoryNames };
  };

  const { initialStandardCategoryNames, initialFeaturedCategoryNames } =
    getInitialCategoryNames(initialData);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset, // Import reset function from useForm
  } = useForm({
    // Conditionally set defaultValues based on initialData presence
    defaultValues: initialData
      ? {
          id: initialData.id,
          name: initialData.name,
          writer: initialData.writer,
          description: initialData.description,
          standardCategoryNames: initialStandardCategoryNames,
          featuredCategoryNames: initialFeaturedCategoryNames,
          language: initialData.language || "English",
          releaseDate: dayjs(
            initialData.releaseDate?.toDate
              ? initialData.releaseDate.toDate()
              : initialData.releaseDate
          ).format("YYYY-MM-DD"),
          pricePkr: Number(initialData.prices?.pkr || 0),
          priceUsd: Number(initialData.prices?.usd || 0),
          discountType: initialData.discount?.type || "percentage",
          discountValue: Number(initialData.discount?.value || 0),
          contentRestriction: Number(initialData.contentRestriction || 5),
          tags: initialData.tags || [],
          tag: initialData.tag || "",
          keywords: initialData.keywords || [],
          coverUrl: initialData?.coverUrl || null,
          frontPageUrl: initialData.frontPageUrl || null,
          backPageUrl: initialData.backPageUrl || null,
          // coverImage is handled by state/preview, not directly in form data for initial load
          content: initialData.content || [],
          tableOfContents: initialData.tableOfContents || [], // This is initialized from prop too
          status: initialData.status || "published",
        }
      : {
          name: "",
          writer: "",
          description: "",
          standardCategoryNames: [],
          featuredCategoryNames: [],
          language: "English",
          releaseDate: "",
          pricePkr: 0,
          priceUsd: 0,
          discountType: "percentage",
          discountValue: 0,
          tags: [],
          tag: "",
          keywords: [],
          coverImage: null,
          frontPageUrl: null,
          backPageUrl: null,
          contentRestriction: 5,
          content: [],
          tableOfContents: [],
          status: "published",
        },
  });

  // Initialize with initialData
  const [previews, setPreviews] = useState({
    cover: initialData?.coverUrl || null,
    frontPage: initialData?.frontPageUrl || null,
    backPage: initialData?.backPageUrl || null,
  });
  const [fileUploadErrors, setFileUploadErrors] = useState({});
  const [tableOfContents, setTableOfContents] = useState(
    initialData?.tableOfContents || []
  ); // Initialize with initialData
  const discountType = watch("discountType");
  const pricePkr = watch("pricePkr");
  const discountValue = watch("discountValue");
  const [selectedTagOption, setSelectedTagOption] = useState(
    initialData?.tag && availableTags.includes(initialData.tag)
      ? initialData.tag
      : "custom"
  ); // Initialize with initialData

  // Ref to track the ID of the last book whose data was loaded into the form
  const lastLoadedBookIdRef = useRef(initialData?.id);

  // This useEffect will reset the form only when initialData.id changes (i.e., a different book is being edited)
  // or when the modal is opened for the first time for a new book (initialData becomes null initially).
  useEffect(() => {
    // Check if initialData has changed (e.g., editing a different book)
    // Or if we are switching from editing to adding a new book (initialData becomes null)
    const isDifferentBook = initialData?.id !== lastLoadedBookIdRef.current;
    const isOpeningForNewBook =
      isOpen && !initialData && lastLoadedBookIdRef.current !== undefined; // lastLoadedBookIdRef.current !== undefined prevents initial run on mount

    if (isDifferentBook || isOpeningForNewBook) {
      const { initialStandardCategoryNames, initialFeaturedCategoryNames } =
        getInitialCategoryNames(initialData);

      reset({
        // Use reset to set all form values and reset form state
        id: initialData?.id, // Ensure ID is passed for editing context
        name: initialData.name || "",
        writer: initialData.writer || "",
        description: initialData ? initialData.description : "",
        content: initialData?.content || [],
        standardCategoryNames: initialStandardCategoryNames,
        featuredCategoryNames: initialFeaturedCategoryNames,
        language: initialData?.language || "English",
        releaseDate: initialData?.releaseDate
          ? dayjs(
              initialData.releaseDate.toDate
                ? initialData.releaseDate.toDate()
                : initialData.releaseDate
            ).format("YYYY-MM-DD")
          : "",
        pricePkr: Number(initialData?.prices?.pkr || 0),
        priceUsd: Number(initialData?.prices?.usd || 0),
        discountType: initialData?.discount?.type || "percentage",
        discountValue: Number(initialData?.discount?.value || 0),
        contentRestriction: Number(initialData?.contentRestriction || 5),
        tags: initialData?.tags || [],
        tag: initialData?.tag || "",
        keywords: initialData?.keywords || [],
        status: initialData?.status || "published",
        coverUrl: initialData?.coverUrl || null,
        frontPageUrl: initialData.frontPageUrl || null,
        backPageUrl: initialData.backPageUrl || null,
      });

      setPreviews({
        cover: initialData?.coverUrl || null,
        frontPage: initialData?.frontPageUrl || null,
        backPage: initialData?.backPageUrl || null,
      });
      setTableOfContents(initialData?.tableOfContents || []);
      setSelectedTagOption(
        initialData?.tag && availableTags.includes(initialData.tag)
          ? initialData.tag
          : "custom"
      );

      // Update the ref to the current book's ID
      lastLoadedBookIdRef.current = initialData?.id;
    } else if (!isOpen && lastLoadedBookIdRef.current !== null) {
      // When modal closes, and it was previously editing a book, reset ref to null
      // This helps 'isOpeningForNewBook' trigger correctly next time if 'Add Book' is clicked.
      lastLoadedBookIdRef.current = null;
    }
  }, [
    initialData,
    isOpen,
    reset,
    allStandardCategories,
    allFeaturedCategories,
  ]); // Keep initialData as dependency for object identity check

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
  const handleImageUpload = (file, fieldName) => {
    const previewName = fieldName.replace("Image", "");
    setFileUploadErrors((prev) => ({ ...prev, [fieldName]: null }));

    if (file === null) {
      setValue(fieldName, null);
      setPreviews((prev) => ({ ...prev, [previewName]: null }));
      return;
    }
    if (!file.type.match("image.*")) {
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldName]: "Please upload an image file (PNG/JPG)",
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldName]: "File size should be less than 2MB",
      }));
      return;
    }

    setValue(fieldName, file);
    setPreviews((prev) => ({
      ...prev,
      [previewName]: URL.createObjectURL(file),
    }));
  };

  register("content", {
    validate: (value) =>
      (Array.isArray(value) && value.length > 0) ||
      "At least one chapter is required.",
  });
  const languages = ["English", "Urdu"];

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

  const submitState = isLoading
    ? initialData
      ? "Updating..."
      : "Saving..."
    : initialData
    ? "Update Book"
    : "Add Book";

  // --- SUBMISSION HANDLER ---
  const processAndSubmit = (data) => {
    // Helper to stringify rich text content (Delta objects) for Firestore
    const stringifyRichText = (value) => {
      if (value && typeof value === "object" && Array.isArray(value.ops)) {
        return JSON.stringify(value);
      }
      return value; // Return as is if not a Delta object
    };

    const combinedCategories = [
      ...(data.standardCategoryNames || []),
      ...(data.featuredCategoryNames || []),
    ];

    const formData = {
      ...data,
      content: data.content.map((chapter) => ({
        ...chapter,
        body:
          typeof chapter.body === "object"
            ? JSON.stringify(chapter.body)
            : chapter.body,
      })),
      categories: combinedCategories,
      tableOfContents: tableOfContents.filter(
        (item) => item.title && item.anchor
      ),
    };
    delete formData.standardCategoryNames;
    delete formData.featuredCategoryNames;

    onSubmit(formData);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="h-full w-full absolute bg-gray-700 opacity-80"></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden">
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
              onSubmit={handleSubmit(processAndSubmit)}
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
                    } p-2 focus:ring-primary focus:border-primary`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-error">
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
                    } p-2 focus:ring-primary focus:border-primary`}
                  />
                  {errors.writer && (
                    <p className="mt-1 text-sm text-error">
                      {errors.writer.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Second Row - Category, Language, Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Categories*
                  </label>
                  <Controller
                    name="standardCategoryNames"
                    control={control}
                    rules={{
                      required: "At least one standard category is required.",
                    }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        isMulti
                        options={allStandardCategories.map((cat) => ({
                          value: cat.name,
                          label: cat.name,
                        }))}
                        value={
                          field.value?.map((name) => ({
                            value: name,
                            label: name,
                          })) || []
                        }
                        onChange={(selected) => {
                          const selectedValues = selected.map(
                            (item) => item.value
                          );
                          field.onChange(selectedValues);
                        }}
                        className={`react-select-container ${
                          errors.standardCategoryNames
                            ? "react-select--error"
                            : ""
                        }`}
                        classNamePrefix="react-select"
                      />
                    )}
                  />
                  {errors.standardCategoryNames && (
                    <p className="mt-1 text-sm text-error">
                      {errors.standardCategoryNames.message}
                    </p>
                  )}
                </div>

                {/* Featured Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Featured Categories (Max 3)
                  </label>
                  <Controller
                    name="featuredCategoryNames"
                    control={control}
                    rules={{
                      validate: (value) => {
                        return (
                          (value && value.length <= 3) ||
                          "You can select a maximum of 3 featured categories."
                        );
                      },
                    }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        isMulti
                        options={allFeaturedCategories.map((cat) => ({
                          value: cat.name,
                          label: cat.name,
                        }))}
                        value={
                          field.value?.map((name) => ({
                            value: name,
                            label: name,
                          })) || []
                        }
                        onChange={(selectedOptions) => {
                          field.onChange(
                            selectedOptions.map((opt) => opt.value)
                          );
                        }}
                        className={`react-select-container ${
                          errors.featuredCategoryNames
                            ? "react-select--error"
                            : ""
                        }`}
                        classNamePrefix="react-select"
                      />
                    )}
                  />
                  {errors.featuredCategoryNames && (
                    <p className="mt-1 text-sm text-error">
                      {errors.featuredCategoryNames.message}
                    </p>
                  )}
                </div>

                {/* Language (moved to column 3) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    {...register("language")}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-primary focus:border-primary"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Third Row - Release Date, Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Release Date (moved from column 3 of previous row) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release Date*
                  </label>
                  <input
                    type="date"
                    {...register("releaseDate", { required: "Required" })}
                    className={`w-full rounded-md border ${
                      errors.releaseDate ? "border-red-500" : "border-gray-300"
                    } p-2 focus:ring-primary focus:border-primary`}
                  />
                  {errors.releaseDate && (
                    <p className="mt-1 text-sm text-error">
                      {errors.releaseDate.message}
                    </p>
                  )}
                </div>
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
                      } p-2 focus:ring-primary focus:border-primary`}
                    />
                  </div>
                  {errors.pricePkr && (
                    <p className="mt-1 text-sm text-error">
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
                      } p-2 focus:ring-primary focus:border-primary`}
                    />
                  </div>
                  {errors.priceUsd && (
                    <p className="mt-1 text-sm text-error">
                      {errors.priceUsd.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Fourth Row - Discount, Content Restriction & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register("discountType")}
                      className="w-1/3 rounded-md border border-gray-300 p-2 focus:ring-primary focus:border-primary"
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
                      } p-2 focus:ring-primary focus:border-primary`}
                    />
                  </div>
                  {errors.discountValue && (
                    <p className="mt-1 text-sm text-error">
                      {errors.discountValue.message}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    Discounted Price: ₨
                    {watch("discountedPricePkr")?.toFixed(2) || "0.00"}
                  </p>
                </div>

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
                    } p-2 focus:ring-primary focus:border-primary`}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Pages visible to unauthorized users
                  </p>
                  {errors.contentRestriction && (
                    <p className="mt-1 text-sm text-error">
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
                    <select
                      className="w-full h-10 p-2 shadow-sm bg-secondary-light border border-gray-300 rounded-lg focus:border-primary text-black placeholder:italic"
                      value={selectedTagOption}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTagOption(e.target.value);
                        setValue("tag", value === "custom" ? "" : value); // Ensure 'tag' field is updated
                      }}
                    >
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                      <option key="custom" value="custom">
                        Custom
                      </option>
                    </select>
                    {selectedTagOption === "custom" && (
                      <input
                        type="text"
                        {...register("tag")} // Register 'tag' here
                        className={`w-full rounded-md border ${
                          errors.tag ? "border-red-500" : "border-gray-300"
                        } p-2 focus:ring-primary focus:border-primary`}
                        placeholder="Write any custom tag"
                      />
                    )}
                  </div>
                  {errors.tag && (
                    <p className="mt-1 text-sm text-error">
                      {errors.tag.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Fifth Row - Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Keywords */}
                <div className="md:col-span-3">
                  {" "}
                  {/* Span all columns */}
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
                    } p-2 focus:ring-primary focus:border-primary`}
                    placeholder="e.g. science, fiction, AI"
                  />
                  {/* Keywords badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map((keyword, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-primary text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="ml-1 text-primary hover:text-primary-dark"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  rows={5}
                  {...register("description", { required: "Required" })}
                  className={`w-full rounded-md border ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  } p-2 focus:ring-primary focus:border-primary`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-error">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Seventh Row - Cover Image */}
              <ImageUploader
                label="Book Cover*"
                previewUrl={previews.cover}
                onFileChange={(file) => handleImageUpload(file, "coverImage")}
                error={fileUploadErrors.coverImage}
              />

              {/* Eighth Row - Book Content (Text) */}
              {errors.content && (
                <p className="mt-3 text-md text-end text-error">
                  {errors.content.message}
                </p>
              )}
              <AddBookContent
                content={watch("content")}
                setContent={(cb) => setValue("content", cb(watch("content")))}
              />

              {/* Front Page and Back Page --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploader
                  label="Front Page"
                  previewUrl={previews.frontPage}
                  onFileChange={(file) =>
                    handleImageUpload(file, "frontPageImage")
                  }
                  error={fileUploadErrors.frontPageImage}
                />
                <ImageUploader
                  label="Back Page"
                  previewUrl={previews.backPage}
                  onFileChange={(file) =>
                    handleImageUpload(file, "backPageImage")
                  }
                  error={fileUploadErrors.backPageImage}
                />
              </div>

              {/* Status and Featured toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Footer with Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t pb-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-grey-500 rounded-md shadow-sm text-sm font-medium text-primary hover:bg-grey-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary disabled:bg-grey-600 disabled:cursor-not-allowed hover:bg-warning"
                >
                  {submitState}
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
