import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { expensesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Expenses.css';


const Expenses = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  
  // Function to handle receipt click
  const handleReceiptClick = useCallback((receipt, e) => {
    e.preventDefault();
    if (receipt && receipt.url) {
      // For PDFs, open in new tab
      if (receipt.mimeType === 'application/pdf') {
        const pdfUrl = `http://localhost:8000${receipt.url}`;
        window.open(pdfUrl, '_blank');
      } 
      // For images, open in modal
      else if (receipt.mimeType.startsWith('image/')) {
        setSelectedReceipt(receipt);
      }
    }
  }, []);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || '',
  });

  const categories = [
    { value: 'travel', label: 'Travel' },
    { value: 'food', label: 'Food' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'office', label: 'Office' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' }
  ];

  // Fetch expenses based on filters and pagination
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query string from filters and pagination
      const params = new URLSearchParams();
      
      // Add filters to params if they exist
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
      // Format date filters as simple date strings (YYYY-MM-DD)
      // The backend will handle the date range conversion
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.search) {
        // Simple search on the notes field
        params.append('notes', filters.search);
      }
      
      // Add pagination
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      
      // Sort by date descending by default
      params.append('sort', '-date');
      
      // Update URL with current filters
      setSearchParams(params);
      
      // Make API call
      const response = await expensesApi.getExpenses(params.toString());
      
      setExpenses(response.data || []);
      
      // Update pagination info from response
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total || 0,
          totalPages: response.pagination.pages || 1,
          page: response.pagination.page || 1,
          limit: response.pagination.limit || 10
        }));
      }
      
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenses when component mounts or filters/pagination changes
  useEffect(() => {
    fetchExpenses();
  }, [filters, pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  // Handle status update
  const handleStatusUpdate = async (expenseId, newStatus) => {
    try {
      setLoading(true);
      await expensesApi.updateExpense(expenseId, { status: newStatus });
      
      // Update the local state to reflect the change
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense._id === expenseId 
            ? { 
                ...expense, 
                status: newStatus,
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'current-user' // This would ideally come from the API response
              } 
            : expense
        )
      );
      
      // Status updated successfully
      console.log(`Expense status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating expense status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
      
      // Scroll to top of the list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get status badge class
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

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      status: '',
      category: '',
      startDate: '',
      endDate: '',
      search: '',
    });
  };

  return (
    <div className="expenses-page">
      <div className="page-header">
        <h1>My Expenses</h1>
        <Link to="/expenses/add" className="btn btn-primary">
          + Add New Expense
        </Link>
      </div>
      
      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <h3>Filters</h3>
          <button 
            type="button" 
            className="btn btn-text"
            onClick={resetFilters}
            disabled={!Object.values(filters).some(Boolean)}
          >
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="startDate">From Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endDate">To Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="form-control"
              min={filters.startDate}
            />
          </div>
          

        </div>
      </div>
      
      {/* Results Summary */}
      <div className="results-summary">
        <p>
          {expenses.length > 0 ? (
            <>
              Showing <strong>1-{expenses.length}</strong> of <strong>{pagination.total}</strong> expenses
              {filters.status && ` with status "${filters.status}"`}
              {filters.category && ` in category "${categories.find(cat => cat.value === filters.category)?.label || filters.category}"`}
            </>
          ) : (
            'No expenses found matching your criteria'
          )}
        </p>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading expenses...</p>
        </div>
      )}
      
      {/* Error State */}
      {error && !loading && (
        <div className="error-message">
          {error}
          <button 
            type="button" 
            className="btn btn-text"
            onClick={fetchExpenses}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Expenses List */}
      {!loading && !error && expenses.length > 0 && (
        <div className="expenses-list">
          <div className="table-responsive">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Category</th>
                  <th className="amount">Amount</th>
                  <th>Receipt</th>
                  <th className="status">Status</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/expenses/${expense._id}/edit`} className="expense-description">
                        {expense.notes || 'No notes'}
                      </Link>
                    </td>
                    <td>{expense.category}</td>
                    <td className="amount">{formatCurrency(expense.amount)}</td>
                    <td className="receipt-cell">
                      {expense.receipt && expense.receipt.url ? (
                        <button
                          type="button"
                          className="receipt-link"
                          onClick={(e) => handleReceiptClick(expense.receipt, e)}
                          title={expense.receipt.filename || 'View receipt'}
                        >
                          📄
                        </button>
                      ) : (
                        <span className="no-receipt" title="No receipt attached">
                          No Receipt
                        </span>
                      )}
                    </td>
                    <td className="status">
                      {isAdmin ? (
                        <select
                          className={`status-select ${expense.status}`}
                          value={expense.status}
                          onChange={(e) => handleStatusUpdate(expense._id, e.target.value)}
                          disabled={loading}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <span className={getStatusBadgeClass(expense.status)}>
                          {expense.status}
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <Link 
                        to={`/expenses/${expense._id}/edit`} 
                        className="btn-icon"
                        title="Edit expense"
                      >
                        ✏️
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-text"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              
              <div className="page-info">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              
              <button
                type="button"
                className="btn btn-text"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </button>
              
              <div className="page-size">
                <label htmlFor="pageSize">Show:</label>
                <select
                  id="pageSize"
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination(prev => ({
                      ...prev,
                      limit: parseInt(e.target.value),
                      page: 1 // Reset to first page when changing page size
                    }));
                  }}
                  className="form-control"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !error && expenses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No expenses found</h3>
          <p>Try adjusting your filters or add a new expense.</p>
          <Link to="/expenses/add" className="btn btn-primary">
            + Add Your First Expense
          </Link>
        </div>
      )}
      
      {/* Image Modal (only for images, not PDFs) */}
      {selectedReceipt && selectedReceipt.mimeType.startsWith('image/') && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedReceipt.filename || 'Receipt'}</h3>
              <button className="close-button" onClick={() => setSelectedReceipt(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <img 
                src={selectedReceipt.url} 
                alt="Receipt" 
                className="receipt-image"
                style={{ maxWidth: '100%', maxHeight: '80vh' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add these styles to Expenses.css
/*
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  width: 800px;
  overflow: auto;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #333;
}

.receipt-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  margin: 0;
}

.receipt-link:hover {
  color: #0056b3;
  text-decoration: underline;
}
*/

export default Expenses;
