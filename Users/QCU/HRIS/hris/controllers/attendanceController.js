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