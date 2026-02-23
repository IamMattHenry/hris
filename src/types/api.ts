// src/types/api.ts

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

/**
 * User entity
 */
export interface User {
  user_id: number;
  username: string;
  role: 'admin' | 'employee' | 'supervisor' | 'superadmin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  // Associated employee info (if exists)
  employee_id?: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  extension_name?: string;
  birthdate?: string;
  hire_date?: string;
  status?: 'active' | 'resigned' | 'terminated' | 'on-leave';
  department_id?: number;
  department_name?: string;
  emails?: string[];
  contact_numbers?: string[];
  dependents?: Dependent[];
  // Associated user role info (if exists)
  user_role_id?: number;
  sub_role?: 'hr' | 'it';
}

/**
 * User Role entity (replaces Admin)
 */
export interface UserRole {
  user_role_id: number;
  user_id: number;
  sub_role: 'hr' | 'it' | 'manager' | 'supervisor';
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  requester_role?: string;
  requester_sub_role?: string | null;
}

/**
 * Employee Documents entity
 */
export interface EmployeeDocuments {
  document_id?: number;
  employee_id: number;
  sss: boolean;
  pagIbig: boolean;
  tin: boolean;
  philhealth: boolean;
  cedula: boolean;
  birthCert: boolean;
  policeClearance: boolean;
  barangayClearance: boolean;
  medicalCert: boolean;
  others: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Employee entity
 */
export interface Employee {
  employee_id: number;
  employee_code: string;
  user_id: number;
  fingerprint_id?: number | null;
  first_name: string;
  last_name: string;
  middle_name?: string;
  extension_name?: string;
  birthdate?: string;
  gender?: 'male' | 'female' | 'others';
  civil_status?: 'single' | 'married' | 'divorced' | 'widowed';
  home_address?: string;
  city?: string;
  region?: string;
  province?: string;
  province_city?: string;
  position_id?: number;
  department_id?: number;
  salary?: number;
  hire_date: string;
  status: 'active' | 'resigned' | 'terminated' | 'on-leave';
  leave_credit: number;
  supervisor_id?: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  // Associated data
  position_name?: string;
  department_name?: string;
  supervisor_name?: string;
  emails?: string[];
  contact_numbers?: string[];
  address?: EmployeeAddress;
  dependents?: Dependent[];
  documents?: EmployeeDocuments;
  // Associated user info
  username?: string;
  role?: string;
}

/**
 * Employee Address entity
 */
export interface EmployeeAddress {
  address_id: number;
  employee_id: number;
  region_code?: string;
  province_code?: string;
  city_code?: string;
  barangay?: string;
  street_address?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Request payload for creating an employee
 */
export interface CreateEmployeeRequest {
  username: string;
  password: string;
  role?: 'admin' | 'employee' | 'supervisor';
  sub_role?: 'hr' | 'it' | 'manager' | 'supervisor';
  first_name: string;
  last_name: string;
  middle_name?: string;
  extension_name?: string;
  birthdate: string;
  gender?: 'male' | 'female' | 'others';
  civil_status?: 'single' | 'married' | 'divorced' | 'widowed';
  position_id?: number;
  department_id?: number;
  salary?: number;
  hire_date: string;
  leave_credit?: number;
  supervisor_id?: number;
  email?: string;
  contact_number?: string;
  // Address fields
  region_code?: string;
  province_code?: string;
  city_code?: string;
  barangay?: string;
  street_address?: string;
  status?: 'active' | 'resigned' | 'terminated' | 'on-leave';
}

/**
 * Request payload for updating a user
 */
export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: 'admin' | 'employee' | 'supervisor';
  is_active?: boolean;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    username: string;
    role: string;
  };
}

/**
 * Department entity
 */
export interface Department {
  department_id: number;
  department_code: string;
  department_name: string;
  description?: string;
  supervisor_id?: number;
  supervisor_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Position entity
 */
export interface Position {
  position_id: number;
  position_code: string;
  // Human-friendly name for the position (kept for compatibility)
  position_name?: string;
  position_desc?: string;
  department_id: number;
  department_name?: string;
  default_salary?: number;
  employment_type?: 'regular' | 'probationary';
  salary_unit?: 'monthly' | 'hourly';
  availability?: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Attendance entity
 */
export interface Attendance {
  attendance_id: number | null;
  attendance_code: string | null;
  employee_id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'offline';
  overtime_hours: number;
  created_at: string | null;
  updated_at: string | null;
  created_by?: number | null;
  updated_by?: number | null;
}

/**
 * Employee Availability Status
 */
export interface EmployeeAvailability {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position_name?: string;
  department_name?: string;
  email?: string;
  phone_number?: string;
  employee_status: 'active' | 'resigned' | 'terminated' | 'on-leave';
  availability_status: 'available' | 'offline' | 'on_leave';
  attendance_status?: 'present' | 'absent' | 'late' | 'early_leave' | 'half_day' | 'on_leave' | 'offline' | null;
  time_in?: string | null;
  time_out?: string | null;
  date: string;
}

/**
 * Employee Availability Response
 */
export interface EmployeeAvailabilityResponse {
  success: boolean;
  data: EmployeeAvailability[];
  summary: {
    total: number;
    available: number;
    offline: number;
    on_leave: number;
  };
  date: string;
}

/**
 * Leave entity
 */
export interface Leave {
  leave_id: number;
  leave_code: string;
  employee_id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  leave_type: 'vacation' | 'sick' | 'emergency' | 'half_day' | 'others' | 'maternity' | 'paternity' | 'sil' | 'special_women' | 'bereavement';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
  approved_by?: number;
  approved_by_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Dependent entity
 */
export interface Dependent {
  dependant_id: number;
  dependant_code: string;
  employee_id: number;
  firstname: string;
  lastname: string;
  relationship: string;
  birth_date: string;
  email?: string;
  contact_no?: string;
  home_address?: string;
  region_name?: string;
  province_name?: string;
  city_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Activity Log entity
 */
export interface ActivityLog {
  log_id: number;
  user_id: number;
  username?: string;
  action: string;
  module: string;
  description?: string;
  created_at: string;
  created_by?: number;
}

