import { useState, useEffect, useRef } from "react";
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
  BookOutlined,
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
import { useQuery } from "@tanstack/react-query";
import { fetchBooks } from "../utils";
import { utils, writeFile } from "xlsx";

const { RangePicker } = DatePicker;
const { Option } = Select;

// const formattedDate = dayjs(user.registrationDate).format(
//   "YYYY-MM-DD HH:mm:ss"
// );

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
  const [booksModallVisible, setBooksModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editForm] = Form.useForm();
  const tableRef = useRef();

  const showBooksModal = (user) => {
    setCurrentUser(user);
    setBooksModalVisible(true);
  };

  const {
    data: booksData,
    isLoading: booksLoading,
    error,
  } = useQuery({
    queryKey: ["books"],
    queryFn: fetchBooks,
    refetchOnWindowFocus: false,
  });

  const getBookName = (bookId) => {
    const book = booksData.find((b) => b.id === bookId);
    return book?.name || "Unknown Book";
  };

  // Fetch users from Firestore
  const fetchUsers = () => {
    setLoading(true);

    // Start with base collection reference
    let q = collection(db, "users");

    // Apply filters if they exist
    const conditions = [];
    if (statusFilter) {
      conditions.push(where("status", "==", statusFilter));
    }
    if (dateRange && dateRange?.[0] && dateRange?.[1]) {
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
          lastLogin: doc.data().lastLogin?.toDate() || new Date(),
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

  const handleExport = () => {
    const filteredData = filteredUsers;

    // Prepare data for export
    const exportData = filteredData.map((item) => ({
      Email: item.email,
      Username: item.username,
      "Registration Date": new Date(item.registrationDate).toLocaleDateString(),
      Status: item.status,
      "Last Login": new Date(item.lastLogin).toLocaleDateString(),
      "Books Purchased": item.purchasedBooks?.length || 0,
      "Purchased Titles":
        item.purchasedBooks
          ?.map((book) => {
            const bookData = booksData.find((b) => b.id === book.bookId);
            return bookData?.name || "Unknown Book";
          })
          .join(", ") || "None",
      // Add other fields as needed
    }));

    // Create worksheet
    const ws = utils.json_to_sheet(exportData);

    // Create workbook
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Users");

    // Export to CSV
    writeFile(
      wb,
      "users_export_${new Date().toISOString().split('T')[0]}.csv",
      {
        bookType: "csv",
      }
    );
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
      render: (date) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      sorter: (a, b) => {
        const aTime = a.registrationDate?.getTime?.() || 0;
        const bTime = b.registrationDate?.getTime?.() || 0;
        return aTime - bTime;
      },
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
      dataIndex: "purchasedBooks",
      key: "purchasedBooks",
      render: (books, record) =>
        books?.length > 0 ? (
          <Button
            type="primary"
            shape="round"
            icon={<BookOutlined />}
            onClick={() => showBooksModal(record)}
          >
            {books.length}
          </Button>
        ) : (
          <Tag color="default">No purchases</Tag>
        ),
      sorter: (a, b) =>
        (a.purchasedBooks?.length || 0) - (b.purchasedBooks?.length || 0),
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
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">User Management</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-grey-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Input
              placeholder="Search by username or email"
              prefix={<SearchOutlined className="!text-grey-500" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="hover:!border-primary focus:!border-primary"
            />
          </div>

          <div>
            <Select
              placeholder="Filter by status"
              className="!w-full"
              onChange={setStatusFilter}
              allowClear
              suffixIcon={<FilterOutlined className="!text-grey-500" />}
              dropdownClassName="![&_.ant-select-item]:hover:bg-primary-light ![&_.ant-select-item-option-selected]:bg-primary-light"
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </div>

          <div>
            <RangePicker
              className="!w-full hover:!border-primary focus:!border-primary ![&_.ant-picker-input>input]:placeholder-grey-400"
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
              className="!bg-success hover:!bg-primary !border-primary hover:!border-primary-dark"
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg shadow border border-grey-200 overflow-hidden">
        <Table
          ref={tableRef}
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => (
              <span className="text-grey-600">Total {total} users</span>
            ),
          }}
          onChange={handleTableChange}
          scroll={{ x: true }}
          className="![&_.ant-table-thead>tr>th]:!bg-grey-50 ![&_.ant-table-tbody>tr:hover>td]:!bg-primary-light"
        />
      </div>

      {/* Edit Modal */}
      <Modal
        title={<span className="!text-primary">Edit User</span>}
        visible={editModalVisible}
        onOk={saveEdit}
        onCancel={() => setEditModalVisible(false)}
        confirmLoading={loading}
        okButtonProps={{
          className:
            "!bg-primary hover:!bg-primary-dark !border-primary hover:!border-primary-dark",
        }}
        cancelButtonProps={{
          className:
            "hover:!text-primary !border-grey-300 hover:!border-primary",
        }}
        bodyStyle={{ padding: "24px" }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="username"
            label={<span className="!text-grey-700">Username</span>}
            rules={[{ required: true, message: "Please input username!" }]}
          >
            <Input className="hover:!border-primary focus:!border-primary" />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span className="!text-grey-700">Email</span>}
            rules={[
              { required: true, message: "Please input email!" },
              { type: "email", message: "Please input valid email!" },
            ]}
          >
            <Input className="hover:!border-primary focus:!border-primary" />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span className="!text-grey-700">Status</span>}
            rules={[{ required: true, message: "Please select status!" }]}
          >
            <Select
              className="hover:!border-primary focus:!border-primary"
              dropdownClassName="![&_.ant-select-item]:hover:!bg-primary-light ![&_.ant-select-item-option-selected]:!bg-primary-light"
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`Purchased Books - ${currentUser?.username}`}
        visible={booksModallVisible}
        onCancel={() => setBooksModalVisible(false)}
        footer={null}
        cancelText="Close"
        width={800}
      >
        {currentUser?.purchasedBooks?.length ? (
          <Table
            columns={[
              {
                title: "Book ID",
                dataIndex: "bookId",
                key: "bookId",
              },
              {
                title: "Book Name",
                dataIndex: "bookId",
                key: "bookName",
                render: (bookId) => getBookName(bookId),
              },
              {
                title: "Purchase Date",
                dataIndex: "purchaseDate",
                key: "purchaseDate",
                // render: (date) => new Date(date).toLocaleString(),
                render: (date) =>
                  dayjs(date?.toDate()).format("YYYY-MM-DD HH:mm:ss"),
              },
              {
                title: "Price Paid",
                dataIndex: "pricePaid",
                key: "pricePaid",
                render: (price) => `₨${price.toLocaleString()}`,
              },
              {
                title: "Payment Method",
                dataIndex: "paymentMethod",
                key: "paymentMethod",
              },
            ]}
            dataSource={currentUser.purchasedBooks}
            rowKey="bookId"
            pagination={false}
          />
        ) : (
          <p>No books purchased yet</p>
        )}
      </Modal>
    </div>
  );
};
