import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { type AppRole, MANAGER_ROLES } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // If omitted, any manager role is sufficient (dashboard access)
  requiredRoles?: AppRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, isAdmin, hasAnyRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // admin bypasses every role check
  if (isAdmin) return <>{children}</>;

  const allowed = requiredRoles ?? MANAGER_ROLES;
  if (!hasAnyRole(allowed)) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
