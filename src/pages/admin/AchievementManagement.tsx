import React, { useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useGamificationData } from '../../hooks/useGamificationData';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertMessage } from '../../components/common/AlertMessage';
import { Table, TableColumn } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Trophy,
  Target,
  Zap,
  BookOpen,
  Clock,
  Star
} from 'lucide-react';
import { Achievement, AchievementCriteriaType } from '../../types';

const CRITERIA_TYPE_OPTIONS = [
  { value: 'total_quizzes_completed', label: 'Total Quizzes Completed' },
  { value: 'total_points_earned', label: 'Total Points Earned' },
  { value: 'longest_streak', label: 'Longest Study Streak' },
  { value: 'total_questions_answered', label: 'Total Questions Answered' },
  { value: 'perfect_quiz', label: 'Perfect Quiz Score' },
  { value: 'speed_demon', label: 'Speed Demon (Fast Completion)' },
  { value: 'accuracy_book_ruth', label: 'Ruth Book Accuracy' },
  { value: 'accuracy_book_esther', label: 'Esther Book Accuracy' },
  { value: 'accuracy_book_daniel', label: 'Daniel Book Accuracy' },
  { value: 'accuracy_chapter', label: 'Chapter Accuracy' },
  { value: 'accuracy_tier_free', label: 'Free Tier Accuracy' },
  { value: 'accuracy_tier_pro', label: 'Pro Tier Accuracy' },
  { value: 'accuracy_tier_enterprise', label: 'Enterprise Tier Accuracy' },
];

export function AchievementManagement() {
  const { achievements, loading, error, refreshGamificationData } = useGamificationData();
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria_type: 'total_quizzes_completed' as AchievementCriteriaType,
    criteria_value: 1,
    badge_icon_url: '',
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAchievement = () => {
    setEditingAchievement(null);
    setFormData({
      name: '',
      description: '',
      criteria_type: 'total_quizzes_completed',
      criteria_value: 1,
      badge_icon_url: '',
    });
    setSaveError(null);
    setShowAchievementModal(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      criteria_type: achievement.criteria_type as AchievementCriteriaType,
      criteria_value: achievement.criteria_value,
      badge_icon_url: achievement.badge_icon_url,
    });
    setSaveError(null);
    setShowAchievementModal(true);
  };

  const handleSaveAchievement = async () => {
    setSaveError(null);
    setIsSaving(true);

    // Basic validation
    if (!formData.name.trim() || !formData.description.trim() || formData.criteria_value <= 0) {
      setSaveError('Please fill in all required fields with valid values.');
      setIsSaving(false);
      return;
    }

    try {
      if (editingAchievement) {
        // Update existing achievement
        const { error } = await supabase
          .from('achievements')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            criteria_type: formData.criteria_type,
            criteria_value: formData.criteria_value,
            badge_icon_url: formData.badge_icon_url.trim() || '/vite.svg', // Default icon
          })
          .eq('id', editingAchievement.id);

        if (error) throw error;
        console.log('✅ Achievement updated successfully');
      } else {
        // Create new achievement
        const { error } = await supabase
          .from('achievements')
          .insert([{
            name: formData.name.trim(),
            description: formData.description.trim(),
            criteria_type: formData.criteria_type,
            criteria_value: formData.criteria_value,
            badge_icon_url: formData.badge_icon_url.trim() || '/vite.svg', // Default icon
          }]);

        if (error) throw error;
        console.log('✅ Achievement created successfully');
      }

      setShowAchievementModal(false);
      await refreshGamificationData();
    } catch (err: any) {
      console.error('Error saving achievement:', err);
      setSaveError(err.message || 'Failed to save achievement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAchievement = async (achievementId: string, achievementName: string) => {
    if (!confirm(`Are you sure you want to delete the achievement "${achievementName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsSaving(true);
      
      // First, delete any user achievements that reference this achievement
      const { error: userAchievementsError } = await supabase
        .from('user_achievements')
        .delete()
        .eq('achievement_id', achievementId);

      if (userAchievementsError) {
        console.warn('Warning: Could not delete user achievements:', userAchievementsError);
        // Continue with achievement deletion even if user achievements deletion fails
      }

      // Delete the achievement
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', achievementId);

      if (error) throw error;

      console.log('✅ Achievement deleted successfully');
      await refreshGamificationData();
    } catch (err: any) {
      console.error('Error deleting achievement:', err);
      setSaveError(err.message || 'Failed to delete achievement.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCriteriaTypeIcon = (criteriaType: string) => {
    switch (criteriaType) {
      case 'total_quizzes_completed':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'total_points_earned':
        return <Trophy className="h-4 w-4 text-yellow-600" />;
      case 'longest_streak':
        return <Zap className="h-4 w-4 text-orange-600" />;
      case 'total_questions_answered':
        return <Target className="h-4 w-4 text-green-600" />;
      case 'perfect_quiz':
        return <Star className="h-4 w-4 text-purple-600" />;
      case 'speed_demon':
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Award className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCriteriaTypeLabel = (criteriaType: string) => {
    const option = CRITERIA_TYPE_OPTIONS.find(opt => opt.value === criteriaType);
    return option?.label || criteriaType;
  };

  const columns: TableColumn<Achievement>[] = [
    {
      key: 'badge',
      header: 'Badge',
      render: (achievement) => (
        <div className="flex items-center justify-center">
          {achievement.badge_icon_url ? (
            <img 
              src={achievement.badge_icon_url} 
              alt={achievement.name} 
              className="h-8 w-8 rounded-full"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center ${achievement.badge_icon_url ? 'hidden' : ''}`}>
            <Award className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      ),
      className: 'text-center w-16',
    },
    {
      key: 'name',
      header: 'Achievement Name',
      render: (achievement) => (
        <div className="font-medium text-gray-900">{achievement.name}</div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (achievement) => (
        <div className="text-sm text-gray-600 max-w-xs line-clamp-2">
          {achievement.description}
        </div>
      ),
    },
    {
      key: 'criteria',
      header: 'Criteria',
      render: (achievement) => (
        <div className="flex items-center space-x-2">
          {getCriteriaTypeIcon(achievement.criteria_type)}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {getCriteriaTypeLabel(achievement.criteria_type)}
            </div>
            <div className="text-xs text-gray-500">
              Target: {achievement.criteria_value}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (achievement) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditAchievement(achievement)}
            className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            title="Edit achievement"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteAchievement(achievement.id, achievement.name)}
            className="text-red-600 hover:text-red-700 transition-colors duration-200"
            title="Delete achievement"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading achievements..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Achievement Management</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Create and manage achievements that users can unlock through their quiz activities.
            </p>
          </div>
          <Button variant="primary" icon={Plus} onClick={handleAddAchievement}>
            Add New Achievement
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <AlertMessage
            type="error"
            message={error}
            className="mb-6"
          />
        )}

        {/* Save Error Message */}
        {saveError && (
          <AlertMessage
            type="error"
            message={saveError}
            className="mb-6"
            dismissible
            onDismiss={() => setSaveError(null)}
          />
        )}

        {/* Achievements Table */}
        <Table
          columns={columns}
          data={achievements}
          loading={loading}
          emptyState={{
            icon: Award,
            title: "No Achievements Found",
            description: "No achievements are configured in the system. Create your first achievement to get started.",
            action: (
              <Button variant="primary" icon={Plus} onClick={handleAddAchievement}>
                Create First Achievement
              </Button>
            )
          }}
        />

        {/* Achievement Modal */}
        <Modal
          isOpen={showAchievementModal}
          onClose={() => {
            setShowAchievementModal(false);
            setSaveError(null);
          }}
          title={editingAchievement ? `Edit Achievement: ${editingAchievement.name}` : 'Add New Achievement'}
          maxWidth="2xl"
          footer={
            <div className="flex justify-end space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAchievementModal(false);
                  setSaveError(null);
                }} 
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveAchievement} 
                loading={isSaving}
                disabled={!formData.name.trim() || !formData.description.trim() || formData.criteria_value <= 0}
              >
                {editingAchievement ? 'Update Achievement' : 'Create Achievement'}
              </Button>
            </div>
          }
        >
          {saveError && (
            <AlertMessage type="error" message={saveError} className="mb-4" />
          )}
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Achievement Name"
                id="achievementName"
                type="text"
                value={formData.name}
                onChange={(val) => setFormData({ ...formData, name: val })}
                placeholder="e.g., Quiz Master"
                required
              />
              <FormField
                label="Badge Icon URL"
                id="badgeIconUrl"
                type="text"
                value={formData.badge_icon_url}
                onChange={(val) => setFormData({ ...formData, badge_icon_url: val })}
                placeholder="https://example.com/badge.png (optional)"
                helpText="Leave empty to use default icon"
              />
            </div>
            
            <FormField
              label="Description"
              id="achievementDescription"
              type="textarea"
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder="Describe what the user needs to do to unlock this achievement..."
              rows={3}
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Criteria Type"
                id="criteriaType"
                type="select"
                value={formData.criteria_type}
                onChange={(val) => setFormData({ ...formData, criteria_type: val as AchievementCriteriaType })}
                options={CRITERIA_TYPE_OPTIONS}
                required
              />
              <FormField
                label="Target Value"
                id="criteriaValue"
                type="number"
                value={formData.criteria_value}
                onChange={(val) => setFormData({ ...formData, criteria_value: parseInt(val) || 1 })}
                min={1}
                required
                helpText="The target value the user must reach to unlock this achievement"
              />
            </div>

            {/* Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
              <div className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                  {formData.badge_icon_url ? (
                    <img 
                      src={formData.badge_icon_url} 
                      alt="Badge preview" 
                      className="h-10 w-10 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Award className={`h-6 w-6 text-gray-600 ${formData.badge_icon_url ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {formData.name || 'Achievement Name'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.description || 'Achievement description will appear here...'}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getCriteriaTypeIcon(formData.criteria_type)}
                    <span className="text-xs text-gray-500">
                      {getCriteriaTypeLabel(formData.criteria_type)}: {formData.criteria_value}
                    </span>
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