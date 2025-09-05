import React from 'react';
import { Calendar as CalendarIcon, Target, Check, BookOpen } from 'lucide-react';

interface ScheduleStatsProps {
  stats: {
    totalAssignments: number;
    thisMonth: number;
    completed: number;
    booksScheduled: number;
  };
}

export function ScheduleStats({ stats }: ScheduleStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center">
          <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Total Assignments</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center">
          <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">This Month</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center">
          <Check className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.completed}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center">
          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Books Scheduled</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.booksScheduled}</p>
          </div>
        </div>
      </div>
    </div>
  );
}