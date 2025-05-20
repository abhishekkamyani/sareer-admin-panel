import { useEffect, useState } from "react";
import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import { db } from "../utils/firebase";
import ReactECharts from 'echarts-for-react';
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
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalSalesPKR: 0,
    totalSalesUSD: 0,
    newReleases: 0,
    activeUsers: 0,
    totalCopiesSold: 0
  });
  const [activities, setActivities] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total Books
      const booksCol = collection(db, 'books');
      const booksSnapshot = await getCountFromServer(booksCol);
      
      // New Releases (last 30 days)
      const newReleasesQuery = query(
        booksCol, 
        where('releaseDate', '>=', dayjs().subtract(30, 'day').toDate())
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
        totalSalesUSD: 0,  // Replace with actual query
        activeUsers: 0,    // Replace with actual query
        totalCopiesSold: 0 // Replace with actual query
      });

      // Fetch recent activities
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('timestamp', '>=', dateRange[0].toDate()),
        where('timestamp', '<=', dateRange[1].toDate()),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      setActivities(activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp.toDate().toLocaleString()
      })));
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
      text: 'Sales by Category'
    },
    tooltip: {},
    legend: {
      data: ['Sales']
    },
    xAxis: {
      data: ['Fiction', 'Non-Fiction', 'Poetry', 'Biography', 'Children']
    },
    yAxis: {},
    series: [
      {
        name: 'Sales',
        type: 'bar',
        data: [120, 200, 150, 80, 70]
      }
    ]
  };

  // Reading Analytics Chart
  const readingAnalyticsOption = {
    title: {
      text: 'Pages Read (Last 7 Days)'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Pages Read']
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Pages Read',
        type: 'line',
        data: [120, 132, 101, 134, 90, 230, 210],
        smooth: true
      }
    ]
  };

  // Activities Table Columns
  const activityColumns = [
    {
      title: 'Book Name',
      dataIndex: 'bookName',
      key: 'bookName'
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user'
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card loading={loading}>
          <div className="flex items-center">
            <BookOutlined className="text-blue-500 text-2xl mr-3" />
            <div>
              <p className="text-gray-500">Total Books</p>
              <p className="text-2xl font-semibold">{stats.totalBooks}</p>
            </div>
          </div>
        </Card>
        
        <Card loading={loading}>
          <div className="flex items-center">
            <DollarOutlined className="text-green-500 text-2xl mr-3" />
            <div>
              <p className="text-gray-500">Total Sales</p>
              <p className="text-2xl font-semibold">
                ₨{stats.totalSalesPKR.toLocaleString()} / ${stats.totalSalesUSD.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        
        <Card loading={loading}>
          <div className="flex items-center">
            <StarOutlined className="text-yellow-500 text-2xl mr-3" />
            <div>
              <p className="text-gray-500">New Releases</p>
              <p className="text-2xl font-semibold">{stats.newReleases}</p>
            </div>
          </div>
        </Card>
        
        <Card loading={loading}>
          <div className="flex items-center">
            <UserOutlined className="text-purple-500 text-2xl mr-3" />
            <div>
              <p className="text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold">{stats.activeUsers}</p>
            </div>
          </div>
        </Card>
        
        <Card loading={loading}>
          <div className="flex items-center">
            <ShoppingCartOutlined className="text-red-500 text-2xl mr-3" />
            <div>
              <p className="text-gray-500">Total Copies Sold</p>
              <p className="text-2xl font-semibold">{stats.totalCopiesSold}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Quick Links */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button type="primary" icon={<UploadOutlined />}>
          Upload Book
        </Button>
        <Button icon={<FileTextOutlined />}>
          View Books
        </Button>
        <Button icon={<NotificationOutlined />}>
          Send Notification
        </Button>
        <Button icon={<BarChartOutlined />}>
          Generate Report
        </Button>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Sales by Category">
          <ReactECharts 
            option={salesByCategoryOption} 
            style={{ height: 400 }} 
          />
        </Card>
        <Card title="Reading Analytics">
          <ReactECharts 
            option={readingAnalyticsOption} 
            style={{ height: 400 }} 
          />
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card 
        title="Recent Activity" 
        extra={
          <RangePicker 
            value={dateRange}
            onChange={setDateRange}
            disabledDate={current => current && current > dayjs().endOf('day')}
          />
        }
      >
        <Table 
          columns={activityColumns} 
          dataSource={activities} 
          loading={loading}
          pagination={false}
          rowKey="id"
        />
      </Card>
    </div>
  );
};