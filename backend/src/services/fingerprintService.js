import axios from 'axios';
import logger from '../utils/logger.js';

const bridgeUrl = process.env.BRIDGE_URL || 'http://localhost:3001';

export const deleteFingerprintTemplate = async (fingerprintId) => {
  if (fingerprintId === undefined || fingerprintId === null) {
    throw new Error('Fingerprint ID is required');
  }

  try {
    await axios.post(`${bridgeUrl}/fingerprint/delete`, {
      fingerprint_id: fingerprintId,
    });
  } catch (error) {
    const message = error?.response?.data?.message || error.message;
    logger.error(`Bridge delete fingerprint error: ${message}`);
    const err = new Error('Bridge service not available. Make sure fingerprint bridge is running.');
    err.status = error?.response?.status || 503;
    throw err;
  }
};
