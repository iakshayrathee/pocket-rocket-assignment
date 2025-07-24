const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
require('colors');
require('dotenv').config();

// Route files
const auth = require('./routes/auth');
const expenses = require('./routes/expenses');
const auditLogs = require('./routes/auditLogs');
const admin = require('./routes/admin');
const analytics = require('./routes/analytics');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Set static folders
const publicDir = path.join(__dirname, '../public');
const uploadsDir = path.join(publicDir, 'uploads');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files
app.use(express.static(publicDir));

// Raw request body logging middleware
app.use((req, res, next) => {
  // let data = '';
  // req.on('data', chunk => {
  //   data += chunk;
  // });
  // req.on('end', () => {
  //   console.log('=== RAW REQUEST BODY ===');
  //   console.log(data);
  //   console.log('========================');
  // });
  next();
});

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging middleware
app.use((req, res, next) => {
  // console.log('=== PARSED REQUEST BODY ===');
  // console.log(JSON.stringify(req.body, null, 2));
  // console.log('===========================');
  next();
});

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Match your frontend URL
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Set security headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  next();
});

// Mount routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/expenses', expenses);
app.use('/api/v1/audit-logs', auditLogs);
app.use('/api/v1/admin', admin);
app.use('/api/v1/expenses/analytics', analytics);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    environment: process.env.NODE_ENV
  });
});

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000

const server = app.listen(PORT, () => {
  console.log(`\n`.bgBlue);
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.cyan.underline.bold);
  console.log(`\n`.bgBlue);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
