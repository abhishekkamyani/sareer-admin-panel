import { useState, useEffect } from "react";
import {
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Modal,
  Space,
  message,
  Popconfirm,
  Form,
  Tag,
} from "antd";
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
// import { csvExport } from "../utils/export";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editForm] = Form.useForm();

  // Fetch users from Firestore
  const fetchUsers = () => {
    setLoading(true);

    // Start with base collection reference
    let q = collection(db, "Users");

    // Apply filters if they exist
    const conditions = [];
    if (statusFilter) {
      conditions.push(where("status", "==", statusFilter));
    }
    if (dateRange?.[0] && dateRange?.[1]) {
      conditions.push(
        where("registrationDate", ">=", dateRange[0].startOf("day").toDate()),
        where("registrationDate", "<=", dateRange[1].endOf("day").toDate())
      );
    }

    // Apply sorting
    // conditions.push(orderBy("registrationDate", "desc"));

    // Combine all conditions
    q = query(q, ...conditions);

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("querySnapshot.docs", querySnapshot.docs);
        
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          registrationDate: doc.data().registrationDate?.toDate() || new Date(),
        }));
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };  

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [statusFilter, dateRange]);

  console.log("users", users);


  // Apply search filter
  useEffect(() => {
    if (searchText) {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchText, users]);

  // Handle table change (pagination, sorting)
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
    // You could add sorting logic here if needed
  };

  // Edit user
  const handleEdit = (user) => {
    setCurrentUser(user);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      status: user.status,
    });
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await updateDoc(doc(db, "users", currentUser.id), values);
      message.success("User updated successfully");
      fetchUsers();
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating user:", error);
      message.error("Failed to update user");
    }
  };

  // Delete user
  const handleDelete = async (userId) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      message.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      message.error("Failed to delete user");
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      { label: "Username", key: "username" },
      { label: "Email", key: "email" },
      { label: "Registration Date", key: "registrationDate" },
      { label: "Status", key: "status" },
      { label: "Books Purchased", key: "booksPurchased" },
    ];

    // csvExport({
    //   data: filteredUsers,
    //   headers,
    //   filename: "users_export.csv",
    // });
  };

  // Table columns
  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: "Registration Date",
      dataIndex: "registrationDate",
      key: "registrationDate",
      sorter: (a, b) =>
        new Date(a.registrationDate) - new Date(b.registrationDate),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
        { text: "Banned", value: "banned" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = "";
        switch (status) {
          case "active":
            color = "green";
            break;
          case "inactive":
            color = "orange";
            break;
          case "banned":
            color = "red";
            break;
          default:
            color = "gray";
        }
        return <Tag color={color}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Books Purchased",
      dataIndex: "booksPurchased",
      key: "booksPurchased",
      sorter: (a, b) => a.booksPurchased - b.booksPurchased,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Search by username or email"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div>
            <Select
              placeholder="Filter by status"
              style={{ width: "100%" }}
              onChange={setStatusFilter}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </div>

          <div>
            <RangePicker
              style={{ width: "100%" }}
              placeholder={["Start Date", "End Date"]}
              onChange={setDateRange}
              disabledDate={(current) =>
                current && current > dayjs().endOf("day")
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* User Table */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `Total ${total} users`,
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        visible={editModalVisible}
        onOk={saveEdit}
        onCancel={() => setEditModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please input username!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please input email!" },
              { type: "email", message: "Please input valid email!" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Please select status!" }]}
          >
            <Select>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
