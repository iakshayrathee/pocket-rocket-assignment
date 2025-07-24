# Expense Tracker with Admin Dashboard

A comprehensive expense tracking application with role-based access control (RBAC) built with the MERN stack (MongoDB, Express, React, Node.js). The application allows users to track their expenses, view analytics, and manage their finances effectively.

## 🚀 Key Features

- 👤 User Authentication & Authorization (JWT)
- 👑 Role-Based Access Control (Admin/User roles)
- 💰 Expense Management (Add, Edit, Delete)
- 📊 Analytics Dashboard with Charts
- 📋 Audit Logs for all user actions
- 📤 Export Data to PDF/CSV
- 📱 Responsive Design

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19
- **Routing**: React Router v7
- **State Management**: React Context API
- **Charts**: Chart.js with react-chartjs-2
- **PDF Generation**: React-PDF
- **UI Components**: React Icons
- **Date Handling**: date-fns
- **Bundler**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Uploads**: Multer
- **Request Validation**: express-validator
- **Logging**: Morgan
- **Security**: bcryptjs for password hashing

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iakshayrathee/expense-tracker.git
   cd expense-tracker
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Edit with your configuration
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: https://expense-tracker-pr.netlify.app/
   - Backend API: https://pocket-rocket-assignment.onrender.com

## 🏗 Project Structure

### Frontend (`/frontend/src`)
```
├── components/
│   ├── common/          # Reusable components (AdminRoute, PrivateRoute)
│   └── layout/          # Layout components
├── context/             # React context providers
├── pages/               # Page components
│   ├── AddExpense.jsx   # Add new expense
│   ├── Analytics.jsx    # Analytics dashboard
│   ├── AuditLogs.jsx    # View audit logs
│   ├── Dashboard.jsx    # Main dashboard
│   ├── EditExpense.jsx  # Edit existing expense
│   ├── Expenses.jsx     # List all expenses
│   ├── Login.jsx        # Login page
│   ├── Profile.jsx      # User profile
│   └── Register.jsx     # Registration page
└── services/            # API service layer
```

### Backend (`/backend/src`)
```
├── config/              # Configuration files
├── controllers/         # Route controllers
│   ├── adminController.js     # Admin operations
│   ├── analyticsController.js # Analytics endpoints
│   ├── auditLogController.js  # Audit log management
│   ├── authController.js      # Authentication
│   ├── expenseController.js   # Expense operations
│   └── exportController.js    # Data export
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── error.js        # Error handling
│   └── upload.js       # File upload handling
├── models/             # Mongoose models
│   ├── AuditLog.js     # Audit log schema
│   ├── Expense.js      # Expense schema
│   └── User.js         # User schema
└── routes/             # API routes
```

## 🔧 Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

## 🚀 Development

### Running the application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

### Available Scripts

**Backend**
- `npm run dev`: Start development server with nodemon
- `npm start`: Start production server

**Frontend**
- `npm run dev`: Start Vite dev server
- `npm run build`: Create production build
- `npm run preview`: Preview production build locally

## 🔒 Authentication & Authorization

The application uses JWT for authentication with the following user roles:

- **User**: Can manage their own expenses and view personal analytics
- **Admin**: Has full access to all features including user management and audit logs

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Expenses
- `GET /api/expenses` - Get all expenses (paginated)
- `POST /api/expenses` - Create new expense
- `GET /api/expenses/:id` - Get single expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Analytics
- `GET /api/analytics/summary` - Get expense summary
- `GET /api/analytics/categories` - Get expenses by category
- `GET /api/analytics/timeline` - Get expenses over time

### Admin
- `GET /api/admin/users` - Get all users (Admin only)
- `GET /api/admin/audit-logs` - Get all audit logs (Admin only)


## 📝 Implementation Details

### Security Measures
- JWT authentication with HTTP-only cookies
- Role-based access control
- Input validation on all API endpoints
- Password hashing with bcrypt
- CORS configuration
- Audit logging for all sensitive operations

### Performance Optimizations
- Pagination for expense lists
- Database indexing on frequently queried fields
- Efficient aggregation pipelines for analytics
- Client-side caching where appropriate

