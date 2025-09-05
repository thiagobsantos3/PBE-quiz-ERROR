import React from 'react';
import clsx from 'clsx';
import { Layout } from '../components/layout/Layout';
import { useGamificationData } from '../hooks/useGamificationData';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { Trophy, Lock, CheckCircle } from 'lucide-react';

export function Achievements() {
  const { userAchievements, achievements, loading, error } = useGamificationData();

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading achievements..." />
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

  // Create a map for quick lookup of unlocked achievements
  const unlockedMap = new Map(userAchievements.map(ua => [ua.achievement_id, ua]));

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-gray-600">Track your progress and unlock new milestones!</p>
        </div>

        {achievements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements Defined</h3>
            <p className="text-gray-600">
              It looks like there are no achievements configured in the system yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => {
              const isUnlocked = unlockedMap.has(achievement.id);
              const unlockedDate = isUnlocked ? unlockedMap.get(achievement.id)?.unlocked_at : null;

              return (
                <div
                  key={achievement.id}
                  className={clsx(
                    'bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4',
                    isUnlocked ? 'border-2 border-green-200' : 'opacity-70 grayscale'
                  )}
                >
                  <div className="flex-shrink-0">
                    <div className={clsx(
                      'h-16 w-16 rounded-full flex items-center justify-center',
                      isUnlocked ? 'bg-green-100' : 'bg-gray-100'
                    )}>
                      {achievement.badge_icon_url ? (
                        <img src={achievement.badge_icon_url} alt={achievement.name} className="h-10 w-10" />
                      ) : (
                        <Trophy className={clsx(
                          'h-8 w-8',
                          isUnlocked ? 'text-green-600' : 'text-gray-400'
                        )} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={clsx(
                      'text-lg font-semibold',
                      isUnlocked ? 'text-gray-900' : 'text-gray-600'
                    )}>
                      {achievement.name}
                    </h3>
                    <p className={clsx(
                      'text-sm',
                      isUnlocked ? 'text-gray-600' : 'text-gray-500'
                    )}>
                      {achievement.description}
                    </p>
                    {isUnlocked ? (
                      <div className="flex items-center space-x-1 text-xs text-green-600 mt-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Unlocked on {new Date(unlockedDate!).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}