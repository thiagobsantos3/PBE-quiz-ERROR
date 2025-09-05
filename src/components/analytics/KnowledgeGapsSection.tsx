import React from 'react';
import { AlertTriangle, BookOpen, Target, TrendingDown, Brain, ChevronRight } from 'lucide-react';

interface KnowledgeGap {
  topic: string;
  type: 'book' | 'chapter' | 'tier';
  averageScore: number;
  totalQuestions: number;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  book?: string;
  chapter?: number;
  tier?: string;
}

interface KnowledgeGapsSectionProps {
  data: KnowledgeGap[];
  loading: boolean;
  error: string | null;
  showIndividual: boolean; // Whether showing individual or team data
}

export function KnowledgeGapsSection({ data, loading, error, showIndividual }: KnowledgeGapsSectionProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'book':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'chapter':
        return <Target className="h-4 w-4 text-green-600" />;
      case 'tier':
        return <Brain className="h-4 w-4 text-purple-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-yellow-50 border-yellow-200';
    if (score >= 70) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Knowledge Gaps</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <TrendingDown className="h-6 w-6 text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Knowledge Gaps Analysis</h2>
            <p className="text-sm text-gray-600">
              {showIndividual 
                ? 'Topics where this individual struggles most (below 90% accuracy)'
                : 'Topics where the team struggles most (below 90% accuracy)'
              }
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing knowledge gaps...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Knowledge Gaps Found</h3>
            <p className="text-gray-600">
              {showIndividual 
                ? 'This individual is performing well across all topics (90%+ accuracy)!'
                : 'The team is performing well across all topics (90%+ accuracy)!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((gap, index) => (
              <div 
                key={`${gap.type}-${gap.topic}`}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getScoreBgColor(gap.averageScore)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                      {getTypeIcon(gap.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{gap.topic}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{gap.totalAttempts} attempts</span>
                        <span>•</span>
                        <span>{gap.correctAnswers} correct</span>
                        <span>•</span>
                        <span>{gap.incorrectAnswers} incorrect</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(gap.averageScore)}`}>
                      {gap.averageScore.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        gap.averageScore >= 80 ? 'bg-yellow-500' :
                        gap.averageScore >= 70 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(gap.averageScore, 5)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Recommendation */}
                <div className="mt-3 flex items-start space-x-2">
                  <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    <strong>Recommendation:</strong> Focus additional study time on {gap.topic.toLowerCase()}
                    {gap.type === 'chapter' && gap.book && gap.chapter 
                      ? ` by reviewing ${gap.book} chapter ${gap.chapter} content and practicing more questions from this section.`
                      : gap.type === 'book' && gap.book
                      ? ` by reviewing ${gap.book} content and practicing more questions from this book.`
                      : gap.type === 'tier' && gap.tier
                      ? ` by practicing more ${gap.tier} level questions to build confidence.`
                      : ' to improve performance in this area.'
                    }
                  </p>
                </div>
              </div>
            ))}
            
            {data.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Study Tips:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Focus on the topics with the lowest scores first</li>
                      <li>• Create custom quizzes targeting these specific areas</li>
                      <li>• Review source material for chapters with low performance</li>
                      <li>• Practice regularly to improve retention and understanding</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}