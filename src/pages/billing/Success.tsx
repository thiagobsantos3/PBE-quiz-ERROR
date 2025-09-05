import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useStripeSubscription } from '../../hooks/useStripeSubscription';
import { CheckCircle, ArrowRight, Home, AlertCircle } from 'lucide-react';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BillingSuccess Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Completed!</h1>
              <p className="text-gray-600 mb-8">
                Your payment was processed successfully. Please check your dashboard for updated subscription details.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple success component without Layout to avoid potential issues
function SimpleSuccessPage({ 
  sessionId, 
  onDashboardClick, 
  onBillingClick,
  processingState 
}: { 
  sessionId?: string | null;
  onDashboardClick: () => void;
  onBillingClick: () => void;
  processingState: 'processing' | 'complete' | 'error';
}) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            processingState === 'error' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {processingState === 'error' ? (
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {processingState === 'error' ? 'Payment Received!' : 'Payment Successful!'}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {processingState === 'processing' && (
              'Your payment is being processed. Subscription details will be available shortly.'
            )}
            {processingState === 'complete' && (
              'Thank you for your purchase! Your subscription has been activated and you now have access to all the premium features.'
            )}
            {processingState === 'error' && (
              'Your payment was successful, but subscription details are still being processed. If you don\'t see your subscription in a few minutes, please contact support.'
            )}
          </p>

          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Session ID:</strong> {sessionId.substring(0, 20)}...
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={onDashboardClick}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Home className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </button>
            
            <button
              onClick={onBillingClick}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <span>View Billing</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component
function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing your payment...</h2>
        <p className="text-gray-600">Please wait while we confirm your subscription.</p>
      </div>
    </div>
  );
}

export function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const { forceRefresh: forceRefreshSubscription } = useStripeSubscription();
  const [loading, setLoading] = useState(true);
  const [processingState, setProcessingState] = useState<'processing' | 'complete' | 'error'>('processing');

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 3;
    let isComplete = false;
    
    const attemptRefresh = async () => {
      if (isComplete) return;
      
      attempts++;
      try {
        console.log(`🔄 Attempt ${attempts}/${maxAttempts}: Refreshing user data after payment`);
        
        // Refresh both user and subscription data
        const [refreshedUser] = await Promise.all([
          refreshUser(),
          forceRefreshSubscription()
        ]);
        
        if (refreshedUser) {
          isComplete = true;
          setProcessingState('complete');
          setLoading(false);
          console.log('✅ User and subscription data refreshed successfully after payment');
          return;
        } else {
          console.warn('⚠️ User refresh returned null, but continuing...');
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${attempts} failed:`, error);
      }
      
      if (attempts >= maxAttempts) {
        // Max attempts reached
        console.error('❌ Max attempts reached, subscription may still be processing');
        isComplete = true;
        setProcessingState('error');
        setLoading(false);
      } else {
        // Retry after delay
        const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
        console.log(`⏱️ Retrying in ${delay}ms...`);
        setTimeout(attemptRefresh, delay);
      }
    };

    // Start the first attempt after a short delay to allow webhook processing
    const timer = setTimeout(attemptRefresh, 2000);

    return () => {
      clearTimeout(timer);
      isComplete = true; // Prevent further attempts if component unmounts
    };
  }, []); // Empty dependency array to run only once

  // Add error boundary for this component
  useEffect(() => {
    // Log successful payment completion
    if (sessionId) {
      console.log('✅ Payment completed successfully, session ID:', sessionId);
    }
  }, [sessionId]);

  const handleDashboardClick = () => {
    console.log('🏠 Navigating to dashboard');
    navigate('/dashboard');
  };

  const handleBillingClick = () => {
    console.log('💳 Navigating to billing');
    navigate('/billing');
  };

  // Show loading state
  if (loading) {
    return (
      <ErrorBoundary>
        <LoadingPage />
      </ErrorBoundary>
    );
  }

  // Show success page without Layout to avoid potential component conflicts
  return (
    <ErrorBoundary>
      <SimpleSuccessPage 
        sessionId={sessionId}
        onDashboardClick={handleDashboardClick}
        onBillingClick={handleBillingClick}
        processingState={processingState}
      />
    </ErrorBoundary>
  );
}