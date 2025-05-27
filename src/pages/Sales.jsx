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
  Spin,
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
import ReactECharts from "echarts-for-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";
import { utils, writeFile } from "xlsx";
import { useState, useMemo } from "react";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

// Firebase query functions
const fetchOrders = async (filters = {}) => {
    try {
      console.log("Applying filters:", {
        dateRange: filters.dateRange?.map(d => d?.format('YYYY-MM-DD')),
        paymentMethod: filters.paymentMethod,
        category: filters.category
      });
  
      const { dateRange, paymentMethod, category } = filters;
      const ordersCol = collection(db, "orders");
  
      // Base query constraints
      let queryConstraints = [orderBy("orderDate", "desc")];
  
      // Date range filter
      if (dateRange?.length === 2) {
        queryConstraints.push(
          where("orderDate", ">=", dateRange[0].startOf("day").toDate()),
          where("orderDate", "<=", dateRange[1].endOf("day").toDate())
        );
      }
  
      // Payment method filter
      if (paymentMethod) {
        queryConstraints.push(where("paymentMethod", "==", paymentMethod));
      }
  
      // Build and execute query
      const q = query(ordersCol, ...queryConstraints);
      console.log("Executing Firestore query with constraints:", queryConstraints);
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} orders before client-side filtering`);
  
      let orders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          orderDate: data.orderDate.toDate(),
          // Add any necessary transformations here
        };
      });
  
      // Apply category filter if specified
      if (category) {
        const initialCount = orders.length;
        orders = orders.filter((order) =>
          order.items?.some((item) =>
            item.categories?.includes(category) || item.category === category
          )
        );
        console.log(`Filtered ${initialCount - orders.length} orders by category`);
      }
  
      console.log(`Returning ${orders.length} orders after all filtering`);
      return orders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to fetch orders. Please try again.");
    }
  };

const fetchCategories = async () => {
  const categoriesCol = collection(db, "categories");
  const snapshot = await getDocs(categoriesCol);
  return snapshot.docs.map((doc) => doc.data().name);
};

export const Sales = () => {
  const [filters, setFilters] = useState({
    dateRange: null,
    paymentMethod: null,
    category: null,
    searchText: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fetch orders with filters
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => fetchOrders(filters),
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Filter orders based on search text
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (filters.searchText) {
      const searchTextLower = filters.searchText.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTextLower) ||
          order.items.some((item) =>
            item.title?.toLowerCase().includes(searchTextLower)
          )
      );
    }

    return result;
  }, [orders, filters.searchText]);

  // Calculate summary statistics
  const summaryData = useMemo(() => {
    const totalRevenuePKR = filteredOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenuePKR / totalOrders : 0;

    // Sales by category for pie chart
    const categorySales = {};
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        // Handle both categories array and single category field
        const itemCategories =
          item.categories || (item.category ? [item.category] : []);
        itemCategories.forEach((category) => {
          categorySales[category] =
            (categorySales[category] || 0) + item.price * item.quantity;
        });
      });
    });

    return {
      totalRevenuePKR,
      totalOrders,
      avgOrderValue,
      categorySales,
    };
  }, [filteredOrders]);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      dateRange: null,
      paymentMethod: null,
      category: null,
      searchText: "",
    });
  };

  // Export to CSV
  const handleExport = () => {
    const exportData = filteredOrders.map((order) => ({
      "Order ID": order.id,
      Buyer: order.username,
      "Amount (PKR)": order.total,
      "Payment Method": order.paymentMethod,
      Date: dayjs(order.orderDate).format("YYYY-MM-DD HH:mm"),
      Status: order.paymentStatus,
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sales Data");
    writeFile(wb, `sales_data_${dayjs().format("YYYY-MM-DD")}.csv`, {
      bookType: "csv",
    });
  };

  // Show order details modal
  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  // Table columns
  const columns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <span className="font-mono">{id.slice(0, 8)}...</span>,
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
      key: "amount",
      render: (_, record) => `₨${record.total.toLocaleString()}`,
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      //   render: (method) => {
      //     // const methodNames = {
      //     //   "Bank Transfer": "Bank Transfer",
      //     //   cod: "Cash on Delivery",
      //     //   easyPaisa: "EasyPaisa",
      //     //   PayPal: "PayPal",
      //     // };
      //     return methodNames[method] || method;
      //   },
      filters: [
        { text: "Bank Transfer", value: "bank_transfer" },
        { text: "Cash on Delivery", value: "cod" },
        { text: "EasyPaisa", value: "easypaisa" },
        { text: "PayPal", value: "paypal" },
      ],
      onFilter: (value, record) => record.paymentMethod === value,
    },
    {
      title: "Date",
      dataIndex: "orderDate",
      key: "date",
      render: (date) => dayjs(date).format("DD MMM YYYY HH:mm"),
      sorter: (a, b) => a.orderDate - b.orderDate,
    },
    {
      title: "Status",
      dataIndex: "paymentStatus",
      key: "status",
      render: (status) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Completed", value: "completed" },
        { text: "Pending", value: "pending" },
      ],
      onFilter: (value, record) => record.paymentStatus === value,
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

  // Prepare ECharts options for pie chart
  const pieChartOptions = useMemo(() => {
    const pieData = Object.entries(summaryData.categorySales).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    return {
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        right: 10,
        top: "center",
        data: pieData.map((item) => item.name),
      },
      series: [
        {
          name: "Sales by Category",
          type: "pie",
          radius: ["50%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: "18",
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: pieData,
        },
      ],
    };
  }, [summaryData.categorySales]);

  return (
    <div className="p-4">
      <Title level={3} className="mb-6">
        Sales Data
      </Title>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by book or order ID"
              prefix={<SearchOutlined />}
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <RangePicker
              style={{ width: "100%" }}
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange("dateRange", dates)}
              presets={[
                {
                  label: "Last 7 Days",
                  value: [dayjs().subtract(7, "day"), dayjs()],
                },
                {
                  label: "Last 30 Days",
                  value: [dayjs().subtract(30, "day"), dayjs()],
                },
                {
                  label: "This Month",
                  value: [dayjs().startOf("month"), dayjs()],
                },
              ]}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Payment Method"
              style={{ width: "100%" }}
              value={filters.paymentMethod}
              onChange={(value) => handleFilterChange("paymentMethod", value)}
              allowClear
            >
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="cod">Cash on Delivery</Option>
              <Option value="EasyPaisa">EasyPaisa</Option>
              <Option value="PayPal">PayPal</Option>
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Book Category"
              style={{ width: "100%" }}
              value={filters.category}
              onChange={(value) => handleFilterChange("category", value)}
              allowClear
            >
              {categories.map((category) => (
                <Option key={category} value={category}>
                  {category}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Button
          type="link"
          onClick={handleResetFilters}
          style={{ marginTop: 16 }}
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
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#3f8600" }}
              suffix="PKR"
              formatter={(value) => Number(value).toLocaleString()}
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
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#3f8600" }}
              suffix="PKR"
              formatter={(value) => Number(value).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={16}>
        <Col xs={24} lg={16}>
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
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Sales by Category">
            {Object.keys(summaryData.categorySales).length > 0 ? (
              <ReactECharts
                option={pieChartOptions}
                style={{ height: 400 }}
                opts={{ renderer: "svg" }}
              />
            ) : (
              <div className="text-center py-8 text-gray-400">
                No category data available
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Order Details Modal */}
      <Modal
        title={`Order Details - ${selectedOrder?.id}`}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Buyer">
                {selectedOrder.username}
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(selectedOrder.orderDate).format("DD MMM YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {selectedOrder.paymentMethod === "bank_transfer" &&
                  "Bank Transfer"}
                {selectedOrder.paymentMethod === "cod" && "Cash on Delivery"}
                {selectedOrder.paymentMethod === "easypaisa" && "EasyPaisa"}
                {selectedOrder.paymentMethod === "paypal" && "PayPal"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    selectedOrder.paymentStatus === "completed"
                      ? "green"
                      : "orange"
                  }
                >
                  {selectedOrder.paymentStatus.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
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
                          Categories:{" "}
                          {item.categories?.join(", ") || item.category}
                        </div>
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
