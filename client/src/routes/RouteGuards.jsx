import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BingoLoading from "../components/common/BingoLoading";
import Unauthorized from "../pages/common/Unauthorized";

export const ProtectedRoute = ({ element }) => {
  const { token, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <BingoLoading message="Loading..." size="large"  />;
  }
  const isAuthenticated = !!token;
  return isAuthenticated ? (
    element
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export const AdminProtectedRoute = ({ element }) => {
  const { token, isAdmin } = useAuth();
  const isAuthenticated = !!token;
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return <Unauthorized />;
  }
  return element;
};

export const UnauthenticatedRoute = ({ element, redirectPath }) => {
  const { token, loading } = useAuth();
  const isAuthenticated = !!token;
  const location = useLocation();
  if (loading) {
    return <BingoLoading message="Loading..." size="large" />;
  }
  if (isAuthenticated) {
    const from =
      (location.state && location.state.from?.pathname) || redirectPath || "/";
    return <Navigate to={from} replace />;
  }
  return element;
};
