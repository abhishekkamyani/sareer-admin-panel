import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (currentUser?.email !== import.meta.env.VITE_FIREBASE_ADMIN_EMAIL) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}