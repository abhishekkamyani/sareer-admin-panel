import ReactDOM from "react-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { XMarkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import PerfectScrollbar from "react-perfect-scrollbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../../utils/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { Loader } from "../Loader";

// Define the API functions for coupons
const fetchCoupons = async () => {
  const snapshot = await getDocs(collection(db, "coupons"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    expiryDate: doc.data().expiryDate?.toDate(),
  }));
};

const addCoupon = async (newCoupon) => {
  const docRef = await addDoc(collection(db, "coupons"), {
    ...newCoupon,
    expiryDate: newCoupon.expiryDate
      ? Timestamp.fromDate(new Date(newCoupon.expiryDate))
      : null,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...newCoupon };
};

const updateCoupon = async ({ id, ...updatedData }) => {
  const couponRef = doc(db, "coupons", id);
  await updateDoc(couponRef, {
    ...updatedData,
    expiryDate: updatedData.expiryDate
      ? Timestamp.fromDate(new Date(updatedData.expiryDate))
      : null,
    updatedAt: serverTimestamp(),
  });
  return { id, ...updatedData };
};

const deleteCoupon = async (id) => {
  await deleteDoc(doc(db, "coupons", id));
  return id;
};

export const CouponManagementModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [editingCouponId, setEditingCouponId] = useState(null);

  const {
    data: coupons,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["coupons"],
    queryFn: fetchCoupons,
    refetchOnWindowFocus: false,
  });

  const addCouponMutation = useMutation({
    mutationFn: addCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries(["coupons"]);
      toast.success("Coupon added successfully!");
      reset(); // Reset form after successful submission
      setEditingCouponId(null);
    },
    onError: (error) => {
      toast.error(`Failed to add coupon: ${error.message}`);
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: updateCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries(["coupons"]);
      toast.success("Coupon updated successfully!");
      reset(); // Reset form after successful update
      setEditingCouponId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update coupon: ${error.message}`);
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries(["coupons"]);
      toast.success("Coupon deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete coupon: ${error.message}`);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      code: "",
      discountType: "percentage",
      discountValue: 0,
      expiryDate: "",
      isActive: true,
    },
  });

  const handleClearForm = () => {
    reset({
      code: "",
      discountType: "percentage",
      discountValue: 0,
      expiryDate: "",
      isActive: true,
    });
    setEditingCouponId(null); // Optional: also clear the editing state
  };

  useEffect(() => {
    if (editingCouponId) {
      const couponToEdit = coupons.find((c) => c.id === editingCouponId);
      if (couponToEdit) {
        reset({
          code: couponToEdit.code,
          discountType: couponToEdit.discountType,
          discountValue: couponToEdit.discountValue,
          expiryDate: couponToEdit.expiryDate
            ? dayjs(couponToEdit.expiryDate).format("YYYY-MM-DD")
            : "",
          isActive: couponToEdit.isActive,
        });
      }
    } else {
      handleClearForm();
    }
  }, [editingCouponId, coupons, reset]);

  const onSubmit = (data) => {
    if (editingCouponId) {
      updateCouponMutation.mutate({ id: editingCouponId, ...data });
    } else {
      addCouponMutation.mutate(data);
    }
  };

  const handleEdit = (coupon) => {
    setEditingCouponId(coupon.id);
  };

  const handleCancel = () => {
    setEditingCouponId(null);
    handleClearForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      deleteCouponMutation.mutate(id);
    }
  };

  const handleExpire = (coupon) => {
    if (window.confirm("Are you sure you want to expire this coupon?")) {
      updateCouponMutation.mutate({ ...coupon, isActive: false });
    }
  };

  if (!isOpen) return null;

  const isFormLoading =
    addCouponMutation.isPending ||
    updateCouponMutation.isPending ||
    deleteCouponMutation.isPending;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="h-full w-full absolute bg-gray-700 opacity-80"></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Manage Checkout Coupons
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 h-[85%] flex flex-col md:flex-row gap-6">
          {/* Coupon Form */}
          <div className="md:w-1/3">
            <h4 className="text-md font-semibold text-gray-700 mb-4">
              {editingCouponId ? "Edit Coupon" : "Add New Coupon"}
            </h4>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  {...register("code", { required: "Required" })}
                  className={`w-full rounded-md border ${
                    errors.code ? "border-red-500" : "border-gray-300"
                  } p-2`}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-error">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    {...register("discountType")}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (PKR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("discountValue", {
                      required: "Required",
                      min: { value: 0, message: "Must be ≥ 0" },
                    })}
                    className={`w-full rounded-md border ${
                      errors.discountValue
                        ? "border-red-500"
                        : "border-gray-300"
                    } p-2`}
                  />
                  {errors.discountValue && (
                    <p className="mt-1 text-sm text-error">
                      {errors.discountValue.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  {...register("expiryDate")}
                  className="w-full rounded-md border border-gray-300 p-2"
                />
              </div>

              {/* Is Active */}
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  {...register("isActive")}
                  className="h-4 w-4 text-primary rounded border-gray-300"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Is Active
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isFormLoading}
                  className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary disabled:bg-gray-400 hover:bg-warning"
                >
                  {editingCouponId ? "Update Coupon" : "Add Coupon"}
                </button>
                {editingCouponId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Coupon List */}
          <div className="md:w-2/3 flex-1 flex flex-col">
            <h4 className="text-md font-semibold text-gray-700 mb-4">
              All Coupons
            </h4>
            <div className="relative flex-1">
              {isLoading && <Loader />}
              <PerfectScrollbar>
                <div className="space-y-4">
                  {coupons?.length > 0 ? (
                    coupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        className="p-4 border rounded-md flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">
                            {coupon.code}
                            <span
                              className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${
                                coupon.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {coupon.isActive ? "Active" : "Expired"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% off`
                              : `PKR ${coupon.discountValue} off`}
                          </div>
                          {coupon.expiryDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Expires:{" "}
                              {dayjs(coupon.expiryDate).format("MMMM DD, YYYY")}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(coupon)}
                            className="text-gray-400 hover:text-primary p-2"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon.id)}
                            className="text-gray-400 hover:text-red-500 p-2"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500">
                      No coupons found.
                    </p>
                  )}
                </div>
              </PerfectScrollbar>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("root")
  );
};
