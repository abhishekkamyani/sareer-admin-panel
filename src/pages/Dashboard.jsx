import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
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
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../utils/firebaseApis";

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

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const [loading, setLoading] = useState(false);

  const [salesByCategoryOption, setSalesByCategoryOption] = useState({
    title: {
      text: "Sales by Category",
    },
    tooltip: {},
    legend: {
      data: ["Sales"],
    },
    xAxis: {
      type: "category",
      data: categories || [],
    },
    yAxis: {},
    series: [
      {
        name: "Sales",
        type: "bar",
        data: [0, 0, 0, 0], // Initialize with zeros
      },
    ],
  });

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

      // Total Sales (PKR and USD)
      const ordersCol = collection(db, "orders");

      const completedOrdersQuery = query(
        ordersCol,
        where("paymentStatus", "==", "completed")
      );
      const ordersSnapshot = await getDocs(completedOrdersQuery);

      let totalPKR = 0;
      let totalUSD = 0;
      let totalCopies = 0;

      ordersSnapshot.forEach((doc) => {
        const order = doc.data();
        // if (order.currency === "PKR") {
        totalPKR += order.total;
        // } else if (order.currency === "USD") {
        // totalUSD += order.total;
        // }
        totalCopies += order.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      });

      // Active Users (last 24 hours)
      const usersCol = collection(db, "users");
      const activeUsersQuery = query(
        usersCol,
        where("lastLogin", ">=", dayjs().subtract(1, "day").toDate())
      );
      const activeUsersSnapshot = await getCountFromServer(activeUsersQuery);

      setStats({
        totalBooks: booksSnapshot.data().count,
        newReleases: newReleasesSnapshot.data().count,
        totalSalesPKR: totalPKR,
        totalSalesUSD: totalUSD,
        activeUsers: activeUsersSnapshot.data().count,
        totalCopiesSold: totalCopies,
      });

      // Fetch recent activities (from orders)
      const activitiesQuery = query(
        ordersCol,
        orderBy("orderDate", "desc"),
        limit(5)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);

      setActivities(
        activitiesSnapshot.docs.map((doc) => {
          const order = doc.data();
          return {
            id: doc.id,
            bookName: order.items[0]?.title || "Multiple Books",
            action: "Purchase",
            date: order.orderDate.toDate().toLocaleString(),
            user: order.username,
          };
        })
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Call these in useEffect
  useEffect(() => {
    fetchStats();
    fetchSalesByCategory();
    fetchReadingAnalytics();
  }, [dateRange, categories]);

  // Fetch sales by category data
  const fetchSalesByCategory = async () => {
    const ordersCol = collection(db, "orders");
    const snapshot = await getDocs(ordersCol);

    const categorySales = categories.reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {});

    snapshot.forEach((doc) => {
      const order = doc.data();
      order.items.forEach((item) => {
        item.categories?.forEach((category) => {
          if (categorySales.hasOwnProperty(category)) {
            categorySales[category] += item.price * item.quantity;
          }
        });
      });
    });

    setSalesByCategoryOption((prev) => ({
      ...prev,
      xAxis: {
        ...prev.xAxis,
        data: Object.keys(categorySales),
      },
      series: [
        {
          ...prev.series[0],
          data: Object.values(categorySales),
        },
      ],
    }));
  };

  // Reading Analytics Chart (pages read)
  const readingAnalyticsOption = {
    title: {
      text: "Reading Activity (Last 7 Days)",
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: Array.from({ length: 7 }, (_, i) =>
        dayjs()
          .subtract(6 - i, "day")
          .format("ddd, MMM D")
      ),
    },
    yAxis: {
      type: "value",
      name: "Pages Read",
    },
    series: [
      {
        name: "Pages Read",
        type: "line",
        data: Array(7).fill(0), // Initialize with zeros
        smooth: true,
      },
    ],
  };

  // Fetch reading analytics
  const fetchReadingAnalytics = async () => {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);

    const dailyPages = Array(7).fill(0);

    snapshot.forEach((doc) => {
      const user = doc.data();
      user.readingProgress?.forEach((book) => {
        const readDate = book.lastReadAt?.toDate();
        if (readDate) {
          const daysAgo = dayjs().diff(readDate, "day");
          if (daysAgo >= 0 && daysAgo < 7) {
            dailyPages[6 - daysAgo] += book.totalPagesRead || 0;
          }
        }
      });
    });

    readingAnalyticsOption.series[0].data = dailyPages;
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
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
};
