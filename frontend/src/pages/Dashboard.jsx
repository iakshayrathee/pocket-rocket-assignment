import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { expensesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent expenses
        const expensesResponse = await expensesApi.getExpenses('limit=5&sort=-date');
        setRecentExpenses(expensesResponse.data || []);
        
        // Helper function to extract expenses from API response
        const getExpensesFromResponse = (response) => {
          if (!response) return [];
          // Check if response is an array
          if (Array.isArray(response)) return response;
          // Check if response has a 'data' property that's an array
          if (response.data && Array.isArray(response.data)) return response.data;
          // Check if response has an 'expenses' property that's an array
          if (response.expenses && Array.isArray(response.expenses)) return response.expenses;
          // If no array found, return empty array
          return [];
        };

        // If admin, fetch stats
        if (isAdmin) {
          // console.log('Fetching admin stats...');
          const [total, pending, approved, rejected] = await Promise.all([
            expensesApi.getExpenses('status=all').catch(err => {
              console.error('Error fetching total expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=pending').catch(err => {
              console.error('Error fetching pending expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=approved').catch(err => {
              console.error('Error fetching approved expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=rejected').catch(err => {
              console.error('Error fetching rejected expenses:', err);
              return { data: [] };
            }),
          ]);
          
          const totalExpenses = getExpensesFromResponse(total);
          const pendingExpenses = getExpensesFromResponse(pending);
          const approvedExpenses = getExpensesFromResponse(approved);
          const rejectedExpenses = getExpensesFromResponse(rejected);
          
          // console.log('Admin stats response:', { 
          //   totalExpenses: totalExpenses.length,
          //   pendingExpenses: pendingExpenses.length,
          //   approvedExpenses: approvedExpenses.length,
          //   rejectedExpenses: rejectedExpenses.length,
          //   sampleData: totalExpenses.slice(0, 2),
          //   rawResponse: {
          //     total: total,
          //     pending: pending,
          //     approved: approved,
          //     rejected: rejected
          //   }
          // });
          
          const statsData = {
            totalExpenses: totalExpenses.length,
            pendingExpenses: pendingExpenses.length,
            approvedExpenses: approvedExpenses.length,
            rejectedExpenses: rejectedExpenses.length,
          };
          
          setStats(statsData);
        } else {
          // For regular users, just get their own stats
          // console.log('Fetching user stats...');
          const [allExpenses, pending, approved, rejected] = await Promise.all([
            expensesApi.getExpenses('').catch(err => {
              console.error('Error fetching all expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=pending').catch(err => {
              console.error('Error fetching pending expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=approved').catch(err => {
              console.error('Error fetching approved expenses:', err);
              return { data: [] };
            }),
            expensesApi.getExpenses('status=rejected').catch(err => {
              console.error('Error fetching rejected expenses:', err);
              return { data: [] };
            }),
          ]);
          
          const allExpensesList = getExpensesFromResponse(allExpenses);
          const pendingExpenses = getExpensesFromResponse(pending);
          const approvedExpenses = getExpensesFromResponse(approved);
          const rejectedExpenses = getExpensesFromResponse(rejected);
          
          // console.log('User stats response:', { 
          //   allExpensesCount: allExpensesList.length,
          //   pendingCount: pendingExpenses.length,
          //   approvedCount: approvedExpenses.length,
          //   rejectedCount: rejectedExpenses.length,
          //   sampleData: allExpensesList.slice(0, 2),
          //   rawResponse: {
          //     allExpenses: allExpenses,
          //     pending: pending,
          //     approved: approved,
          //     rejected: rejected
          //   }
          // });
          
          const statsData = {
            totalExpenses: allExpensesList.length,
            pendingExpenses: pendingExpenses.length,
            approvedExpenses: approvedExpenses.length,
            rejectedExpenses: rejectedExpenses.length,
          };
          
          // console.log('Setting user stats:', statsData);
          setStats(statsData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'status-badge approved';
      case 'rejected':
        return 'status-badge rejected';
      default:
        return 'status-badge pending';
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <p className="stat-value">{stats.totalExpenses}</p>
          <p className="stat-description">All-time expenses</p>
        </div>
        
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value">{stats.pendingExpenses}</p>
          <p className="stat-description">Awaiting approval</p>
        </div>
        
        <div className="stat-card">
          <h3>Approved</h3>
          <p className="stat-value">{stats.approvedExpenses}</p>
          <p className="stat-description">Approved expenses</p>
        </div>
        
        <div className="stat-card">
          <h3>Rejected</h3>
          <p className="stat-value">{stats.rejectedExpenses}</p>
          <p className="stat-description">Not approved</p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/expenses/add" className="btn btn-primary">
            + Add New Expense
          </Link>
          <Link to="/expenses" className="btn btn-secondary">
            View All Expenses
          </Link>
          {isAdmin && (
            <Link to="/analytics" className="btn btn-secondary">
              View Analytics
            </Link>
          )}
        </div>
      </div>
      
      {/* Recent Expenses */}
      <div className="recent-expenses">
        <div className="section-header">
          <h2>Recent Expenses</h2>
          <Link to="/expenses" className="view-all">View All</Link>
        </div>
        
        {recentExpenses.length > 0 ? (
          <div className="expenses-table">
            <div className="table-header">
              <div className="table-cell">Date</div>
              <div className="table-cell">Notes</div>
              <div className="table-cell">Category</div>
              <div className="table-cell amount">Amount</div>
              <div className="table-cell status">Status</div>
            </div>
            
            {recentExpenses.map((expense) => (
              <div key={expense._id} className="table-row">
                <div className="table-cell">
                  {new Date(expense.date).toLocaleDateString()}
                </div>
                <div className="table-cell notes">
                  <Link to={`/expenses/${expense._id}/edit`}>
                    {expense.notes || 'No notes'}
                  </Link>
                </div>
                <div className="table-cell">
                  {expense.category}
                </div>
                <div className="table-cell amount">
                  {formatCurrency(expense.amount)}
                </div>
                <div className="table-cell status">
                  <span className={getStatusBadgeClass(expense.status)}>
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-expenses">
            <p>No expenses found. <Link to="/expenses/add">Add your first expense</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
