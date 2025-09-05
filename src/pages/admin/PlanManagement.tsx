import React, { useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { usePlanSettings } from '../../hooks/usePlanSettings';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertMessage } from '../../components/common/AlertMessage';
import { Table, TableColumn } from '../../components/common/Table';
import {
  DollarSign,
  Settings,
  Users,
  Award,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';
import { Plan, PlanSettings, PlanPrice } from '../../types';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';

export function PlanManagement() {
  const { plans, planSettings, loading, error, fetchPlanData } = usePlanSettings();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingPlanSettings, setEditingPlanSettings] = useState<PlanSettings | null>(null);
  const [planFormData, setPlanFormData] = useState<Partial<Plan>>({});
  const [settingsFormData, setSettingsFormData] = useState<Partial<PlanSettings>>({});
  const [pricesFormData, setPricesFormData] = useState<PlanPrice[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanFormData(plan);
    const settings = planSettings.find(s => s.plan_id === plan.id);
    setEditingPlanSettings(settings || null);
    setSettingsFormData(settings || {
      plan_id: plan.id,
      max_questions_custom_quiz: 0,
      max_team_members: 0,
      question_tier_access: [],
      allow_quick_start_quiz: true,
      allow_create_own_quiz: true,
      allow_study_schedule_quiz: false,
      allow_analytics_access: false,
    });
    // Set prices form data from the plan's prices
    setPricesFormData(plan.prices || []);
    setSaveError(null);
    setShowPlanModal(true);
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      id: '',
      name: '',
      is_enabled: true,
      description: '',
    });
    setSettingsFormData({
      max_questions_custom_quiz: 20,
      max_team_members: 5,
      question_tier_access: ['free'],
      allow_quick_start_quiz: true,
      allow_create_own_quiz: true,
      allow_study_schedule_quiz: false,
      allow_analytics_access: false,
    });
    setPricesFormData([]);
    setSaveError(null);
    setShowPlanModal(true);
  };

  const handleAddPrice = () => {
    const newPrice: PlanPrice = {
      plan_id: planFormData.id || '',
      currency: 'USD',
      interval: 'monthly',
      amount: 0,
    };
    setPricesFormData(prev => [...prev, newPrice]);
  };

  const handleUpdatePrice = (index: number, updates: Partial<PlanPrice>) => {
    setPricesFormData(prev => prev.map((price, i) => 
      i === index ? { ...price, ...updates } : price
    ));
  };

  const handleRemovePrice = (index: number) => {
    setPricesFormData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePlan = async () => {
    setSaveError(null);
    setIsSaving(true);

    // Basic validation
    if (!planFormData.name || !planFormData.id || 
        settingsFormData.max_questions_custom_quiz === undefined || 
        settingsFormData.max_team_members === undefined || 
        settingsFormData.allow_quick_start_quiz === undefined || 
        settingsFormData.allow_create_own_quiz === undefined || 
        settingsFormData.allow_study_schedule_quiz === undefined || 
        settingsFormData.allow_analytics_access === undefined) {
      setSaveError('Please fill in all required fields.');
      setIsSaving(false);
      return;
    }

    // Validate prices
    for (const price of pricesFormData) {
      if (!price.currency || !price.interval || price.amount === undefined || price.amount < 0) {
        setSaveError('Please ensure all price entries have valid currency, interval, and amount.');
        setIsSaving(false);
        return;
      }
    }

    // Validate for duplicate currency/interval combinations within pricesFormData
    const seenCombinations = new Set<string>();
    for (const price of pricesFormData) {
      const combination = `${price.currency}-${price.interval}`;
      if (seenCombinations.has(combination)) {
        setSaveError(`Duplicate price entry found for ${price.currency} (${price.interval}). Each plan can only have one price per currency and interval combination.`);
        setIsSaving(false);
        return;
      }
      seenCombinations.add(combination);
    }

    try {
      if (editingPlan) {
        // Update existing plan
        const { error: planUpdateError } = await supabase
          .from('plans')
          .update({
            name: planFormData.name,
            is_enabled: planFormData.is_enabled,
            description: planFormData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', planFormData.id);

        if (planUpdateError) throw planUpdateError;

        // Update plan settings
        const { error: settingsUpdateError } = await supabase
          .from('plan_settings')
          .update({
            max_questions_custom_quiz: settingsFormData.max_questions_custom_quiz,
            max_team_members: settingsFormData.max_team_members,
            question_tier_access: settingsFormData.question_tier_access,
            allow_quick_start_quiz: settingsFormData.allow_quick_start_quiz,
            allow_create_own_quiz: settingsFormData.allow_create_own_quiz,
            allow_study_schedule_quiz: settingsFormData.allow_study_schedule_quiz,
            allow_analytics_access: settingsFormData.allow_analytics_access,
            updated_at: new Date().toISOString()
          })
          .eq('plan_id', planFormData.id);

        if (settingsUpdateError) throw settingsUpdateError;

        // Handle prices - delete existing and insert new ones
        const { error: deletePricesError } = await supabase
          .from('plan_prices')
          .delete()
          .eq('plan_id', planFormData.id);

        if (deletePricesError) throw deletePricesError;

        if (pricesFormData.length > 0) {
          const { error: insertPricesError } = await supabase
            .from('plan_prices')
            .insert(pricesFormData.map(price => ({
              plan_id: planFormData.id,
              currency: price.currency,
              interval: price.interval,
              amount: price.amount,
              stripe_price_id: price.stripe_price_id
            })));

          if (insertPricesError) throw insertPricesError;
        }

        console.log('✅ Plan updated successfully');
      } else {
        // Create new plan
        const { error: createPlanError } = await supabase
          .from('plans')
          .insert([{
            id: planFormData.id,
            name: planFormData.name,
            is_enabled: planFormData.is_enabled,
            description: planFormData.description,
          }]);

        if (createPlanError) throw createPlanError;

        // Create plan settings
        const { error: createSettingsError } = await supabase
          .from('plan_settings')
          .insert([{
            plan_id: planFormData.id,
            max_questions_custom_quiz: settingsFormData.max_questions_custom_quiz,
            max_team_members: settingsFormData.max_team_members,
            question_tier_access: settingsFormData.question_tier_access,
            allow_quick_start_quiz: settingsFormData.allow_quick_start_quiz,
            allow_create_own_quiz: settingsFormData.allow_create_own_quiz,
            allow_study_schedule_quiz: settingsFormData.allow_study_schedule_quiz,
            allow_analytics_access: settingsFormData.allow_analytics_access,
          }]);

        if (createSettingsError) throw createSettingsError;

        // Create prices
        if (pricesFormData.length > 0) {
          const { error: createPricesError } = await supabase
            .from('plan_prices')
            .insert(pricesFormData.map(price => ({
              plan_id: planFormData.id,
              currency: price.currency,
              interval: price.interval,
              amount: price.amount,
              stripe_price_id: price.stripe_price_id
            })));

          if (createPricesError) throw createPricesError;
        }

        console.log('✅ Plan created successfully');
      }

      setShowPlanModal(false);
      await fetchPlanData();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setSaveError(err.message || 'Failed to save plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const planColumns: TableColumn<Plan>[] = [
    {
      key: 'name',
      header: 'Plan Name',
      render: (plan) => (
        <div className="font-medium text-gray-900">{plan.name}</div>
      ),
    },
    {
      key: 'prices',
      header: 'Pricing',
      render: (plan) => (
        <div className="text-sm text-gray-900">
          {plan.prices && plan.prices.length > 0 ? (
            <div className="space-y-1">
              {plan.prices.map((price, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="font-medium">
                    ${price.amount.toFixed(2)} {price.currency}
                  </span>
                  <span className="text-gray-500">/{price.interval}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 italic">No pricing set</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_enabled',
      header: 'Enabled',
      render: (plan) => (
        plan.is_enabled ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
      ),
      className: 'text-center',
    },
    {
      key: 'max_questions_custom_quiz',
      header: 'Max Custom Quiz Qs',
      render: (plan) => {
        const settings = planSettings.find(s => s.plan_id === plan.id);
        return <div className="text-sm text-gray-900">{settings?.max_questions_custom_quiz || 'N/A'}</div>;
      },
      className: 'text-center',
    },
    {
      key: 'max_team_members',
      header: 'Max Team Members',
      render: (plan) => {
        const settings = planSettings.find(s => s.plan_id === plan.id);
        return <div className="text-sm text-gray-900">{settings?.max_team_members || 'N/A'}</div>;
      },
      className: 'text-center',
    },
    {
      key: 'question_tier_access',
      header: 'Question Tiers',
      render: (plan) => {
        const settings = planSettings.find(s => s.plan_id === plan.id);
        return (
          <div className="text-sm text-gray-900">
            {settings?.question_tier_access?.map((tier) => (
              <span key={tier} className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-xs font-medium text-gray-600 mr-1 mb-1 capitalize">
                {tier}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'feature_access',
      header: 'Feature Access',
      render: (plan) => {
        const settings = planSettings.find(s => s.plan_id === plan.id);
        return (
          <div className="text-sm text-gray-900 flex flex-col space-y-1">
            <span className="flex items-center">
              {settings?.allow_quick_start_quiz ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <XCircle className="h-4 w-4 text-red-500 mr-1" />} Quick Start Quiz
            </span>
            <span className="flex items-center">
              {settings?.allow_create_own_quiz ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <XCircle className="h-4 w-4 text-red-500 mr-1" />} Custom Quiz
            </span>
            <span className="flex items-center">
              {settings?.allow_study_schedule_quiz ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <XCircle className="h-4 w-4 text-red-500 mr-1" />} Study Schedule
            </span>
            <span className="flex items-center">
              {settings?.allow_analytics_access ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <XCircle className="h-4 w-4 text-red-500 mr-1" />} Analytics Access
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (plan) => (
        <button
          onClick={() => handleEditPlan(plan)}
          className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
        >
          <Edit className="h-4 w-4" />
        </button>
      ),
      className: 'text-right',
    },
  ];

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading plans..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <AlertMessage type="error" message={error} className="mb-6" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Plan Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage subscription plans and their associated settings.</p>
          </div>
          <Button variant="primary" icon={Plus} onClick={handleAddPlan}>
            Add New Plan
          </Button>
        </div>

        <Table
          columns={planColumns}
          data={plans}
          emptyState={{
            title: "No Plans Found",
            description: "No subscription plans are configured in the system.",
          }}
        />

        <Modal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Add New Plan'}
          maxWidth="4xl"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowPlanModal(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSavePlan} loading={isSaving}>
                Save Changes
              </Button>
            </div>
          }
        >
          {saveError && (
            <AlertMessage type="error" message={saveError} className="mb-4" />
          )}
          
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Plan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Plan ID"
                id="planId"
                type="text"
                value={planFormData.id || ''}
                onChange={(val) => setPlanFormData({ ...planFormData, id: val })}
                required
                disabled={!!editingPlan}
                helpText={!editingPlan ? "Unique identifier for the plan (e.g., 'free', 'pro')" : undefined}
              />
              <FormField
                label="Plan Name"
                id="planName"
                type="text"
                value={planFormData.name || ''}
                onChange={(val) => setPlanFormData({ ...planFormData, name: val })}
                required
              />
              <FormField
                label="Is Enabled"
                id="planEnabled"
                type="select"
                value={planFormData.is_enabled?.toString() || 'true'}
                onChange={(val) => setPlanFormData({ ...planFormData, is_enabled: val === 'true' })}
                options={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
              />
            </div>
            <FormField
              label="Description"
              id="planDescription"
              type="textarea"
              value={planFormData.description || ''}
              onChange={(val) => setPlanFormData({ ...planFormData, description: val })}
            />

            {/* Pricing Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
                <Button variant="secondary" icon={Plus} size="sm" onClick={handleAddPrice}>
                  Add Price
                </Button>
              </div>
              
              {pricesFormData.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No pricing configured</p>
                  <p className="text-sm text-gray-400">Add pricing options for this plan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pricesFormData.map((price, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Price Option {index + 1}</h4>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          icon={Trash2} 
                          onClick={() => handleRemovePrice(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          label="Currency"
                          id={`currency-${index}`}
                          type="select"
                          value={price.currency}
                          onChange={(val) => handleUpdatePrice(index, { currency: val as 'USD' | 'GBP' | 'AUD' | 'CAD' })}
                          options={[
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'GBP', label: 'GBP (£)' },
                            { value: 'AUD', label: 'AUD (A$)' },
                            { value: 'CAD', label: 'CAD (C$)' },
                          ]}
                          required
                        />
                        <FormField
                          label="Billing Interval"
                          id={`interval-${index}`}
                          type="select"
                          value={price.interval}
                          onChange={(val) => handleUpdatePrice(index, { interval: val as 'monthly' | 'yearly' })}
                          options={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'yearly', label: 'Yearly' },
                          ]}
                          required
                        />
                        <FormField
                          label="Amount"
                          id={`amount-${index}`}
                          type="number"
                          value={price.amount}
                          onChange={(val) => handleUpdatePrice(index, { amount: parseFloat(val) || 0 })}
                          min={0}
                          required
                        />
                      </div>
                      <div className="mt-4">
                        <FormField
                          label="Stripe Price ID (Optional)"
                          id={`stripe-${index}`}
                          type="text"
                          value={price.stripe_price_id || ''}
                          onChange={(val) => handleUpdatePrice(index, { stripe_price_id: val })}
                          helpText="Will be populated automatically when synced with Stripe"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Max Questions Custom Quiz"
                  id="maxQuestionsCustomQuiz"
                  type="number"
                  value={settingsFormData.max_questions_custom_quiz || 0}
                  onChange={(val) => setSettingsFormData({ ...settingsFormData, max_questions_custom_quiz: parseInt(val) })}
                  min={0}
                  required
                />
                <FormField
                  label="Max Team Members"
                  id="maxTeamMembers"
                  type="number"
                  value={settingsFormData.max_team_members || 0}
                  onChange={(val) => setSettingsFormData({ ...settingsFormData, max_team_members: parseInt(val) })}
                  min={0}
                  required
                />
                <FormField
                  label="Question Tier Access (comma-separated)"
                  id="questionTierAccess"
                  type="text"
                  value={settingsFormData.question_tier_access?.join(', ') || ''}
                  onChange={(val) => setSettingsFormData({ ...settingsFormData, question_tier_access: val.split(',').map(s => s.trim()) })}
                  helpText="e.g., free, pro, enterprise"
                />
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Feature Access</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <FormField
                      label="Allow Quick Start Quiz"
                      id="allowQuickStartQuiz"
                      type="select"
                      value={settingsFormData.allow_quick_start_quiz?.toString() || 'true'}
                      onChange={(val) => setSettingsFormData({ ...settingsFormData, allow_quick_start_quiz: val === 'true' })}
                      options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]}
                    />
                    <FormField
                      label="Allow Create Own Quiz"
                      id="allowCreateOwnQuiz"
                      type="select"
                      value={settingsFormData.allow_create_own_quiz?.toString() || 'true'}
                      onChange={(val) => setSettingsFormData({ ...settingsFormData, allow_create_own_quiz: val === 'true' })}
                      options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]}
                    />
                    <FormField
                      label="Allow Study Schedule Quiz"
                      id="allowStudyScheduleQuiz"
                      type="select"
                      value={settingsFormData.allow_study_schedule_quiz?.toString() || 'false'}
                      onChange={(val) => setSettingsFormData({ ...settingsFormData, allow_study_schedule_quiz: val === 'true' })}
                      options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]}
                    />
                    <FormField
                      label="Allow Analytics Access"
                      id="allowAnalyticsAccess"
                      type="select"
                      value={settingsFormData.allow_analytics_access?.toString() || 'false'}
                      onChange={(val) => setSettingsFormData({ ...settingsFormData, allow_analytics_access: val === 'true' })}
                      options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}