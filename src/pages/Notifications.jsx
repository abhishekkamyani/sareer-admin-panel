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
  // Removed: addDoc, // No longer directly add to notifications for sending
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";
// New Import: For calling Firebase Cloud Functions
import { getFunctions, httpsCallable } from "firebase/functions";

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

  // Initialize Firebase Functions instance and callable function
  const functions = getFunctions();
  const sendOneSignalNotification = httpsCallable(functions, 'sendOneSignalNotification');


  // Fetch books and notifications
  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksQuery, notifsQuery] = [
        query(collection(db, "books")),
        // Notifications are now saved by the Cloud Function, so fetch them here.
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

  // Estimate number of recipients (still valid for UI display)
  const estimateRecipients = async (target, bookId) => {
    if (!target || target.length === 0) {
      setUserCount(0);
      return;
    }

    try {
      let q = query(collection(db, "users"));

      if (target.includes("Specific Book Buyers") && bookId) {
        q = query(q, where(`purchasedBooks.${bookId}`, "==", true));
      }

      if (target.includes("Inactive Users")) {
        const inactiveDate = dayjs().subtract(30, 'days').toDate(); // Use dayjs for consistency
        q = query(q, where("lastActive", "<", inactiveDate));
      }

      const snapshot = await getCountFromServer(q);
      console.log("Estimated recipients from Firestore:", snapshot.data().count);

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
    // Show modal before calling the Cloud Function
    setIsModalOpen(true);
  };

  // Handle actual submission after confirmation (calls the Cloud Function)
  const handleConfirmSubmit = async () => {
    try {
      setSending(true);
      const values = form.getFieldsValue(); // Get the latest form values

      // Prepare data for the Cloud Function call
      const payload = {
        type: values.type,
        target: values.target,
        message: values.message,
        scheduledDate: scheduled ? values.sendDate.toDate().toISOString() : null, // Send as ISO string
        estimatedRecipients: userCount, // Pass the estimated count for storage
        ...(values.bookId && { bookId: values.bookId }),
      };

      // Call the Firebase Cloud Function
      const response = await sendOneSignalNotification(payload);

      console.log("Notification Cloud Function response:", response.data);

      message.success(
        `Notification ${scheduled ? "scheduled" : "sent"} via OneSignal.`
      );
      form.resetFields();
      setScheduled(false);
      setUserCount(0);
      fetchData(); // Re-fetch history to show the newly sent/scheduled notification
    } catch (error) {
      console.error("Error sending notification via OneSignal:", error);
      message.error(
        `Failed to ${scheduled ? "schedule" : "send"} notification: ${error.message}`
      );
    } finally {
      setSending(false);
      setIsModalOpen(false);
    }
  };

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
      render: (date) => dayjs(date).format("MMM D,YYYY h:mm A"),
      sorter: (a, b) => a.sentAt - b.sentAt,
      width: 150,
    },
    {
      title: "Recipients",
      dataIndex: "estimatedRecipients", // This column now shows your Firestore estimate
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
    <div className="!p-6">
      <Row gutter={[24, 24]}>
        {/* Notification Form */}
        <Col xs={24} md={10}>
          <Card
            className="!border-grey-200"
            title={
              <span className="!text-primary">
                <SendOutlined className="!mr-2" />
                Send Notification
              </span>
            }
            extra={
              <Badge
                count={userCount}
                showZero
                overflowCount={9999}
                className="![&>.ant-badge-count]:!bg-primary"
              >
                <Tag
                  icon={<UserOutlined />}
                  className={`!flex !items-center ${
                    userCount > 0
                      ? "!bg-primary-light !text-primary"
                      : "!bg-grey-100 !text-grey-600"
                  }`}
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
                label={
                  <span className="!text-grey-700">Notification Type</span>
                }
                rules={[{ required: true, message: "Please select type" }]}
              >
                <Select
                  placeholder="Select type"
                  className="hover:!border-primary focus:!border-primary"
                  dropdownClassName="![&_.ant-select-item]:hover:!bg-primary-light ![&_.ant-select-item-option-selected]:!bg-primary-light"
                >
                  {notificationTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="target"
                label={<span className="!text-grey-700">Target Audience</span>}
                rules={[{ required: true, message: "Please select audience" }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select recipients"
                  maxTagCount="responsive"
                  className="hover:!border-primary focus:!border-primary"
                  dropdownClassName="![&_.ant-select-item]:hover:!bg-primary-light ![&_.ant-select-item-option-selected]:!bg-primary-light"
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
                label={<span className="!text-grey-700">Message</span>}
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
                  className="hover:!border-primary focus:!border-primary"
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
                      label={<span className="!text-grey-700">Book</span>}
                      rules={[
                        { required: true, message: "Please select a book" },
                      ]}
                    >
                      <Select
                        placeholder="Select book"
                        showSearch
                        optionFilterProp="children"
                        suffixIcon={<BookOutlined className="!text-grey-500" />}
                        className="hover:!border-primary focus:!border-primary"
                        dropdownClassName="![&_.ant-select-item]:hover:!bg-primary-light ![&_.ant-select-item-option-selected]:!bg-primary-light"
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
                  className="[&>.ant-checkbox-inner]:hover:!border-primary [&>.ant-checkbox-checked>.ant-checkbox-inner]:!bg-primary [&>.ant-checkbox-checked>.ant-checkbox-inner]:!border-primary"
                >
                  Schedule for later
                </Checkbox>
              </Form.Item>

              {scheduled && (
                <Form.Item
                  name="sendDate"
                  label={
                    <span className="!text-grey-700">Schedule Date & Time</span>
                  }
                  rules={[{ required: true, message: "Please select date" }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    disabledDate={(current) =>
                      current && current < dayjs().startOf("day")
                    }
                    className="!w-full hover:!border-primary focus:!border-primary [&_.ant-picker-input>input]:!placeholder-grey-400"
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
                  className="!bg-primary hover:!bg-primary-dark !border-primary hover:!border-primary-dark !w-full"
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
            className="!border-grey-200"
            title={
              <span className="!text-primary">
                <HistoryOutlined className="!mr-2" />
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
                className="!mt-4 [&_.ant-table-thead>tr>th]:!bg-grey-50 [&_.ant-table-tbody>tr:hover>td]:!bg-primary-light"
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal
        title={
          <span className="!text-primary">
            <ExclamationCircleOutlined className="!mr-2" />
            Confirm {scheduled ? "Scheduling" : "Sending"}
          </span>
        }
        open={isModalOpen}
        onOk={handleConfirmSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Confirm"
        cancelText="Cancel"
        confirmLoading={sending}
        okButtonProps={{
          className:
            "!bg-primary hover:!bg-primary-dark !border-primary hover:!border-primary-dark",
        }}
        cancelButtonProps={{
          className:
            "hover:!text-primary !border-grey-300 hover:!border-primary",
        }}
      >
        <p>This will send a notification to approximately {userCount} users.</p>
        <p>Are you sure you want to continue?</p>
      </Modal>
    </div>
  );
};