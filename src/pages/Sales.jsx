import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Statistic,
  Row,
  Col,
  Typography,
  Tag,
  Modal,
  Descriptions,
  Divider,
  List,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  DollarOutlined,
  ShoppingOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { utils, writeFile } from "xlsx";
import { useState, useMemo } from "react";
import { fetchOrders } from "../utils/APIs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

export const Sales = () => {
  const [filters, setFilters] = useState({
    dateRange: null,
    paymentMethod: null,
    searchText: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fetch and transform orders data
  const { data: orders = [], isLoading, error } = useQuery({
  queryKey: ["orders"],
  queryFn: fetchOrders,
  refetchOnWindowFocus: false,
  select: (data) => {
    try {
      return data.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        username: `${order.userInfo?.firstName} ${order.userInfo?.lastName}`,
        total: order.total,
        paymentMethod: order.paymentMethod,
        orderDate: new Date(order.createdAt?.seconds * 1000),
        status: order.status,
        items: order.items,
        originalOrder: order,
      }));
    } catch (e) {
      console.error("transform failed", e);
      return []; // so React-Query doesn’t crash
    }
  },
});

// React-Query exposes the error for you
  // Filter orders based on active filters
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply date range filter
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      result = result.filter(
        (order) =>
          dayjs(order.orderDate).isAfter(start) &&
          dayjs(order.orderDate).isBefore(end)
      );
    }

    // Apply payment method filter
    if (filters.paymentMethod) {
      result = result.filter(
        (order) => order.paymentMethod === filters.paymentMethod
      );
    }

    // Apply search text filter
    if (filters.searchText) {
      const searchTextLower = filters.searchText.toLowerCase();
      result = result.filter(
        (order) =>
          order.orderNumber?.toLowerCase().includes(searchTextLower) ||
          order.username?.toLowerCase().includes(searchTextLower) ||
          order.items.some((item) =>
            item.title?.toLowerCase().includes(searchTextLower)
          )
      );
    }

    return result;
  }, [orders, filters]);

  // Calculate summary statistics from the filtered orders
  const summaryData = useMemo(() => {
    console.log("filteredOrders", filteredOrders)
    const totalRevenuePKR = filteredOrders.reduce(
      (sum, order) => sum + (order.total ? order.total : 0),
      0
    );
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenuePKR / totalOrders : 0;

    return {
      totalRevenuePKR,
      totalOrders,
      avgOrderValue,
    };
  }, [filteredOrders]);

  // Handle changes in filter inputs
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Reset all filters to their initial state
  const handleResetFilters = () => {
    setFilters({
      dateRange: null,
      paymentMethod: null,
      searchText: "",
    });
  };

  // Export the filtered sales data to a CSV file
  const handleExport = () => {
    const exportData = filteredOrders.map((order) => ({
      "Order Number": order.orderNumber,
      Buyer: order.username,
      "Amount (PKR)": order.total,
      "Payment Method": order.paymentMethod,
      Date: dayjs(order.orderDate).format("YYYY-MM-DD HH:mm"),
      Status: order.status,
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sales Data");
    writeFile(wb, `sales_data_${dayjs().format("YYYY-MM-DD")}.csv`, {
      bookType: "csv",
    });
  };

  // Show the modal with details of the selected order
  const showOrderDetails = (order) => {
    setSelectedOrder(order.originalOrder); // Use the original data for full details
    setIsModalVisible(true);
  };

  // Define the columns for the sales table
  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (id) => <span className="font-mono">{id}</span>,
    },
    {
      title: "Book Name",
      key: "bookName",
      render: (_, record) => (
        <div>
          {record.items.length > 1
            ? `${record.items[0].title} + ${record.items.length - 1} more`
            : record.items[0]?.title}
        </div>
      ),
    },
    {
      title: "Buyer",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Amount (PKR)",
      dataIndex: "total",
      key: "amount",
      render: (total) => `₨${total?.toLocaleString()}`,
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      filters: [
        { text: "Cash on Delivery", value: "cod" },
        // Add other payment methods if available
      ],
      onFilter: (value, record) => record.paymentMethod === value,
    },
    {
      title: "Date",
      dataIndex: "orderDate",
      key: "date",
      render: (date) => dayjs(date).format("DD MMM YYYY HH:mm"),
      sorter: (a, b) => dayjs(a.orderDate).unix() - dayjs(b.orderDate).unix(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Completed", value: "completed" },
        { text: "Pending", value: "pending" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => showOrderDetails(record)}
          size="small"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Title level={3} className="mb-6">
        Sales Data
      </Title>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Search by Order #, Buyer, or Book"
              prefix={<SearchOutlined />}
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: "100%" }}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange("dateRange", dates)}
              presets={[
                {
                  label: "Last 7 Days",
                  value: [dayjs().subtract(7, "d"), dayjs()],
                },
                {
                  label: "Last 30 Days",
                  value: [dayjs().subtract(30, "d"), dayjs()],
                },
                {
                  label: "This Month",
                  value: [dayjs().startOf("month"), dayjs().endOf("month")],
                },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Payment Method"
              style={{ width: "100%" }}
              value={filters.paymentMethod}
              onChange={(value) => handleFilterChange("paymentMethod", value)}
              allowClear
            >
              <Option value="cod">Cash on Delivery</Option>
              {/* Add other options as needed */}
            </Select>
          </Col>
        </Row>
        <Button
          type="link"
          onClick={handleResetFilters}
          style={{ marginTop: 16, paddingLeft: 0 }}
        >
          Reset Filters
        </Button>
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={summaryData.totalRevenuePKR}
              prefix="₨"
              precision={2}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Total Orders"
              value={summaryData.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Avg. Order Value"
              value={summaryData.avgOrderValue}
              prefix="₨"
              precision={2}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card
        title="Sales Records"
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={filteredOrders.length === 0}
          >
            Export CSV
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: true }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Order Details Modal */}
      <Modal
        title={`Order Details - ${selectedOrder?.orderNumber}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Buyer">
                {`${selectedOrder.userInfo.firstName} ${selectedOrder.userInfo.lastName}`}
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(selectedOrder.createdAt.seconds * 1000).format(
                  "DD MMM YYYY HH:mm"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {selectedOrder.paymentMethod}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    selectedOrder.status === "completed" ? "green" : "orange"
                  }
                >
                  {selectedOrder.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {selectedOrder.userInfo.address}, {selectedOrder.userInfo.city},{" "}
                {selectedOrder.userInfo.state}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount" span={2}>
                <Text strong>₨{selectedOrder.total.toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Items</Divider>

            <List
              itemLayout="horizontal"
              dataSource={selectedOrder.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <div>
                        <div>Quantity: {item.quantity}</div>
                        <div>Price: ₨{item.price.toLocaleString()}</div>
                        <div>
                          Subtotal: ₨
                          {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
