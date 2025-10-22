/**
 * Proxmox VM Controller API Service
 * 
 * This module handles all API communications with the backend service.
 * Includes authentication, VM management, and error handling.
 */

const API_URL = 'http://localhost:8000';  // Update with your Cloudflare tunnel URL
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

// Store access token in memory
let accessToken = null;
let currentUser = null;

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
 * Set the access token for authenticated requests
 */
export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * Set the current user
 */
export const setCurrentUser = (user) => {
  currentUser = user;
};

/**
 * Get the current user
 */
export const getCurrentUser = () => {
  return currentUser;
};

/**
 * Clear authentication data
 */
export const clearAuth = () => {
  accessToken = null;
  currentUser = null;
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Token and user data
 */
export const login = async (email, password) => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    setCurrentUser(data.user);
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to login');
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/auth/request-password-reset?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to request password reset');
    }

    return await response.json();
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Fetch all accessible VMs
 * @returns {Promise<Array>} List of VMs
 */
export const fetchVMs = async () => {
  return withRetry(async () => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/vms/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.vms || [];
      
    } catch (error) {
      console.error('Error fetching VMs:', error);
      throw new Error(error.message || 'Failed to fetch VMs');
    }
  });
};

/**
 * Get VM status
 * @param {number} vmId - VM ID
 * @returns {Promise<object>} VM status
 */
export const getVMStatus = async (vmId) => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/vms/${vmId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting VM ${vmId} status:`, error);
    throw error;
  }
};

/**
 * Start a VM
 * @param {number} vmId - VM ID
 * @returns {Promise<object>} Operation result
 */
export const startVM = async (vmId) => {
  return withRetry(async () => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/vms/${vmId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start VM');
      }

      return await response.json();
      
    } catch (error) {
      console.error(`Error starting VM ${vmId}:`, error);
      throw new Error(error.message || 'Failed to start VM');
    }
  });
};

/**
 * Health check for the API endpoint
 * @returns {Promise<boolean>} True if API is reachable
 */
export const checkAPIHealth = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/health`, {
      method: 'GET',
    }, 5000); // Shorter timeout for health check
    
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};
