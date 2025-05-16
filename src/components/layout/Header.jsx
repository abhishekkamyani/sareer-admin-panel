import { useState } from 'react';
import { Bars3Icon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          className="lg:hidden text-gray-500 focus:outline-none"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        
        {/* Search and profile */}
        <div className="flex items-center space-x-4">
          <button className="p-1 text-gray-400 hover:text-gray-500 focus:outline-none">
            <BellIcon className="h-6 w-6" />
          </button>
          
          <div className="relative">
            <button
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="hidden md:inline text-sm font-medium text-gray-700">Admin User</span>
            </button>
            
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Your Profile
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;