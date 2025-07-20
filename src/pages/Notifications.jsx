import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Row,
  Col,
  message,
  Modal,
  Badge,
  Spin,
} from "antd";
import {
  SendOutlined,
  HistoryOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  NotificationOutlined,
  FileImageOutlined,
  TagOutlined,
  MessageOutlined,
} from "@ant-design/icons";
// Import functions from your central API file
import { fetchBooks, fetchNotificationHistory } from "../utils/APIs"; // Corrected path
import { db } from "../utils/firebase"; // Used for recipient estimation
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, getCountFromServer } from "firebase/firestore";


const { TextArea } = Input;
const { Option } = Select;

// Component to manage and send notifications from the admin panel
export const Notifications = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [currentType, setCurrentType] = useState('');

  const functions = getFunctions();
  const sendCustomNotification = httpsCallable(functions, "sendCustomNotification");

  // Main data fetching logic, now using centralized API functions
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Use API functions to fetch data
      const [fetchedBooks, fetchedHistory] = await Promise.all([
        fetchBooks(),
        fetchNotificationHistory(),
      ]);

      setBooks(fetchedBooks);
      setNotificationHistory(fetchedHistory);
    } catch (error) {
      console.error("Error loading initial data:", error);
      message.error("Failed to load data. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Estimates the number of recipients based on the selected target audience
  const estimateRecipients = async (target) => {
    if (!target) {
      setUserCount(0);
      return;
    }
    try {
      // Updated collection name to "Users" as per your feedback
      let q = query(collection(db, "Users"), where("fcmToken", "!=", null));
      if (target === "buyers") {
        q = query(collection(db, "Users"), where("hasMadePurchase", "==", true));
      }
      const snapshot = await getCountFromServer(q);
      setUserCount(snapshot.data().count);
    } catch (error) {
      console.error("Error estimating recipients:", error);
      // Silently fail on estimation, the backend will handle the real count.
    }
  };

  const handleFormChange = (_, allValues) => {
    setCurrentType(allValues.type);
    if (allValues.target) {
      estimateRecipients(allValues.target);
    }
  };

  const handleOpenConfirmModal = () => {
    form.validateFields().then(() => setIsModalOpen(true));
  };

  const handleConfirmSubmit = async () => {
    setSending(true);
    try {
      const values = await form.getFieldsValue();
      // Restored the full payload structure to match the Cloud Function's expectations
      const payload = {
        title: values.title,
        body: values.body,
        type: values.type,
        target: values.target,
        data: { ...(values.type === 'newBook' && values.bookId && { bookId: values.bookId }) },
        ...(values.imageUrl && { imageUrl: values.imageUrl }),
      };
      
      console.log("===payload===", payload);

      const result = await sendCustomNotification(payload);
      message.success(result.data.message || `Notification job processed successfully.`);
      
      form.resetFields();
      setUserCount(0);
      loadInitialData(); // Refresh history
    } catch (error) {
      console.error("Error calling Firebase Function:", error);
      message.error(`Failed to send notification: ${error.message}`);
    } finally {
      setSending(false);
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const notificationTypes = {
      orderUpdate: "Order Update",
      newBook: "New Book",
      promotion: "Promotion",
      payment: "Payment",
      system: "System Announcement"
  };

  const targetOptions = {
      all: "All Users",
      buyers: "Users with Purchases",
  };

  const columns = [
    { title: "Title", dataIndex: "title", key: "title", width: 200, ellipsis: true },
    { title: "Body", dataIndex: "body", key: "body", ellipsis: true },
    { 
      title: "Type", 
      dataIndex: "type", 
      key: "type", 
      width: 150,
      render: (type) => <Tag color="cyan">{notificationTypes[type] || type}</Tag>
    },
    {
      title: "Sent At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (date ? new Date(date).toLocaleString() : "N/A"),
      sorter: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
      width: 200,
    },
    {
      title: "Recipients",
      dataIndex: "recipientCount",
      key: "recipientCount",
      render: (count) => (count?.toLocaleString() || "0"),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={status === "sent" ? "green" : "orange"}>{status?.toUpperCase() || "UNKNOWN"}</Tag>,
      width: 120,
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card
            title={ <span className="text-xl font-semibold flex items-center"><NotificationOutlined className="mr-2" />Compose Notification</span> }
            extra={ <Badge count={userCount} showZero overflowCount={9999}><Tag icon={<UserOutlined />} color="blue" className="text-sm">Est. ~{userCount.toLocaleString()} recipients</Tag></Badge> }
            className="shadow-lg rounded-lg"
          >
            <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
              <Form.Item name="type" label="Notification Type" rules={[{ required: true }]}>
                <Select placeholder="Select the notification category">
                  {Object.entries(notificationTypes).map(([key, value]) => (<Option key={key} value={key}>{value}</Option>))}
                </Select>
              </Form.Item>
              <Form.Item name="target" label="Target Audience" rules={[{ required: true }]}>
                <Select placeholder="Select which users to notify">
                  {Object.entries(targetOptions).map(([key, value]) => (<Option key={key} value={key}>{value}</Option>))}
                </Select>
              </Form.Item>
               <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title!" },{ max: 80, message: "Title cannot exceed 80 characters." }]}>
                <Input prefix={<TagOutlined className="site-form-item-icon" />} showCount maxLength={80} placeholder="Enter notification title" />
              </Form.Item>
              <Form.Item name="body" label="Body" rules={[{ required: true, message: "Please enter a message body!" }, { max: 250, message: "Body cannot exceed 250 characters." }]}>
                <TextArea rows={4} showCount maxLength={250} placeholder="Enter the main content of the notification..."/>
              </Form.Item>
               <Form.Item name="imageUrl" label="Image URL (Optional)">
                <Input prefix={<FileImageOutlined className="site-form-item-icon" />} placeholder="https://example.com/image.png" />
              </Form.Item>
              
              {currentType === 'newBook' && (
                <Form.Item name="bookId" label="Link to Book" rules={[{ required: true, message: "Please select a book for this notification type." }]}>
                  <Select placeholder="Select a book" showSearch optionFilterProp="children" suffixIcon={<BookOutlined />}>
                    {books.map((b) => (<Option key={b.id} value={b.id}>{b.name}</Option>))}
                  </Select>
                </Form.Item>
              )}
             
              <Form.Item>
                <Button type="primary" onClick={handleOpenConfirmModal} icon={<SendOutlined />} size="large" loading={sending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Review and Send Notification
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<span className="text-xl font-semibold flex items-center"><HistoryOutlined className="mr-2" />Notification History</span>} className="shadow-lg rounded-lg">
            <Spin spinning={loading}>
              <Table columns={columns} dataSource={notificationHistory} rowKey="id" scroll={{ x: 800 }} pagination={{ pageSize: 10, size: 'small' }} className="w-full"/>
            </Spin>
          </Card>
        </Col>
      </Row>
      <Modal
        title={<span className="font-semibold text-lg flex items-center"><ExclamationCircleOutlined className="mr-2 text-yellow-500" />Confirm Notification</span>}
        open={isModalOpen}
        onOk={handleConfirmSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Yes, Send Now"
        cancelText="Cancel"
        confirmLoading={sending}
      >
        <p className="py-2">You are about to send a notification to approximately <strong>{userCount.toLocaleString()}</strong> users.</p>
        <p>This action cannot be undone. Are you sure you want to proceed?</p>
      </Modal>
    </div>
  );
};
