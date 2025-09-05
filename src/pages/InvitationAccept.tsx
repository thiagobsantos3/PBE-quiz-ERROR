import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/common/Badge';
import { getRoleIconComponent } from '../utils/displayUtils';
import { 
  Zap, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Building2,
  Users,
  Crown,
  Shield,
  Loader
} from 'lucide-react';

interface SignupForm {
  name: string;
  password: string;
  confirmPassword: string;
}

interface LoginForm {
  password: string;
}

interface InvitationData {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  expiresAt: string;
  team: {
    id: string;
    name: string;
    description?: string;
  };
  inviter: {
    name: string;
  };
}

export function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, signup, signupForInvitation, refreshUser, loading: authLoading, developerLog } = useAuth();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'processing'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [acceptanceAttempted, setAcceptanceAttempted] = useState(false);
  const [teamFullError, setTeamFullError] = useState(false);

  const token = searchParams.get('token');

  const signupForm = useForm<SignupForm>();
  const loginForm = useForm<LoginForm>();

  const password = signupForm.watch('password');

  useEffect(() => {
    developerLog('🔍 InvitationAccept: Component mounted with token:', token);
    
    if (!token) {
      developerLog('❌ InvitationAccept: No token provided in URL');
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  // Enhanced logging for user and invitation state changes
  useEffect(() => {
    developerLog('🔄 InvitationAccept: State change detected');
    developerLog('👤 User state:', user ? { id: user.id, email: user.email, name: user.name } : 'null');
    developerLog('📧 Invitation state:', invitation ? { id: invitation.id, email: invitation.email, teamName: invitation.team.name } : 'null');
    developerLog('⚙️ Processing state:', processing);
    developerLog('🔐 Auth loading state:', authLoading);

    // If user is already logged in and we have invitation data, try to accept the invitation automatically
    // But only if we haven't already attempted acceptance
    if (user && invitation && !processing && !authLoading && !acceptanceAttempted) {
      developerLog('✅ InvitationAccept: Conditions met for auto-acceptance - calling handleAcceptInvitation');
      setAcceptanceAttempted(true);
      handleAcceptInvitation();
    } else {
      developerLog('⏳ InvitationAccept: Auto-acceptance conditions not met:', {
        hasUser: !!user,
        hasInvitation: !!invitation,
        isProcessing: processing,
        isAuthLoading: authLoading,
        acceptanceAttempted: acceptanceAttempted
      });
    }
      }, [user, invitation, processing, authLoading, acceptanceAttempted]);

  const loadInvitation = async () => {
    if (!token) return;

    try {
      developerLog('📥 InvitationAccept: Loading invitation with token:', token);
      setLoading(true);
      setError(null);

      // Load invitation details using the token
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          invited_by,
          team_id,
          teams:team_id (
            id,
            name,
            description
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        developerLog('❌ InvitationAccept: Error loading invitation:', error);
        setError('Failed to load invitation details');
        return;
      }

      if (!data) {
        developerLog('⚠️ InvitationAccept: No invitation found for token:', token);
        setError('Invitation not found or has expired');
        return;
      }

      developerLog('📧 InvitationAccept: Invitation data loaded:', data);
      developerLog('🔍 InvitationAccept: Raw team data from join:', data.teams);
      developerLog('🔍 InvitationAccept: Raw team_id:', data.team_id);

      // Load team data separately if the join didn't work
      let teamData = data.teams;
      if (!teamData && data.team_id) {
        developerLog('🔄 InvitationAccept: Loading team data separately for:', data.team_id);
        const { data: separateTeamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, description')
          .eq('id', data.team_id)
          .single();
          
        if (!teamError && separateTeamData) {
          teamData = separateTeamData;
          developerLog('✅ InvitationAccept: Team data loaded separately:', teamData);
        } else {
          developerLog('❌ InvitationAccept: Failed to load team data:', teamError);
        }
      }

      // Check if the team data exists
      if (!teamData) {
        developerLog('⚠️ InvitationAccept: Team data missing from invitation');
        setError('The team associated with this invitation no longer exists');
        return;
      }

      // Get the inviter's profile separately
      let inviterName = 'Unknown User';
      if (data.invited_by) {
        developerLog('👤 InvitationAccept: Loading inviter profile for:', data.invited_by);
        const { data: inviterNameResult, error: inviterError } = await supabase
          .rpc('get_user_name_by_id', { p_user_id: data.invited_by });
        
        if (!inviterError && inviterNameResult) {
          inviterName = inviterNameResult;
          developerLog('✅ InvitationAccept: Inviter profile loaded:', inviterName);
        } else {
          developerLog('⚠️ InvitationAccept: Could not load inviter name:', inviterError);
        }
      }

      const invitationData: InvitationData = {
        id: data.id,
        email: data.email,
        role: data.role,
        status: data.status,
        expiresAt: data.expires_at,
        team: {
          id: teamData.id,
          name: teamData.name,
          description: teamData.description,
        },
        inviter: {
          name: inviterName
        }
      };

      developerLog('✅ InvitationAccept: Complete invitation data prepared:', invitationData);
      setInvitation(invitationData);

      // Default to signup mode - let the user attempt signup first
      setMode('signup');

    } catch (error) {
      developerLog('💥 InvitationAccept: Unexpected error loading invitation:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    developerLog('🎯 InvitationAccept: handleAcceptInvitation called');
    developerLog('👤 Current user:', user ? { id: user.id, email: user.email } : 'null');
    developerLog('📧 Current invitation:', invitation ? { id: invitation.id, email: invitation.email } : 'null');

    if (!invitation || !user) {
      developerLog('⚠️ InvitationAccept: Cannot accept invitation - missing data:', {
        hasInvitation: !!invitation,
        hasUser: !!user
      });
      return;
    }

    try {
      developerLog('🚀 InvitationAccept: Starting invitation acceptance process');
      setProcessing(true);
      setError(null);

      // Verify the invitation email matches the logged-in user's email
      developerLog('🔍 InvitationAccept: Verifying email match');
      developerLog('📧 Invitation email:', invitation.email.toLowerCase());
      developerLog('👤 User email:', user.email.toLowerCase());

      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        developerLog('❌ InvitationAccept: Email mismatch');
        setError('This invitation is for a different email address. Please log in with the correct account or contact the team administrator.');
        return;
      }

      developerLog('✅ InvitationAccept: Email verification passed');

      // The team capacity check is handled by the accept_team_invitation function
      developerLog('🔍 InvitationAccept: Skipping client-side team capacity check - will be handled by database function');

      // Use the database function to accept the invitation
      developerLog('📞 InvitationAccept: Calling accept_team_invitation function with ID:', invitation.id);
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        p_invitation_id: invitation.id
      });

      if (error) {
        developerLog('❌ InvitationAccept: Database function error:', error);
        setError('Failed to accept invitation. Please try again.');
        return;
      }

      developerLog('📊 InvitationAccept: Database function response:', data);

      if (!data.success) {
        developerLog('❌ InvitationAccept: Database function returned failure:', data.error);
        
        // Check if it's a team capacity error
        if (data.error && data.error.includes('maximum capacity')) {
          setTeamFullError(true);
          setError('This team has reached its maximum capacity. Please contact the team owner to increase the team size or remove inactive members.');
        } else {
          setError(data.error || 'Failed to accept invitation');
        }
        return;
      }

      developerLog('🎉 InvitationAccept: Invitation accepted successfully!');

      // Refresh user profile to get updated team information
      developerLog('🔄 InvitationAccept: Refreshing user profile to get updated team info');
      try {
        await refreshUser();
        developerLog('✅ InvitationAccept: User profile refreshed after invitation acceptance');
      } catch (refreshError) {
        developerLog('⚠️ Could not refresh user profile after invitation acceptance:', refreshError);
      }

      // Show success and redirect
      setMode('processing');
      
      // Wait a moment to show success message, then redirect
      developerLog('🔄 InvitationAccept: Setting redirect timer');
      setTimeout(() => {
        developerLog('🏠 InvitationAccept: Redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }, 2000);

    } catch (error) {
      developerLog('💥 InvitationAccept: Unexpected error accepting invitation:', error);
      setError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const onSignupSubmit = async (data: SignupForm) => {
    if (!invitation) return;

    developerLog('📝 InvitationAccept: Signup form submitted');
    developerLog('📧 Signup email:', invitation.email);
    developerLog('👤 Signup name:', data.name);

    // If we know the team is full, don't proceed with signup
    if (teamFullError) {
      setError('Cannot create account - the team has reached maximum capacity. Please contact the team owner.');
      return;
    }

    try {
      setError(null);
      developerLog('🚀 InvitationAccept: Calling signupForInvitation function');
      await signupForInvitation(invitation.email, data.password, data.name);
      developerLog('✅ InvitationAccept: Signup completed successfully');
      // The useEffect will handle accepting the invitation once the user is logged in
    } catch (err: any) {
      developerLog('❌ InvitationAccept: Signup error:', err);
      
      // Check if the error indicates the user already exists
      if (err.message && err.message.toLowerCase().includes('user already registered')) {
        developerLog('🔄 InvitationAccept: User already exists, switching to login mode');
        setError('An account with this email already exists. Please sign in instead.');
        setMode('login');
      } else {
        setError(err.message || 'Failed to create account');
      }
    }
  };

  const onLoginSubmit = async (data: LoginForm) => {
    if (!invitation) return;

    developerLog('🔐 InvitationAccept: Login form submitted');
    developerLog('📧 Login email:', invitation.email);

    try {
      setError(null);
      developerLog('🚀 InvitationAccept: Calling login function');
      await login(invitation.email, data.password);
      developerLog('✅ InvitationAccept: Login completed successfully');
      // The useEffect will handle accepting the invitation once the user is logged in
    } catch (err: any) {
      developerLog('❌ InvitationAccept: Login error:', err);
      
      // Check if the error indicates invalid credentials (user might not exist)
      if (err.message && (err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('not found'))) {
        developerLog('🔄 InvitationAccept: Invalid credentials, switching to signup mode');
        setError('Invalid credentials. If you don\'t have an account, please create one.');
        setMode('signup');
      } else {
        setError(err.message || 'Invalid password');
      }
    }
  };

  if (loading) {
    developerLog('⏳ InvitationAccept: Rendering loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    developerLog('❌ InvitationAccept: Rendering error state (no invitation)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
          </div>
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'processing') {
    developerLog('🎉 InvitationAccept: Rendering success/processing state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Welcome to the Team!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You have successfully joined <strong>{invitation?.team.name}</strong>. 
              Redirecting you to the dashboard...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    developerLog('⚠️ InvitationAccept: No invitation data available');
    return null;
  }

  developerLog('📋 InvitationAccept: Rendering main form in mode:', mode);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Zap className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Team Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join a team
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {invitation.team.name}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                <strong>{invitation.inviter.name}</strong> invited you to join as{' '}
                <Badge type="teamRole" value={invitation.role} showIcon />
              </p>
            </div>
          </div>
          
          {invitation.team.description && (
            <p className="text-sm text-gray-500 mb-4">
              {invitation.team.description}
            </p>
          )}
          
          <div className="text-xs text-gray-500">
            Invitation expires: {new Date(invitation.expiresAt).toLocaleDateString()}
          </div>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{error}</p>
                  {teamFullError && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setError(null);
                          setTeamFullError(false);
                          setAcceptanceAttempted(false);
                          if (user && invitation) {
                            handleAcceptInvitation();
                          }
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' && !teamFullError ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your Account</h3>
                <p className="text-sm text-gray-600">
                  Complete your account setup to join <strong>{invitation.team.name}</strong>
                </p>
              </div>

              <form className="space-y-6" onSubmit={signupForm.handleSubmit(onSignupSubmit)}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                    {...signupForm.register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                  />
                  {signupForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                      {...signupForm.register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                      {...signupForm.register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: value =>
                          value === password || 'The passwords do not match',
                      })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {authLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create Account & Join Team'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            </>
          ) : teamFullError ? (
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-2 text-yellow-800 mb-4">
                  <Users className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">Team at Capacity</h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  The team <strong>{invitation.team.name}</strong> has reached its maximum member limit.
                </p>
                <p className="text-sm text-yellow-600">
                  Please contact the team owner to increase the team capacity or remove inactive members, then use the "Try Again" button above.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign In to Join</h3>
                <p className="text-sm text-gray-600">
                  Sign in to your account to join <strong>{invitation.team.name}</strong>
                </p>
              </div>

              <form className="space-y-6" onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                      {...loginForm.register('password', {
                        required: 'Password is required',
                      })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {authLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In & Join Team'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                  >
                    Create one now
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}