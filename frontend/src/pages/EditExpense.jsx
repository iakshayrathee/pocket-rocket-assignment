import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { expensesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ExpenseForm.css';

const EditExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Initialize form with default values
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
    receipt: null,
    receiptPreview: null,
    existingReceipt: null,
  });
  
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);
  
  const categories = [
    'travel',
    'food',
    'accommodation',
    'office',
    'entertainment',
    'utilities',
    'other'
  ];
  
  const getDisplayCategory = (category) => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  // Normalize category for comparison (case-insensitive)
  const getMatchingCategory = (category) => {
    if (!category) return '';
    const normalizedInput = category.toLowerCase();
    return categories.find(cat => cat === normalizedInput) || category;
  };
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // Fetch expense data when component mounts
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        console.log('Fetching expense with ID:', id);
        const response = await expensesApi.getExpense(id);
        console.log('Raw API response:', response);
        
        // Handle case where the response might be nested under a data property
        const expense = response?.data || response;
        
        if (!expense) {
          throw new Error('Expense not found');
        }
        
        // Debug log to check the structure of the returned expense
        console.log('Fetched expense:', expense);
        
        // Check if the current user is the owner or an admin
        if (user.role !== 'admin' && (!expense.user || expense.user._id !== user._id)) {
          throw new Error('You do not have permission to edit this expense');
        }
        
        console.log('Raw expense data from API:', expense);
        console.log('Receipt URL from API:', expense.receiptUrl);
        console.log('Expense object keys:', Object.keys(expense));
        
        // Format the date for the date input
        let formattedDate = new Date().toISOString().split('T')[0];
        if (expense?.date) {
          try {
            const dateValue = new Date(expense.date);
            if (!isNaN(dateValue.getTime())) {
              formattedDate = dateValue.toISOString().split('T')[0];
            }
          } catch (dateError) {
            console.error('Error formatting date:', dateError);
          }
        }
        
        // Create new form data with API values
        const newFormData = {
          amount: expense.amount !== undefined ? expense.amount.toString() : '',
          date: formattedDate,
          category: getMatchingCategory(expense.category) || '',
          notes: expense.notes || expense.note || expense.description || '', // Handle all possible note/description fields
          receipt: null, // Reset file input
          receiptPreview: (expense.receipt?.url) ? expense.receipt.url : null,
          existingReceipt: expense.receipt ? {
            url: expense.receipt.url,
            filename: expense.receipt.filename || expense.receipt.url.split('/').pop() || 'receipt',
            mimeType: expense.receipt.mimeType
          } : null
        };
        
        console.log('Processed receipt data:', newFormData.existingReceipt);
        
        console.log('Processed form data with normalized category:', newFormData);
        
        console.log('Processed form data:', newFormData);
        
        // Debug log the new form data before setting state
        console.log('New form data to be set:', newFormData);
        
        // Set the form data directly to ensure all fields are updated
        setFormData(newFormData);
        
        // Log the form data after state update (will show in next render)
        setTimeout(() => {
          console.log('Form data after state update:', formData);
        }, 0);
        
      } catch (err) {
        console.error('Error fetching expense:', err);
        // More detailed error message
        const errorMessage = err.response?.data?.message || 
                           err.message || 
                           'Failed to load expense. Please try again.';
        setError(errorMessage);
        
        // Optionally redirect to expenses list if the expense doesn't exist or permission denied
        if (err.message.includes('not found') || err.message.includes('permission')) {
          setTimeout(() => {
            navigate('/expenses');
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchExpense();
  }, [id, user]);
  
  // Log form data changes
  useEffect(() => {
    console.log('Form data changed:', formData);
  }, [formData]);
  
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
          receiptPreview: reader.result,
          existingReceipt: null // Clear existing receipt when a new one is selected
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
      setSubmitting(true);
      setError('');
      
      // Debug: Log the current form data
      console.log('Form data before submission:', {
        amount: formData.amount,
        date: formData.date,
        category: formData.category,
        notes: formData.notes,
        hasReceipt: !!formData.receipt,
        hasExistingReceipt: !!formData.existingReceipt
      });
      
      // Prepare data for submission
      const updateData = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        // Ensure category is lowercase to match backend enum
        category: formData.category.toLowerCase(),
        notes: formData.notes || ''
      };
      
      console.log('Sending category as:', updateData.category);
      
      // If existing receipt was removed, add a flag
      if (formData.existingReceipt === null && formData.receipt === null) {
        updateData.removeReceipt = true;
      }
      
      // Debug: Log the data being sent
      console.log('Sending update data:', updateData);
      
      // For file uploads, we'll need to handle separately if needed
      // For now, we'll just send the JSON data
      console.log('Sending update request to:', `/expenses/${id}`);
      
      const response = await expensesApi.updateExpense(id, updateData);
      console.log('Update response:', response);
      
      if (!response.success) {
        throw new Error('Update was not successful');
      }
      
      // Log the updated expense data
      console.log('Updated expense data:', response.data);
      
      // Redirect to expenses list with success message
      navigate('/expenses', { 
        state: { message: 'Expense updated successfully!' } 
      });
      
      return response;
    } catch (err) {
      console.error('Error updating expense:', err);
      setError(err.message || 'Failed to update expense. Please try again.');
      throw err; // Re-throw to allow parent components to handle if needed
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle receipt removal
  const handleRemoveReceipt = () => {
    setFormData(prev => ({
      ...prev,
      receipt: null,
      receiptPreview: null,
      existingReceipt: null
    }));
    // Reset file input
    document.getElementById('receipt').value = '';
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to discard your changes?')) {
      navigate('/expenses');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading expense details...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => navigate('/expenses')}
        >
          Back to Expenses
        </button>
      </div>
    );
  }
  
  return (
    <div className="expense-form-container">
      <div className="expense-form-header">
        <h1>Edit Expense</h1>
        <p>Update the details of your expense</p>
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
                <option key={category} value={category}>
                  {getDisplayCategory(category)}
                </option>
              ))}
            </select>
            {formErrors.category && (
              <div className="error-message">{formErrors.category}</div>
            )}
          </div>
          
          {/* Description */}
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="Add any additional notes about this expense"
            />
          </div>
          
          {/* Receipt Upload */}
          <div className="form-group">
            <label htmlFor="receipt">Receipt {formData.existingReceipt ? '(Update)' : '(Optional)'}</label>
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
                <span className="file-upload-button">
                  {formData.existingReceipt || formData.receipt ? 'Change File' : 'Choose File'}
                </span>
                <span className="file-upload-text">
                  {formData.receipt 
                    ? formData.receipt.name 
                    : formData.existingReceipt 
                      ? formData.existingReceipt.filename 
                      : 'No file chosen'}
                </span>
              </label>
            </div>
            
            {(formData.receiptPreview || formData.existingReceipt) && (
              <div className="receipt-preview">
                <h4>Receipt Preview:</h4>
                {formData.receiptPreview ? (
                  // Newly selected receipt preview
                  formData.receipt?.type?.startsWith('image/') ? (
                    <img 
                      src={formData.receiptPreview} 
                      alt="Receipt preview" 
                      className="receipt-image"
                    />
                  ) : (
                    <div className="file-preview">
                      <span className="file-icon">📄</span>
                      <span className="file-name">
                        {formData.receipt?.name || formData.existingReceipt?.filename || 'receipt'}
                      </span>
                    </div>
                  )
                ) : formData.existingReceipt ? (
                  // Existing receipt preview
                  formData.existingReceipt.url.match(/\.(jpeg|jpg|gif|png)$/) ? (
                    <img 
                      src={formData.existingReceipt.url} 
                      alt="Receipt preview" 
                      className="receipt-image"
                    />
                  ) : (
                    <div className="file-preview">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{formData.existingReceipt.filename}</span>
                      <a 
                        href={formData.existingReceipt.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-text"
                      >
                        View
                      </a>
                    </div>
                  )
                ) : null}
                
                {(formData.receipt || formData.existingReceipt) && (
                  <button 
                    type="button" 
                    className="btn-text text-danger"
                    onClick={handleRemoveReceipt}
                  >
                    Remove
                  </button>
                )}
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
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Update Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditExpense;
