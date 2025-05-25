import { useState } from 'react';
import { 
  Button, 
  Dropdown, 
  Menu, 
  Avatar, 
  Badge, 
  Popconfirm,
  message,
  Layout,
  Space,
  Grid
} from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  BellOutlined, 
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { adminLogout } from '../../utils/firebase';

const { Header } = Layout;
const { useBreakpoint } = Grid;

const AppHeader = ({ sidebarOpen, setSidebarOpen }) => {
  const screens = useBreakpoint();
  const isLargeScreen = screens.lg; // true when screen is lg or larger

  const handleLogout = async () => {
    try {
      await adminLogout();
      message.success('Logged out successfully');
    } catch (error) {
      message.error('Error logging out');
      console.error('Logout error:', error);
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="logout" className='!bg-error !text-white'>
        <Popconfirm
          title="Are you sure you want to logout?"
          onConfirm={handleLogout}
          okText="Yes"
          cancelText="No"
        >
          <Space>
            <LogoutOutlined />
            <span>Sign out</span>
          </Space>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  return (
    <Header style={{ 
      background: '#fff',
      padding: '10px 24px',
      boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
      display: 'flex',
      justifyContent: !isLargeScreen ? 'space-between' : "end",
      alignItems: 'center'
    }}>
      {/* Sidebar toggle button - hidden on lg screens and larger */}
      {!isLargeScreen && (
        <Button
          type="text"
          icon={sidebarOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ marginLeft: -16 }}
        />
      )}
      
      {/* Right side icons */}
      <Space size="middle">
        <Badge count={5}>
          <Button 
            type="text" 
            icon={<BellOutlined />}
          />
        </Badge>
        
        <Dropdown overlay={menu} trigger={['click']}>
          <Space style={{ cursor: 'pointer', padding: '4px 8px' }}>
            <Avatar icon={<UserOutlined />} />
            <span>Admin</span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default AppHeader;