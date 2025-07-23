const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

// Initialize multer with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    fieldNameSize: 100, // Max field name size
    fieldSize: 2000000, // For multipart forms, the max file size (in bytes)
  },
  preservePath: true
});

// Middleware to handle file upload and form data
const handleFileUpload = (req, res, next) => {
  // First, handle the file upload
  upload.single('receipt')(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error processing file upload'
      });
    }
    
    // Log the incoming request body and file for debugging
    console.log('Request body after multer:', req.body);
    console.log('Uploaded file:', req.file);
    
    try {
      // If file was uploaded, add the file path to req.body
      if (req.file) {
        req.body.receipt = `/uploads/${req.file.filename}`;
      }
      
      // Ensure required fields are present
      if (!req.body.amount) {
        throw new Error('Amount is required');
      }
      
      // Parse amount to number if it exists
      req.body.amount = parseFloat(req.body.amount);
      if (isNaN(req.body.amount)) {
        throw new Error('Invalid amount format');
      }
      
      // Ensure category is present
      if (!req.body.category) {
        throw new Error('Category is required');
      }
      
      // Ensure date is in the correct format
      if (req.body.date) {
        const date = new Date(req.body.date);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        req.body.date = date;
      } else {
        req.body.date = new Date();
      }
      
      next();
    } catch (error) {
      console.error('Error processing form data:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Error processing form data'
      });
    }
  });
};

module.exports = handleFileUpload;
