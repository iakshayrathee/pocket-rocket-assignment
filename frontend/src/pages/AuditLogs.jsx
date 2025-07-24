import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditLogsApi } from '../services/api';
import { format } from 'date-fns';
import { FaSearch, FaFilter, FaSync, FaInfoCircle, FaFileExport } from 'react-icons/fa';
import './AuditLogs.css';

const AuditLogs = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [showFilters, setShowFilters] = useState(false);

  // Available actions for filter dropdown - must match backend enum
  const actionTypes = [
    'user:register',
    'user:login',
    'expense:create',
    'expense:update',
    'expense:delete',
    'expense:status_change'
  ];

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Build query params
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: new Date(filters.startDate).toISOString() }),
        ...(filters.endDate && { endDate: new Date(filters.endDate).toISOString() }),
        ...(filters.search && { search: filters.search })
      });
      
      const response = await auditLogsApi.getAuditLogs(params.toString());
      
      setLogs(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.count || 0,
        totalPages: response.pagination?.next ? response.pagination.next.page : 1
      }));
      
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs on component mount and when filters/pagination change
  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, pagination.limit, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle search input
  const handleSearch = (e) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  // Handle export to CSV
  const handleExportToCSV = async () => {
    if (!isAdmin || exporting) return;
    
    try {
      setExporting(true);
      
      // Build query params from current filters
      const params = new URLSearchParams({
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      });
      
      await auditLogsApi.exportAuditLogs(params.toString());
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      setError('Failed to export audit logs. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get action badge color
  const getActionBadgeClass = (action) => {
    if (!action) return 'secondary';
    
    const actionMap = {
      'create': 'success',
      'update': 'info',
      'delete': 'danger',
      'login': 'success',
      'register': 'primary',
      'status_change': 'warning'
    };

    // Extract the action type (e.g., 'create' from 'expense:create')
    const actionType = action.split(':')[1] || '';
    return actionMap[actionType] || 'secondary';
  };

  // Loading state
  if (loading && logs?.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading audit logs...</p>
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
          onClick={fetchAuditLogs}
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
    <div className="audit-logs-container">
      <div className="audit-logs-header">
        <h1>Audit Logs</h1>
        <p>Track system activities and user actions</p>
      </div>
      
      {/* Search and Filters */}
      <div className="audit-logs-toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Search logs..."
              className="search-input"
              value={filters.search}
              onChange={(e) => handleFilterChange({
                target: { name: 'search', value: e.target.value }
              })}
            />
            <button type="submit" className="search-button">
              <FaSearch className="search-icon" />
            </button>
          </div>
        </form>
        
        <div className="toolbar-actions">
          <div className="flex space-x-2">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter className="mr-1" /> {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button 
              className="btn btn-primary flex items-center"
              onClick={handleExportToCSV}
              disabled={exporting}
            >
              <FaFileExport className="mr-1" /> 
              {exporting ? 'Exporting...' : 'Export to CSV'}
            </button>
          </div>
          
          <button 
            className="btn btn-outline"
            onClick={fetchAuditLogs}
            title="Refresh"
          >
            <FaSync className={`action-icon ${loading ? 'spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="action">Action Type</label>
              <select
                id="action"
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="">All Actions</option>
                {actionTypes.map((action) => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ').replace(/\w\S*/g, txt => 
                      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                    )}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="userId">User ID</label>
              <input
                type="text"
                id="userId"
                name="userId"
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={handleFilterChange}
                className="form-control"
              />
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
          
          <div className="filters-actions">
            <button 
              type="button" 
              className="btn btn-text"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
            
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
      
      {/* Logs Table */}
      <div className="logs-table-container">
        <div className="table-responsive">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length > 0 ? (
                logs.map((log) => {
                  // Format action for display
                  const actionDisplay = log.action?.replace(':', ' ').replace(/_/g, ' ');
                  
                  // Format details based on action type
                  let details = 'No additional details';
                  if (log.details) {
                    if (typeof log.details === 'object') {
                      details = Object.entries(log.details)
                        .filter(([key]) => !['removeReceipt', '__v', '_id'].includes(key)) // Skip internal fields
                        .map(([key, value]) => {
                          // Format date fields
                          if (value && (key.toLowerCase().includes('date') || key.toLowerCase().includes('at'))) {
                            try {
                              const date = new Date(value);
                              // Check if the date is valid
                              if (!isNaN(date.getTime())) {
                                return `${key}: ${format(date, 'MMM d, yyyy h:mm a')}`;
                              }
                            } catch (e) {
                              console.warn(`Failed to parse date for ${key}:`, value);
                            }
                          }
                          // Handle nested objects and arrays
                          if (value && typeof value === 'object' && !Array.isArray(value)) {
                            return `${key}: ${JSON.stringify(value, (k, v) => {
                              // Skip internal fields in nested objects
                              if (['_id', '__v'].includes(k)) return undefined;
                              // Format dates in nested objects
                              if (v && (k.toLowerCase().includes('date') || k.toLowerCase().includes('at'))) {
                                try {
                                  const d = new Date(v);
                                  if (!isNaN(d.getTime())) {
                                    return format(d, 'MMM d, yyyy h:mm a');
                                  }
                                } catch (e) {
                                  // If date parsing fails, return as is
                                }
                              }
                              return v;
                            }, 2)}`;
                          }
                          return `${key}: ${JSON.stringify(value, null, 2)}`;
                        })
                        .join('\n');
                    } else {
                      details = log.details;
                    }
                  }
                  
                  return (
                    <tr key={log._id}>
                      <td className="timestamp">
                        <div className="timestamp-inner">
                          {formatTimestamp(log.createdAt)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${getActionBadgeClass(log.action)}`}>
                          {actionDisplay}
                        </span>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {log.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="user-details">
                            <div className="user-name">
                              {log.user?.name || 'System'}
                            </div>
                            <div className="user-email">
                              {log.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="details">
                        <div className="details-content">
                          {details}
                        </div>
                        {log.targetExpense && (
                          <div className="metadata-tooltip">
                            <FaInfoCircle className="info-icon" />
                            <div className="metadata-popup">
                              <div className="expense-details">
                                <h4>Expense Details</h4>
                                <div className="detail-row">
                                  <span className="detail-label">Amount:</span>
                                  <span className="detail-value">${log.targetExpense.amount}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Category:</span>
                                  <span className="detail-value">{log.targetExpense.category}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Status:</span>
                                  <span className={`status-badge status-${log.targetExpense.status?.toLowerCase() || 'pending'}`}>
                                    {log.targetExpense.status?.toUpperCase() || 'PENDING'}
                                  </span>
                                </div>
                                {log.targetExpense.notes && (
                                  <div className="detail-row notes">
                                    <span className="detail-label">Notes:</span>
                                    <div className="detail-value">{log.targetExpense.notes}</div>
                                  </div>
                                )}
                              </div>
                              <div className="action-details">
                                <h4>Action Details</h4>
                                <pre className="details-pre">
                                  {details}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${log.status === 'failed' ? 'error' : 'success'}`}>
                          {log.status ? log.status.toUpperCase() : 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="no-results">
                    <div className="no-results-content">
                      <FaInfoCircle className="no-results-icon" />
                      <p>No audit logs found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            
            <div className="pagination-pages">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            
            <button
              className="pagination-button"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
            
            <div className="pagination-info">
              Showing {logs?.length} of {pagination.total} logs
            </div>
            
            <div className="page-size-selector">
              <label htmlFor="pageSize">Per page:</label>
              <select
                id="pageSize"
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({
                  ...prev,
                  limit: parseInt(e.target.value),
                  page: 1 // Reset to first page when changing page size
                }))}
                className="form-control"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
