const Attendance = require('../models/attendance');
const Employee = require('../models/employee');

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.findAll({
      include: [{
        model: Employee,
        attributes: ['first_name', 'last_name', 'position']
      }],
      order: [['date', 'DESC']]
    });
    
    // Return raw timestamps without timezone conversion
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get attendance by employee ID
exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const attendanceRecords = await Attendance.findAll({
      where: { employee_id: employeeId },
      include: [{
        model: Employee,
        attributes: ['first_name', 'last_name', 'position']
      }],
      order: [['date', 'DESC']]
    });
    
    // Return raw timestamps without timezone conversion
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new attendance record
exports.createAttendance = async (req, res) => {
  try {
    const { employee_id, date, time_in, time_out } = req.body;
    
    // Verify if employee exists
    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Create attendance record with raw timestamps
    const attendanceRecord = await Attendance.create({
      employee_id,
      date,
      time_in: time_in ? new Date(time_in) : null,
      time_out: time_out ? new Date(time_out) : null
    });
    
    res.status(201).json(attendanceRecord);
  } catch (error) {
    console.error('Error creating attendance record:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        message: 'Invalid employee ID. Employee does not exist.' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Update attendance record
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, date, time_in, time_out } = req.body;
    
    const attendanceRecord = await Attendance.findByPk(id);
    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // If employee_id is being updated, verify it exists
    if (employee_id && employee_id !== attendanceRecord.employee_id) {
      const employee = await Employee.findByPk(employee_id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
    }
    
    // Update with raw timestamps
    await attendanceRecord.update({
      employee_id,
      date,
      time_in: time_in ? new Date(time_in) : null,
      time_out: time_out ? new Date(time_out) : null
    });
    
    res.json(attendanceRecord);
  } catch (error) {
    console.error('Error updating attendance record:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        message: 'Invalid employee ID. Employee does not exist.' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete attendance record
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendanceRecord = await Attendance.findByPk(id);
    if (!attendanceRecord) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    await attendanceRecord.destroy();
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ message: 'Server error' });
  }
};