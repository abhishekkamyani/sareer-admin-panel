import { Modal, Select, DatePicker, Button, message } from 'antd';
import { useState } from 'react';
import { generateReport } from '../utils/APIs';
import { DownloadOutlined } from '@ant-design/icons';
import { utils, writeFile } from 'xlsx';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

export const ReportModal = ({ visible, onCancel }) => {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const report = await generateReport(reportType, dateRange);
      downloadCSVReport(report);
      message.success('CSV report generated successfully');
      onCancel();
    } catch (error) {
      message.error('Failed to generate report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVReport = (report) => {
    try {
      // Create worksheet
      const ws = utils.json_to_sheet(report.data);
      
      // Create workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, report.type);
      
      // Generate filename with current date
      const dateStr = dayjs().format('YYYY-MM-DD');
      const filename = `sareer_${report.type}_report_${dateStr}.csv`;
      
      // Export to CSV
      writeFile(wb, filename, { bookType: 'csv' });
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw error;
    }
  };

  return (
    <Modal
      title="Generate CSV Report"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="generate"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleGenerate}
        >
          Download CSV
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div>
          <label className="block mb-2">Report Type</label>
          <Select
            value={reportType}
            onChange={setReportType}
            className="w-full"
          >
            <Option value="sales">Sales Report</Option>
            <Option value="users">Users Report</Option>
            <Option value="books">Books Report</Option>
          </Select>
        </div>

        {reportType === 'sales' && (
          <div>
            <label className="block mb-2">Date Range</label>
            <RangePicker
              className="w-full"
              onChange={setDateRange}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};