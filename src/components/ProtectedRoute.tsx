import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireUser?: boolean;
  allowedTeamRoles?: ('owner' | 'admin' | 'member')[];
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireUser = false,
  allowedTeamRoles,
}: ProtectedRouteProps) {
  const { user, loading, hasSession, profileLoading, developerLog } = useAuth();
  const location = useLocation();

  developerLog('🚦 ProtectedRoute: Rendering with user:', user, 'loading:', loading, 'hasSession:', hasSession, 'profileLoading:', profileLoading, 'path:', location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    // If we have an active session but profile is still loading in the background,
    // avoid redirecting to login to prevent the flicker/logout on refresh.
    if (hasSession && profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // System admin access control
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Prevent system admins from accessing user-only features
  if (requireUser && user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Team role-based access control
  if (allowedTeamRoles && user.teamRole && !allowedTeamRoles.includes(user.teamRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Add error boundary wrapper to prevent crashes from redirecting to login
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('ProtectedRoute error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}