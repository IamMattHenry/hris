/**
 * Code Generator Utility
 * Generates standardized codes for different entities
 */

/**
 * Generate a code with prefix and padded ID
 * @param {string} prefix - The prefix (e.g., 'DEP', 'EMP', 'POS')
 * @param {number} id - The ID to pad
 * @returns {string} - The generated code (e.g., 'DEP-0001')
 */
export const generateCode = (prefix, id) => {
  if (!prefix || !id) {
    throw new Error('Prefix and ID are required');
  }
  return `${prefix}-${String(id).padStart(4, '0')}`;
};

/**
 * Generate department code
 * @param {number} departmentId - The department ID
 * @returns {string} - The generated code (e.g., 'DEP-0001')
 */
export const generateDepartmentCode = (departmentId) => {
  return generateCode('DEP', departmentId);
};

/**
 * Generate position code
 * @param {number} positionId - The position ID
 * @returns {string} - The generated code (e.g., 'POS-0001')
 */
export const generatePositionCode = (positionId) => {
  return generateCode('POS', positionId);
};

/**
 * Generate employee code
 * @param {number} employeeId - The employee ID
 * @returns {string} - The generated code (e.g., 'EMP-0001')
 */
export const generateEmployeeCode = (employeeId) => {
  return generateCode('EMP', employeeId);
};

/**
 * Generate admin code
 * @param {number} adminId - The admin ID
 * @returns {string} - The generated code (e.g., 'ADM-0001')
 */
export const generateAdminCode = (adminId) => {
  return generateCode('ADM', adminId);
};

/**
 * Generate attendance code
 * @param {number} attendanceId - The attendance ID
 * @returns {string} - The generated code (e.g., 'ATT-0001')
 */
export const generateAttendanceCode = (attendanceId) => {
  return generateCode('ATT', attendanceId);
};

/**
 * Generate leave code
 * @param {number} leaveId - The leave ID
 * @returns {string} - The generated code (e.g., 'LEV-0001')
 */
export const generateLeaveCode = (leaveId) => {
  return generateCode('LEV', leaveId);
};

/**
 * Generate payroll code
 * @param {number} payrollId - The payroll ID
 * @returns {string} - The generated code (e.g., 'PAY-0001')
 */
export const generatePayrollCode = (payrollId) => {
  return generateCode('PAY', payrollId);
};

export default {
  generateCode,
  generateDepartmentCode,
  generatePositionCode,
  generateEmployeeCode,
  generateAdminCode,
  generateAttendanceCode,
  generateLeaveCode,
  generatePayrollCode,
};

