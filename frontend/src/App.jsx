import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import EditExpense from './pages/EditExpense';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
// import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import './App.css';

// Main App Component with Routing
const AppContent = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route element={<PrivateRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="expenses/add" element={<AddExpense />} />
          <Route path="expenses/:id/edit" element={<EditExpense />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin Only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
        
        {/* 404 - Not Found */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Route>
    </Routes>
  );
};

// App Wrapper with Providers
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
