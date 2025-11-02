// src/lib/api.ts

import { User } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Get the authentication token from localStorage
 */
function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

/**
 * Generic API call function with authentication
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string; count?: number }> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authentication header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge with any additional headers from options
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle authentication errors
    if (response.status === 401) {
      // Token expired or invalid - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login_hr';
      }
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============ USER API FUNCTIONS ============

export const userApi = {
  /**
   * Get all users
   */
  getAll: async () => {
    return apiCall<any[]>('/users', {
      method: 'GET',
    });
  },

  /**
   * Get user by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/users/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update user
   */
  update: async (id: number, data: { username?: string; password?: string; role?: string }) => {
    return apiCall<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete user
   */
  delete: async (id: number) => {
    return apiCall<any>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ EMPLOYEE API FUNCTIONS ============

export const employeeApi = {
  /**
   * Get all employees
   */
  getAll: async () => {
    return apiCall<any[]>('/employees', {
      method: 'GET',
    });
  },

  /**
   * Get employee by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/employees/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create employee (automatically creates user account)
   */
  create: async (data: {
    username: string;
    password: string;
    role?: 'admin' | 'employee';
    sub_role?: 'hr' | 'manager' | 'finance' | 'it';
    first_name: string;
    last_name: string;
    birthdate: string;
    gender?: string;
    civil_status?: string;
    home_address?: string;
    city?: string;
    region?: string;
    province?: string;
    province_city?: string;
    position_id?: number;
    shift?: string;
    department_id?: number;
    hire_date: string;
    email?: string;
    contact_number?: string;
    status?: 'active' | 'resigned' | 'terminated';
  }) => {
    return apiCall<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update employee
   */
  update: async (id: number, data: any) => {
    return apiCall<any>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete employee
   */
  delete: async (id: number) => {
    return apiCall<any>(`/employees/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ AUTH API FUNCTIONS ============

export const authApi = {
  /**
   * Login
   */
  login: async (username: string, password: string) => {
    return apiCall<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    return apiCall<User>('/auth/me', {
      method: 'GET',
    });
  },

  /**
   * Logout (client-side only)
   */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login_hr';
    }
  },
};

// ============ DEPARTMENT API FUNCTIONS ============

export const departmentApi = {
  /**
   * Get all departments
   */
  getAll: async () => {
    return apiCall<any[]>('/departments', {
      method: 'GET',
    });
  },

  /**
   * Get department by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/departments/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new department
   */
  create: async (data: {
    department_name: string;
    description?: string;
    supervisor_id?: number;
  }) => {
    return apiCall<any>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a department
   */
  update: async (id: number, data: any) => {
    return apiCall<any>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a department
   */
  delete: async (id: number) => {
    return apiCall<any>(`/departments/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ POSITION API FUNCTIONS ============

export const positionApi = {
  /**
   * Get all positions
   * @param departmentId - Optional filter by department ID
   */
  getAll: async (departmentId?: number) => {
    const url = departmentId
      ? `/positions?department_id=${departmentId}`
      : '/positions';
    return apiCall<any[]>(url, {
      method: 'GET',
    });
  },

  /**
   * Get position by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/positions/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get total availability
   */
  getTotalAvailability: async () => {
    return apiCall<any>('/positions/total-availability', {
      method: 'GET',
    });
  },

  /**
   * Create a new position
   */
  create: async (data: {
    position_name: string;
    position_desc?: string;
    department_id: number;
    salary?: number;
    availability?: number;
  }) => {
    return apiCall<any>('/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update position by ID
   */
  update: async (id: number, data: any) => {
    return apiCall<any>(`/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete position by ID
   */
  delete: async (id: number) => {
    return apiCall<any>(`/positions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ ATTENDANCE API FUNCTIONS ============

export const attendanceApi = {
  /**
   * Get all attendance records
   * @param employee_id - Optional filter by employee ID
   * @param start_date - Optional filter by start date (YYYY-MM-DD)
   * @param end_date - Optional filter by end date (YYYY-MM-DD)
   */
  getAll: async (employee_id?: number, start_date?: string, end_date?: string) => {
    let url = '/attendance';
    const params = new URLSearchParams();
    if (employee_id) params.append('employee_id', employee_id.toString());
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (params.toString()) url += `?${params.toString()}`;

    return apiCall<any[]>(url, {
      method: 'GET',
    });
  },

  /**
   * Get attendance by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/attendance/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Clock in for an employee
   * @param employee_id - Employee ID
   * @param status - Optional attendance status (present, absent, late, etc.)
   */
  clockIn: async (employee_id: number, status?: string) => {
    return apiCall<any>('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ employee_id, status }),
    });
  },

  /**
   * Clock out for an employee
   */
  clockOut: async (employee_id: number) => {
    return apiCall<any>('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify({ employee_id }),
    });
  },

  /**
   * Update overtime hours for an attendance record
   */
  updateOvertime: async (id: number, overtime_hours: number) => {
    return apiCall<any>(`/attendance/${id}/overtime`, {
      method: 'PUT',
      body: JSON.stringify({ overtime_hours }),
    });
  },

  /**
   * Update attendance status
   */
  updateStatus: async (id: number, status: string) => {
    return apiCall<any>(`/attendance/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Get attendance summary for an employee
   */
  getSummary: async (employee_id: number) => {
    return apiCall<any>(`/attendance/summary/${employee_id}`, {
      method: 'GET',
    });
  },

  /**
   * Mark absences for a date (admin/superadmin)
   */
  markAbsences: async (date?: string) => {
    return apiCall<any>('/attendance/mark-absences', {
      method: 'POST',
      body: JSON.stringify(date ? { date } : {}),
    });
  },

};

// ============ LEAVE API FUNCTIONS ============

export const leaveApi = {
  /**
   * Get all leave requests
   */
  getAll: async () => {
    return apiCall<any[]>('/leave', {
      method: 'GET',
    });
  },

  /**
   * Get leave by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/leave/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create leave request
   */
  create: async (data: {
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    remarks?: string;
  }) => {
    return apiCall<any>('/leave/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Approve leave request
   */
  approve: async (id: number) => {
    return apiCall<any>(`/leave/${id}/approve`, {
      method: 'PUT',
    });
  },

  /**
   * Reject leave request
   */
  reject: async (id: number, remarks?: string) => {
    return apiCall<any>(`/leave/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ remarks }),
    });
  },

  /**
   * Delete leave request
   */
  delete: async (id: number) => {
    return apiCall<any>(`/leave/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Check and revert leave status for expired leaves
   */
  checkAndRevertStatus: async () => {
    return apiCall<any>('/leave/check-revert-status', {
      method: 'POST',
    });
  },

  /**
   * Get pending leave count
   */
  getPendingCount: async () => {
    return apiCall<any>('/leave/stats/pending-count', {
      method: 'GET',
    });
  },

  /**
   * Get all pending leaves
   */
  getPendingLeaves: async () => {
    return apiCall<any>('/leave/stats/pending-leaves', {
      method: 'GET',
    });
  },

  /**
   * Get absence records
   * @param start_date - Optional filter by start date (YYYY-MM-DD)
   * @param end_date - Optional filter by end date (YYYY-MM-DD)
   */
  getAbsenceRecords: async (start_date?: string, end_date?: string) => {
    let url = '/leave/stats/absence-records';
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (params.toString()) url += `?${params.toString()}`;

    return apiCall<any>(url, {
      method: 'GET',
    });
  },

  /**
   * Get absence count
   * @param start_date - Optional filter by start date (YYYY-MM-DD)
   * @param end_date - Optional filter by end date (YYYY-MM-DD)
   */
  getAbsenceCount: async (start_date?: string, end_date?: string) => {
    let url = '/leave/stats/absence-count';
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (params.toString()) url += `?${params.toString()}`;

    return apiCall<any>(url, {
      method: 'GET',
    });
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    return apiCall<any>('/leave/stats/dashboard', {
      method: 'GET',
    });
  },
};

// ACTIVITY LOG FUNCTIONS
export const activityApi = {
  // Get activities
  getAll: async () => {
    return apiCall<any>('/activity', {
      method: 'GET',
    })
  }
}

// ============ TICKET API FUNCTIONS ============

export const ticketApi = {
  /**
   * Get all tickets
   * @param status - Optional filter by status (open, in_progress, resolved, closed)
   * @param user_id - Optional filter by user ID
   */
  getAll: async (status?: string, user_id?: number) => {
    let url = '/tickets';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (user_id) params.append('user_id', user_id.toString());
    if (params.toString()) url += `?${params.toString()}`;

    return apiCall<any[]>(url, {
      method: 'GET',
    });
  },

  /**
   * Get ticket by ID
   */
  getById: async (id: number) => {
    return apiCall<any>(`/tickets/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new ticket
   */
  create: async (data: {
    user_id: number;
    title: string;
    description?: string;
  }) => {
    return apiCall<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Create a new public ticket (for unauthenticated users)
   */
  createPublic: async (data: {
    title: string;
    description?: string;
    email?: string;
    name?: string;
  }) => {
    return apiCall<any>('/tickets/public', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update ticket status
   */
  updateStatus: async (id: number, status: 'open' | 'in_progress' | 'resolved' | 'closed', fixed_by?: number) => {
    return apiCall<any>(`/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, fixed_by }),
    });
  },

  /**
   * Update ticket details
   */
  update: async (id: number, data: {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    fixed_by?: number;
  }) => {
    return apiCall<any>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a ticket
   */
  delete: async (id: number) => {
    return apiCall<any>(`/tickets/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Generate ticket report
   */
  generateReport: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.status) queryParams.append('status', params.status);

    const url = `/tickets/report${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiCall<any>(url, {
      method: 'GET',
    });
  },
};
