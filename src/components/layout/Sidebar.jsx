import { NavLink, useLocation } from 'react-router-dom';
import { 
  Layout, 
  Menu, 
  Button, 
  Typography, 
  Grid 
} from 'antd';
import { 
  HomeOutlined,
  UserOutlined,
  ShoppingOutlined,
  NotificationOutlined,
  BookOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const Sidebar = ({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeOutlined },
    { name: 'Book Management', href: '/book-management', icon: BookOutlined },
    { name: 'Users', href: '/user-management', icon: UserOutlined },
    { name: 'Notifications', href: '/notifications', icon: NotificationOutlined },
    { name: 'Orders', href: '/orders', icon: ShoppingOutlined },
    { name: 'Settings', href: '/settings', icon: SettingOutlined },
  ];

  // Get the current path and find matching navigation item
  const selectedKeys = navigation
    .filter(item => location.pathname === item.href)
    .map(item => item.href);

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sider
        width={220}
        collapsedWidth={isMobile ? 0 : 80}
        collapsible
        collapsed={isMobile ? !sidebarOpen : isCollapsed}
        trigger={null}
        className="bg-white shadow-lg fixed h-full z-20"
        style={{
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-blue-600">
          {!(isMobile ? !sidebarOpen : isCollapsed) && (
            <Text strong className="text-white text-lg">Admin Panel</Text>
          )}
          <Button
            type="text"
            icon={isMobile ? 
              (sidebarOpen ? <LeftOutlined /> : <RightOutlined />) : 
              (isCollapsed ? <RightOutlined /> : <LeftOutlined />)
            }
            onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-blue-500"
          />
        </div>

        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}
          theme="light"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Menu.Item 
                key={item.href} 
                icon={<Icon className="text-lg" />}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <NavLink to={item.href}>
                  {!(isMobile ? !sidebarOpen : isCollapsed) && item.name}
                </NavLink>
              </Menu.Item>
            );
          })}
        </Menu>
      </Sider>
    </>
  );
};

export default Sidebar;