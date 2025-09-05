import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings, LogOut, User, Menu, Crown, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useStripeSubscription } from '../../hooks/useStripeSubscription';
import { stripeProducts } from '../../stripe-config';
import { supabase } from '../../lib/supabase';
import { IS_BETA_MODE, BETA_CONFIG } from '../../config/beta';

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { subscription, loading: subscriptionLoading } = useStripeSubscription();
  const [pendingInvitations, setPendingInvitations] = useState(0);

  // Get current subscription plan name
  const currentProduct = React.useMemo(() => {
    if (subscriptionLoading || !subscription?.price_id) {
      return null;
    }
    return stripeProducts.find(p => p.priceId === subscription.price_id) || null;
  }, [subscription, subscriptionLoading]);

  // Load pending invitations count
  useEffect(() => {
    if (user) {
      loadPendingInvitationsCount();
    }
  }, [user]);

  const loadPendingInvitationsCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('team_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error loading invitations count:', error);
        return;
      }

      setPendingInvitations(count || 0);
    } catch (error) {
      console.error('Error loading invitations count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPlanIcon = () => {
    if (subscriptionLoading || !currentProduct) return null;
    
    if (currentProduct.interval === 'year') {
      return <Crown className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Star className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPlanName = () => {
    if (subscriptionLoading) return 'Loading...';
    if (!currentProduct) return 'Free Plan';
    return currentProduct.name;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <Bell className="h-5 w-5" />
            {pendingInvitations > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingInvitations > 9 ? '9+' : pendingInvitations}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-medium text-gray-900">{user?.name}</span>
              {IS_BETA_MODE && BETA_CONFIG.showBetaBadge && (
                <span className="text-xs text-blue-600 font-medium">Beta User</span>
              )}
              {!subscriptionLoading && (
                <div className="flex items-center space-x-1">
                  {getPlanIcon()}
                  <span className="text-xs text-gray-500">{getPlanName()}</span>
                </div>
              )}
              {subscriptionLoading && (
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-600"></div>
                  <span className="text-xs text-gray-500">Loading...</span>
                </div>
              )}
            </div>
            
            <div className="relative group">
              <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer">
                <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}