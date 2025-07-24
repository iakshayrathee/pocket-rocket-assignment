/**
 * Utility functions for generating CSV content
 */

/**
 * Convert an array of objects to CSV string
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Object} options - Options for CSV generation
 * @param {Array} [options.fields] - Array of field names to include in CSV
 * @param {Object} [options.fieldLabels] - Mapping of field names to display labels
 * @param {Object} [options.formatters] - Object with formatter functions for specific fields
 * @param {Boolean} [options.includeHeader=true] - Whether to include header row
 * @param {Array} [options.headerRow] - Custom header row values
 * @returns {String} - CSV formatted string
 */
const jsonToCsv = (data, { 
  fields = null, 
  fieldLabels = {}, 
  formatters = {},
  includeHeader = true,
  headerRow = null
} = {}) => {
  if (!data || !data.length) {
    return '';
  }

  // Use provided fields or get all unique fields from data
  const allFields = fields || Object.keys(data[0]);
  
  // Get headers with labels if provided
  const headers = headerRow || allFields.map(field => {
    const label = fieldLabels[field] || field;
    return label;
  });

  // Process each row
  const rows = data.map(item => {
    return allFields.map(field => {
      let value = item[field];
      
      // Apply formatter if exists
      if (formatters[field] && typeof formatters[field] === 'function') {
        value = formatters[field](value, item);
      }
      
      // Handle nested objects/arrays
      if (value !== null && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Skip escaping if value is already a number or boolean
      if (typeof value === 'string') {
        // Only escape if the string contains commas, quotes, or newlines
        if (/[,"\n]/.test(value)) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
      }
      
      return value !== undefined ? value : '';
    });
  });

  // Combine headers and rows
  const result = [];
  if (includeHeader) {
    result.push(headers.join(','));
  }
  
  // Add data rows
  rows.forEach(row => {
    result.push(row.join(','));
  });
  
  return result.join('\n');
};

/**
 * Generate a filename with timestamp
 * @param {String} prefix - Prefix for the filename
 * @returns {String} - Formatted filename
 */
const generateFilename = (prefix) => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
  return `${prefix}_${timestamp}.csv`;
};

module.exports = {
  jsonToCsv,
  generateFilename
};
