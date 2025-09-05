import React from 'react';
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react';

interface QuizStats {
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageTime: number;
}

interface QuizCompletionProps {
  title: string;
  stats: QuizStats;
  bonusXp: number;
  isFullScreen: boolean;
  themeClasses: any;
  onRestart: () => void;
  onBack: () => void;
  formatTime: (seconds: number) => string;
}

export function QuizCompletion({
  title,
  stats,
  bonusXp,
  isFullScreen,
  themeClasses,
  onRestart,
  onBack,
  formatTime
}: QuizCompletionProps) {
  const totalXpEarned = stats.totalPointsEarned + bonusXp;

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className={`${themeClasses.card} rounded-xl shadow-sm p-8 text-center border ${themeClasses.border}`}>
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            
            <h1 className={`text-2xl font-bold ${themeClasses.text} mb-4`}>Quiz Completed!</h1>
            <p className={`${themeClasses.textSecondary} mb-8`}>
              Great job! Here's how you performed on your {title.toLowerCase()}.
            </p>

            {/* XP Points Statement */}
            <div className={`mb-8 p-6 rounded-lg ${isFullScreen ? 'bg-white/10' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} border-2 border-indigo-200`}>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Trophy className="h-6 w-6 text-indigo-600" />
                <h2 className={`text-xl font-bold ${isFullScreen ? 'text-white' : 'text-indigo-900'}`}>
                  Experience Points Earned
                </h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isFullScreen ? 'text-white/80' : 'text-indigo-700'}`}>
                    Quiz Points:
                  </span>
                  <span className={`font-bold text-lg ${isFullScreen ? 'text-white' : 'text-indigo-900'}`}>
                    +{stats.totalPointsEarned} XP
                  </span>
                </div>
                
                {bonusXp > 0 && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isFullScreen ? 'text-white/80' : 'text-green-700'}`}>
                      On-Time Bonus:
                    </span>
                    <span className={`font-bold text-lg ${isFullScreen ? 'text-white' : 'text-green-700'}`}>
                      +{bonusXp} XP
                    </span>
                  </div>
                )}
                
                <div className={`border-t pt-3 ${isFullScreen ? 'border-white/20' : 'border-indigo-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isFullScreen ? 'text-white' : 'text-indigo-900'}`}>
                      Total XP Earned:
                    </span>
                    <span className={`font-bold text-2xl ${isFullScreen ? 'text-white' : 'text-indigo-900'}`}>
                      +{totalXpEarned} XP
                    </span>
                  </div>
                </div>
              </div>
              
              {bonusXp > 0 && (
                <div className={`mt-4 p-3 rounded-lg ${isFullScreen ? 'bg-white/10' : 'bg-green-100'} border ${isFullScreen ? 'border-white/20' : 'border-green-200'}`}>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">🎉</span>
                    <span className={`text-sm font-medium ${isFullScreen ? 'text-white' : 'text-green-800'}`}>
                      Congratulations! You completed your study assignment on time!
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats.accuracy}%
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Accuracy</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                  {stats.correctAnswers} of {stats.totalQuestions} correct
                </div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats.totalPointsEarned}
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Points Earned</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                  of {stats.totalPossiblePoints} possible
                </div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatTime(stats.averageTime)}
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Avg Time</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>per question</div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {Math.round((stats.totalPointsEarned / stats.totalPossiblePoints) * 100)}%
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Score</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>overall performance</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onRestart}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Take Another Quiz</span>
              </button>
              <button
                onClick={onBack}
                className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Quiz Center</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}