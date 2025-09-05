import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthContextType, PlanSettings } from '../types';
import { createSecureDeveloperLog } from '../utils/secureLogging';
import { AuditLogger } from '../utils/secureLogging';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) { 
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    // In production, developer mode should always be false
    if (import.meta.env.PROD) {
      return false;
    }
    
    // In development, initialize from localStorage, default to false
    const saved = localStorage.getItem('developerMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Create a ref to hold the latest isDeveloperMode value
  const isDeveloperModeRef = useRef(isDeveloperMode);
  
  // Create secure developer log function
  const secureDeveloperLog = createSecureDeveloperLog(isDeveloperMode);

  // Persist developer mode to localStorage (only in development)
  useEffect(() => {
    if (!import.meta.env.PROD) {
      localStorage.setItem('developerMode', JSON.stringify(isDeveloperMode));
    }
  }, [isDeveloperMode]);

  const toggleDeveloperMode = useCallback(() => {
    // Prevent toggling developer mode in production
    if (import.meta.env.PROD) {
      console.warn('Developer mode cannot be enabled in production');
      return;
    }
    setIsDeveloperMode(prev => !prev);
  }, []);

  // Use secure developer log function
  const developerLog = secureDeveloperLog;
  console.log('DEBUG: isDeveloperMode status:', isDeveloperMode); // NEW DEBUG LOG

  // Enhanced logging function
  const logLoadingState = (action: string, state: boolean, context?: string) => {
    developerLog(`🔄 [${new Date().toISOString()}] AuthContext Loading: ${action} -> ${state}${context ? ` (${context})` : ''}`);
  };

  useEffect(() => {
    logLoadingState('Initial setup', true, 'Component mounted');
    
    const initializeAuth = async () => {
      setLoading(true); // Ensure loading is true at the start of initialization
      logLoadingState('Auth initialization start', true, 'Fetching initial session');

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        developerLog('🔄 Initial session found, loading user profile...', session.user.id);
        logLoadingState('Initial session found', true, 'Loading user profile');
        // Do not block the global loading state on profile fetching
        setHasSession(true);
        setProfileLoading(true);
        setLoading(false);
        loadUserProfile(session.user.id, session.user.email)
          .catch((error) => {
            developerLog('💥 Initial profile load error (non-blocking):', error);
          })
          .finally(() => {
            setProfileLoading(false);
            logLoadingState('Initial setup complete', false, 'Auth initialization finished');
          });
      } else {
        developerLog('📭 No initial session found');
        logLoadingState('No initial session', false, 'No session found');
        setUser(null);
        setHasSession(false);
        setProfileLoading(false);
        setLoading(false);
        logLoadingState('Initial setup complete', false, 'Auth initialization finished');
      }
    };

    initializeAuth(); // Call the async function immediately

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      developerLog('🔄 Auth state change:', event, session?.user?.id, 'Current loading state:', loading);
      logLoadingState(`Auth event: ${event}`, true, `Session: ${session?.user?.id || 'none'}`);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        developerLog('👋 User signed out or deleted');
        logLoadingState('User signed out/deleted', false, 'Clearing user state');
        setUser(null);
        setHasSession(false);
        setProfileLoading(false);
        setLoading(false); // Ensure loading is false after sign out
      } else if (session?.user) { // For SIGNED_IN, USER_UPDATED, PASSWORD_RECOVERY
        developerLog('🔄 User session active, loading profile');
        logLoadingState('User session active', true, 'Loading profile');
        // Do not block the route on profile fetching
        setHasSession(true);
        setProfileLoading(true);
        setLoading(false);
        loadUserProfile(session.user.id, session.user.email)
          .catch((error) => {
            developerLog('💥 Auth event profile load error (non-blocking):', error);
            logLoadingState('Auth event profile load error', false, error?.message || 'Unknown error');
          })
          .finally(() => {
            setProfileLoading(false);
          });
      } else { // Fallback for other cases where session.user might be null
        developerLog('📭 Auth state change: No user in session');
        logLoadingState('Auth state change: No user', false, 'Setting user to null');
        setUser(null);
        setHasSession(false);
        setProfileLoading(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array to run only once on mount

  // Helper function to fetch user subscription
  const fetchUserSubscription = async (userId: string) => {
    try {
      developerLog('📝 fetchUserSubscription: Attempting to fetch subscription for user:', userId);
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, current_period_end, cancel_at_period_end, cancelled_at, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (subscriptionError) {
        developerLog('❌ fetchUserSubscription: Error loading subscription:', subscriptionError);
        return null;
      }
      developerLog('✅ fetchUserSubscription: Subscription data:', subscription);
      return subscription;
    } catch (error) {
      developerLog('💥 fetchUserSubscription: Error fetching subscription:', error);
      return null;
    }
  };

  // Helper function to fetch plan settings for a specific plan
  const fetchPlanSettingsForPlan = async (planId: string): Promise<PlanSettings | null> => {
    try {
      developerLog('📝 fetchPlanSettingsForPlan: Fetching plan settings for plan:', planId);
      const { data: settings, error: settingsError } = await supabase
        .from('plan_settings')
        .select('plan_id, max_team_members, max_questions_custom_quiz, question_tier_access, allow_quick_start_quiz, allow_create_own_quiz, allow_study_schedule_quiz, allow_analytics_access')
        .eq('plan_id', planId)
        .maybeSingle();

      if (settingsError) {
        developerLog('❌ fetchPlanSettingsForPlan: Error loading plan settings:', settingsError);
        return null;
      }

      developerLog('✅ fetchPlanSettingsForPlan: Plan settings loaded:', settings);
      return settings;
    } catch (error) {
      developerLog('💥 fetchPlanSettingsForPlan: Error fetching plan settings:', error);
      return null;
    }
  };

  const loadUserProfile = async (userId: string, userEmail?: string | null): Promise<User | null> => {
    console.log('--- Entering loadUserProfile function ---'); // New log to confirm function entry
    try {
      console.log('DEBUG: loadUserProfile - About to fetch user profile from DB (Step 1)'); // NEW DIRECT CONSOLE LOG
      logLoadingState('loadUserProfile start', true, `User: ${userId}`);
      developerLog('📝 loadUserProfile: Starting profile load for:', userId);
      
      developerLog('📝 loadUserProfile: Step 1: Fetching user profile from DB...'); // Added log
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          role,
          team_id,
          team_role,
          avatar_url,
          created_at,
          updated_at,
          nickname
        `)
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        developerLog('❌ loadUserProfile: Step 1 Error loading user profile from DB:', profileError); // Modified log
        logLoadingState('Profile load error', false, profileError.message);
        setUser(null);
        return null;
      }

      developerLog('✅ loadUserProfile: Step 1: Raw profile data from DB:', profile); // Modified log

      if (!profile) {
        developerLog('⚠️ loadUserProfile: Step 1: No user profile found for user:', userId); // Modified log
        logLoadingState('No profile found', false, 'Profile does not exist');
        setUser(null);
        return null;
      }

      developerLog('📝 loadUserProfile: Step 2: Fetching user subscription...'); // Added log
      let subscription = await fetchUserSubscription(userId);
      let userPlanSettings: PlanSettings | null = null;

      developerLog('📝 loadUserProfile: Step 2: User subscription check:', { // Modified log
        userId, 
        hasSubscription: !!subscription, 
        subscriptionPlan: subscription?.plan, 
        teamId: profile.team_id,
        teamRole: profile.team_role
      });

      const shouldUseTeamOwnerSubscription = profile.team_id && (!subscription || subscription.plan === 'free');
      
      if (shouldUseTeamOwnerSubscription) {
        developerLog('📝 loadUserProfile: Step 3: Team member with no/free subscription, checking team owner plan settings for team:', profile.team_id); // Modified log
        developerLog('📝 loadUserProfile: Step 3: Calling get_team_owner_plan_settings RPC...'); // Added log
        const { data: teamOwnerPlanData, error: teamOwnerError } = await supabase
          .rpc('get_team_owner_plan_settings', { p_team_id: profile.team_id });
          
        if (!teamOwnerError && teamOwnerPlanData?.success) {
          developerLog('📝 loadUserProfile: Step 3: get_team_owner_plan_settings RPC returned successfully.'); // Added log
          developerLog('📝 loadUserProfile: Step 3: Found team owner plan settings:', teamOwnerPlanData.subscription_plan); // Modified log
          developerLog('✅ loadUserProfile: Step 3: Using team owner plan settings directly'); // Modified log
          userPlanSettings = teamOwnerPlanData.plan_settings;
        } else {
          developerLog('❌ loadUserProfile: Step 3: Failed to get team owner plan settings:', teamOwnerError || teamOwnerPlanData?.error); // Modified log
        }
      }

      developerLog('📝 loadUserProfile: Step 4: Determining plan settings...'); // Added log
      if (!userPlanSettings) {
        if (subscription) {
          developerLog('📝 loadUserProfile: Step 4: Loading plan settings for plan:', subscription.plan); // Modified log
          userPlanSettings = await fetchPlanSettingsForPlan(subscription.plan);
          developerLog('📝 loadUserProfile: Step 4: Plan settings loaded:', userPlanSettings); // Modified log
        } else {
          developerLog('📝 loadUserProfile: Step 4: No active subscription found, fetching settings for "free" plan'); // Modified log
          userPlanSettings = await fetchPlanSettingsForPlan('free');
          developerLog('📝 loadUserProfile: Step 4: Free plan settings loaded:', userPlanSettings); // Modified log
        }
      } else {
        developerLog('📝 loadUserProfile: Step 4: Using team owner plan settings:', userPlanSettings); // Modified log
      }

      // Step 5: Set maxTeamMembers from plan settings instead of querying teams table
      // This avoids RLS issues where non-owner/admin users can't see team details
      let maxTeamMembers: number | undefined;
      if (profile.team_id && userPlanSettings) {
        maxTeamMembers = userPlanSettings.max_team_members;
        developerLog('✅ loadUserProfile: Step 5: Using max_team_members from plan settings:', maxTeamMembers);
      } else {
        developerLog('ℹ️ loadUserProfile: Step 5: No team or plan settings available for max_team_members');
      }

      const userData: User = {
        id: profile.id,
        email: profile.email || userEmail || '',
        name: profile.name,
        nickname: profile.nickname,
        role: profile.role,
        teamId: profile.team_id,
        teamRole: profile.team_role,
        maxTeamMembers: maxTeamMembers,
        createdAt: profile.created_at,
        subscription: subscription ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelledAt: subscription.cancelled_at,
        } : undefined,
        planSettings: userPlanSettings,
      };

      developerLog('✅ loadUserProfile: User profile loaded successfully:', userData);
      setUser(userData);
      developerLog('✅ loadUserProfile: setUser called with:', userData.id);
      logLoadingState('loadUserProfile success', false, `User: ${userData.name}`);
      return userData;
    } catch (error) {
      developerLog('💥 loadUserProfile: Error loading user data:', error);
      logLoadingState('loadUserProfile error', false, error instanceof Error ? error.message : 'Unknown error');
      setUser(null);
      return null;
    }
  };

  const updateUserProfile = async (updates: { name?: string; email?: string; nickname?: string }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      logLoadingState('updateUserProfile start', true, `Updates: ${Object.keys(updates).join(', ')}`);
      developerLog('🔄 Updating user profile:', updates);
      
      // Prepare profile updates
      const profileUpdates: any = {};
      
      if (updates.name !== undefined) {
        profileUpdates.name = updates.name;
      }
      
      if (updates.email !== undefined) {
        profileUpdates.email = updates.email;
      }

      if (updates.nickname !== undefined) {
        profileUpdates.nickname = updates.nickname;
      }

      // Update user profile in database
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) {
          developerLog('❌ Error updating user profile:', profileError);
          throw profileError;
        }
      }

      // Update auth user email if it changed
      if (updates.email && updates.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: updates.email
        });

        if (authError) {
          developerLog('❌ Error updating auth user email:', authError);
          throw authError;
        }
      }

      // Reload user profile to get updated data
      await loadUserProfile(user.id, updates.email || user.email);
      
      developerLog('✅ User profile updated successfully');
    } catch (error) {
      developerLog('💥 Error updating user profile:', error);
      logLoadingState('updateUserProfile error', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      logLoadingState('updateUserProfile finally', false, 'Function complete');
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      logLoadingState('updatePassword start', true, 'Updating password');
      developerLog('🔄 Updating user password...');
      
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        developerLog('❌ Error updating password:', error);
        logLoadingState('updatePassword error', false, error.message);
        throw error;
      }
      
      developerLog('✅ Password updated successfully');
      logLoadingState('updatePassword success', false, 'Password updated');
    } catch (error) {
      developerLog('💥 Error updating password:', error);
      logLoadingState('updatePassword catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      logLoadingState('updatePassword finally', false, 'Function complete');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      logLoadingState('forgotPassword start', true, `Email: ${email}`);
      developerLog('🔄 Sending password reset email to:', email);
      
      // Check server-side rate limiting for password reset
      try {
        const rateLimitResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'password_reset',
            identifier: email
          })
        });

        if (rateLimitResponse.status === 429) {
          const rateLimitData = await rateLimitResponse.json();
          const retryMinutes = rateLimitData.retryAfter ? Math.ceil(rateLimitData.retryAfter / 60) : 60;
          throw new Error(`Too many password reset attempts. Please try again in ${retryMinutes} minutes.`);
        }

        if (!rateLimitResponse.ok) {
          console.warn('Rate limiting check failed, proceeding with password reset');
        }
      } catch (rateLimitError) {
        // If rate limiting fails, log but continue with password reset
        console.warn('Rate limiting check failed:', rateLimitError);
      }
      
      // Use environment variable for base URL, fallback to window.location.origin
      const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      });
      
      if (error) {
        developerLog('❌ Error sending password reset email:', error);
        logLoadingState('forgotPassword error', false, error.message);
        throw error;
      }
      
      developerLog('✅ Password reset email sent successfully');
      logLoadingState('forgotPassword success', false, 'Reset email sent');
    } catch (error) {
      logLoadingState('forgotPassword catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const resetPasswordWithToken = async (accessToken: string, newPassword: string) => {
    try {
      logLoadingState('resetPasswordWithToken start', true, 'Setting session and updating password');
      developerLog('🔄 Resetting password with token...');
      
      // Set the session using the access token from the reset link
      const { data: sessionResponse, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Not needed for password reset
      });
      
      if (setSessionError) {
        developerLog('❌ Error setting session with reset token:', setSessionError);
        logLoadingState('resetPasswordWithToken session error', false, setSessionError.message);
        throw new Error('Invalid or expired reset token');
      }
      
      if (!sessionResponse.user) {
        developerLog('❌ No user found with reset token');
        logLoadingState('resetPasswordWithToken no user', false, 'Invalid reset token');
        throw new Error('Invalid reset token');
      }
      
      developerLog('✅ Reset token verified, updating password...');
      
      // Now update the password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        developerLog('❌ Error updating password:', updateError);
        logLoadingState('resetPasswordWithToken update error', false, updateError.message);
        throw updateError;
      }
      
      developerLog('✅ Password updated successfully');
      logLoadingState('resetPasswordWithToken success', false, 'Password reset complete');
      
      // Load the user profile after password reset if we have update data
      if (updateData.user) {
        await loadUserProfile(sessionResponse.user.id, sessionResponse.user.email);
      }
      
    } catch (error) {
      developerLog('💥 Error resetting password:', error);
      logLoadingState('resetPasswordWithToken catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const invalidateTeamData = async () => {
    if (!user) return;

    try {
      developerLog('🔄 Invalidating team data for user:', user.id);
      
      // Update user profile to clear team association
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          team_id: null,
          team_role: null,
        })
        .eq('id', user.id);

      if (profileError) {
        developerLog('❌ Error clearing team data from profile:', profileError);
        throw profileError;
      }

      developerLog('✅ Team data cleared from profile, refreshing user...');
      
      // Refresh user profile to reflect changes
      await loadUserProfile(user.id, user.email);
      
      developerLog('✅ User profile refreshed after team data invalidation');
    } catch (error) {
      developerLog('💥 Error invalidating team data:', error);
      throw error;
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      logLoadingState('refreshUser start', true, 'Force refresh requested');
      
      // Force a fresh session check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        developerLog('❌ Session error during refresh:', sessionError);
        logLoadingState('Session error during refresh', false, sessionError.message);
        setUser(null);
        return null;
      }
      
      if (!session?.user) {
        developerLog('🚫 No session found during refresh');
        logLoadingState('No session during refresh', false, 'Setting user to null');
        setUser(null);
        return null;
      }

      developerLog('🔄 Refreshing user profile for:', session.user.id);
      
      const refreshedUser = await loadUserProfile(session.user.id, session.user.email);
      
      if (refreshedUser) {
        developerLog('✅ User profile refreshed successfully:', refreshedUser.name);
      }
      
      logLoadingState('refreshUser complete', false, 'Manual refresh complete');
      return refreshedUser;
    } catch (error) {
      developerLog('💥 Error refreshing user:', error);
      logLoadingState('refreshUser error', false, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      logLoadingState('login start', true, `Email: ${email}`);
      developerLog('🔐 Starting login process for:', email);
      
      // Check server-side rate limiting
      try {
        const rateLimitResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'login',
            identifier: email
          })
        });

        if (rateLimitResponse.status === 429) {
          const rateLimitData = await rateLimitResponse.json();
          const retryMinutes = rateLimitData.retryAfter ? Math.ceil(rateLimitData.retryAfter / 60) : 15;
          throw new Error(`Too many login attempts. Please try again in ${retryMinutes} minutes.`);
        }

        if (!rateLimitResponse.ok) {
          console.warn('Rate limiting check failed, proceeding with login');
        }
      } catch (rateLimitError) {
        // If rate limiting fails, log but continue with login
        console.warn('Rate limiting check failed:', rateLimitError);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        developerLog('❌ Login failed:', error);
        logLoadingState('login error', false, error.message);
        throw error;
      }

      if (!data.user) {
        developerLog('❌ Login failed: No user returned');
        logLoadingState('login no user', false, 'No user in response');
        throw new Error('Login failed');
      }

      developerLog('✅ Auth login successful, loading user profile...');
      
      // Explicitly load user profile and wait for it to complete
      const userData = await loadUserProfile(data.user.id, data.user.email);
      
      if (!userData) {
        throw new Error('User profile not found. Please contact support or try creating a new account.');
      }
      
      developerLog('🎉 Login process completed successfully');
      logLoadingState('login success', false, 'Login complete');
    } catch (error) {
      logLoadingState('login catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  // Function for invitation-based signup (creates user but no team)
  const signupForInvitation = async (email: string, password: string, name: string) => {
    try {
      logLoadingState('signup for invitation start', true, `Email: ${email}`);
      developerLog('🚀 Starting invitation signup process for:', { email, name });
      
      // Create auth user
      developerLog('📝 Step 1: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        developerLog('❌ Auth user creation failed:', authError);
        logLoadingState('signup for invitation auth error', false, authError.message);
        throw authError;
      }

      if (!authData.user) {
        developerLog('❌ Auth user creation failed: No user returned');
        logLoadingState('signup for invitation no user', false, 'No user in auth response');
        throw new Error('Failed to create user');
      }

      const userId = authData.user.id;
      developerLog('✅ Auth user created successfully:', userId);

      // Create user profile (without team - will be set when invitation is accepted)
      developerLog('📝 Step 2: Creating user profile...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          email,
          name,
          role: 'user',
          team_id: null, // Will be set when invitation is accepted
          team_role: null, // Will be set when invitation is accepted
        }]);

      if (profileError) {
        developerLog('❌ User profile creation failed:', profileError);
        logLoadingState('signup for invitation profile error', false, profileError.message);
        throw profileError;
      }

      developerLog('✅ User profile created successfully');

      // Load complete user profile
      developerLog('📝 Step 3: Loading complete user profile...');
      const userData = await loadUserProfile(userId, email);
      
      if (!userData) {
        throw new Error('Failed to load user profile after creation');
      }

      developerLog('🎉 Invitation signup process completed successfully!');
      logLoadingState('signup for invitation success', false, 'Signup complete');
    } catch (error) {
      logLoadingState('signup for invitation catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, teamName: string) => {
    try {
      logLoadingState('signup start', true, `Email: ${email}, Team: ${teamName}`);
      developerLog('🚀 Starting signup process for:', { email, name, teamName });
      
      // Create auth user
      developerLog('📝 Step 1: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        developerLog('❌ Auth user creation failed:', authError);
        logLoadingState('signup auth error', false, authError.message);
        throw authError;
      }

      if (!authData.user) {
        developerLog('❌ Auth user creation failed: No user returned');
        logLoadingState('signup no user', false, 'No user in auth response');
        throw new Error('Failed to create user');
      }

      const userId = authData.user.id;
      developerLog('✅ Auth user created successfully:', userId);

      // Create team first
      developerLog('📝 Step 2: Creating team...');
      
      // Fetch max_team_members from free plan settings (default for new signups)
      let maxMembers = 5; // Fallback default
      try {
        const { data: freePlanSettings, error: planError } = await supabase
          .from('plan_settings')
          .select('max_team_members')
          .eq('plan_id', 'free')
          .single();
        
        if (!planError && freePlanSettings) {
          maxMembers = freePlanSettings.max_team_members;
          developerLog('📝 Step 2: Using max_team_members from free plan settings:', maxMembers);
        } else {
          developerLog('⚠️ Step 2: Could not fetch free plan settings, using default:', maxMembers);
        }
      } catch (error) {
        developerLog('⚠️ Step 2: Error fetching plan settings, using default:', maxMembers);
      }
      
      
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{
          name: teamName,
          description: `${teamName} team`,
          owner_id: userId,
          member_count: 1,
          max_members: maxMembers,
        }])
        .select()
        .single();

      if (teamError) {
        developerLog('❌ Team creation failed:', teamError);
        logLoadingState('signup team error', false, teamError.message);
        throw teamError;
      }

      developerLog('✅ Team created successfully:', teamData);

      // Create user profile
      developerLog('📝 Step 3: Creating user profile...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          email,
          name,
          role: 'user',
          team_id: teamData.id,
          team_role: 'owner',
        }]);

      if (profileError) {
        developerLog('❌ User profile creation failed:', profileError);
        logLoadingState('signup profile error', false, profileError.message);
        throw profileError;
      }

      developerLog('✅ User profile created successfully');

      // Create subscription
      developerLog('📝 Step 4: Creating subscription...');
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          plan: 'free',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        }]);

      if (subscriptionError) {
        developerLog('❌ Subscription creation failed:', subscriptionError);
        logLoadingState('signup subscription error', false, subscriptionError.message);
        throw subscriptionError;
      }

      developerLog('✅ Subscription created successfully');

      // Create team member entry
      developerLog('📝 Step 5: Creating team member entry...');
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          user_id: userId,
          team_id: teamData.id,
          role: 'owner',
          status: 'active',
          invited_by: userId,
        }]);

      if (memberError) {
        developerLog('❌ Team member creation failed:', memberError);
        logLoadingState('signup member error', false, memberError.message);
        throw memberError;
      }

      developerLog('✅ Team member entry created successfully');

      // Send custom welcome email via Brevo Edge Function
      try {
        await supabase.functions.invoke('send-email-brevo', {
          body: {
            to: email,
            subject: `Welcome to PBE Quiz, ${name}!`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4F46E5; text-align: center;">Welcome to PBE Quiz!</h1>
                <p>Hello ${name},</p>
                <p>Welcome to PBE Quiz! Your account has been successfully created, and you are now part of the <strong>${teamName}</strong> team.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
                </div>
                <p>Here's what you can do next:</p>
                <ul>
                  <li>Take a Quick Start Quiz to test your knowledge</li>
                  <li>Create custom quizzes focused on specific books</li>
                  <li>View your study schedule and assignments</li>
                  <li>Track your progress and achievements</li>
                </ul>
                <p>Best regards,<br>The PBE Quiz Team</p>
              </div>
            `,
          },
        });
        developerLog('✅ Custom welcome email sent via Brevo');
      } catch (emailError) {
        console.error('❌ Failed to send custom welcome email via Brevo:', emailError);
      }
      
      // Load the complete user profile
      developerLog('📝 Step 6: Loading complete user profile...');
      const userData = await loadUserProfile(userId, authData.user.email);
      
      if (!userData) {
        throw new Error('Failed to load user profile after signup. Please try logging in.');
      }
      
      developerLog('🎉 Signup process completed successfully!');
      logLoadingState('signup success', false, 'Signup complete');
    } catch (error) {
      developerLog('💥 Signup process failed:', error);
      logLoadingState('signup catch', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const logout = async () => {
    logLoadingState('logout start', true, 'Signing out');
    
    // Log logout event
    if (user) {
      AuditLogger.getInstance().logSecurityEvent({
        type: 'logout',
        userId: user.id,
        details: { success: true },
      });
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      developerLog('Error signing out:', error);
      logLoadingState('logout error', false, error.message);
    } else {
      logLoadingState('logout success', false, 'Signed out successfully');
    }
    setUser(null);
    setLoading(false);
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    signupForInvitation,
    updateUserProfile,
    updatePassword,
    forgotPassword,
    resetPasswordWithToken,
    refreshUser,
    logout,
    loading,
    hasSession,
    profileLoading,
    isDeveloperMode,
    toggleDeveloperMode,
    developerLog,
    invalidateTeamData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}