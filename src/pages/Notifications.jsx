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
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";
import { getFunctions, httpsCallable } from "firebase/functions";

const { TextArea } = Input;
const { Option } = Select;

export const Notifications = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [sending, setSending] = useState(false);

  // No longer need to store form values in state
  // const [formValues, setFormValues] = useState(null);

  const functions = getFunctions();
  const sendPushNotification = httpsCallable(functions, "sendPushNotification");

  const fetchData = async () => {
    setLoading(true);
    try {
      const booksQuery = query(collection(db, "books"));
      const notifsQuery = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
      );

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
      message.error("Failed to load data from Firestore.");
    } finally {
      setLoading(false);
    }
  };

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
        const inactiveDate = dayjs().subtract(30, "days").toDate();
        q = query(q, where("lastActive", "<", inactiveDate));
      }
      const snapshot = await getCountFromServer(q);
      setUserCount(snapshot.data().count);
    } catch (error) {
      console.error("Error estimating recipients:", error);
      message.error("Failed to estimate recipients.");
    }
  };

  const handleFormChange = (_, allValues) => {
    if (allValues.target || allValues.bookId) {
      estimateRecipients(allValues.target, allValues.bookId);
    }
  };

  // **THE FIX: This function now just validates the form and opens the modal.**
  const handleOpenConfirmModal = () => {
    form
      .validateFields()
      .then(() => {
        setIsModalOpen(true);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
        message.warning("Please fill out all required fields.");
      });
  };

  // **THE FIX: This function now gets the latest form values itself before sending.**
  const handleConfirmSubmit = async () => {
    setSending(true);
    try {
      // Get latest values directly from the form instance, ensuring they're fresh.
      const values = await form.getFieldsValue();

      const payload = {
        type: values.type,
        target: values.target,
        message: values.message,
        scheduledDate:
          scheduled && values.sendDate ? values.sendDate.toISOString() : null,
        ...(values.bookId && { bookId: values.bookId }),
      };

      const result = await sendPushNotification(payload);
      message.success(
        result.data.message || `Notification job started successfully.`
      );

      form.resetFields();
      setScheduled(false);
      setUserCount(0);
      fetchData();
    } catch (error) {
      console.error("Error calling sendPushNotification function:", error);
      message.error(`Failed to send notification: ${error.message}`);
    } finally {
      setSending(false);
      setIsModalOpen(false);
    }
  };

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
    { title: "Message", dataIndex: "message", key: "message", ellipsis: true },
    { title: "Type", dataIndex: "type", key: "type", width: 150 },
    {
      title: "Date",
      dataIndex: "sentAt",
      key: "date",
      render: (date) =>
        date ? dayjs(date).format("MMM D, YYYY h:mm A") : "N/A",
      sorter: (a, b) => (a.sentAt || 0) - (b.sentAt || 0),
      width: 200,
    },
    {
      title: "Recipients (Est.)",
      dataIndex: "estimatedRecipients",
      key: "recipients",
      render: (count) => count?.toLocaleString() || "0",
      width: 150,
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
              : status === "scheduled"
              ? "blue"
              : "orange"
          }
        >
          {status?.toUpperCase() || "UNKNOWN"}
        </Tag>
      ),
      width: 120,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={10}>
          <Card
            title={
              <span className="text-xl font-semibold">
                <SendOutlined className="mr-2" />
                Send Notification
              </span>
            }
            extra={
              <Badge count={userCount} showZero overflowCount={9999}>
                <Tag icon={<UserOutlined />} color="blue">
                  {userCount.toLocaleString()} recipients
                </Tag>
              </Badge>
            }
          >
            {/* The form no longer uses onFinish, the button triggers the process */}
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
              initialValues={{ sendDate: dayjs() }}
            >
              <Form.Item
                name="type"
                label="Notification Type"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select type">
                  {notificationTypes.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="target"
                label="Target Audience"
                rules={[{ required: true }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select recipients"
                  maxTagCount="responsive"
                >
                  {targetOptions.map((o) => (
                    <Option key={o} value={o}>
                      {o}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="message"
                label="Message"
                rules={[
                  { required: true, message: "Please enter a message!" },
                  { max: 200 },
                ]}
              >
                <TextArea
                  rows={4}
                  showCount
                  maxLength={200}
                  placeholder="Enter notification message..."
                />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.type !== curr.type}
              >
                {({ getFieldValue }) =>
                  ["New Release", "Book Update"].includes(
                    getFieldValue("type")
                  ) && (
                    <Form.Item
                      name="bookId"
                      label="Book"
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder="Select book"
                        showSearch
                        optionFilterProp="children"
                        suffixIcon={<BookOutlined />}
                      >
                        {books.map((b) => (
                          <Option key={b.id} value={b.id}>
                            {b.name}
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
                  rules={[{ required: true }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    disabledDate={(current) =>
                      current && current < dayjs().startOf("day")
                    }
                    className="w-full"
                  />
                </Form.Item>
              )}
              <Form.Item>
                {/* This button is no longer a 'submit' type. It just opens the modal. */}
                <Button
                  type="primary"
                  onClick={handleOpenConfirmModal}
                  icon={scheduled ? <ScheduleOutlined /> : <SendOutlined />}
                  size="large"
                  loading={sending}
                  className="w-full"
                >
                  {scheduled
                    ? "Schedule Notification"
                    : "Send Notification Now"}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card
            title={
              <span className="text-xl font-semibold">
                <HistoryOutlined className="mr-2" />
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
                pagination={{ pageSize: 5 }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>
      <Modal
        title={
          <span className="font-semibold">
            <ExclamationCircleOutlined className="mr-2" />
            Confirm {scheduled ? "Scheduling" : "Sending"}
          </span>
        }
        open={isModalOpen}
        onOk={handleConfirmSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Confirm"
        cancelText="Cancel"
        confirmLoading={sending}
      >
        <p>
          This action will target approximately{" "}
          <strong>{userCount.toLocaleString()}</strong> users.
        </p>
        <p>Are you sure you want to proceed?</p>
      </Modal>
    </div>
  );
};
