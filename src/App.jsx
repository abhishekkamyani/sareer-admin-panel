// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
// import { Dashboard } from "./pages/Dashboard";
// import { BookManagement } from "./pages/BookManagement";
// // import Settings from './pages/Settings';
// // Import other pages as needed

// function App() {
//   return (
//     <Router>
//       <Layout>
//         <Routes>
//           <Route path="/" element={<Dashboard />} />
//           <Route path="/book-management" element={<BookManagement />} />
//           <Route path="*" element={<Navigate to="/" />} />
//         </Routes>
//       </Layout>
//     </Router>
//   );
// }

// export default App;

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignIn from "./pages/SignIn";
// import AdminDashboard from "./pages/AdminDashboard";
import { Dashboard } from "./pages/Dashboard";
import { BookManagement } from "./pages/BookManagement";
import { UserManagement } from "./pages/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public route - without Layout */}
          <Route path="/signin" element={<SignIn />} />

          {/* Protected admin routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout /> {/* Layout wrapper for all admin routes */}
              </ProtectedRoute>
            }
          >
            {/* These routes will be rendered inside the Layout */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="book-management" element={<BookManagement />} />
            <Route path="user-management" element={<UserManagement />} />
            {/* <Route path="settings" element={<Settings />} /> */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>

          {/* Catch-all route that redirects to signin */}
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
export default App;
