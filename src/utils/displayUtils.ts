import { Crown, Shield, Users } from 'lucide-react';

/**
 * Display utilities for UI elements like icons and badges
 */

/**
 * Get icon component for team/user roles
 */
export function getRoleIcon(role: string) {
  switch (role) {
    case 'owner': return '👑';
    case 'admin': return '🛡️';
    default: return '👥';
  }
}

/**
 * Get React icon component for team roles
 */
export function getRoleIconComponent(role: string) {
  switch (role) {
    case 'owner': return Crown;
    case 'admin': return Shield;
    default: return Users;
  }
}