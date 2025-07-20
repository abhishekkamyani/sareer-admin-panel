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
  Upload, // Import Upload component
} from "antd";
import {
  SendOutlined,
  HistoryOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  NotificationOutlined,
  TagOutlined,
  MessageOutlined,
  UploadOutlined, // Import Upload icon
} from "@ant-design/icons";
// Import functions from your central API file, including the uploader
import { fetchBooks, fetchNotificationHistory, uploadFileToFirebase } from "../utils/APIs";
import { db } from "../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, getCountFromServer } from "firebase/firestore";


const { TextArea } = Input;
const { Option } = Select;

export const Notifications = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [currentType, setCurrentType] = useState('');
  const [imageFile, setImageFile] = useState(null); // State to hold the selected image file

  const functions = getFunctions();
  const sendCustomNotification = httpsCallable(functions, "sendCustomNotification");

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [fetchedBooks, fetchedHistory] = await Promise.all([
        fetchBooks(),
        fetchNotificationHistory(),
      ]);
      setBooks(fetchedBooks);
      setNotificationHistory(fetchedHistory);
    } catch (error) {
      console.error("Error loading initial data:", error);
      message.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const estimateRecipients = async (target) => {
    if (!target) {
      setUserCount(0);
      return;
    }
    try {
      let q = query(collection(db, "Users"), where("fcmToken", "!=", null));
      if (target === "buyers") {
        q = query(collection(db, "Users"), where("hasMadePurchase", "==", true));
      }
      const snapshot = await getCountFromServer(q);
      setUserCount(snapshot.data().count);
    } catch (error) {
      console.error("Error estimating recipients:", error);
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
      let uploadedImageUrl = null;

      // Step 1: Upload image if one is selected
      if (imageFile) {
        message.loading({ content: 'Uploading image...', key: 'imageUpload' });
        const uploadResult = await uploadFileToFirebase(imageFile, 'notification-images/');
        uploadedImageUrl = uploadResult.url;
        message.success({ content: 'Image uploaded successfully!', key: 'imageUpload' });
      }

      // Step 2: Construct the payload
      const payload = {
        title: values.title,
        body: values.body,
        type: values.type,
        target: values.target,
        data: { ...(values.type === 'newBook' && values.bookId && { bookId: values.bookId }) },
        // Use the uploaded image URL if it exists
        ...(uploadedImageUrl && { imageUrl: uploadedImageUrl }),
      };
      
      console.log("===payload===", payload);

      // Step 3: Send the notification
      const result = await sendCustomNotification({ data: payload }); // Ensure payload is nested under 'data'
      message.success(result.data.message || `Notification job processed successfully.`);
      
      form.resetFields();
      setImageFile(null); // Clear the selected file
      setUserCount(0);
      loadInitialData();
    } catch (error) {
      console.error("Error during submission:", error);
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
               <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input prefix={<TagOutlined />} showCount maxLength={80} placeholder="Enter notification title" />
              </Form.Item>
              <Form.Item name="body" label="Body" rules={[{ required: true }]}>
                <TextArea rows={4} showCount maxLength={250} placeholder="Enter the main content..."/>
              </Form.Item>
              
              {/* Image Upload Field */}
              <Form.Item label="Image (Optional)">
                <Upload
                  listType="picture"
                  maxCount={1}
                  beforeUpload={(file) => {
                    setImageFile(file); // Store the file in state
                    return false; // Prevent automatic upload
                  }}
                  onRemove={() => setImageFile(null)} // Clear the file from state
                >
                  <Button icon={<UploadOutlined />}>Select Image</Button>
                </Upload>
              </Form.Item>
              
              {currentType === 'newBook' && (
                <Form.Item name="bookId" label="Link to Book" rules={[{ required: true }]}>
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
