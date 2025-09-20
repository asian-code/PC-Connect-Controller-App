/**
 * PC Connect API Service
 * 
 * This module handles all API communications with the PC Connect service.
 */

const API_URL = 'https://api.eric-n.com/pc-connect/';

/**
 * Fetches the current PC status from the API
 * @returns {Promise<boolean>} True if PC is on, false if off
 * @throws {Error} If the API request fails
 */
export const fetchPCStatus = async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle different possible response formats
    if (data.hasOwnProperty('status')) {
      return data.status === 'on' || data.status === true;
    }
    
    if (data.hasOwnProperty('isOn')) {
      return data.isOn === true;
    }
    
    // Default fallback - assume any truthy response means PC is on
    return Boolean(data);
    
  } catch (error) {
    console.error('Error fetching PC status:', error);
    throw new Error('Failed to fetch PC status');
  }
};

/**
 * Sends a command to turn on the PC
 * @returns {Promise<void>}
 * @throws {Error} If the API request fails
 */
export const turnOnPC = async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'turn_on',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return the response data in case it contains useful information
    return await response.json();
    
  } catch (error) {
    console.error('Error turning on PC:', error);
    throw new Error('Failed to turn on PC');
  }
};
