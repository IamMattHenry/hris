import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getAllPositions = async (req, res, next) => {
  try {
    const { department_id } = req.query;

    let query = `
      SELECT jp.*, d.department_name 
      FROM job_positions jp
      LEFT JOIN departments d ON jp.department_id = d.department_id
    `;
    
    const params = [];

    // Filter by department if provided
    if (department_id) {
      query += ' WHERE jp.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY jp.position_id DESC';

    const positions = await db.getAll(query, params);

    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    logger.error('Get all positions error:', error);
    next(error);
  }
};

export const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const position = await db.getOne(`
      SELECT jp.*, d.department_name 
      FROM job_positions jp
      LEFT JOIN departments d ON jp.department_id = d.department_id
      WHERE jp.position_id = ?
    `, [id]);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found',
      });
    }

    res.json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error('Get position by ID error:', error);
    next(error);
  }
};

export default {
  getAllPositions,
  getPositionById,
};

