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
  role: 'admin' | 'employee';
  created_at: string;
  // Associated employee info (if exists)
  employee_id?: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  birthdate?: string;
  hire_date?: string;
  status?: 'active' | 'resigned' | 'terminated';
  // Associated admin info (if exists)
  admin_id?: number;
  admin_code?: string;
  sub_role?: 'hr' | 'manager' | 'finance' | 'it';
}

/**
 * Employee entity
 */
export interface Employee {
  employee_id: number;
  employee_code: string;
  user_id: number;
  first_name: string;
  last_name: string;
  birthdate?: string;
  gender?: 'male' | 'female' | 'others';
  civil_status?: 'single' | 'married' | 'divorced' | 'widowed';
  home_address?: string;
  city?: string;
  region?: string;
  position_id?: number;
  shift?: string;
  position_name?: string;
  department_id?: number;
  department_name?: string;
  hire_date: string;
  emails?: string[];
  contact_numbers?: string[];
  status: 'active' | 'resigned' | 'terminated';
  created_at: string;
  // Associated user info
  username?: string;
  role?: string;
}

/**
 * Admin entity
 */
export interface Admin {
  admin_id: number;
  admin_code: string;
  employee_id: number;
  user_id: number;
  sub_role: 'hr' | 'manager' | 'finance' | 'it';
  created_at: string;
}

/**
 * Request payload for creating an employee
 */
export interface CreateEmployeeRequest {
  username: string;
  password: string;
  role?: 'admin' | 'employee';
  sub_role?: 'hr' | 'manager' | 'finance' | 'it';
  first_name: string;
  last_name: string;
  birthdate: string;
  gender?: 'male' | 'female' | 'others';
  civil_status?: 'single' | 'married' | 'divorced' | 'widowed';
  home_address?: string;
  city?: string;
  region?: string;
  position_id?: number;
  department_id?: number;
  hire_date: string;
  email?: string;
  contact_number?: string;
  status?: 'active' | 'resigned' | 'terminated';
}

/**
 * Request payload for updating a user
 */
export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: 'admin' | 'employee';
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
}

/**
 * Position entity
 */
export interface Position {
  position_id: number;
  position_code: string;
  position_name: string;
  position_desc?: string;
  department_id?: number;
  department_name?: string;
  salary?: number;
  availability?: number;
}

