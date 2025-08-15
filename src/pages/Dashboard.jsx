import { useQuery } from "@tanstack/react-query";
import { Card, Button, DatePicker, Table, Statistic, Row, Col } from "antd";
import {
  BookOutlined,
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  NotificationOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import ReactECharts from "echarts-for-react";
import { useState, useMemo } from "react";
import { fetchOrders, fetchTotalBooks } from "../utils/APIs"; // Assuming APIs are in this file
import { Loader } from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { ReportModal } from "../components/ReportModal";

dayjs.extend(isBetween);
const { RangePicker } = DatePicker;

export const Dashboard = () => {
  // Set initial dateRange to null to show all orders by default
  const [dateRange, setDateRange] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const navigate = useNavigate();

  // Dashboard stats queries
  const { data: totalBooks, isLoading: isTotalBooksLoading } = useQuery({
    queryKey: ["totalBooks"],
    queryFn: fetchTotalBooks,
    refetchOnWindowFocus: false,
  });

  // Fetch and transform orders data for use across the dashboard
  const { data: orders = [], isLoading: isOrdersDataLoading } = useQuery({
    queryKey: ["ordersData"],
    queryFn: fetchOrders,
    refetchOnWindowFocus: false,
    select: (data) =>
      data.map((order) => ({
        id: order.orderId,
        ...order,
        username: `${order.userInfo?.firstName} ${order.userInfo?.lastName}`,
        orderDate: new Date(order.createdAt?.seconds * 1000),
      })),
  });

  // Process all dashboard data based on the selected date range
  const processedData = useMemo(() => {
    // If dateRange is set, filter orders; otherwise, use all orders.
    const filteredOrders = dateRange
      ? orders.filter((order) => {
          const [startDate, endDate] = dateRange;
          return dayjs(order.orderDate).isBetween(
            startDate,
            endDate,
            null,
            "[]"
          );
        })
      : orders;

    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const totalOrdersCount = filteredOrders.length;
    const avgOrderValue =
      totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
    
    const uniqueCustomerIds = new Set(filteredOrders.map(order => order.userId));
    const uniqueCustomers = uniqueCustomerIds.size;

    // Group sales by day for the trend chart
    const salesByDay = {};
    filteredOrders.forEach((order) => {
      const date = dayjs(order.orderDate).format("YYYY-MM-DD");
      salesByDay[date] = (salesByDay[date] || 0) + order.total;
    });

    const chartLabels = Object.keys(salesByDay).sort();
    const chartData = chartLabels.map((label) => salesByDay[label]);

    return {
      filteredOrders,
      totalRevenue,
      totalOrdersCount,
      avgOrderValue,
      uniqueCustomers,
      salesTrend: { labels: chartLabels, data: chartData },
    };
  }, [orders, dateRange]);

  // Chart options for sales trend
  const salesTrendOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params) =>
        `<b>${params[0].name}</b><br/>Revenue: ₨${params[0].value.toLocaleString()}`,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: processedData.salesTrend.labels,
    },
    yAxis: { type: "value", axisLabel: { formatter: "₨{value}" } },
    series: [
      {
        name: "Revenue",
        type: "line",
        smooth: true,
        data: processedData.salesTrend.data,
        areaStyle: {},
        itemStyle: { color: "#5470C6" },
      },
    ],
  };

  // Table columns for recent orders
  const orderColumns = [
    { title: "Order #", dataIndex: "orderNumber", key: "orderNumber" },
    { title: "Buyer", dataIndex: "username", key: "username" },
    {
      title: "Date",
      dataIndex: "orderDate",
      key: "date",
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Amount",
      dataIndex: "total",
      key: "total",
      render: (total) => `₨${total.toLocaleString()}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {status.toUpperCase()}
        </span>
      ),
    },
  ];

  const isLoading = isTotalBooksLoading || isOrdersDataLoading;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          disabledDate={(current) => current && current > dayjs().endOf("day")}
        />
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={processedData.totalRevenue}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              prefix={
                <span>
                  <DollarOutlined style={{ marginRight: 8 }} />
                  ₨
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Total Orders"
              value={processedData.totalOrdersCount}
              valueStyle={{ color: "#d48806" }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Unique Customers"
              value={processedData.uniqueCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic
              title="Avg. Order Value"
              value={processedData.avgOrderValue}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              prefix={
                <span>
                  <RiseOutlined style={{ marginRight: 8 }} />
                  ₨
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Total Books"
              value={totalBooks}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          onClick={() => navigate("/book-management")}
          icon={<FileTextOutlined />}
          type="primary"
        >
          View Books
        </Button>
        <Button
          icon={<NotificationOutlined />}
          onClick={() => navigate("/notifications")}
        >
          Send Notification
        </Button>
        <Button
          icon={<BarChartOutlined />}
          onClick={() => setReportModalVisible(true)}
        >
          Generate Report
        </Button>
      </div>

      {/* Chart */}
      <Card title="Sales Trend" className="mb-6">
        <ReactECharts
          option={salesTrendOption}
          style={{ height: 350, width: "100%" }}
          opts={{ renderer: "svg" }}
        />
      </Card>

      {/* Recent Orders */}
      <Card title="Recent Orders">
        <Table
          columns={orderColumns}
          dataSource={processedData.filteredOrders}
          loading={isLoading}
          pagination={{ pageSize: 5 }}
          rowKey="id"
          scroll={{ x: true }}
        />
      </Card>

      <ReportModal
        visible={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
      />
    </div>
  );
};