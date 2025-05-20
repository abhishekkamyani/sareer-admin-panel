import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (currentUser?.email !== "abhishekkamyani@gmail.com") {
    return <Navigate to="/signin" replace />;
  }

  return children;
}