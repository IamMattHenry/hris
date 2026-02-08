// src/lib/api.ts
	
	import { User } from '@/types/api';
  import showToast, { toast } from '@/utils/toast';
	
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

// Network/timeout and error handling helpers
const DEFAULT_TIMEOUT_MS = 20000
const RETRY_STATUS_CODES = new Set([502, 503, 504]);


	// Extend RequestInit with optional timeoutMs for our API helper
	type ApiRequestInit = RequestInit & { timeoutMs?: number };

	type ApiResult<T> = {
	  success: boolean;
	  data?: T;
	  message?: string;
	  error?: string;
	  count?: number;
	  status?: number;
	};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function friendlyMessageFromStatus(status?: number) {
  switch (status) {
    case 401:
      return 'Incorrect login details. Please try again.';
    case 403:
      return 'You don’t have permission to perform this action.';
    case 404:
      return 'The requested resource could not be found.';
    case 408:
      return 'The server is taking too long to respond. Please try again later.';
    case 500:
      return 'An unexpected server error occurred. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again shortly.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function friendlyNetworkErrorMessage(err: any): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  const code = (err?.code || '').toString().toUpperCase();
  const msg = (err?.message || '').toLowerCase();

  // Explicitly handle ECONNRESET to show a friendly message
  if (code === 'ECONNRESET' || msg.includes('econnreset')) {
    return 'Connection lost. Please check your internet connection and try again.';
  }

  if (msg.includes('aborted') || msg.includes('timeout') || err?.name === 'AbortError') {
    return 'The server is not responding. Please try again later.';
  }
  if (
    msg.includes('econnrefused') ||
    msg.includes('failed to fetch') ||
    msg.includes('network')
  ) {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  return 'Connection error. Please try again.';
}


	/**
	 * Generic API call function with authentication, timeout, retries, and friendly errors
	 */
	async function apiCall<T>(
	  endpoint: string,
	  options: ApiRequestInit = {}
	): Promise<ApiResult<T>> {
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
	    Object.assign(headers, options.headers as Record<string, string>);
	  }
	
	  const method = (options.method || 'GET').toString().toUpperCase();
	  const isGet = method === 'GET';
	  const maxRetries = isGet ? 2 : 0; // retry GETs only
	
    const isBrowser = typeof window !== 'undefined';
	
	  const finish = (result: ApiResult<T>): ApiResult<T> => {
	    return result;
	  };
	
	  let attempt = 0;
	  let lastError: any = null;
	
	  while (attempt <= maxRetries) {
    const { timeoutMs, ...restOptions } = (options as any) || {};
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...restOptions,
        method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any = null;
      let rawText: string | null = null;
      try {
        rawText = await response.text();
      } catch {}
      if (rawText) {
        try {
          responseData = JSON.parse(rawText);
        } catch {
          responseData = rawText; // non-JSON response
        }
      }

	      // Handle authentication errors
	      if (response.status === 401) {
	        const authMessage =
	          (responseData && typeof responseData === 'object' && (responseData.message || responseData.error)) ||
	          friendlyMessageFromStatus(401);
	
	        if (typeof window !== 'undefined') {
	          try { localStorage.removeItem('token'); } catch {}
	          window.location.href = '/';
	        }
	        return finish({ success: false, message: authMessage, error: 'Unauthorized', status: 401 });
	      }
	
        // Handle 500 status (server error) — do NOT remove token or redirect automatically
        if (response.status === 500) {
          const serverMessage = friendlyMessageFromStatus(500);
          return finish({ success: false, message: serverMessage, error: 'ServerError', status: 500 });
        }

      // Non-OK responses
      if (!response.ok) {
	        const message =
	          (responseData && typeof responseData === 'object' && (responseData.message || responseData.error)) ||
	          friendlyMessageFromStatus(response.status);

        // Retry on transient server errors for GET
        if (isGet && RETRY_STATUS_CODES.has(response.status) && attempt < maxRetries) {
          attempt++;
          await sleep(300 * attempt);
          continue;
        }

	        return finish({
	          success: false,
	          message,
	          error: typeof responseData === 'string' ? responseData : undefined,
	          status: response.status,
	        });
      }

      // OK responses — pass through if backend already returns our envelope
	      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
	        return finish(responseData as ApiResult<T>);
	      }
	  
	      // Otherwise, wrap the value as data
	      return finish({ success: true, data: (responseData as T) });
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // Retry for GETs on network/timeout errors
      if (isGet && attempt < maxRetries) {
        attempt++;
        await sleep(300 * attempt);
        continue;
      }

	      const message = friendlyNetworkErrorMessage(err);
	      return finish({ success: false, message, error: err?.message || 'Network error' });
    }
  }
	
	  const message = friendlyNetworkErrorMessage(lastError);
	  return finish({ success: false, message, error: lastError?.message || 'Network error' });
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
   * Update current user (self)
   */
  updateMe: async (data: { username?: string; password?: string }) => {
    return apiCall<any>('/users/me', {
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
  getAll: async (params?: {
    department_id?: number | string;
    role?: string;
    status?: string;
    exclude_employee_id?: number | string;
  }) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const serialized = searchParams.toString();
      if (serialized) {
        query = `?${serialized}`;
      }
    }
    return apiCall<any[]>(`/employees${query}`, {
      method: 'GET',
    });
  },

  /**
   * Get employee availability status
   * Returns all employees with their current availability (available/offline/on_leave)
   * @param date - Optional date in YYYY-MM-DD format (defaults to today)
   */
  getAvailability: async (date?: string) => {
    let url = '/employees/availability';
    if (date) {
      url += `?date=${date}`;
    }
    return apiCall<{
      success: boolean;
      data: any[];
      summary: {
        total: number;
        available: number;
        offline: number;
        on_leave: number;
      };
      date: string;
    }>(url, {
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
   * Update current employee (self)
   */
  updateMe: async (data: any) => {
    return apiCall<any>(`/employees/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get current employee with dependents
   */
  getMe: async () => {
    return apiCall<any>(`/employees/me`, {
      method: 'GET',
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
   * Employee portal login
   */
  loginEmployee: async (username: string, password: string) => {
    return apiCall<{ token: string; user: any }>('/auth/login/employee', {
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
   * Verify fingerprint for 2FA login
   * @param temp_token - Temporary token from password verification step
   * @param scanned_fingerprint_id - The fingerprint ID scanned by the sensor
   */
  verifyFingerprint: async (temp_token: string, scanned_fingerprint_id: number) => {
    return apiCall<{ token: string; user: any }>('/auth/verify-fingerprint', {
      method: 'POST',
      body: JSON.stringify({ temp_token, scanned_fingerprint_id }),
    });
  },

  /**
   * Logout (client-side only)
   */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  },
};

// ============ PASSWORD RECOVERY API FUNCTIONS ============

export const passwordRecoveryApi = {
  /**
   * Request an OTP for password recovery
   */
  requestOtp: async (identifier: string) => {
    return apiCall<any>('/password/otp/request', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  /**
   * Verify OTP and get a reset token
   */
  verifyOtp: async (identifier: string, code: string) => {
    return apiCall<any>('/password/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code }),
    });
  },

  /**
   * Reset password using the reset token
   */
  resetPassword: async (token: string, password: string) => {
    return apiCall<any>('/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
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
   * @param include_offline - Optional flag to include offline employees (default: false)
   */
  getAll: async (employee_id?: number, start_date?: string, end_date?: string, include_offline?: boolean) => {
    let url = '/attendance';
    const params = new URLSearchParams();
    if (employee_id) params.append('employee_id', employee_id.toString());
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (include_offline) params.append('include_offline', 'true');
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
   * Mark absences for a date or range (admin/superadmin)
   * Accepts either a single date or a range payload.
   */
  markAbsences: async (
    params?: { date?: string; start_date?: string; end_date?: string; respect_sundays?: boolean; holiday_dates?: string[] }
  ) => {
    return apiCall<any>('/attendance/mark-absences', {
      method: 'POST',
      body: JSON.stringify(params || {}),
      // allow heavier batch processing to complete without client abort
      timeoutMs: 60000,
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
    maternity_type?: string;
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
  updateStatus: async (id: number, status: 'open' | 'in_progress' | 'resolved' | 'closed', fixed_by?: number, resolution_description?: string) => {
    return apiCall<any>(`/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, fixed_by, resolution_description }),
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

// ============ FINGERPRINT API FUNCTIONS ============

export const fingerprintApi = {
  /**
   * Get next available fingerprint ID
   */
  getNextId: async () => {
    return apiCall<any>('/fingerprint/next-id', {
      method: 'GET',
    });
  },

  /**
   * Check if fingerprint ID is available
   */
  checkId: async (fingerprintId: number) => {
    return apiCall<any>(`/fingerprint/check/${fingerprintId}`, {
      method: 'GET',
    });
  },

  /**
   * Check if fingerprint bridge service is available
   */
  checkBridgeHealth: async (): Promise<{ available: boolean; error?: string }> => {
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${bridgeUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      if (response.ok) {
        return { available: true };
      }

      const errorText = await response.text().catch(() => null);
      return {
        available: false,
        error: errorText || `Bridge service returned status ${response.status}`,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('Bridge health check timed out');
        return { available: false, error: 'Bridge health check timed out' };
      }

      console.error('Bridge health check failed:', error);
      return { available: false, error: error?.message || 'Bridge service not available' };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Start fingerprint scan for authentication (2FA)
   */
  startScan: async () => {
    return apiCall<any>('/fingerprint/scan/start', {
      method: 'POST',
    });
  },

  /**
   * Start fingerprint enrollment
   */
  startEnrollment: async (employeeId: number, fingerprintId: number) => {
    return apiCall<any>('/fingerprint/enroll/start', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, fingerprint_id: fingerprintId }),
    });
  },

  /**
   * Confirm fingerprint enrollment
   */
  confirmEnrollment: async (employeeId: number, fingerprintId: number) => {
    return apiCall<any>('/fingerprint/enroll/confirm', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, fingerprint_id: fingerprintId }),
    });
  },
};
