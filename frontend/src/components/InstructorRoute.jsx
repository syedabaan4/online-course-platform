import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function InstructorRoute({ children }) {
  const { isAuthenticated, isInstructor, isLoading } = useAuth();
  if (isLoading) return <div className="spinner" style={{ margin: '20vh auto' }} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isInstructor) return <Navigate to="/courses" replace />;
  return children;
}