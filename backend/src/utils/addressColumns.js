import * as db from '../config/db.js';

let employeeAddressColumnsCache = null;
let dependantAddressColumnsCache = null;

const resolveBarangayColumn = async (tableName) => {
  const columns = await db.getAll(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME IN ('barangay_name', 'barangay')`,
    [tableName]
  );

  const columnNames = new Set(columns.map((row) => row.COLUMN_NAME));

  if (columnNames.has('barangay_name')) {
    return 'barangay_name';
  }

  if (columnNames.has('barangay')) {
    return 'barangay';
  }

  return 'barangay_name';
};

export const getEmployeeAddressColumns = async () => {
  if (employeeAddressColumnsCache) {
    return employeeAddressColumnsCache;
  }

  const barangay = await resolveBarangayColumn('employee_addresses');
  employeeAddressColumnsCache = { barangay };
  return employeeAddressColumnsCache;
};

export const getDependantAddressColumns = async () => {
  if (dependantAddressColumnsCache) {
    return dependantAddressColumnsCache;
  }

  const barangay = await resolveBarangayColumn('dependant_address');
  dependantAddressColumnsCache = { barangay };
  return dependantAddressColumnsCache;
};
