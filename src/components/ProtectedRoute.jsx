import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#667eea'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the current location to redirect back after login
    return <Navigate to={`/${requiredRole.toLowerCase()}/login`} state={{ from: location.pathname }} replace />;
  }

  const allowedRoles = requiredRole === 'ADMIN' ? ['ADMIN', 'SUPER_ADMIN'] : [requiredRole];
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
