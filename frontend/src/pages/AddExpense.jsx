import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expensesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ExpenseForm.css';

const AddExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
    receipt: null,
    receiptPreview: null,
  });
  
  // Categories must match the backend enum in Expense.js
  const [categories] = useState([
    { value: 'travel', label: 'Travel' },
    { value: 'food', label: 'Food' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'office', label: 'Office' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState('');
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'receipt' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          receipt: file,
          receiptPreview: reader.result
        }));
      };
      
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for the field being edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
      isValid = false;
    }
    
    if (!formData.date) {
      errors.date = 'Date is required';
      isValid = false;
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Parse amount and ensure it's a valid number
      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Ensure category is selected and valid
      const category = formData.category?.trim().toLowerCase();
      if (!category) {
        throw new Error('Please select a category');
      }
      
      // Create FormData for the request
      const formDataToSend = new FormData();
      formDataToSend.append('amount', amountValue);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('category', category);
      if (formData.notes) {
        formDataToSend.append('notes', formData.notes);
      }
      
      // Add receipt file if present
      if (formData.receipt) {
        formDataToSend.append('receipt', formData.receipt);
      }
      
      console.log('Sending form data with receipt:', formData.receipt ? 'Yes' : 'No');
      
      // Use the API service for consistency
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // Let the browser set the Content-Type with boundary for FormData
        },
        body: formDataToSend
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.json().catch(e => ({
        error: 'Failed to parse response: ' + e.message
      }));
      
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add expense. Please try again.');
      }
      
      // Show success message
      setSuccess('Expense added successfully!');
      
      // Reset form
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
        receipt: null,
        receiptPreview: null,
      });
      
      // Redirect to expenses list after a short delay
      setTimeout(() => {
        navigate('/expenses');
      }, 1500);
      
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err.message || 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/expenses');
    }
  };
  
  return (
    <div className="expense-form-container">
      <div className="expense-form-header">
        <h1>Add New Expense</h1>
        <p>Fill in the details below to add a new expense</p>
      </div>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-grid">
          {/* Amount */}
          <div className={`form-group ${formErrors.amount ? 'has-error' : ''}`}>
            <label htmlFor="amount">Amount *</label>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            {formErrors.amount && (
              <div className="error-message">{formErrors.amount}</div>
            )}
          </div>
          
          {/* Date */}
          <div className={`form-group ${formErrors.date ? 'has-error' : ''}`}>
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-control"
              required
            />
            {formErrors.date && (
              <div className="error-message">{formErrors.date}</div>
            )}
          </div>
          
          {/* Category */}
          <div className={`form-group ${formErrors.category ? 'has-error' : ''}`}>
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {formErrors.category && (
              <div className="error-message">{formErrors.category}</div>
            )}
          </div>
          
          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="Add any notes about the expense"
            />
          </div>
          
          {/* Receipt Upload */}
          <div className="form-group">
            <label htmlFor="receipt">Receipt (Optional)</label>
            <div className="file-upload">
              <input
                type="file"
                id="receipt"
                name="receipt"
                onChange={handleChange}
                accept="image/*,.pdf"
                className="file-input"
              />
              <label htmlFor="receipt" className="file-upload-label">
                <span className="file-upload-button">Choose File</span>
                <span className="file-upload-text">
                  {formData.receipt ? formData.receipt.name : 'No file chosen'}
                </span>
              </label>
            </div>
            
            {formData.receiptPreview && (
              <div className="receipt-preview">
                <h4>Receipt Preview:</h4>
                {formData.receipt.type.startsWith('image/') ? (
                  <img 
                    src={formData.receiptPreview} 
                    alt="Receipt preview" 
                    className="receipt-image"
                  />
                ) : (
                  <div className="file-preview">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{formData.receipt.name}</span>
                  </div>
                )}
                <button 
                  type="button" 
                  className="btn-text"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      receipt: null,
                      receiptPreview: null
                    }));
                    // Reset file input
                    document.getElementById('receipt').value = '';
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            
            <div className="file-hint">
              Accepted formats: JPG, PNG, PDF (Max 5MB)
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
