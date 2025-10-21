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
};

