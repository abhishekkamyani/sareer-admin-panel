import { useQuery } from "@tanstack/react-query";
import { Card, Button, DatePicker, Table, Spin } from "antd";
import {
  BookOutlined,
  DollarOutlined,
  StarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  UploadOutlined,
  FileTextOutlined,
  NotificationOutlined,
  BarChartOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import ReactECharts from "echarts-for-react";

import { useState } from "react";
import { getCategories } from "../utils/firebaseApis";
import {
  fetchActiveUsers,
  fetchNewReleases,
  fetchReadingAnalytics,
  fetchRecentActivities,
  fetchSalesByCategory,
  fetchSalesData,
  fetchTotalBooks,
} from "../utils/APIs";
import { Loader } from "../components/Loader";

const { RangePicker } = DatePicker;

// Firebase query functions

export const Dashboard = () => {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);

  // Categories query
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    refetchOnWindowFocus: false,
  });

  // Dashboard stats queries
  const { data: totalBooks, isLoading: isTotalBooksLoading } = useQuery({
    queryKey: ["totalBooks"],
    queryFn: fetchTotalBooks,
    refetchOnWindowFocus: false,
  });

  const { data: newReleases, isLoading: isNewReleaseLoading } = useQuery({
    queryKey: ["newReleases"],
    queryFn: fetchNewReleases,
    refetchOnWindowFocus: false,
  });

  const { data: salesData, isLoading: isSalesDataLoading } = useQuery({
    queryKey: ["salesData"],
    queryFn: fetchSalesData,
    refetchOnWindowFocus: false,
  });

  const { data: activeUsers, isLoading: isActiveUsersLoading } = useQuery({
    queryKey: ["activeUsers"],
    queryFn: fetchActiveUsers,
    refetchOnWindowFocus: false,
  });

  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["recentActivities"],
    queryFn: fetchRecentActivities,
    refetchOnWindowFocus: false,
  });

  // Category sales query (depends on categories)
  const { data: categorySales, isLoading: isCategorySalesLoading } = useQuery({
    queryKey: ["categorySales", categories],
    queryFn: () => fetchSalesByCategory(categories || []),
    refetchOnWindowFocus: false,

    enabled: !!categories,
  });

  // Reading analytics query
  const { data: readingAnalytics, isLoading: isReadingAnalyticsLoading } =
    useQuery({
      queryKey: ["readingAnalytics"],
      queryFn: fetchReadingAnalytics,
      refetchOnWindowFocus: false,
    });

  // Combine stats
  const stats = {
    totalBooks,
    totalSalesPKR: salesData?.totalPKR || 0,
    totalSalesUSD: salesData?.totalUSD || 0,
    newReleases,
    activeUsers,
    totalCopiesSold: salesData?.totalCopies || 0,
  };

  // Chart options
  const salesByCategoryOption = {
    title: { text: "Sales by Category" },
    tooltip: {},
    legend: { data: ["Sales"] },
    xAxis: {
      type: "category",
      data: categorySales?.categories || [],
    },
    yAxis: {},
    series: [
      {
        name: "Sales",
        type: "bar",
        data: categorySales?.sales || [],
      },
    ],
  };

  const readingAnalyticsOption = {
    title: { text: "Reading Activity (Last 7 Days)" },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: Array.from({ length: 7 }, (_, i) =>
        dayjs()
          .subtract(6 - i, "day")
          .format("ddd, MMM D")
      ),
    },
    yAxis: { type: "value", name: "Pages Read" },
    series: [
      {
        name: "Pages Read",
        type: "line",
        data: readingAnalytics || Array(7).fill(0),
        smooth: true,
      },
    ],
  };

  // Activities Table Columns
  const activityColumns = [
    { title: "Book Name", dataIndex: "bookName", key: "bookName" },
    { title: "Action", dataIndex: "action", key: "action" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "User", dataIndex: "user", key: "user" },
  ];

  // Check if any query is loading
  const isLoading = [
    isTotalBooksLoading,
    isNewReleaseLoading,
    isSalesDataLoading,
    isActiveUsersLoading,
    isActivitiesLoading,
    isCategorySalesLoading,
    isReadingAnalyticsLoading,
  ].some((query) => query === true);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card loading={isLoading} className="hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <BookOutlined className="!text-primary-light text-2xl mr-3" />
            <div>
              <p className="text-grey-600">Total Books</p>
              <p className="text-2xl font-semibold text-primary">
                {stats.totalBooks}
              </p>
            </div>
          </div>
        </Card>

        <Card loading={isLoading} className="hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <DollarOutlined className="!text-secondary text-2xl mr-3" />
            <div>
              <p className="text-grey-600">Total Sales</p>
              <p className="text-2xl font-semibold text-primary">
                ₨{stats.totalSalesPKR.toLocaleString()} / $
                {stats.totalSalesUSD.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card loading={isLoading} className="hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <StarOutlined className="!text-secondary text-2xl mr-3" />
            <div>
              <p className="text-grey-600">New Releases</p>
              <p className="text-2xl font-semibold text-primary">
                {stats.newReleases}
              </p>
            </div>
          </div>
        </Card>

        <Card loading={isLoading} className="hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <UserOutlined className="!text-primary-light text-2xl mr-3" />
            <div>
              <p className="text-grey-600">Active Users</p>
              <p className="text-2xl font-semibold text-primary">
                {stats.activeUsers}
              </p>
            </div>
          </div>
        </Card>

        <Card loading={isLoading} className="hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <ShoppingCartOutlined className="!text-secondary text-2xl mr-3" />
            <div>
              <p className="text-grey-600">Total Copies Sold</p>
              <p className="text-2xl font-semibold text-primary">
                {stats.totalCopiesSold}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          type="primary"
          icon={<UploadOutlined />}
          className="!bg-primary hover:!bg-primary-dark !border-primary hover:!border-primary-dark"
        >
          Upload Book
        </Button>
        <Button
          icon={<FileTextOutlined />}
          className="!text-primary !border-primary hover:!bg-primary-light hover:!text-primary-dark"
        >
          View Books
        </Button>
        <Button
          icon={<NotificationOutlined />}
          className="!text-primary !border-primary hover:!bg-primary-light hover:!text-primary-dark"
        >
          Send Notification
        </Button>
        <Button
          icon={<BarChartOutlined />}
          className="!text-primary !border-primary hover:!bg-primary-light hover:!text-primary-dark"
        >
          Generate Report
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Card
          title="Sales by Category"
          className="!border-grey-200"
          headStyle={{ borderBottomColor: "var(--color-grey-200)" }}
        >
          <ReactECharts
            option={salesByCategoryOption}
            style={{ height: 300, width: "100%" }}
            lazyUpdate={true}
            opts={{ renderer: "svg" }} // Better performance
          />
        </Card>
        <Card
          title="Reading Analytics"
          className="!border-grey-200"
          headStyle={{ borderBottomColor: "var(--color-grey-200)" }}
        >
          <ReactECharts
            option={readingAnalyticsOption}
            style={{ height: 300, width: "100%" }}
          />
        </Card>
      </div>

      {/* Recent Activity */}
      <Card
        title="Recent Activity"
        className="!border-grey-200"
        headStyle={{ borderBottomColor: "var(--color-grey-200)" }}
        extra={
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            disabledDate={(current) =>
              current && current > dayjs().endOf("day")
            }
            className="w-full sm:w-auto"
          />
        }
      >
        <Table
          columns={activityColumns}
          dataSource={activities}
          loading={isLoading}
          pagination={false}
          rowKey="id"
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
};
