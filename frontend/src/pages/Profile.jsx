import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { FaUser, FaEnvelope, FaSave, FaTimes, FaEdit, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Validate form
  const validateForm = (isPasswordUpdate = false) => {
    const newErrors = {};
    
    if (editMode) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }
    
    if (isPasswordUpdate || changePasswordMode) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    console.log('handleProfileUpdate called, editMode:', editMode);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Prepare update data - only include fields from User model
      const updateData = {
        name: formData.name,
        email: formData.email
      };
      
      // Include password change if in change password mode
      if (changePasswordMode) {
        if (!validateForm(true)) {
          return;
        }
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // Call API to update profile
      const response = await authApi.updateProfile(updateData);
      
      // Update user in context with the updated user data
      if (response.data) {
        updateUser(response.data);
      }
      
      // Reset form and show success message
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setChangePasswordMode(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit mode
  const handleCancel = () => {
    console.log('handleCancel called, resetting form');
    // Reset form to original user data
    setFormData({
      name: user.name || '',
      email: user.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setEditMode(false);
    setChangePasswordMode(false);
  };

  // Toggle password change section
  const toggleChangePassword = () => {
    console.log('toggleChangePassword called, current mode:', changePasswordMode);
    setChangePasswordMode(!changePasswordMode);
    setErrors(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  // Format role for display
  const formatRole = (role) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : '';
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account information and settings</p>
      </div>
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="profile-role">
              {formatRole(user?.role)}
            </div>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="profile-form" noValidate>
            <div className="form-grid">
              {/* Name */}
              <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                <label htmlFor="name">
                  <FaUser className="input-icon" /> Full Name
                </label>
                {editMode ? (
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="form-control-static">{formData.name || 'Not provided'}</div>
                )}
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>
              
              
              {/* Email */}
              <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                <label htmlFor="email">
                  <FaEnvelope className="input-icon" /> Email
                </label>
                {editMode ? (
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="form-control-static">{formData.email || 'Not provided'}</div>
                )}
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
            </div>
            
            {/* Change Password Section */}
            {changePasswordMode && (
              <div className="password-section">
                <h3>Change Password</h3>
                
                <div className={`form-group ${errors.currentPassword ? 'has-error' : ''}`}>
                  <label htmlFor="currentPassword">
                    <FaLock className="input-icon" /> Current Password
                  </label>
                  <div className="password-input-group">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter current password"
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPassword.current ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <div className="error-message">{errors.currentPassword}</div>
                  )}
                </div>
                
                <div className={`form-group ${errors.newPassword ? 'has-error' : ''}`}>
                  <label htmlFor="newPassword">
                    <FaLock className="input-icon" /> New Password
                  </label>
                  <div className="password-input-group">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <div className="error-message">{errors.newPassword}</div>
                  )}
                </div>
                
                <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                  <label htmlFor="confirmPassword">
                    <FaLock className="input-icon" /> Confirm New Password
                  </label>
                  <div className="password-input-group">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Confirm new password"
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="error-message">{errors.confirmPassword}</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Form Actions */}
            <div className="form-actions">
              {!editMode ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Edit button clicked, setting editMode to true');
                      setEditMode(true);
                    }}
                  >
                    <FaEdit className="btn-icon" /> Edit Profile
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={toggleChangePassword}
                  >
                    <FaLock className="btn-icon" /> 
                    {changePasswordMode ? 'Cancel Password Change' : 'Change Password'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      'Saving...'
                    ) : (
                      <>
                        <FaSave className="btn-icon" /> Save Changes
                      </>
                    )}
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <FaTimes className="btn-icon" /> Cancel
                  </button>
                  
                  {!changePasswordMode && (
                    <button 
                      type="button" 
                      className="btn btn-outline"
                      onClick={toggleChangePassword}
                      disabled={loading}
                    >
                      <FaLock className="btn-icon" /> Change Password
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
