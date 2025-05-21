import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  ReceiptPercentIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { NotificationFilled } from '@ant-design/icons';

const Sidebar = ({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Book Management', href: 'book-management', icon: BookOpenIcon },
    { name: 'Users', href: '/user-management', icon: UsersIcon },
    { name: 'Notifications', href: '/notifications', icon: NotificationFilled },
    { name: 'Orders', href: '/orders', icon: ReceiptPercentIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`inset-y-0 rounded-md bg-white shadow-lg transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-54'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-indigo-600">
          {!isCollapsed && (
            <h1 className="text-white text-xl font-semibold">Admin Panel</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-white hover:bg-indigo-500 focus:outline-none"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-6 w-6" />
            ) : (
              <ChevronLeftIcon className="h-6 w-6" />
            )}
          </button>
        </div>
        
        <nav className="mt-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-sm font-medium ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50 border-r-4 border-indigo-600'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-6 w-6 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;