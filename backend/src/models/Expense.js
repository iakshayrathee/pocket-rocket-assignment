const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'travel',
        'food',
        'accommodation',
        'office',
        'entertainment',
        'utilities',
        'other',
      ],
    },
    date: {
      type: Date,
      required: [true, 'Please add a date'],
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot be more than 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot be more than 500 characters'],
    },
    receipt: {
      filename: String,
      url: String,
      mimeType: String,
      size: Number
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ status: 1, date: -1 });

expenseSchema.pre('save', function (next) {
  // If status is being updated to approved/rejected, set reviewedAt
  if (this.isModified('status') && ['approved', 'rejected'].includes(this.status)) {
    this.reviewedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
