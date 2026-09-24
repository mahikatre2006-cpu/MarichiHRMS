import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

export function Can({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  if (!permission || hasPermission(permission)) {
    return <>{children}</>;
  }
  return fallback;
}
