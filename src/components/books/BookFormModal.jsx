import ReactDOM from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Select from "react-select";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { AddBookContent } from "./AddBookContent";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { fetchBook } from "../../utils/APIs";
import { Loader } from "../Loader";

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
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600 justify-center">
            <label
              htmlFor={label.toLowerCase().replace(/\s+/g, "-")}
              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
            >
              <span>Upload a file</span>
              <input
                id={label.toLowerCase().replace(/\s+/g, "-")}
                name={label.toLowerCase().replace(/\s+/g, "-")}
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
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export const BookFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingBookId,
  categories,
  isLoading,
}) => {
  const { data: initialData, isLoading: initialDataLoading } = useQuery({
    queryKey: ["book", editingBookId],
    queryFn: () => fetchBook(editingBookId),
    enabled: !!editingBookId,
    refetchOnWindowFocus: false,
  });

  console.log("editingBookId", editingBookId);
  console.log("initialData", initialData);

  const allStandardCategories =
    categories?.filter((cat) => cat.type === "standard") || [];
  const allFeaturedCategories =
    categories?.filter((cat) => cat.type === "featured") || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      content: [],
      standardCategoryNames: [],
      featuredCategoryNames: [],
      keywords: [],
    },
  });

  const [previews, setPreviews] = useState({
    cover: null,
    frontPage: null,
    backPage: null,
  });
  const [fileUploadErrors, setFileUploadErrors] = useState({});
  const [selectedTagOption, setSelectedTagOption] = useState("custom");
  const lastLoadedBookIdRef = useRef(null);

  useEffect(() => {
    if (
      editingBookId &&
      initialData &&
      initialData.id !== lastLoadedBookIdRef.current
    ) {
      const formattedData = {
        ...initialData,
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
        couponCode: initialData.coupon?.code || "",
        couponDiscountPercentage: Number(
          initialData.coupon?.discountPercentage || 0
        ),
        standardCategoryNames: initialData.standardCategoryNames || [],
        featuredCategoryNames: initialData.featuredCategoryNames || [],
        content: initialData.content || [],
        tag: initialData.tag || "",
      };
      reset(formattedData);
      setPreviews({
        cover: initialData.coverUrl,
        frontPage: initialData.frontPageUrl,
        backPage: initialData.backPageUrl,
      });
      setSelectedTagOption(
        initialData.tag && availableTags.includes(initialData.tag)
          ? initialData.tag
          : "custom"
      );
      lastLoadedBookIdRef.current = initialData.id;
    } else if (!editingBookId && lastLoadedBookIdRef.current !== null) {
      reset({
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
        status: "published",
        couponCode: "",
        couponDiscountPercentage: 0,
      });
      setPreviews({ cover: null, frontPage: null, backPage: null });
      setSelectedTagOption("custom");
      lastLoadedBookIdRef.current = null;
    }
  }, [editingBookId, initialData, reset]);

  const pricePkr = watch("pricePkr");
  const discountValue = watch("discountValue");
  const discountType = watch("discountType");

  useEffect(() => {
    const pkr = parseFloat(pricePkr) || 0;
    const val = parseFloat(discountValue) || 0;
    const discountAmount =
      discountType === "percentage" ? (pkr * val) / 100 : val;
    setValue("discountedPricePkr", pkr - discountAmount);
  }, [pricePkr, discountValue, discountType, setValue]);

  const handleImageUpload = (file, fieldName) => {
    const previewName = fieldName.replace("Image", "");
    setFileUploadErrors((prev) => ({ ...prev, [fieldName]: null }));
    if (!file) {
      setValue(fieldName, null);
      setPreviews((prev) => ({ ...prev, [previewName]: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldName]: "Please upload an image file.",
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileUploadErrors((prev) => ({
        ...prev,
        [fieldName]: "File size must be under 2MB.",
      }));
      return;
    }
    setValue(fieldName, file);
    setPreviews((prev) => ({
      ...prev,
      [previewName]: URL.createObjectURL(file),
    }));
  };

  const keywords = watch("keywords", []);

  const handleKeywordsKeyDown = (e) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value && !keywords.includes(value)) {
        setValue("keywords", [...keywords, value]);
        e.target.value = "";
      }
    }
  };

  const removeKeyword = (indexToRemove) => {
    setValue(
      "keywords",
      keywords.filter((_, index) => index !== indexToRemove)
    );
  };

  const processAndSubmit = (data) => {
    const combinedCategories = [
      ...(data.standardCategoryNames || []),
      ...(data.featuredCategoryNames || []),
    ];

    const formData = {
      ...data,
      id: editingBookId,
      categories: combinedCategories,
      coupon: {
        code: data.couponCode || null,
        discountPercentage: data.couponDiscountPercentage || 0,
      },
    };
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const submitState = isLoading
    ? editingBookId
      ? "Updating..."
      : "Saving..."
    : editingBookId
    ? "Update Book"
    : "Add Book";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-700 opacity-80"></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingBookId ? "Edit Book" : "Add New Book"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {initialDataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <Loader />
          </div>
        )}

        <div className="flex-grow overflow-hidden">
          <PerfectScrollbar options={{ suppressScrollX: true }}>
            <form
              onSubmit={handleSubmit(processAndSubmit)}
              className={`p-6 space-y-6 ${
                initialDataLoading ? "opacity-50" : ""
              }`}
            >
              {/* --- Row 1: Book Info --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Name*
                  </label>
                  <input
                    {...register("name", {
                      required: "Book name is required.",
                    })}
                    className="w-full form-input"
                  />
                  {errors.name && (
                    <p className="form-error">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Writer*
                  </label>
                  <input
                    {...register("writer", {
                      required: "Writer name is required.",
                    })}
                    className="w-full form-input"
                  />
                  {errors.writer && (
                    <p className="form-error">{errors.writer.message}</p>
                  )}
                </div>
              </div>

              {/* --- Row 2: Categories & Language --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        options={allStandardCategories.map((c) => ({
                          value: c.name,
                          label: c.name,
                        }))}
                        value={field.value.map((v) => ({ value: v, label: v }))}
                        onChange={(selected) =>
                          field.onChange(selected.map((s) => s.value))
                        }
                        classNamePrefix="react-select"
                      />
                    )}
                  />
                  {errors.standardCategoryNames && (
                    <p className="form-error">
                      {errors.standardCategoryNames.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Featured Categories (Max 3)
                  </label>
                  <Controller
                    name="featuredCategoryNames"
                    control={control}
                    rules={{
                      validate: (v) =>
                        !v || v.length <= 3 || "Max 3 featured categories.",
                    }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        isMulti
                        options={allFeaturedCategories.map((c) => ({
                          value: c.name,
                          label: c.name,
                        }))}
                        value={field.value.map((v) => ({ value: v, label: v }))}
                        onChange={(selected) =>
                          field.onChange(selected.map((s) => s.value))
                        }
                        classNamePrefix="react-select"
                      />
                    )}
                  />
                  {errors.featuredCategoryNames && (
                    <p className="form-error">
                      {errors.featuredCategoryNames.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    {...register("language")}
                    className="w-full form-input"
                  >
                    <option>English</option>
                    <option>Urdu</option>
                  </select>
                </div>
              </div>

              {/* --- Row 3: Date & Pricing --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release Date*
                  </label>
                  <input
                    type="date"
                    {...register("releaseDate", {
                      required: "Release date is required.",
                    })}
                    className="w-full form-input"
                  />
                  {errors.releaseDate && (
                    <p className="form-error">{errors.releaseDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (PKR)*
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    {...register("pricePkr", {
                      required: "PKR price is required.",
                      valueAsNumber: true,
                      min: { value: 0, message: "Must be ≥ 0" },
                    })}
                    className="w-full form-input"
                  />
                  {errors.pricePkr && (
                    <p className="form-error">{errors.pricePkr.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD)*
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("priceUsd", {
                      required: "USD price is required.",
                      valueAsNumber: true,
                      min: { value: 0, message: "Must be ≥ 0" },
                    })}
                    className="w-full form-input"
                  />
                  {errors.priceUsd && (
                    <p className="form-error">{errors.priceUsd.message}</p>
                  )}
                </div>
              </div>

              {/* --- Row 4: Discount & Coupon --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register("discountType")}
                      className="w-1/3 form-input"
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
                      className="w-2/3 form-input"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Discounted Price: ₨
                    {watch("discountedPricePkr")?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Code
                  </label>
                  <input
                    {...register("couponCode")}
                    className="w-full form-input"
                    placeholder="e.g., SAVE10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    {...register("couponDiscountPercentage", {
                      valueAsNumber: true,
                      min: { value: 0, message: "Must be ≥ 0" },
                      max: { value: 100, message: "Must be ≤ 100" },
                    })}
                    className="w-full form-input"
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              {/* --- Row 5: Restriction & Tags --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview Pages Limit*
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register("contentRestriction", {
                      required: "Limit is required.",
                      valueAsNumber: true,
                      min: { value: 0, message: "Must be ≥ 0" },
                    })}
                    className="w-full form-input"
                  />
                  {errors.contentRestriction && (
                    <p className="form-error">
                      {errors.contentRestriction.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTagOption}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTagOption(value);
                        if (value !== "custom") setValue("tag", value);
                        else setValue("tag", "");
                      }}
                      className="form-input"
                    >
                      {availableTags.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                    {selectedTagOption === "custom" && (
                      <input
                        {...register("tag")}
                        className="w-full form-input"
                        placeholder="Custom tag"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* --- Description --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  rows={4}
                  {...register("description", {
                    required: "Description is required.",
                  })}
                  className="w-full form-input"
                />
                {errors.description && (
                  <p className="form-error">{errors.description.message}</p>
                )}
              </div>

              {/* --- Book Content Section --- */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-4">
                  Book Content
                </h4>
                <AddBookContent
                  content={watch("content")}
                  setContent={(newContent) =>
                    setValue(
                      "content",
                      typeof newContent === "function"
                        ? newContent(watch("content"))
                        : newContent,
                      { shouldValidate: true }
                    )
                  }
                />
                {errors.content && (
                  <p className="form-error">{errors.content.message}</p>
                )}
              </div>

              {/* --- Image Uploaders --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ImageUploader
                  label="Book Cover*"
                  previewUrl={previews.cover}
                  onFileChange={(file) => handleImageUpload(file, "coverImage")}
                  error={fileUploadErrors.coverImage}
                />
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

              {/* --- Keywords --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  onKeyDown={handleKeywordsKeyDown}
                  className="w-full form-input"
                  placeholder="Type a keyword and press Enter"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="ml-1.5 text-indigo-500 hover:text-indigo-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- Status --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select {...register("status")} className="w-full form-input">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* --- Footer & Submit --- */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
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
