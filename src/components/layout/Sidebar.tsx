import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  BarChart3, 
  CreditCard, 
  BookOpen,
  Calendar,
  Award,
  Trophy,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isTeamOwnerOrAdmin = user?.teamRole === 'owner' || user?.teamRole === 'admin';

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      show: true,
    },
    {
      name: 'Quiz Center',
      icon: BookOpen,
      path: '/quiz',
      show: true,
    },
    {
      name: 'Study Schedule',
      icon: Calendar,
      path: '/schedule',
      show: true,
    },
    {
      name: 'Achievements',
      icon: Award,
      path: '/achievements',
      show: true,
    },
    {
      name: 'Leaderboard',
      icon: Trophy,
      path: '/leaderboard',
      show: !!user?.teamId,
    },
    {
      name: 'Team',
      icon: Users,
      path: '/team',
      show: isTeamOwnerOrAdmin,
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      show: isTeamOwnerOrAdmin,
    },
    {
      name: 'Billing',
      icon: CreditCard,
      path: '/billing',
      show: user?.teamRole === 'owner',
    },
  ];

  const adminItems = [
    {
      name: 'Admin Panel',
      icon: ShieldAlert,
      path: '/admin',
      show: isAdmin,
    },
    {
      name: 'User Management',
      icon: Users,
      path: '/admin/users',
      show: isAdmin,
    },
    {
      name: 'Question Management',
      icon: BookOpen,
      path: '/admin/questions',
      show: isAdmin,
    },
    {
      name: 'Plan Management',
      icon: DollarSign,
      path: '/admin/plans',
      show: isAdmin,
    },
    {
      name: 'Achievement Management',
      icon: Award,
      path: '/admin/achievements',
      show: isAdmin,
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/settings',
      show: isAdmin,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } sm:hidden`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PBE Journey</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <nav className="space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => {
                  if (window.innerWidth < 640) {
                    toggleSidebar();
                  }
                }}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          
          {isAdmin && (
            <>
              <div className="mt-8 mb-2 px-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
              </div>
              <nav className="space-y-1">
                {adminItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      if (window.innerWidth < 640) {
                        toggleSidebar();
                      }
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
            </>
          )}
          
          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Desktop sidebar */}
      <div className={`hidden sm:flex flex-col h-full ${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-gray-200 transition-all duration-300`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-gray-200`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PBE Journey</span>
            </div>
          )}
          {isCollapsed && (
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-lg transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${
                  isCollapsed
                    ? 'justify-center h-12 w-full' // Full width with centered content
                    : 'space-x-3 px-3 py-2' // Original padding for expanded state
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon className={`${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>
          
          {isAdmin && (
            <>
              <div className={`mt-8 mb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </h3>
                )}
                {isCollapsed && (
                  <div className="h-px bg-gray-200 my-2"></div>
                )}
              </div>
              <nav className="space-y-1">
                {adminItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center rounded-lg transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    } ${
                      isCollapsed
                        ? 'justify-center h-12 w-full' // Full width with centered content
                        : 'space-x-3 px-3 py-2' // Original padding for expanded state
                    }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <item.icon className={`${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 ${
              isCollapsed
                ? 'justify-center h-12 w-full' // Full width with centered content
                : 'space-x-3 px-3 py-2 w-full text-left' // Original styling for expanded state
            }`}
            title={isCollapsed ? 'Sign Out' : ''}
          >
            <LogOut className={`${isCollapsed ? 'h-7 w-7' : 'h-5 w-5'}`} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
}