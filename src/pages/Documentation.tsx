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
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function Documentation() {
  const subscriptionPlans = [
    {
      name: 'Free Plan',
      icon: Zap,
      color: 'bg-green-500',
      features: [
        'Access to Quick Start quizzes',
        'Ability to Create Your Own Quiz (limited number of questions per quiz)',
        'Achievements tracking',
        'Leaderboard access (team-only)',
        'Team management'
      ]
    },
    {
      name: 'Pro Plan',
      icon: Star,
      color: 'bg-blue-500',
      features: [
        'All Free Plan features',
        'Unlimited quiz creation with no question limits',
        'Study Schedule (plan individual study sessions for team members)',
        'Schedule (calendar-based planning)',
        'Advanced Analytics and performance insights',
        'Global leaderboard'
      ]
    }
  ];

  const userRoles = [
    {
      role: 'Team Owner',
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      responsibilities: [
        'Full control over team settings',
        'Manage billing and subscription',
        'Invite/remove members and admins',
        'Access all Pro features (if subscribed)',
        'Assign schedules and quizzes'
      ]
    },
    {
      role: 'Team Admin',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      responsibilities: [
        'Manage quizzes and schedules',
        'Invite/remove team members',
        'Access analytics (Pro plan only)',
        'Cannot change billing'
      ]
    },
    {
      role: 'Team Member',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      responsibilities: [
        'Participate in quizzes and schedules',
        'View leaderboard and achievements',
        'Access quizzes assigned by the team'
      ]
    }
  ];

  const coreModules = [
    {
      id: '4.1',
      title: 'Quiz Center',
      icon: BookOpen,
      color: 'bg-indigo-500',
      availability: 'Available in Free and Pro (feature limits vary)',
      features: [
        {
          name: 'Quick Start',
          description: 'Jump into pre-made quizzes instantly (available to all plans)'
        },
        {
          name: 'Create Your Own Quiz',
          description: 'Free Plan: Limited number of questions per quiz | Pro Plan: Unlimited questions'
        },
        {
          name: 'Quiz Tracking',
          description: 'Track quiz results for each team member'
        },
        {
          name: 'Question Formats',
          description: 'Multiple-choice, true/false, short-answer'
        }
      ]
    },
    {
      id: '4.2',
      title: 'Study Schedule',
      icon: Calendar,
      color: 'bg-purple-500',
      availability: 'Pro Plan',
      features: [
        {
          name: 'Custom Schedules',
          description: 'Create custom study schedules for individual team members'
        },
        {
          name: 'Topic Assignment',
          description: 'Assign topics, books, or chapters for each study session'
        },
        {
          name: 'Calendar View',
          description: 'Calendar view for better planning'
        }
      ]
    },
    {
      id: '4.3',
      title: 'Schedule',
      icon: Settings,
      color: 'bg-orange-500',
      availability: 'Pro Plan',
      features: [
        {
          name: 'Team Events',
          description: 'Plan and manage team-wide study events'
        },
        {
          name: 'Individual Assignment',
          description: 'Assign schedules to individuals'
        }
      ]
    },
    {
      id: '4.4',
      title: 'Achievements',
      icon: Award,
      color: 'bg-yellow-500',
      availability: 'All Plans',
      features: [
        {
          name: 'Milestone Badges',
          description: 'Earn badges for milestones: "Perfect Score", "Consistent Learner", "Quiz Streak"'
        },
        {
          name: 'Achievement Tracking',
          description: 'View personal and team-wide achievements'
        },
        {
          name: 'Motivation System',
          description: 'Helps motivate consistent participation'
        }
      ]
    },
    {
      id: '4.5',
      title: 'Leaderboard',
      icon: Trophy,
      color: 'bg-green-500',
      availability: 'All Plans',
      features: [
        {
          name: 'Team Comparison',
          description: 'Compare team members\' scores and progress'
        },
        {
          name: 'Time Filters',
          description: 'Filter by weekly, monthly, or all-time results'
        }
      ]
    },
    {
      id: '4.6',
      title: 'Team Management',
      icon: Users,
      color: 'bg-blue-500',
      availability: 'All Plans',
      features: [
        {
          name: 'Member Invitations',
          description: 'Invite members by email (Owners/Admins only)'
        },
        {
          name: 'Role Assignment',
          description: 'Assign admin roles'
        },
        {
          name: 'Activity Monitoring',
          description: 'View member activity and quiz results'
        },
        {
          name: 'Member Management',
          description: 'Manage invitations and remove inactive members'
        }
      ]
    },
    {
      id: '4.7',
      title: 'Analytics',
      icon: BarChart3,
      color: 'bg-red-500',
      availability: 'Pro Plan, Owners & Admins only',
      features: [
        {
          name: 'Team Performance Trends',
          description: 'Track team performance over time'
        },
        {
          name: 'Performance Progression',
          description: 'Monitor improvement over time'
        },
        {
          name: 'Knowledge Gaps Analysis',
          description: 'Identify weak areas that need focus'
        },
        {
          name: 'Question Performance Analysis',
          description: 'Analyze performance by type or topic'
        },
        {
          name: 'Daily Activity & Engagement',
          description: 'Track daily study patterns and engagement'
        },
        {
          name: 'Book & Chapter Performance',
          description: 'Detailed breakdown by Bible books and chapters'
        }
      ]
    },
    {
      id: '4.8',
      title: 'Billing',
      icon: CreditCard,
      color: 'bg-gray-500',
      availability: 'Team Owners only',
      features: [
        {
          name: 'Plan Management',
          description: 'Upgrade/downgrade between Free and Pro'
        },
        {
          name: 'Billing History',
          description: 'View billing history and invoices'
        },
        {
          name: 'Payment Methods',
          description: 'Update payment methods'
        },
        {
          name: 'Auto-renewal',
          description: 'Manage auto-renewal settings'
        }
      ]
    }
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
                to="/features"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Features
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. Document Title and Introduction */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            PBE (Pathfinder Bible Experience)
            <span className="block text-indigo-600">App Documentation</span>
          </h1>
        </div>

        {/* 1. Overview */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <span>1. Overview</span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              The PBE App is designed to help Pathfinder teams prepare for the Pathfinder Bible Experience 
              through interactive quizzes, study planning, progress tracking, and performance analytics. 
              It supports Free and Pro subscription plans to suit different needs and budgets.
            </p>
          </div>
        </section>

        {/* 2. Subscription Plans */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <span>2. Subscription Plans</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {subscriptionPlans.map((plan, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className={`h-12 w-12 ${plan.color} rounded-lg flex items-center justify-center`}>
                      <plan.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. User Roles */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <span>3. User Roles</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {userRoles.map((roleInfo, index) => (
                <div key={index} className={`border-2 ${roleInfo.borderColor} ${roleInfo.bgColor} rounded-xl p-6`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`h-10 w-10 ${roleInfo.bgColor} rounded-lg flex items-center justify-center border ${roleInfo.borderColor}`}>
                      <roleInfo.icon className={`h-6 w-6 ${roleInfo.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{roleInfo.role}</h3>
                  </div>
                  <ul className="space-y-2">
                    {roleInfo.responsibilities.map((responsibility, respIndex) => (
                      <li key={respIndex} className="flex items-start space-x-2">
                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Core Modules & Features */}
        <section className="mb-16">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-red-600" />
              </div>
              <span>4. Core Modules & Features</span>
            </h2>
            
            <div className="space-y-8">
              {coreModules.map((module, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className={`h-12 w-12 ${module.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                      <div className="flex items-center space-x-2 mb-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          module.availability.includes('Pro Plan') 
                            ? 'bg-blue-100 text-blue-800' 
                            : module.availability.includes('All Plans')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {module.availability}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {module.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{feature.name}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your PBE Journey?</h2>
            <p className="text-xl mb-8 text-indigo-100">
              Join teams already using our platform to excel in their Pathfinder Bible Experience preparation.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                to="/signup"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Start Free</span>
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