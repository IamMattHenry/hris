import * as db from "../config/db.js";
import logger from "../utils/logger.js";

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
      query += " WHERE jp.department_id = ?";
      params.push(department_id);
    }

    query += " ORDER BY jp.position_id DESC";

    const positions = await db.getAll(query, params);

    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    logger.error("Get all positions error:", error);
    next(error);
  }
};

export const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const position = await db.getOne(
      `
      SELECT jp.*, d.department_name 
      FROM job_positions jp
      LEFT JOIN departments d ON jp.department_id = d.department_id
      WHERE jp.position_id = ?
    `,
      [id]
    );

    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found",
      });
    }

    res.json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error("Get position by ID error:", error);
    next(error);
  }
};

export const getTotalPosAvailability = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT SUM(availability) AS total_availability FROM job_positions"
    );
    const total_availability = rows.total_availability || 0;

    res.json({
      success: true,
      data: { total_availability },
    });
  } catch (error) {
    logger.error("Get total position availability error:", error);
    next(error);
  }
};

export const createPosition = async (req, res, next) => {
  try {
    const { position_name, position_desc, department_id, availability } = req.body;

    // Validate required fields
    if (!position_name || !department_id) {
      return res.status(400).json({
        success: false,
        message: "Position name and department are required",
      });
    }

    // Get user ID from JWT token for audit trail
    const createdBy = req.user?.user_id;

    // Insert position without code first
    const positionId = await db.insert("job_positions", {
      position_name,
      position_desc,
      department_id,
      availability: availability || 0,
      created_by: createdBy,
    });

    // Generate position code based on the ID
    const positionCode = `POS-${String(positionId).padStart(4, "0")}`;

    // Update the position with the generated code
    await db.update(
      "job_positions",
      { position_code: positionCode },
      "position_id = ?",
      [positionId]
    );

    logger.info(`Position created: ${positionId}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || 1,
        action: "CREATE",
        module: "positions",
        description: `Created position ${position_name} (${positionCode})`,
        created_by: createdBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.status(201).json({
      success: true,
      message: "Position created successfully",
      data: {
        position_id: positionId,
        position_code: positionCode,
        position_name,
        position_desc,
        department_id,
        availability,
      },
    });
  } catch (error) {
    logger.error("Create position error:", error);
    next(error);
  }
};

export const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if position exists
    const position = await db.getOne(
      "SELECT * FROM job_positions WHERE position_id = ?",
      [id]
    );
    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found",
      });
    }

    // Prevent updating the code
    if (updates.position_code) {
      delete updates.position_code;
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;
    if (updatedBy) {
      updates.updated_by = updatedBy;
    }

    const affectedRows = await db.update(
      "job_positions",
      updates,
      "position_id = ?",
      [id]
    );

    logger.info(`Position updated: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || 1,
        action: "UPDATE",
        module: "positions",
        description: `Updated position ${position.position_name} (${position.position_code})`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: "Position updated successfully",
      affectedRows,
    });
  } catch (error) {
    logger.error("Update position error:", error);
    next(error);
  }
};

export const deletePosition = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if position exists
    const position = await db.getOne(
      "SELECT * FROM job_positions WHERE position_id = ?",
      [id]
    );
    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found",
      });
    }

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    const affectedRows = await db.deleteRecord(
      "job_positions",
      "position_id = ?",
      [id]
    );

    logger.info(`Position deleted: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: deletedBy || 1,
        action: "DELETE",
        module: "positions",
        description: `Deleted position ${position.position_name} (${position.position_code})`,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: "Position deleted successfully",
      affectedRows,
    });
  } catch (error) {
    logger.error("Delete position error:", error);
    next(error);
  }
};

export default {
  getAllPositions,
  getPositionById,
  getTotalPosAvailability,
  createPosition,
  updatePosition,
  deletePosition,
};
