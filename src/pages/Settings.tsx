import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { isSuperAdmin } from '../utils/permissions';
import { validatePassword } from '../utils/security';
import { AlertMessage } from '../components/common/AlertMessage';
import { InlineLoading } from '../components/common/LoadingSpinner';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon
} from 'lucide-react';

interface ProfileForm {
  name: string;
  email: string;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export function Settings() {
  const { user, updateUserProfile, updatePassword, loading: authLoading, isDeveloperMode, toggleDeveloperMode } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordForm>();

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      setProfileError(null);
      setProfileSuccess(null);
      
      await updateUserProfile({
        name: data.name,
        email: data.email,
      });
      
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(error.message || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setPasswordError(null);
      setPasswordSuccess(null);
      
      await updatePassword(data.newPassword);
      
      setPasswordSuccess('Password updated successfully!');
      passwordForm.reset();
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password');
    }
  };

  // Filter tabs based on user permissions
  const allTabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'developer', name: 'Developer', icon: SettingsIcon },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === 'developer') {
      return isSuperAdmin(user);
    }
    return true;
  });

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  {profileSuccess && (
                    <AlertMessage
                      type="success"
                      message={profileSuccess}
                      className="mb-6"
                    />
                  )}
                  
                  {profileError && (
                    <AlertMessage
                      type="error"
                      message={profileError}
                      className="mb-6"
                    />
                  )}
                  
                  <div className="flex items-center space-x-6">
                    <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        Change Avatar
                      </button>
                      <p className="text-sm text-gray-500 mt-1">JPG, GIF or PNG. 1MB max.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                        {...profileForm.register('name', { required: 'Name is required' })}
                      />
                      {profileForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nickname (Public Display Name)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                        {...profileForm.register('nickname')}
                        placeholder="Your public display name for leaderboards"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This will be shown on leaderboards instead of your full name. Leave empty to use your full name.
                      </p>
                      {profileForm.formState.errors.nickname && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.nickname.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                        {...profileForm.register('email', { required: 'Email is required' })}
                      />
                      {profileForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {authLoading && <InlineLoading />}
                      <Save className="h-4 w-4" />
                      <span>{authLoading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <button className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                      Enable 2FA
                    </button>
                  </div>

                  {passwordSuccess && (
                    <AlertMessage type="success" message={passwordSuccess} />
                  )}
                  
                  {passwordError && (
                    <AlertMessage type="error" message={passwordError} />
                  )}

                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <h3 className="font-medium text-gray-900">Change Password</h3>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Password Security</p>
                          <p>Since you're already authenticated, you can directly set a new password without entering your current one.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                          {...passwordForm.register('newPassword', { 
                            required: 'New password is required',
                            minLength: { value: 12, message: 'Password must be at least 12 characters' },
                            validate: (value) => {
                              const validation = validatePassword(value);
                              return validation.isValid || validation.error;
                            }
                          })}
                        />
                        <div
                          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      {passwordForm.formState.errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                          {...passwordForm.register('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: value =>
                              value === passwordForm.watch('newPassword') || 'The passwords do not match',
                          })}
                        />
                        <div
                          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {authLoading && <InlineLoading />}
                        <Lock className="h-4 w-4" />
                        <span>{authLoading ? 'Updating...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'developer' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Developer Settings</h2>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Developer Mode</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Enable detailed console logging for debugging purposes. This will show internal application logs in the browser console.
                        </p>
                      </div>
                      <button
                        onClick={toggleDeveloperMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          isDeveloperMode ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            isDeveloperMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {isDeveloperMode && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <SettingsIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">Developer Mode Active</p>
                            <p>Console logging is now enabled. Open your browser's developer tools (F12) to view detailed logs.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <SettingsIcon className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">About Developer Mode</p>
                        <ul className="mt-2 space-y-1 text-blue-700">
                          <li>• Shows authentication flow logs</li>
                          <li>• Displays API request/response details</li>
                          <li>• Logs component state changes</li>
                          <li>• Helps troubleshoot application issues</li>
                          <li>• Setting persists across browser sessions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}