import React from 'react';
import { Layout } from '../components/layout/Layout';

export function SettingsSimple() {
  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Simple settings page for testing.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Section</h2>
          <p className="text-gray-600 mb-4">This is a simplified settings page to test for nested button issues.</p>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
            Test Button
          </button>
        </div>
      </div>
    </Layout>
  );
}