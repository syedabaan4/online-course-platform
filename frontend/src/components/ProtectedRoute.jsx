import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="spinner" style={{ margin: '20vh auto' }} />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}