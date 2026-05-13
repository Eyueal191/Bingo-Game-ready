y
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const PermissionProtectedRoute = ({ element, requiredPermissions = [] }) => {
  const { isAuthenticated, isAdmin, gamePermissions } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Admins always have access
  if (isAdmin) {
    return element;
  }

  const hasPermission = requiredPermissions.every(
    (perm) => gamePermissions[perm] === true
  );

  if (!hasPermission) {
    return <Navigate to="/not-found" />;
  }

  return element;
};

export default PermissionProtectedRoute;
