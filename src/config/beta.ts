/**
 * Beta mode configuration
 * 
 * Set IS_BETA_MODE to true to enable beta mode, which will:
 * - Hide documentation, features, and signup pages
 * - Redirect users to login page for disabled routes
 * - Keep all code intact for easy restoration later
 * 
 * To restore full functionality, simply change IS_BETA_MODE to false
 */
export const IS_BETA_MODE = true;

/**
 * Beta mode settings
 */
export const BETA_CONFIG = {
  // Pages that should be disabled in beta mode
  disabledRoutes: [
    '/documentation',
    '/features',
    '/signup'
  ],
  
  // Redirect destination for disabled routes
  redirectTo: '/login',
  
  // Message to show on login page in beta mode
  betaMessage: 'Welcome to PBE Journey Beta! Sign in to access the application.',
  
  // Whether to show beta badge in header
  showBetaBadge: false
};