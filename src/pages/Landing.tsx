import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Zap, Shield, BarChart3, Crown, Star } from 'lucide-react';
import { stripeProducts } from '../stripe-config';
import { formatCurrency } from '../utils/formatters';

const features = [
  {
    name: 'Advanced Analytics',
    description: 'Get detailed insights into your quiz performance with real-time analytics.',
    icon: BarChart3,
  },
  {
    name: 'Enterprise Security',
    description: 'Bank-level security with end-to-end encryption and compliance certifications.',
    icon: Shield,
  },
  {
    name: 'Lightning Fast',
    description: 'Built for speed with modern architecture and global CDN distribution.',
    icon: Zap,
  },
];

export function Landing() {
  const getPlanIcon = (interval: string) => {
    return interval === 'year' ? Crown : Star;
  };

  return (
    <div className="min-h-screen bg-white">
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
               to="/documentation"
               className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
             >
               Documentation
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Master Your
              <span className="text-indigo-600 block">Pathfinder Bible Experience</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Interactive quizzes, study schedules, and team collaboration tools to help you excel in the Pathfinder Bible Experience.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                to="/signup"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to excel in PBE
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive tools and features to enhance your Bible study experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.name} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for your PBE preparation
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Free</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">£0</span>
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">Perfect for getting started</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-600">Basic quiz features</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-600">Limited question access</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-600">Basic progress tracking</span>
                </li>
              </ul>
              <Link
                to="/signup"
                className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 block text-center bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Get Started Free
              </Link>
            </div>

            {/* Stripe Products */}
            {stripeProducts.map((product) => {
              const Icon = getPlanIcon(product.interval);
              const isPopular = product.interval === 'year';
              
              return (
                <div
                  key={product.id}
                  className={`relative rounded-xl p-8 ${
                    isPopular
                      ? 'bg-indigo-600 text-white shadow-xl scale-105'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Best Value
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <h3 className={`text-2xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        {product.name.replace('PBE ', '')}
                      </h3>
                      <Icon className={`h-6 w-6 ${isPopular ? 'text-yellow-300' : 'text-blue-500'}`} />
                    </div>
                    <div className="mb-2">
                      <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(product.price, product.currency)}
                      </span>
                      <span className={`text-lg ${isPopular ? 'text-indigo-200' : 'text-gray-600'}`}>
                        /{product.interval}
                      </span>
                    </div>
                    <p className={`${isPopular ? 'text-indigo-200' : 'text-gray-600'}`}>
                      {product.description}
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-3">
                        <Check className={`h-5 w-5 ${isPopular ? 'text-indigo-200' : 'text-indigo-600'}`} />
                        <span className={`${isPopular ? 'text-indigo-100' : 'text-gray-600'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 block text-center ${
                      isPopular
                        ? 'bg-white text-indigo-600 hover:bg-gray-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}