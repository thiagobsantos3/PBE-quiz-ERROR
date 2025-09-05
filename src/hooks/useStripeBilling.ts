import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
}

interface Invoice {
  id: string;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string;
  lines: {
    data: Array<{
      description: string;
      amount: number;
    }>;
  };
}

interface UseStripeBillingResult {
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refreshBillingData: () => void;
}

export function useStripeBilling(): UseStripeBillingResult {
  const { user, developerLog } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      developerLog('🔄 Fetching billing data for user:', user.id);

      // Fetch payment methods
      const { data: pmData, error: pmError } = await supabase.functions.invoke('fetch-payment-methods', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (pmError) {
        console.error('❌ Error fetching payment methods:', pmError);
        console.warn('⚠️ Payment methods not available, continuing without them');
        setPaymentMethods([]);
      } else {
        developerLog('✅ Payment methods fetched:', pmData?.length || 0);
        setPaymentMethods(pmData || []);
      }

      // Fetch invoices
      const { data: invData, error: invError } = await supabase.functions.invoke('fetch-invoices', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (invError) {
        console.error('❌ Error fetching invoices:', invError);
        console.warn('⚠️ Invoices not available, continuing without them');
        setInvoices([]);
      } else {
        developerLog('✅ Invoices fetched:', invData?.length || 0);
        setInvoices(invData || []);
      }

    } catch (err: any) {
      console.error('💥 Failed to fetch billing data:', err);
      setError('Billing data temporarily unavailable');
      setPaymentMethods([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [user, developerLog]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  return {
    paymentMethods,
    invoices,
    loading,
    error,
    refreshBillingData: fetchBillingData,
  };
}
