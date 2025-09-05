import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  Zap, 
  BookOpen,
  Users,
  BarChart3,
  Calendar,
  Award,
  Trophy,
  CreditCard,
  Shield,
  Target,
  Clock,
  Crown,
  Star,
  Edit,
  Settings,
  TrendingUp,
  Brain,
  Activity
} from 'lucide-react';

export function FeaturesOverview() {
  const coreFeatures = [
    {
      category: 'User Authentication & Profiles',
      icon: Shield,
      color: 'bg-blue-500',
      features: [
        {
          name: 'Secure Registration & Login',
          description: 'Email and password authentication with secure password reset functionality.',
          benefits: 'Ensures user data security and provides reliable access to personal progress.',
          roles: ['All Users']
        },
        {
          name: 'User Profile Management',
          description: 'Manage personal information, display names, and account settings.',
          benefits: 'Personalized experience with customizable public display names for leaderboards.',
          roles: ['All Users']
        },
        {
          name: 'Role-Based Access Control',
          description: 'Different permission levels for system admins, team owners, team admins, and members.',
          benefits: 'Secure and organized access to features based on user responsibilities.',
          roles: ['All Users']
        }
      ]
    },
    {
      category: 'Quiz Functionality',
      icon: BookOpen,
      color: 'bg-green-500',
      features: [
        {
          name: 'Quick Start Quiz',
          description: 'Jump into a random quiz with 90 questions from your subscription tier for immediate practice.',
          benefits: 'Perfect for quick practice sessions and mock PBE test experience.',
          roles: ['Free', 'Pro', 'Enterprise']
        },
        {
          name: 'Create Your Own Quiz',
          description: 'Build custom quizzes by selecting specific Bible books, chapters, and question limits.',
          benefits: 'Tailored study experience focusing on specific areas that need improvement.',
          roles: ['Free', 'Pro', 'Enterprise']
        },
        {
          name: 'Study Assignment Quizzes',
          description: 'Complete quizzes based on structured study assignments with progressive difficulty.',
          benefits: 'Organized learning path with comprehensive coverage of PBE material.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Interactive Quiz Interface',
          description: 'Full-screen quiz mode with timer, scoring, and immediate feedback.',
          benefits: 'Immersive learning experience that simulates actual PBE test conditions.',
          roles: ['All Users']
        }
      ]
    },
    {
      category: 'Gamification & Progress Tracking',
      icon: Trophy,
      color: 'bg-yellow-500',
      features: [
        {
          name: 'XP and Level System',
          description: 'Earn experience points from quiz performance and advance through levels.',
          benefits: 'Motivates continued learning and provides clear progression milestones.',
          roles: ['All Users']
        },
        {
          name: 'Study Streak Tracking',
          description: 'Track consecutive days of quiz activity and maintain learning momentum.',
          benefits: 'Encourages consistent daily study habits and long-term retention.',
          roles: ['All Users']
        },
        {
          name: 'Achievement System',
          description: 'Unlock badges and achievements for reaching specific milestones and performance goals.',
          benefits: 'Provides recognition for accomplishments and encourages goal-oriented learning.',
          roles: ['All Users']
        },
        {
          name: 'Personal Analytics',
          description: 'Track quiz performance, accuracy rates, study time, and progress over time.',
          benefits: 'Data-driven insights to identify strengths and areas for improvement.',
          roles: ['All Users']
        }
      ]
    },
    {
      category: 'Team Management',
      icon: Users,
      color: 'bg-purple-500',
      features: [
        {
          name: 'Team Creation & Invitations',
          description: 'Create teams, invite members via email, and manage team membership with role assignments.',
          benefits: 'Collaborative learning environment with organized team structure.',
          roles: ['Team Owners', 'Team Admins']
        },
        {
          name: 'Team Leaderboard',
          description: 'Compare performance across team members with rankings based on points, accuracy, and activity.',
          benefits: 'Healthy competition and motivation through peer comparison.',
          roles: ['All Team Members']
        },
        {
          name: 'Member Management',
          description: 'Suspend, reinstate, and manage team member permissions and access levels.',
          benefits: 'Maintain team organization and ensure appropriate access control.',
          roles: ['Team Owners', 'Team Admins']
        },
        {
          name: 'Team Analytics',
          description: 'View team-wide performance metrics, trends, and collective progress insights.',
          benefits: 'Understand team dynamics and identify opportunities for group improvement.',
          roles: ['Team Owners', 'Team Admins']
        }
      ]
    },
    {
      category: 'Study Schedule',
      icon: Calendar,
      color: 'bg-indigo-500',
      features: [
        {
          name: 'Assignment Creation',
          description: 'Create structured study assignments for team members with specific books, chapters, and dates.',
          benefits: 'Organized learning path with clear expectations and deadlines.',
          roles: ['Team Owners', 'Team Admins']
        },
        {
          name: 'Calendar View',
          description: 'Visual calendar interface showing assignments, completion status, and upcoming deadlines.',
          benefits: 'Easy-to-understand overview of study schedule and progress tracking.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Assignment Tracking',
          description: 'Monitor completion status, quiz scores, and time spent on each assignment.',
          benefits: 'Detailed progress monitoring and accountability for study goals.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Flexible Quiz Selection',
          description: 'Choose specific study items from assignments to create focused quiz sessions.',
          benefits: 'Customizable study experience while maintaining structured learning objectives.',
          roles: ['Pro', 'Enterprise']
        }
      ]
    },
    {
      category: 'Analytics & Reporting',
      icon: BarChart3,
      color: 'bg-red-500',
      features: [
        {
          name: 'Performance Overview',
          description: 'Comprehensive dashboard showing quiz completion, accuracy rates, study time, and trends.',
          benefits: 'Data-driven insights for optimizing study strategies and tracking improvement.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Knowledge Gaps Analysis',
          description: 'Identify specific books, chapters, or question types where performance is below 90%.',
          benefits: 'Targeted study recommendations to address weak areas and improve overall scores.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Question Performance Analysis',
          description: 'Detailed breakdown of individual question performance, difficulty levels, and response patterns.',
          benefits: 'Understand which questions are most challenging and focus study efforts accordingly.',
          roles: ['Pro', 'Enterprise']
        },
        {
          name: 'Team Performance Trends',
          description: 'Track team-wide performance over time with weekly and monthly trend analysis.',
          benefits: 'Monitor team progress and identify periods of high engagement and success.',
          roles: ['Team Owners', 'Team Admins']
        },
        {
          name: 'Daily Activity Tracking',
          description: 'Monitor daily study patterns, engagement levels, and activity streaks.',
          benefits: 'Understand study habits and optimize scheduling for maximum effectiveness.',
          roles: ['Pro', 'Enterprise']
        }
      ]
    }
  ];

  const userRoles = [
    {
      role: 'Free User',
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      capabilities: [
        'Basic quiz features (Quick Start and Create Your Own)',
        'Limited question access (Free tier only)',
        'Basic progress tracking (XP, levels, streaks)',
        'Up to 5 team members',
        'Achievement system access'
      ],
      limitations: [
        'No Study Schedule access',
        'No Analytics access',
        'Limited to 20 questions per custom quiz',
        'Access to Free tier questions only'
      ]
    },
    {
      role: 'Pro User',
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      capabilities: [
        'All Free features',
        'Study Schedule management',
        'Advanced Analytics access',
        'Pro and Free tier questions',
        'Enhanced custom quiz builder',
        'Team collaboration features'
      ],
      limitations: [
        'Limited to Pro and Free tier questions',
        'Standard team member limits'
      ]
    },
    {
      role: 'Team Owner',
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      capabilities: [
        'All subscription tier features',
        'Team creation and management',
        'Member invitation and role assignment',
        'Billing and subscription management',
        'Team analytics and reporting',
        'Study schedule creation for all members'
      ],
      limitations: [
        'Features limited by subscription tier'
      ]
    },
    {
      role: 'Team Admin',
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      capabilities: [
        'Team member management (except owners)',
        'Study schedule creation',
        'Team analytics access',
        'Member invitation and suspension',
        'Assignment creation and tracking'
      ],
      limitations: [
        'Cannot manage team owners',
        'No billing access',
        'Features limited by team subscription tier'
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PBE Quiz</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Home
              </Link>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. Document Title and Introduction */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            PBE Quiz Application
            <span className="block text-indigo-600">Key Features Overview</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive interactive quiz platform designed specifically for Pathfinder Bible Experience 
            participants, teams, and administrators. Master your PBE knowledge through structured learning, 
            team collaboration, and data-driven insights.
          </p>
        </div>

        {/* 2. Executive Summary */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Executive Summary</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Core Value Proposition</h3>
                <p className="text-gray-600 mb-6">
                  PBE Quiz transforms traditional Bible study preparation into an engaging, 
                  data-driven learning experience. Our platform combines interactive quizzes, 
                  team collaboration, and advanced analytics to help Pathfinder participants 
                  achieve excellence in their Bible Experience journey.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Interactive quiz system with 3 different quiz types</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Team collaboration and management tools</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Advanced analytics and progress tracking</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Gamification with XP, levels, and achievements</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Benefits</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Improved Performance</span>
                    </div>
                    <p className="text-blue-800 text-sm">
                      Data-driven insights help identify knowledge gaps and optimize study strategies.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Team Collaboration</span>
                    </div>
                    <p className="text-green-800 text-sm">
                      Structured team environment with shared goals and friendly competition.
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Engagement</span>
                    </div>
                    <p className="text-purple-800 text-sm">
                      Gamification elements maintain motivation and encourage consistent study habits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Features Overview */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Core Features Overview</h2>
            <p className="text-xl text-gray-600">
              Comprehensive tools and features designed to enhance your PBE preparation
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((category, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`h-12 w-12 ${category.color} rounded-lg flex items-center justify-center`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                </div>
                <div className="space-y-3">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="border-l-2 border-gray-200 pl-3">
                      <h4 className="font-medium text-gray-900 text-sm">{feature.name}</h4>
                      <p className="text-xs text-gray-600">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Detailed Feature Descriptions */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Detailed Feature Descriptions</h2>
            <p className="text-xl text-gray-600">
              In-depth look at each feature category and its capabilities
            </p>
          </div>
          
          <div className="space-y-12">
            {coreFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-xl shadow-sm p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className={`h-16 w-16 ${category.color} rounded-xl flex items-center justify-center`}>
                    <category.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{category.category}</h3>
                    <p className="text-gray-600">
                      {category.features.length} feature{category.features.length !== 1 ? 's' : ''} in this category
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">{feature.name}</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                          <p className="text-gray-600 text-sm">{feature.description}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Benefits</h5>
                          <p className="text-gray-600 text-sm">{feature.benefits}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Available To</h5>
                          <div className="flex flex-wrap gap-2">
                            {feature.roles.map((role, roleIndex) => (
                              <span 
                                key={roleIndex}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. User Roles and Permissions */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">User Roles and Permissions</h2>
            <p className="text-xl text-gray-600">
              Understanding access levels and capabilities for different user types
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {userRoles.map((roleInfo, index) => (
              <div key={index} className={`bg-white border-2 ${roleInfo.borderColor} rounded-xl p-6`}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`h-12 w-12 ${roleInfo.bgColor} rounded-lg flex items-center justify-center`}>
                    <roleInfo.icon className={`h-6 w-6 ${roleInfo.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{roleInfo.role}</h3>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Capabilities</span>
                    </h4>
                    <ul className="space-y-2">
                      {roleInfo.capabilities.map((capability, capIndex) => (
                        <li key={capIndex} className="flex items-start space-x-2">
                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-600">{capability}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {roleInfo.limitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span>Limitations</span>
                      </h4>
                      <ul className="space-y-2">
                        {roleInfo.limitations.map((limitation, limIndex) => (
                          <li key={limIndex} className="flex items-start space-x-2">
                            <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-gray-600">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Master Your PBE?</h2>
            <p className="text-xl mb-8 text-indigo-100">
              Join thousands of Pathfinders who are already using our platform to excel in their Bible Experience journey.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                to="/signup"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="border border-white text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-white hover:text-indigo-600 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}