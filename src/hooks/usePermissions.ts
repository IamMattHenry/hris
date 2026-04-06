/**
 * usePermissions — React hook for RBAC permission checks.
 *
 * Fetches the current user's permissions from the backend on mount,
 * caches them for the session, and exposes helper functions.
 *
 * Usage:
 *   const { can, canAny, canAll, loading } = usePermissions();
 *   if (can('employees.create')) { ... }
 *   if (canAny('leave.approve', 'leave.reject')) { ... }
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { rbacApi, UserPermissions } from '@/lib/api';

// Module-level cache to avoid refetching on every component mount
let cachedPermissions: UserPermissions | null = null;
let cachePromise: Promise<UserPermissions | null> | null = null;

export function clearPermissionCache() {
  cachedPermissions = null;
  cachePromise = null;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(cachedPermissions);
  const [loading, setLoading] = useState(!cachedPermissions);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const load = async () => {
      if (cachedPermissions) {
        setPermissions(cachedPermissions);
        setLoading(false);
        return;
      }

      // Deduplicate concurrent requests
      if (!cachePromise) {
        cachePromise = rbacApi.getMyPermissions().then(result => {
          if (result.success && result.data) {
            cachedPermissions = result.data;
            return result.data;
          }
          return null;
        }).catch(() => null);
      }

      const result = await cachePromise;
      if (mounted.current) {
        setPermissions(result);
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Check if user has a specific permission
   */
  const can = useCallback(
    (permissionKey: string): boolean => {
      if (!permissions) return false;
      if (permissions.is_superadmin) return true;
      return permissions.permissions.includes(permissionKey);
    },
    [permissions]
  );

  /**
   * Check if user has ANY of the specified permissions (OR)
   */
  const canAny = useCallback(
    (...permissionKeys: string[]): boolean => {
      if (!permissions) return false;
      if (permissions.is_superadmin) return true;
      return permissionKeys.some(key => permissions.permissions.includes(key));
    },
    [permissions]
  );

  /**
   * Check if user has ALL of the specified permissions (AND)
   */
  const canAll = useCallback(
    (...permissionKeys: string[]): boolean => {
      if (!permissions) return false;
      if (permissions.is_superadmin) return true;
      return permissionKeys.every(key => permissions.permissions.includes(key));
    },
    [permissions]
  );

  /**
   * Check if user has any of the specified RBAC role keys
   */
  const hasRole = useCallback(
    (...roleKeys: string[]): boolean => {
      if (!permissions) return false;
      if (permissions.is_superadmin) return true;
      return roleKeys.some(key => permissions.roles.includes(key));
    },
    [permissions]
  );

  return {
    permissions,
    loading,
    can,
    canAny,
    canAll,
    hasRole,
    isSuperadmin: permissions?.is_superadmin ?? false,
    refresh: clearPermissionCache,
  };
}
