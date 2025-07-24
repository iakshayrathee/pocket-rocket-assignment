const API_BASE_URL = 'https://pocket-rocket-assignment.onrender.com/';

// Helper function to handle fetch requests
const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Don't set Content-Type for FormData, let the browser set it with the correct boundary
  const isFormData = options.body instanceof FormData;
  
  const defaultHeaders = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  // Only stringify the body if it's not FormData
  const body = !isFormData && options.body ? JSON.stringify(options.body) : options.body;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    body,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  // Handle file downloads (CSV exports)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'export.csv';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    return { success: true, filename };
  }

  // Handle JSON responses
  try {
    const text = await response.text();
    if (!text) return {}; // Empty response
    return JSON.parse(text);
  } catch (e) {
    if (!response.ok) {
      throw new Error('Something went wrong');
    }
    return {};
  }
};

// Auth API
export const authApi = {
  login: (credentials) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  register: (userData) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  getMe: () => fetchApi('/auth/me'),
  
  updateProfile: (userData) =>
    fetchApi('/auth/me', {
      method: 'PUT',
      body: userData,
    }),
};

// Expenses API
export const expensesApi = {
  getExpenses: (params = '') => fetchApi(`/expenses${params ? `?${params}` : ''}`),
  
  getExpense: (id) => fetchApi(`/expenses/${id}`),
  
  createExpense: (expenseData) =>
    fetchApi('/expenses', {
      method: 'POST',
      body: expenseData, // Will be FormData for file uploads
    }),
  
  updateExpense: (id, updates) =>
    fetchApi(`/expenses/${id}`, {
      method: 'PUT',
      body: updates, // Will be FormData for file uploads
    }),
  
  deleteExpense: (id) =>
    fetchApi(`/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// Analytics API (Admin only)
export const analyticsApi = {
  getExpenseByCategory: (params = '') => 
    fetchApi(`/expenses/analytics/categories${params ? `?${params}` : ''}`),
  getExpenseByStatus: (params = '') => 
    fetchApi(`/expenses/analytics/status${params ? `?${params}` : ''}`),
  getExpenseTrend: (params = '') => 
    fetchApi(`/expenses/analytics/trend${params ? `?${params}` : ''}`),
  exportAnalytics: (params = '') => 
    fetchApi(`/expenses/analytics/export${params ? `?${params}` : ''}`),
};

// Audit Logs API (Admin only)
export const auditLogsApi = {
  getAuditLogs: (params = '') => 
    fetchApi(`/audit-logs${params ? `?${params}` : ''}`),
  exportAuditLogs: (params = '') => 
    fetchApi(`/audit-logs/export${params ? `?${params}` : ''}`),
};
