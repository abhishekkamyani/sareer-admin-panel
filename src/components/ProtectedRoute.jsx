import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader } from "./Loader"; // Assuming you have a loader component

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth(); // Destructure loading from the context

  console.log("====Loading====", loading);
  // 1. If the auth state is still loading, show a loading indicator.
  // This prevents any premature redirects.
  if (loading) {
    
    return <Loader />; // Or any other loading component/spinner
  }

  // 2. Once loading is false, check if the user is the authenticated admin.
  // This logic runs only after the initial auth check is complete.
  if (
    !currentUser ||
    !currentUser?.email ||
    currentUser?.email !== import.meta.env.VITE_FIREBASE_ADMIN_EMAIL
  ) {
    // If not the admin, redirect to the sign-in page.
    return <Navigate to="/signin" replace />;
  }

  // 3. If the user is the authenticated admin, render the requested page.
  return children;
}
