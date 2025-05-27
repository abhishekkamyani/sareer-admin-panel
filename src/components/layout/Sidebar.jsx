import { NavLink, useLocation } from "react-router-dom";
import { Layout, Menu, Button, Typography, Grid } from "antd";
import {
  HomeOutlined,
  UserOutlined,
  ShoppingOutlined,
  NotificationOutlined,
  BookOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { SellOutlined } from "@mui/icons-material";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const location = useLocation();
  const screens = useBreakpoint();

  const isMobile = !screens.lg;

  const navigation = [
    { name: "Dashboard", href: "/", icon: HomeOutlined },
    { name: "Book Management", href: "/book-management", icon: BookOutlined },
    { name: "Users", href: "/user-management", icon: UserOutlined },
    {
      name: "Notifications",
      href: "/notifications",
      icon: NotificationOutlined,
    },
    { name: "Sales", href: "/sales", icon: SellOutlined },
    { name: "Orders", href: "/orders", icon: ShoppingOutlined },
    { name: "Settings", href: "/settings", icon: SettingOutlined },
  ];

  const selectedKeys = navigation
    .filter((item) => location.pathname === item.href)
    .map((item) => item.href);

  return (
    <div style={{ minHeight: "100vh" }} className="static w-fit !overflow-x-hidden">
      {/* Sidebar - Only visible on desktop by default */}
      {!isMobile && (
        <Sider
          width={220}
          collapsedWidth={80}
          collapsible
          collapsed={isCollapsed}
          trigger={null}
          style={{
            background: "#fff",
            boxShadow: "2px 0 8px 0 rgba(29,35,41,0.05)",
            position: "static",
            height: "100vh",
            zIndex: 10,
          }}
        >
          <div className="flex items-center justify-between h-16 px-4 bg-primary text-white">
            {!isCollapsed && (
              <Text strong className="!text-white text-lg">
                Admin Panel
              </Text>
            )}
            <Button
              type="text"
              icon={isCollapsed ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="!text-white hover:!bg-primary-dark"
            />
          </div>

          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            style={{ height: "calc(100vh - 64px)", overflowY: "auto" }}
            theme="light"
            className="!text-primary"
          >
            {navigation.map((item) => (
              <Menu.Item
                key={item.href}
                icon={<item.icon />}
                style={{
                  color: selectedKeys.includes(item.href) ? "#012C17" : "#555",
                  backgroundColor: selectedKeys.includes(item.href)
                    ? "#e6f7ff"
                    : "transparent",
                }}
              >
                <NavLink to={item.href}>{item.name}</NavLink>
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar - Only appears when toggled */}
      {isMobile && (
        <Sider
          width={220}
          // collapsedWidth={0}
          // collapsible
          // collapsed={!sidebarOpen}
          trigger={null}
          style={{
            background: "#fff",
            position: "fixed",
            height: "100vh",
            overflowX: "hidden",
            zIndex: 20,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.2s ease-in-out",
          }}
        >
          <div className="flex items-center justify-between h-16 px-4 bg-primary !overflow-x-hidden">
            <Text strong className="!text-white text-lg">
              Admin Panel
            </Text>
            {sidebarOpen && (
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:bg-blue-500"
              />
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            style={{ height: "calc(100vh - 64px)", overflowY: "auto" }}
            theme="light"
          >
            {navigation.map((item) => (
              <Menu.Item
                key={item.href}
                icon={<item.icon />}
                style={{
                  color: selectedKeys.includes(item.href) ? "#012C17" : "#555",
                  backgroundColor: selectedKeys.includes(item.href)
                    ? "#e6f7ff"
                    : "transparent",
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <NavLink to={item.href}>{item.name}</NavLink>
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
      )}

      {/* Main content area with proper spacing */}
    </div>
  );
};

export default Sidebar;
