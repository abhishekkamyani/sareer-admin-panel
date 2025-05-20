import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Table,
  Tag,
  DatePicker,
  Row,
  Col,
  message,
} from "antd";
import {
  SendOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  BookOutlined,
} from "@ant-design/icons";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;

export const Notifications = () => {
  const [form] = Form.useForm();
  const [books, setBooks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  // Fetch books for dropdown
  const fetchBooks = async () => {
    const q = query(collection(db, "books"));
    const querySnapshot = await getDocs(q);
    setBooks(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  // Fetch notification history
  const fetchNotifications = async () => {
    setLoading(true);
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    setNotifications(
      querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
    fetchNotifications();
  }, []);

  // Handle form submission
  // Update the handleSubmit function in your Notifications component
  const handleSubmit = async (values) => {
    if (values.message.length > 200) {
      message.error("Message must be 200 characters or less");
      return;
    }

    try {
      // Convert dayjs date to Firestore Timestamp
      const sendDate = scheduled ? values.sendDate.toDate() : new Date();

      const notificationData = {
        type: values.type,
        target: values.target,
        message: values.message,
        status: scheduled ? "scheduled" : "sent",
        createdAt: new Date(), // Current date as native Date object
        sentAt: sendDate, // Native Date object
        ...(values.bookId && { bookId: values.bookId }), // Only include if exists
      };

      await addDoc(collection(db, "notifications"), notificationData);
      message.success(
        `Notification ${scheduled ? "scheduled" : "sent"} successfully`
      );
      fetchNotifications();
      form.resetFields();
      setScheduled(false); // Reset schedule checkbox
    } catch (error) {
      console.error("Error sending notification:", error);
      message.error(
        `Failed to ${scheduled ? "schedule" : "send"} notification`
      );
    }
  };

  // Notification types
  const notificationTypes = [
    "New Release",
    "Book Update",
    "Cart Reminder",
    "Promotion",
  ];

  // Target audience options
  const targetOptions = ["All Users", "Specific Book Buyers", "Inactive Users"];

  // Table columns
  const columns = [
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      ellipsis: true,
      width: 200,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Date",
      dataIndex: "sentAt",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Recipients",
      dataIndex: "target",
      key: "recipients",
      render: (targets) => targets.join(", "),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "sent" ? "success" : "warning"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={24}>
        {/* Notification Form */}
        <Col xs={24} md={10}>
          <Card
            title={
              <span>
                <SendOutlined style={{ marginRight: 8 }} />
                Send Notification
              </span>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ sendDate: dayjs() }}
            >
              <Form.Item
                name="type"
                label="Notification Type"
                rules={[{ required: true, message: "Please select type" }]}
              >
                <Select placeholder="Select type">
                  {notificationTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="target"
                label="Target Audience"
                rules={[{ required: true, message: "Please select audience" }]}
              >
                <Select mode="multiple" placeholder="Select recipients">
                  {targetOptions.map((option) => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[
                  { required: true, message: "Please enter message" },
                  { max: 200, message: "Message too long" },
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={200}
                  placeholder="Enter notification message (max 200 chars)"
                />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.type !== currentValues.type
                }
              >
                {({ getFieldValue }) =>
                  (getFieldValue("type") === "New Release" ||
                    getFieldValue("type") === "Book Update") && (
                    <Form.Item
                      name="bookId"
                      label="Book"
                      rules={[
                        { required: true, message: "Please select a book" },
                      ]}
                    >
                      <Select
                        placeholder="Select book"
                        showSearch
                        optionFilterProp="children"
                      >
                        {books.map((book) => (
                          <Option key={book.id} value={book.id}>
                            <BookOutlined style={{ marginRight: 8 }} />
                            {book.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Form.Item>
                <Checkbox
                  checked={scheduled}
                  onChange={(e) => setScheduled(e.target.checked)}
                >
                  Schedule for later
                </Checkbox>
              </Form.Item>

              {scheduled && (
                <Form.Item
                  name="sendDate"
                  label="Schedule Date & Time"
                  rules={[{ required: true, message: "Please select date" }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    disabledDate={(current) =>
                      current && current < dayjs().startOf("day")
                    }
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={scheduled ? <ScheduleOutlined /> : <SendOutlined />}
                  size="large"
                >
                  {scheduled ? "Schedule" : "Send Now"}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Notification History */}
        <Col xs={24} md={14}>
          <Card
            title={
              <span>
                <HistoryOutlined style={{ marginRight: 8 }} />
                Notification History
              </span>
            }
          >
            <Table
              columns={columns}
              dataSource={notifications}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
