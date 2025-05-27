import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - now part of the flex layout */}
      {/* <div className="w-fit"> */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      {/* </div> */}

      {/* Main content area */}
      <div className="flex-1 lg:ml-8 flex flex-col overflow-hidden">
        {/* Header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        {/* Main content - adjusts width based on sidebar state */}
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className={`mx-auto transition-all duration-200`}>
            <div className="w-full mx-auto">
              {children || <Outlet />}
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;