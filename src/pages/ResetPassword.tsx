import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword } from '../utils/security';
import { AlertMessage } from '../components/common/AlertMessage';
import { InlineLoading } from '../components/common/LoadingSpinner';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [resetType, setResetType] = useState<string | null>(null);
  const { resetPasswordWithToken, loading } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();
  
  // Enhanced token validation
  const [tokenValidated, setTokenValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const password = watch('password');

  // Debug logging to help diagnose the issue
  console.log('🔍 ResetPassword Debug:', {
    error,
    success,
    accessToken,
    resetType,
    loading,
    windowLocationHash: window.location.hash,
    windowLocationHref: window.location.href
  });

  // Parse URL hash for Supabase auth parameters
  useEffect(() => {
    const parseHashParams = () => {
      const hash = window.location.hash;
      if (!hash) return {};
      
      // Remove the leading # and parse as URLSearchParams
      const hashParams = new URLSearchParams(hash.substring(1));
      const params: { [key: string]: string } = {};
      
      for (const [key, value] of hashParams.entries()) {
        params[key] = value;
      }
      
      return params;
    };

    const hashParams = parseHashParams();
    
    // Check for error in hash first
    if (hashParams.error) {
      console.error('Supabase auth error from hash:', {
        error: hashParams.error,
        error_code: hashParams.error_code,
        error_description: hashParams.error_description
      });
      
      if (hashParams.error_code === 'otp_expired') {
        console.log('🔍 Setting error: OTP expired');
        setError('The password reset link has expired. Please request a new password reset.');
      } else {
        console.log('🔍 Setting error: Auth error -', hashParams.error_description || hashParams.error);
        setError(`Authentication error: ${hashParams.error_description || hashParams.error}`);
      }
      return;
    }
    
    // Extract access_token and type from hash
    const token = hashParams.access_token;
    const type = hashParams.type;
    
    // Enhanced token validation with cryptographic checks
    if (!token || typeof token !== 'string') {
      setValidationError('Invalid reset token format');
      setError('Invalid or malformed reset link. Please request a new password reset.');
      return;
    }

    // Validate token format (JWT-like structure)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      setValidationError('Invalid token structure');
      setError('Invalid reset link format. Please request a new password reset.');
      return;
    }

    // Validate token length (minimum security requirement)
    if (token.length < 50) {
      setValidationError('Token too short');
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Validate token contains only valid characters
    const validTokenRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    if (!validTokenRegex.test(token)) {
      setValidationError('Invalid token characters');
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    if (type !== 'recovery') {
      setValidationError('Invalid token type');
      setError('Invalid reset link type. Please request a new password reset.');
      return;
    }
    
    setAccessToken(token);
    setResetType(type);
    setTokenValidated(true);
    
  }, []);

  useEffect(() => {
    // This useEffect was moved into the hash parsing useEffect above
    // Keeping this comment for reference but removing the duplicate logic
  }, []);

  // Remove the old useEffect that was checking searchParams
  // useEffect(() => {
  //   // Check if we have the required parameters
  //   if (!accessToken || type !== 'recovery') {
  //     setError('Invalid or expired reset link. Please request a new password reset.');
  //   }
  // }, [accessToken, type]);

  // Keep the old useEffect structure but remove the duplicate validation
  useEffect(() => {
    // This useEffect is now empty but kept for potential future use
    if (accessToken && resetType === 'recovery') {
      // Clear any existing errors when we have valid parameters
      setError('');
    }
  }, [accessToken, resetType]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!accessToken || !tokenValidated) {
      setError('Invalid reset token');
      return;
    }
    
    // Additional validation before submission
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await resetPasswordWithToken(accessToken, data.password);
      setSuccess(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
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
              Password reset successful
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been updated successfully. You will be redirected to the login page shortly.
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow-lg rounded-xl text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <div className="font-bold">Debug Error Display:</div>
                <div>{error}</div>
                <div className="text-xs mt-2">
                  Access Token: {accessToken ? 'Present' : 'Missing'} | 
                  Reset Type: {resetType || 'Missing'} | 
                  Hash: {window.location.hash || 'Empty'}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  placeholder="Enter your new password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 12,
                      message: 'Password must be at least 12 characters',
                    },
                    validate: (value) => {
                      const validation = validatePassword(value);
                      return validation.isValid || validation.error;
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  placeholder="Confirm your new password"
                  {...register('confirmPassword', {
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
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !accessToken || !tokenValidated || !!validationError}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <InlineLoading />
                  <span>Updating password...</span>
                </div>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}