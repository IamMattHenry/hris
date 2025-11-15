import * as db from "../config/db.js";
import logger from "../utils/logger.js";

const getUserDepartmentId = async (userId) => {
  if (!userId) return null;
  const record = await db.getOne(
    "SELECT department_id FROM employees WHERE user_id = ?",
    [userId]
  );
  return record?.department_id ?? null;
};

export const getAllPositions = async (req, res, next) => {
  try {
    const { department_id } = req.query;

    let query = `
      SELECT jp.*, d.department_name
      FROM job_positions jp
      LEFT JOIN departments d ON jp.department_id = d.department_id
    `;

    const conditions = [];
    const params = [];

    if (department_id) {
      conditions.push("jp.department_id = ?");
      params.push(department_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
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

    // Prevent admin from creating positions for other departments
    const createdBy = req.user?.user_id;
    if (req.user?.role === "admin") {
      const adminDeptId = await getUserDepartmentId(createdBy);
      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admin is not associated with any department",
        });
      }

      if (parseInt(department_id, 10) !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admins can only manage positions within their department",
        });
      }
    }

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
    const updates = { ...req.body };

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

    // Restrict admins to their own department
    const updatedBy = req.user?.user_id;
    if (req.user?.role === "admin") {
      const adminDeptId = await getUserDepartmentId(updatedBy);
      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admin is not associated with any department",
        });
      }

      if (position.department_id !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admins can only edit positions within their department",
        });
      }

      if (
        updates.department_id &&
        parseInt(updates.department_id, 10) !== adminDeptId
      ) {
        return res.status(403).json({
          success: false,
          message: "Admins cannot move positions to another department",
        });
      }

      updates.department_id = adminDeptId;
    }

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

    if (req.user?.role === "admin") {
      const adminDeptId = await getUserDepartmentId(deletedBy);
      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admin is not associated with any department",
        });
      }

      if (position.department_id !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: "Admins can only delete positions within their department",
        });
      }
    }

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
