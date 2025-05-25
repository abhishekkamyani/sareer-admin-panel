import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import ReactECharts from "echarts-for-react";
import { Card, Button, DatePicker, Table } from "antd";
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
} from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalSalesPKR: 0,
    totalSalesUSD: 0,
    newReleases: 0,
    activeUsers: 0,
    totalCopiesSold: 0,
  });
  const [activities, setActivities] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total Books
      const booksCol = collection(db, "books");
      const booksSnapshot = await getCountFromServer(booksCol);

      // New Releases (last 30 days)
      const newReleasesQuery = query(
        booksCol,
        where("releaseDate", ">=", dayjs().subtract(30, "day").toDate())
      );
      const newReleasesSnapshot = await getCountFromServer(newReleasesQuery);

      // TODO: Implement these queries based on your Firestore structure
      // Total Sales
      // Active Users (users with lastLogin in last 24h)
      // Total Copies Sold

      setStats({
        totalBooks: booksSnapshot.data().count,
        newReleases: newReleasesSnapshot.data().count,
        totalSalesPKR: 0, // Replace with actual query
        totalSalesUSD: 0, // Replace with actual query
        activeUsers: 0, // Replace with actual query
        totalCopiesSold: 0, // Replace with actual query
      });

      // Fetch recent activities
      const activitiesQuery =
        query();
        // collection(db, 'activities'),
        // where('timestamp', '>=', dateRange[0].toDate()),
        // where('timestamp', '<=', dateRange[1].toDate()),
        // orderBy('timestamp', 'desc'),
        // limit(5)
      const activitiesSnapshot = await getDocs(activitiesQuery);
      setActivities(
        activitiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().timestamp.toDate().toLocaleString(),
        }))
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  // Sales by Category Chart
  const salesByCategoryOption = {
    title: {
      text: "Sales by Category",
    },
    tooltip: {},
    legend: {
      data: ["Sales"],
    },
    xAxis: {
      data: ["Fiction", "Non-Fiction", "Poetry", "Biography", "Children"],
    },
    yAxis: {},
    series: [
      {
        name: "Sales",
        type: "bar",
        data: [120, 200, 150, 80, 70],
      },
    ],
  };

  // Reading Analytics Chart
  const readingAnalyticsOption = {
    title: {
      text: "Pages Read (Last 7 Days)",
    },
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["Pages Read"],
    },
    xAxis: {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "Pages Read",
        type: "line",
        data: [120, 132, 101, 134, 90, 230, 210],
        smooth: true,
      },
    ],
  };

  // Activities Table Columns
  const activityColumns = [
    {
      title: "Book Name",
      dataIndex: "bookName",
      key: "bookName",
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card loading={loading} className="hover:shadow-md transition-shadow">
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

        <Card loading={loading} className="hover:shadow-md transition-shadow">
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

        <Card loading={loading} className="hover:shadow-md transition-shadow">
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

        <Card loading={loading} className="hover:shadow-md transition-shadow">
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

        <Card loading={loading} className="hover:shadow-md transition-shadow">
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
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
};
