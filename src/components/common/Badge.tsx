import React from 'react';
import { Crown, Shield, Users, Star, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface BadgeProps {
  type: 'role' | 'status' | 'tier' | 'plan' | 'teamRole';
  value: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ type, value, showIcon = false, size = 'sm' }: BadgeProps) {
  const getColorClasses = () => {
    switch (type) {
      case 'role':
        switch (value) {
          case 'admin': return 'bg-purple-100 text-purple-800';
          case 'user': return 'bg-blue-100 text-blue-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      
      case 'status':
        switch (value) {
          case 'active': return 'bg-green-100 text-green-800';
          case 'inactive': return 'bg-gray-100 text-gray-800';
          case 'suspended': return 'bg-red-100 text-red-800';
          case 'pending': return 'bg-yellow-100 text-yellow-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      
      case 'tier':
        switch (value) {
          case 'free': return 'bg-green-100 text-green-800';
          case 'pro': return 'bg-blue-100 text-blue-800';
          case 'enterprise': return 'bg-purple-100 text-purple-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      
      case 'plan':
        switch (value) {
          case 'free': return 'bg-green-100 text-green-800';
          case 'pro': return 'bg-blue-100 text-blue-800';
          case 'enterprise': return 'bg-purple-100 text-purple-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      
      case 'teamRole':
        switch (value) {
          case 'owner': return 'bg-yellow-100 text-yellow-800';
          case 'admin': return 'bg-blue-100 text-blue-800';
          case 'member': return 'bg-gray-100 text-gray-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;

    switch (type) {
      case 'role':
        if (value === 'admin') return <Shield className="h-3 w-3" />;
        return <Users className="h-3 w-3" />;
      
      case 'status':
        switch (value) {
          case 'active': return <CheckCircle className="h-3 w-3" />;
          case 'pending': return <Clock className="h-3 w-3" />;
          case 'suspended': return <XCircle className="h-3 w-3" />;
          default: return <AlertCircle className="h-3 w-3" />;
        }
      
      case 'tier':
        switch (value) {
          case 'enterprise': return <Crown className="h-3 w-3" />;
          case 'pro': return <Star className="h-3 w-3" />;
          default: return null;
        }
      
      case 'teamRole':
        switch (value) {
          case 'owner': return <Crown className="h-3 w-3" />;
          case 'admin': return <Shield className="h-3 w-3" />;
          default: return <Users className="h-3 w-3" />;
        }
      
      default:
        return null;
    }
  };

  const sizeClasses = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-1 text-xs';
  const icon = getIcon();

  return (
    <span className={`inline-flex items-center ${sizeClasses} font-semibold rounded-full ${getColorClasses()}`}>
      {icon && <span className="mr-1">{icon}</span>}
      <span className="capitalize">{value}</span>
    </span>
  );
}