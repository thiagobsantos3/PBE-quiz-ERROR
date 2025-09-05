import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useStripeCheckout } from '../hooks/useStripeCheckout';
import { useStripeSubscription } from '../hooks/useStripeSubscription';
import { useStripeBilling } from '../hooks/useStripeBilling';
import { Modal } from '../components/common/Modal';
import { Table, TableColumn } from '../components/common/Table';
import { stripeProducts } from '../stripe-config';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Check, 
  AlertCircle,
  Crown,
  Star,
  Zap,
  X,
  Clock
} from 'lucide-react';

export function Billing() {
  const { user } = useAuth();
  const { createCheckoutSession, loading: checkoutLoading } = useStripeCheckout();
  const { 
    subscription, 
    orders, 
    loading: subscriptionLoading, 
    error: subscriptionError,
    cancelCurrentSubscription 
  } = useStripeSubscription();
  const { 
    invoices, 
    paymentMethods,
    loading: billingLoading, 
    error: billingError 
  } = useStripeBilling();
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<'month' | 'year'>('month');

  // Get current subscription details
  const currentSubscription = subscription?.subscription_id ? subscription : null; // Ensure subscription_id exists
  const currentPriceId = currentSubscription?.price_id;
  const currentProduct = stripeProducts.find(p => p.priceId === currentPriceId);

  // Debug logs to diagnose cancellation button visibility
  console.log('🔍 Billing Debug - Current subscription data:', {
    hasCurrentSubscription: !!currentSubscription, // Check if currentSubscription object exists
    subscriptionStatus: currentSubscription?.subscription_status, // Use the correct property name
    cancelAtPeriodEnd: currentSubscription?.cancel_at_period_end,
    subscriptionId: currentSubscription?.subscription_id,
    priceId: currentPriceId,
    foundProduct: !!currentProduct
  });

  // Debug billing data
  console.log('🔍 Billing Debug - Billing data:', {
    invoicesCount: invoices.length,
    ordersCount: orders.length,
    billingLoading,
    billingError,
    invoices: invoices.slice(0, 2), // Show first 2 invoices for debugging
    paymentMethods: paymentMethods.slice(0, 1) // Show first payment method
  });

  // Debug the specific condition for showing the cancel button
  const shouldShowCancelButton = currentSubscription?.subscription_status === 'active' && !currentSubscription?.cancel_at_period_end;
  console.log('🔍 Billing Debug - Cancel button condition:', {
    statusIsActive: currentSubscription?.status === 'active',
    notCancelAtPeriodEnd: !currentSubscription?.cancel_at_period_end,
    shouldShowCancelButton
  });

  // Filter products by selected billing interval
  const filteredProducts = stripeProducts.filter(product => product.interval === selectedBillingInterval);

  // Check if user is on free plan
  const isOnFreePlan = !currentSubscription || user?.subscription?.plan === 'free';

  // Check if user can downgrade to free
  const canDowngradeToFree = currentSubscription?.subscription_status === 'active' && !currentSubscription?.cancel_at_period_end;
  
  const handleUpgrade = async (priceId: string) => {
    setProcessingPriceId(priceId);
    
    try {
      await createCheckoutSession({
        priceId,
        mode: 'subscription',
      });
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setProcessingPriceId(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setCancelError(null);
    
    try {
      const result = await cancelCurrentSubscription();
      
      if (result.success) {
        setShowCancelModal(false);
        // Show success message or handle UI update
      } else {
        setCancelError(result.error || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      setCancelError(error.message || 'An unexpected error occurred');
    } finally {
      setCancelling(false);
    }
  };

  // Define invoice table columns
  const invoiceColumns: TableColumn[] = [
    {
      key: 'id',
      header: 'Invoice',
      render: (invoice) => (
        <div className="font-medium text-gray-900">
          #{invoice.id.substring(0, 8)}...
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Date',
      render: (invoice) => (
        <span className="text-sm text-gray-900">
          {formatDate(invoice.created)}
        </span>
      ),
    },
    {
      key: 'amount_due',
      header: 'Amount',
      render: (invoice) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(invoice.amount_due / 100, invoice.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          invoice.status === 'paid'
            ? 'bg-green-100 text-green-800'
            : invoice.status === 'open'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (invoice) => (
        <div className="flex justify-end">
          {invoice.invoice_pdf && (
            <a
              href={invoice.invoice_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
              title="Download Invoice"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];
  
  if (subscriptionLoading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading billing information..." />
      </Layout>
    );
  }

  // Add error boundary for the billing component
  if (subscriptionError && subscriptionError.includes('does not exist')) {
    return (
      <Layout>
        <div className="p-6">
          <AlertMessage 
            type="warning" 
            title="Billing Setup Required"
            message="Billing features are being set up. Please contact support if this persists." 
            className="mb-6" 
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and view billing history.</p>
        </div>

        {subscriptionError && (
          <AlertMessage type="error" message={subscriptionError} className="mb-6" />
        )}

        {/* Current Subscription */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
          
          {currentSubscription && currentProduct ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-gray-900">{currentProduct.name}</h3>
                  {currentProduct.interval === 'year' ? (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Star className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">{currentProduct.description}</p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(currentProduct.price, currentProduct.currency)} 
                    <span className="text-lg font-normal text-gray-600">/{currentProduct.interval}</span>
                  </span>
                  {currentSubscription.current_period_end && ( // Check if current_period_end exists
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {currentSubscription.cancel_at_period_end 
                          ? `Ends on: ${formatDate(currentSubscription.current_period_end)}`
                          : `Next billing: ${formatDate(currentSubscription.current_period_end)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
                {currentSubscription.payment_method_last4 && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 mt-2">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {currentSubscription.payment_method_brand} •••• {currentSubscription.payment_method_last4}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                {/* Improved subscription status display */}
                {currentSubscription.subscription_status === 'active' && currentSubscription.cancel_at_period_end ? (
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-600">
                      Ending {formatDate(currentSubscription.current_period_end)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${
                      currentSubscription.subscription_status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className={`text-sm font-medium capitalize ${
                      currentSubscription.subscription_status === 'active' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {currentSubscription.subscription_status}
                    </span>
                  </div>
                )}
                {/* Downgrade button */}
                {currentSubscription.subscription_status === 'active' && !currentSubscription.cancel_at_period_end && (
                  <button
                    onClick={() => setShowCancelModal(true)} // Use shouldShowCancelButton condition
                    className="text-sm text-red-600 hover:text-red-700 transition-colors duration-200 mt-2"
                  >
                    Downgrade to Free
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-600 mb-4">
                You're currently on the free plan. Upgrade to unlock premium features.
              </p>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing</h2>
            <p className="text-gray-600 mb-6">Start for free. Upgrade as you go.</p>
            
            {/* Billing Interval Toggle */}
            <div className="flex items-center justify-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit mx-auto mb-4">
              <button
                onClick={() => setSelectedBillingInterval('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  selectedBillingInterval === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedBillingInterval('year')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  selectedBillingInterval === 'year'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
              </button>
            </div>
            
            {selectedBillingInterval === 'year' && (
              <p className="text-sm text-green-600 font-medium">Save 17% on a yearly subscription</p>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
            {/* Free Plan Card */}
            <div className={`relative rounded-lg border-2 p-6 ${
              isOnFreePlan
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            } transition-colors duration-200 w-full md:w-80`}>
              {isOnFreePlan && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current
                  </span>
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Free</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">£0</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">Basic quiz features</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">Limited question access</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">Basic progress tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">Up to 5 team members</span>
                </li>
              </ul>
              
              <button
                onClick={() => canDowngradeToFree ? setShowCancelModal(true) : undefined}
                disabled={isOnFreePlan || !canDowngradeToFree}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
                  isOnFreePlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : canDowngradeToFree
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isOnFreePlan ? (
                  <span>Current Plan</span>
                ) : canDowngradeToFree ? (
                  <span>Downgrade to Free</span>
                ) : (
                  <span>Already Downgrading</span>
                )}
              </button>
            </div>

            {/* Pro Plan Cards */}
            {filteredProducts.map((product) => {
              const isCurrentPlan = currentPriceId === product.priceId;
              const isProcessing = processingPriceId === product.priceId;
              const isPopular = selectedBillingInterval === 'year';

              return (
                <div
                  key={product.id}
                  className={`relative rounded-lg border-2 p-6 ${
                    isCurrentPlan
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } transition-colors duration-200 w-full md:w-80`}
                >
                  {isPopular && !isCurrentPlan && selectedBillingInterval === 'year' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Best Value
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Current
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedBillingInterval === 'year' ? 'Pro Yearly' : 'Pro'}
                      </h3>
                      {product.interval === 'year' ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Star className="h-5 w-5 text-blue-500" />
                      )}
                      {isPopular && (
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(product.price, product.currency)}
                      </span>
                      <span className="text-gray-600">
                        /{selectedBillingInterval === 'year' ? 'year' : 'month'}
                      </span>
                      {selectedBillingInterval === 'year' && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatCurrency(product.price / 12, product.currency)} per month
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleUpgrade(product.priceId)}
                    disabled={isCurrentPlan || isProcessing || checkoutLoading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : isCurrentPlan ? (
                      <span>Current Plan</span>
                    ) : (
                      <span>Upgrade to {product.name}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
          
          {billingError && (
            <AlertMessage type="warning" message={`${billingError}. Stripe billing functions may not be deployed yet.`} className="mb-4" />
          )}
          
          {/* Debug Information - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Debug Info:</strong> Invoices: {invoices.length}, Orders: {orders.length}, 
              Billing Loading: {billingLoading ? 'Yes' : 'No'}, 
              Error: {billingError || 'None'}
            </div>
          )}
          
          {invoices.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Invoices</h3>
              <Table
                columns={invoiceColumns}
                data={invoices}
                loading={billingLoading}
                emptyState={{
                  title: "No Invoices",
                  description: "No invoices found for your account."
                }}
              />
            </div>
          ) : orders.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Orders</h3>
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.order_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Order #{order.order_id}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          order.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.order_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.amount_total / 100, order.currency)}
                      </span>
                      <button className="text-indigo-600 hover:text-indigo-700">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !billingLoading ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Billing History</h3>
              <p className="text-gray-600 mb-4">
                Your invoices and billing history will appear here once you make a purchase.
              </p>
              {currentSubscription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You have an active subscription, but billing history may take a few minutes to appear. 
                    If you don't see invoices after 10 minutes, please contact support.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <LoadingSpinner text="Loading billing history..." className="py-8" />
          )}
        </div>

        {/* Usage Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Billing Information</h3>
              <p className="text-sm text-blue-700 mt-1">
                All subscriptions are managed through Stripe. You can cancel or modify your subscription at any time.
                Changes will take effect at the end of your current billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Subscription Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancelError(null);
          }}
          title="Downgrade to Free Plan"
          footer={
            <>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelError(null);
                }}
                disabled={cancelling}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {cancelling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    <span>Downgrade to Free</span>
                  </>
                )}
              </button>
            </>
          }
        >
          {cancelError && (
            <AlertMessage
              type="error"
              message={cancelError}
              className="mb-4"
            />
          )}
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Are you sure you want to downgrade to the free plan?
                </h3>
                <p className="text-gray-600 mb-4">
                  Your subscription will remain active until the end of your current billing period 
                  ({currentSubscription?.current_period_end ? formatDate(currentSubscription.current_period_end) : 'end of period'}), 
                  after which you'll be moved to the free plan.
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">You will lose access to:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {currentProduct?.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-2">
                    <X className="h-3 w-3 text-red-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your subscription will continue until {currentSubscription?.current_period_end ? formatDate(currentSubscription.current_period_end) : 'the end of your billing period'}</li>
                <li>• You'll keep all premium features until then</li>
                <li>• After that, you'll be automatically moved to the free plan</li>
                <li>• You can resubscribe at any time to regain premium features</li>
              </ul>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}