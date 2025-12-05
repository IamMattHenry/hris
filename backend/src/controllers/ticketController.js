import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateTicketCode } from '../utils/codeGenerator.js';

/**
 * Get all tickets with user/employee information
 */
export const getAllTickets = async (req, res, next) => {
  try {
    const { status, user_id } = req.query;

    let query = `
      SELECT 
        t.*,
        u.username,
        e.first_name,
        e.last_name,
        e.employee_code,
        COALESCE(ee.email, pte.email) as email,
        jp.position_name,
        fixer.first_name as fixed_by_first_name,
        fixer.last_name as fixed_by_last_name,
        fixer.employee_code as fixed_by_code
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN employee_emails ee ON e.employee_id = ee.employee_id
      LEFT JOIN public_ticket_emails pte ON t.ticket_id = pte.ticket_id
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN users fixer_user ON t.fixed_by = fixer_user.user_id
      LEFT JOIN employees fixer ON fixer_user.user_id = fixer.user_id
    `;

    const params = [];
    const conditions = [];

    // Filter by status if provided
    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    // Filter by user_id if provided
    if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(user_id);
    }

    // If user is not superadmin, apply filtering based on their access level
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's sub-role
      const userSubrole = await db.getOne(
        `SELECT sub_role FROM user_roles WHERE user_id = ?`,
        [req.user.user_id]
      );

      const subRole = userSubrole?.sub_role || null;
      
      // If user has IT sub-role, show all tickets
      if (subRole !== 'it') {
        // For non-IT users, only show their own tickets
        conditions.push('t.user_id = ?');
        params.push(req.user.user_id);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.ticket_id DESC';

    const tickets = await db.getAll(query, params);

    res.json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  } catch (error) {
    logger.error('Get all tickets error:', error);
    next(error);
  }
};

/**
 * Get ticket by ID
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT 
        t.*,
        u.username,
        e.first_name,
        e.last_name,
        e.employee_code,
        COALESCE(ee.email, pte.email) as email,
        jp.position_name,
        fixer.first_name as fixed_by_first_name,
        fixer.last_name as fixed_by_last_name,
        fixer.employee_code as fixed_by_code
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN employee_emails ee ON e.employee_id = ee.employee_id
      LEFT JOIN public_ticket_emails pte ON t.ticket_id = pte.ticket_id
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN users fixer_user ON t.fixed_by = fixer_user.user_id
      LEFT JOIN employees fixer ON fixer_user.user_id = fixer.user_id
      WHERE t.ticket_id = ?
    `;

    const ticket = await db.getOne(query, [id]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // If user is not superadmin, check if they have permission to view this ticket
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's sub-role
      const userSubrole = await db.getOne(
        `SELECT sub_role FROM user_roles WHERE user_id = ?`,
        [req.user.user_id]
      );

      const subRole = userSubrole?.sub_role || null;
      
      // If user doesn't have IT sub-role and doesn't own the ticket, deny access
      if (subRole !== 'it' && ticket.user_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to view this ticket',
        });
      }
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    logger.error('Get ticket by ID error:', error);
    next(error);
  }
};

/**
 * Create a new internal ticket
 */
export const createTicket = async (req, res, next) => {
  try {
    const { user_id, title, description } = req.body;
    const createdBy = req.user?.user_id;

    // --- Validation ---
    if (!user_id || !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "User ID and title are required.",
      });
    }

    // Optional: prevent duplicate open tickets with same title for same user
    const existing = await db.getOne(
      "SELECT ticket_id FROM tickets WHERE user_id = ? AND title = ? AND status = 'open'",
      [user_id, title.trim()]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A similar open ticket already exists for this user.",
      });
    }

    // --- Insert base ticket record ---
    const ticketId = await db.insert("tickets", {
      user_id,
      title: title.trim(),
      description: description?.trim() || null,
      status: "open",
      created_by: createdBy || user_id,
    });

    // --- Generate and assign ticket code ---
    const ticketCode = generateTicketCode(ticketId);
    await db.update("tickets", { ticket_code: ticketCode }, "ticket_id = ?", [ticketId]);

    logger.info(`Ticket created: ${ticketId} (${ticketCode}) by user ${createdBy || user_id}`);

    // --- Activity log ---
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || user_id,
        action: "CREATE",
        module: "tickets",
        description: `Created ticket "${title}" (${ticketCode})`,
        created_by: createdBy || user_id,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      data: { ticket_id: ticketId, ticket_code: ticketCode },
    });
  } catch (error) {
    logger.error("Create ticket error:", error);
    next(error);
  }
};

/**
 * Create a new public ticket (unauthenticated user)
 */
export const createPublicTicket = async (req, res, next) => {
  try {
    const { title, description, email, name } = req.body;

    // --- Validation ---
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // --- Ensure public user exists ---
    let user = await db.getOne("SELECT user_id FROM users WHERE username = ?", ["public_user"]);

    if (!user) {
      const userId = await db.insert("users", {
        username: "public_user",
        password: "public_user", // placeholder; never used
        role: "employee",
        is_active: true,
      });

      await db.insert("employees", {
        employee_code: "EMP-0000",
        user_id: userId,
        first_name: "Public",
        last_name: "User",
        status: "active",
      });

      user = { user_id: userId };
    }

    // --- Insert ticket record ---
    const ticketId = await db.insert("tickets", {
      user_id: user.user_id,
      title: title.trim(),
      description: description?.trim() || null,
      status: "open",
      created_by: user.user_id,
    });

    // --- Generate and assign ticket code ---
    const ticketCode = generateTicketCode(ticketId);
    await db.update("tickets", { ticket_code: ticketCode }, "ticket_id = ?", [ticketId]);

    logger.info(`Public ticket created: ${ticketId} (${ticketCode})`);

    // --- Save public email reference (if provided) ---
    if (email) {
      try {
        await db.insert("public_ticket_emails", {
          ticket_id: ticketId,
          email,
          name: name?.trim() || null,
        });
      } catch (emailErr) {
        logger.error("Failed to store public ticket email:", emailErr);
      }
    }

    // --- Optional: Log as public action ---
    try {
      await db.insert("activity_logs", {
        user_id: user.user_id,
        action: "CREATE",
        module: "tickets",
        description: `Public ticket created (${ticketCode}) by ${email || "anonymous"}`,
        created_by: user.user_id,
      });
    } catch (logErr) {
      logger.error("Failed to create activity log for public ticket:", logErr);
    }

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      data: { ticket_id: ticketId, ticket_code: ticketCode },
    });
  } catch (error) {
    logger.error("Create public ticket error:", error);
    next(error);
  }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, fixed_by } = req.body;

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: open, in_progress, resolved, closed',
      });
    }

    // Check if ticket exists
    const ticket = await db.getOne('SELECT * FROM tickets WHERE ticket_id = ?', [id]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // If user is not superadmin, check permissions
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's sub-role
      const userSubrole = await db.getOne(
        `SELECT sub_role FROM user_roles WHERE user_id = ?`,
        [req.user.user_id]
      );

      const subRole = userSubrole?.sub_role || null;
      
      // Only IT users or ticket owners can update ticket status
      if (subRole !== 'it' && ticket.user_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to update this ticket',
        });
      }
    }

    // Update ticket
    const updateData = {
      status,
      updated_by: updatedBy,
    };

    // If status is resolved or closed, set fixed_by
    if ((status === 'resolved' || status === 'closed') && fixed_by) {
      updateData.fixed_by = fixed_by;
    }

    await db.update('tickets', updateData, 'ticket_id = ?', [id]);

    logger.info(`Ticket ${id} status updated to ${status}`);

    // Create activity log entry
    try {
      await db.insert('activity_logs', {
        user_id: updatedBy || 1,
        action: 'UPDATE',
        module: 'tickets',
        description: `Updated ticket ${ticket.ticket_code} status to ${status}`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
    });
  } catch (error) {
    logger.error('Update ticket status error:', error);
    next(error);
  }
};

/**
 * Update ticket details
 */
export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, fixed_by } = req.body;

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;

    // Check if ticket exists
    const ticket = await db.getOne('SELECT * FROM tickets WHERE ticket_id = ?', [id]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // If user is not superadmin, check permissions
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's sub-role
      const userSubrole = await db.getOne(
        `SELECT sub_role FROM user_roles WHERE user_id = ?`,
        [req.user.user_id]
      );

      const subRole = userSubrole?.sub_role || null;
      
      // Only IT users or ticket owners can update ticket
      if (subRole !== 'it' && ticket.user_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to update this ticket',
        });
      }
    }

    // Build update data
    const updateData = {
      updated_by: updatedBy,
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }
      updateData.status = status;
    }
    if (fixed_by !== undefined) updateData.fixed_by = fixed_by;

    await db.update('tickets', updateData, 'ticket_id = ?', [id]);

    logger.info(`Ticket ${id} updated`);

    // Create activity log entry
    try {
      await db.insert('activity_logs', {
        user_id: updatedBy || 1,
        action: 'UPDATE',
        module: 'tickets',
        description: `Updated ticket ${ticket.ticket_code}`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    logger.error('Update ticket error:', error);
    next(error);
  }
};

/**
 * Delete ticket
 */
export const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    // Check if ticket exists
    const ticket = await db.getOne('SELECT * FROM tickets WHERE ticket_id = ?', [id]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // If user is not superadmin, check permissions
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's sub-role
      const userSubrole = await db.getOne(
        `SELECT sub_role FROM user_roles WHERE user_id = ?`,
        [req.user.user_id]
      );

      const subRole = userSubrole?.sub_role || null;
      
      // Only IT users or ticket owners can delete ticket
      if (subRole !== 'it' && ticket.user_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to delete this ticket',
        });
      }
    }

    await db.delete('tickets', 'ticket_id = ?', [id]);

    logger.info(`Ticket ${id} deleted`);

    // Create activity log entry
    try {
      await db.insert('activity_logs', {
        user_id: deletedBy || 1,
        action: 'DELETE',
        module: 'tickets',
        description: `Deleted ticket ${ticket.ticket_code}`,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    logger.error('Delete ticket error:', error);
    next(error);
  }
};

export default {
  getAllTickets,
  getTicketById,
  createTicket,
  createPublicTicket,
  updateTicketStatus,
  updateTicket,
  deleteTicket
};