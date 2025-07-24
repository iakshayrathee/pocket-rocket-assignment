import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../services/api';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { FaFileExport } from "react-icons/fa";

import { format, subMonths, subDays } from 'date-fns';
import './Analytics.css';

// Register ChartJS components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register the components we'll use
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30'); // 30, 90, 180, 365 days
  const [chartData, setChartData] = useState({
    byCategory: { labels: [], datasets: [] },
    byStatus: { labels: [], datasets: [] },
    trend: { labels: [], datasets: [] },
  });

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(timeRange));
      
      // Format dates for API
      const formatDate = (date) => format(date, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });
      
      // Fetch all data in parallel
      const [byCategoryRes, byStatusRes, trendRes] = await Promise.all([
        analyticsApi.getExpenseByCategory(params.toString()),
        analyticsApi.getExpenseByStatus(params.toString()),
        analyticsApi.getExpenseTrend(params.toString())
      ]);
      
      // Extract data from responses
      const byCategory = byCategoryRes.data || [];
      const byStatus = byStatusRes.data || [];
      const trend = trendRes.data || [];
      
      // Process category data
      const categoryData = {
        labels: byCategory.map(item => item._id || 'Uncategorized'),
        datasets: [{
          label: 'Total Amount ($)',
          data: byCategory.map(item => item.totalAmount || 0),
          backgroundColor: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#d946ef'
          ],
          borderWidth: 1,
        }]
      };
      
      // Process status data
      const statusData = {
        labels: byStatus.map(item => item._id.charAt(0).toUpperCase() + item._id.slice(1)),
        datasets: [{
          data: byStatus.map(item => item.count || 0),
          backgroundColor: [
            '#f59e0b', // Pending
            '#10b981', // Approved
            '#ef4444'  // Rejected
          ],
          borderWidth: 1,
        }]
      };
      
      // Process trend data
      const trendLabels = trend.map(item => {
        const date = new Date(item._id);
        return format(date, 'MMM d');
      });
      
      const trendData = {
        labels: trendLabels,
        datasets: [{
          label: 'Daily Expenses ($)',
          data: trend.map(item => item.totalAmount || 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
        }]
      };
      
      setChartData({
        byCategory: categoryData,
        byStatus: statusData,
        trend: trendData,
      });
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or time range changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, isAdmin]);

  // Handle export to CSV
  const handleExportToCSV = async () => {
    if (!isAdmin || exporting) return;
    
    try {
      setExporting(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(timeRange));
      
      // Format dates for API
      const formatDate = (date) => format(date, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });
      
      await analyticsApi.exportAnalytics(params.toString());
    } catch (err) {
      console.error('Error exporting analytics data:', err);
      setError('Failed to export analytics data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
    fetchAnalyticsData();
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(context.parsed.y);
            } else if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  // Pie chart options
  const pieOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button 
          className="btn btn-primary"
          onClick={fetchAnalyticsData}
        >
          Retry
        </button>
      </div>
    );
  }

  // Not admin state
  if (!isAdmin) {
    return (
      <div className="not-authorized">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Expense Analytics</h1>
        <div className="flex justify-between items-center mb-6">
          <div className="time-range-selector">
            <label htmlFor="timeRange" className="mr-2">Time Range: </label>
            <select 
              id="timeRange" 
              value={timeRange} 
              onChange={handleTimeRangeChange}
              className="p-2 border rounded"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last Year</option>
            </select>
          </div>
          
          <button 
            onClick={handleExportToCSV}
            disabled={exporting}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            <FaFileExport className="mr-2" />
            {exporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>
      
      <div className="chart-grid">
        {/* Expense Trend Chart */}
        <div className="chart-card">
          <h3>Expense Trend</h3>
          <div className="chart-wrapper">
            <Line 
              data={chartData.trend} 
              options={chartOptions} 
            />
          </div>
        </div>
        
        {/* Expense by Category */}
        <div className="chart-card">
          <h3>Expenses by Category</h3>
          <div className="chart-wrapper">
            <Bar 
              data={chartData.byCategory} 
              options={chartOptions} 
            />
          </div>
        </div>
        
        {/* Expense by Status */}
        <div className="chart-card">
          <h3>Expenses by Status</h3>
          <div className="chart-wrapper pie-chart">
            <Pie 
              data={chartData.byStatus} 
              options={pieOptions} 
            />
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <h4>Total Expenses</h4>
            <div className="summary-value">
              ${chartData.byCategory.datasets[0]?.data.reduce((a, b) => a + b, 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) || '0.00'}
            </div>
            <div className="summary-description">
              Across all categories
            </div>
          </div>
          
          <div className="summary-card">
            <h4>Categories</h4>
            <div className="summary-value">
              {chartData.byCategory.labels?.length || 0}
            </div>
            <div className="summary-description">
              Unique expense categories
            </div>
          </div>
          
          <div className="summary-card">
            <h4>Avg. Daily Spend</h4>
            <div className="summary-value">
              ${chartData.trend.datasets[0]?.data.length > 0 
                ? (chartData.trend.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.trend.datasets[0].data.length).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : '0.00'}
            </div>
            <div className="summary-description">
              Average per day
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
