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
  Modal,
  Badge,
  Spin,
} from "antd";
import {
  SendOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;
const { confirm } = Modal;

export const Notifications = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [formValues, setFormValues] = useState({});

  // Fetch books and notifications
  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksQuery, notifsQuery] = [
        query(collection(db, "books")),
        query(collection(db, "notifications"), orderBy("createdAt", "desc")),
      ];

      const [booksSnapshot, notifsSnapshot] = await Promise.all([
        getDocs(booksQuery),
        getDocs(notifsQuery),
      ]);

      setBooks(
        booksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setNotifications(
        notifsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          sentAt: doc.data().sentAt?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Estimate number of recipients
  const estimateRecipients = async (target, bookId) => {
    if (!target || target.length === 0) {
      setUserCount(0);
      return;
    }

    try {
      // let q = query(collection(db, "Users"), where("fcmToken", "!=", ""));
      let q = query(collection(db, "Users"));

      if (target.includes("Specific Book Buyers") && bookId) {
        q = query(q, where(`purchasedBooks.${bookId}`, "==", true));
      }

      if (target.includes("Inactive Users")) {
        const inactiveDate = new Date();
        inactiveDate.setDate(inactiveDate.getDate() - 30);
        q = query(q, where("lastActive", "<", inactiveDate));
      }

      const snapshot = await getCountFromServer(q);
      console.log("snapshot.data().count", snapshot.data());

      setUserCount(snapshot.data().count);
    } catch (error) {
      console.error("Error estimating recipients:", error);
      message.error("Failed to estimate recipients");
    }
  };

  // Handle form value changes
  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);

    // Estimate recipients when relevant fields change
    if (changedValues.target || changedValues.bookId || changedValues.type) {
      estimateRecipients(allValues.target, allValues.bookId);
    }
  };

  const handleSubmit = async (values) => {
    if (values.message.length > 200) {
      message.error("Message must be 200 characters or less");
      return;
    }
    setIsModalOpen(true); // Show modal first
  };

  // 2. Handle actual submission after confirmation
  const handleConfirmSubmit = async () => {
    try {
      setSending(true);
      const values = form.getFieldsValue();
      const sendDate = scheduled ? values.sendDate.toDate() : new Date();

      const notificationData = {
        type: values.type,
        target: values.target,
        message: values.message,
        status: scheduled ? "scheduled" : "pending",
        createdAt: new Date(),
        sentAt: sendDate,
        estimatedRecipients: userCount,
        ...(values.bookId && { bookId: values.bookId }),
      };

      await addDoc(collection(db, "notifications"), notificationData);
      message.success(
        `Notification ${scheduled ? "scheduled" : "sent"} to ${userCount} users`
      );
      form.resetFields();
      setScheduled(false);
      setUserCount(0);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      message.error("Failed to send notification");
    } finally {
      setSending(false);
      setIsModalOpen(false);
    }
  };

  // Handle form submission
  // const handleSubmit = async (values) => {
  //   // Debug: Log received values
  //   console.log("Form values:", values);

  //   if (values.message.length > 200) {
  //     message.error("Message must be 200 characters or less");
  //     return;
  //   }

  //   // Debug: Check if function is being called
  //   console.log("Form submission initiated");

  //   try {
  //     // Create modal reference first
  //     const modal = Modal.confirm({
  //       title: `Confirm ${scheduled ? "Scheduling" : "Sending"}`,
  //       icon: <ExclamationCircleOutlined />,
  //       content: `This will send a notification to approximately ${userCount} users. Continue?`,
  //       okText: "Confirm",
  //       cancelText: "Cancel",
  //       onOk: async () => {
  //         console.log("User confirmed submission");
  //         setSending(true);
  //         try {
  //           const sendDate = scheduled ? values.sendDate.toDate() : new Date();

  //           const notificationData = {
  //             type: values.type,
  //             target: values.target,
  //             message: values.message,
  //             status: scheduled ? "scheduled" : "pending",
  //             createdAt: new Date(),
  //             sentAt: sendDate,
  //             estimatedRecipients: userCount,
  //             ...(values.bookId && { bookId: values.bookId }),
  //           };

  //           console.log("Notification data:", notificationData);

  //           await addDoc(collection(db, "notifications"), notificationData);
  //           message.success(
  //             `Notification ${
  //               scheduled ? "scheduled" : "being sent"
  //             } to ${userCount} users`
  //           );
  //           await fetchData();
  //           form.resetFields();
  //           setScheduled(false);
  //           setUserCount(0);
  //         } catch (error) {
  //           console.error("Submission error:", error);
  //           message.error(
  //             `Failed to ${scheduled ? "schedule" : "send"} notification`
  //           );
  //           throw error; // Re-throw to prevent modal from closing
  //         } finally {
  //           setSending(false);
  //         }
  //       },
  //       onCancel: () => {
  //         console.log("User canceled submission");
  //       },
  //     });

  //     console.log("Modal created:", modal);
  //   } catch (error) {
  //     console.error("Modal creation error:", error);
  //   }
  // };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  const notificationTypes = [
    "New Release",
    "Book Update",
    "Cart Reminder",
    "Promotion",
  ];

  const targetOptions = ["All Users", "Specific Book Buyers", "Inactive Users"];

  const columns = [
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      ellipsis: true,
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      filters: notificationTypes.map((type) => ({ text: type, value: type })),
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Date",
      dataIndex: "sentAt",
      key: "date",
      render: (date) => dayjs(date).format("MMM D, YYYY h:mm A"),
      sorter: (a, b) => a.sentAt - b.sentAt,
      width: 150,
    },
    {
      title: "Recipients",
      dataIndex: "estimatedRecipients",
      key: "recipients",
      render: (count) => count?.toLocaleString() || "N/A",
      width: 100,
      sorter: (a, b) =>
        (a.estimatedRecipients || 0) - (b.estimatedRecipients || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={
            status === "sent"
              ? "green"
              : status === "pending"
              ? "blue"
              : "orange"
          }
        >
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Sent", value: "sent" },
        { text: "Pending", value: "pending" },
        { text: "Scheduled", value: "scheduled" },
      ],
      onFilter: (value, record) => record.status === value,
      width: 120,
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
            extra={
              <Badge
                count={userCount}
                showZero
                overflowCount={9999}
                style={{ backgroundColor: userCount > 0 ? "#1890ff" : "#ccc" }}
              >
                <Tag
                  icon={<UserOutlined />}
                  color={userCount > 0 ? "blue" : "default"}
                >
                  {userCount.toLocaleString()} recipients
                </Tag>
              </Badge>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={handleFormChange}
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
                <Select
                  mode="multiple"
                  placeholder="Select recipients"
                  maxTagCount="responsive"
                >
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
                        suffixIcon={<BookOutlined />}
                      >
                        {books.map((book) => (
                          <Option key={book.id} value={book.id}>
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
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={scheduled ? <ScheduleOutlined /> : <SendOutlined />}
                  size="large"
                  loading={sending}
                  // disabled={userCount === 0}
                  block
                >
                  {scheduled
                    ? "Schedule Notification"
                    : "Send Notification Now"}
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
            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={notifications}
                rowKey="id"
                scroll={{ x: true }}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: true,
                  pageSizeOptions: ["5", "10", "20", "50"],
                }}
                style={{ marginTop: 16 }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal
        title={
          <>
            <ExclamationCircleOutlined /> Confirm{" "}
            {scheduled ? "Scheduling" : "Sending"}
          </>
        }
        open={isModalOpen}
        onOk={handleConfirmSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Confirm"
        cancelText="Cancel"
        confirmLoading={sending}
      >
        <p>This will send a notification to approximately {userCount} users.</p>
        <p>Are you sure you want to continue?</p>
      </Modal>
    </div>
  );
};
