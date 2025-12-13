/**
 * Utility functions for input sanitization
 * Prevents NoSQL injection attacks
 */

/**
 * Escape special regex characters in a string
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for regex
 */
const escapeRegex = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes MongoDB operators and converts to safe types
 * @param {*} input - Input to sanitize
 * @returns {*} Sanitized input
 */
const sanitizeInput = (input) => {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === 'string') {
    return input;
  }

  // Handle numbers and booleans
  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  // Handle objects - remove MongoDB operators
  if (typeof input === 'object') {
    const sanitized = {};
    for (const key in input) {
      // Skip MongoDB operators ($gt, $lt, $ne, etc.)
      if (key.startsWith('$')) {
        continue;
      }
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }

  return input;
};

/**
 * Sanitize query parameters for safe MongoDB queries
 * @param {Object} query - Query object
 * @returns {Object} Sanitized query
 */
const sanitizeQuery = (query) => {
  return sanitizeInput(query);
};

module.exports = {
  escapeRegex,
  sanitizeInput,
  sanitizeQuery
};
