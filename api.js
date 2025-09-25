/**
 * PC Connect API Service
 * 
 * This module handles all API communications with the PC Connect service.
 * Enhanced with modern error handling, retry logic, and timeout support.
 */

const API_URL = 'https://api.eric-n.com/pc-connect/';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

/**
 * Creates a fetch request with timeout support
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};

/**
 * Retry wrapper for API calls
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>}
 */
const withRetry = async (apiCall, maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 408 (timeout)
      if (error.message.includes('HTTP error') && 
          error.message.includes('4') && 
          !error.message.includes('408')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Fetches the current PC status from the API
 * @returns {Promise<boolean>} True if PC is on, false if off
 * @throws {Error} If the API request fails
 */
export const fetchPCStatus = async () => {
  return withRetry(async () => {
    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PC-Connect-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format - expected JSON');
      }

      const data = await response.json();
      
      // Handle different possible response formats with better validation
      if (typeof data === 'object' && data !== null) {
        // Check for explicit status fields
        if (data.hasOwnProperty('status')) {
          if (typeof data.status === 'string') {
            return data.status.toLowerCase() === 'on' || data.status.toLowerCase() === 'online';
          }
          return Boolean(data.status);
        }
        
        if (data.hasOwnProperty('isOn')) {
          return Boolean(data.isOn);
        }
        
        if (data.hasOwnProperty('online')) {
          return Boolean(data.online);
        }
        
        if (data.hasOwnProperty('powered')) {
          return Boolean(data.powered);
        }
      }
      
      // Default fallback - assume any truthy response means PC is on
      return Boolean(data);
      
    } catch (error) {
      console.error('Error fetching PC status:', error);
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        throw new Error('Connection timeout - please check your internet connection');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - please check your internet connection');
      }
      if (error.message.includes('HTTP error')) {
        throw new Error(`Server error: ${error.message}`);
      }
      
      throw new Error('Failed to fetch PC status');
    }
  });
};

/**
 * Sends a command to turn on the PC
 * @returns {Promise<object>} API response data
 * @throws {Error} If the API request fails
 */
export const turnOnPC = async () => {
  return withRetry(async () => {
    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PC-Connect-App/1.0',
        },
        body: JSON.stringify({
          action: 'turn_on',
          timestamp: new Date().toISOString(),
          source: 'mobile_app',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      // Some APIs might return plain text success message
      const textResponse = await response.text();
      return { success: true, message: textResponse };
      
    } catch (error) {
      console.error('Error turning on PC:', error);
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        throw new Error('Request timeout - the PC might be starting up');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - please check your connection');
      }
      if (error.message.includes('HTTP error')) {
        if (error.message.includes('503') || error.message.includes('502')) {
          throw new Error('PC service temporarily unavailable');
        }
        throw new Error(`Server error: ${error.message}`);
      }
      
      throw new Error('Failed to turn on PC');
    }
  });
};

/**
 * Health check for the API endpoint
 * @returns {Promise<boolean>} True if API is reachable
 */
export const checkAPIHealth = async () => {
  try {
    const response = await fetchWithTimeout(API_URL, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'PC-Connect-App/1.0',
      },
    }, 5000); // Shorter timeout for health check
    
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};
