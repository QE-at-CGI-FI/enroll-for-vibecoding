'use client';

import { getEnrollmentService } from '@/lib/enrollment';
import { useEffect, useState } from 'react';

interface EnrollmentStatsProps {
  refreshTrigger: number;
}

export default function EnrollmentStats({ refreshTrigger }: EnrollmentStatsProps) {
  const [stats, setStats] = useState(getEnrollmentService().getEnrollmentStats());

  useEffect(() => {
    setStats(getEnrollmentService().getEnrollmentStats());
  }, [refreshTrigger]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Enrollment Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Enrolled</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total} / {20}</div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Diversity Quota (Men)</div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.men} / {3}</div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {stats.menQuotaRemaining > 0 ? `${stats.menQuotaRemaining} quota spots remaining` : 'Quota filled'}
          </div>
        </div>

        <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg">
          <div className="text-sm font-medium text-pink-600 dark:text-pink-400">Women & Non-binary</div>
          <div className="text-3xl font-bold text-pink-900 dark:text-pink-100">{stats.women} / {17}</div>
          <div className="text-xs text-pink-600 dark:text-pink-400 mt-1">
            {stats.womenNonBinarySpotsRemaining > 0 ? `${stats.womenNonBinarySpotsRemaining} spots remaining` : 'Spots filled'}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-600 dark:text-green-400">Available Spots</div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.availableSpots}</div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Waiting Queue</div>
          <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.waitingQueueLength}</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Participation</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Local: {stats.local} | Remote: {stats.remote}
          </div>
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Enrollment Rules:</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
          <li>Total capacity: 20 participants</li>
          <li>3 spots reserved for diversity quota (men)</li>
          <li>17 spots for women and non-binary participants</li>
          <li>When more than 17 women try to enroll, they are added to the waiting queue</li>
          <li>When more than 4 men try to enroll, they are informed that spots have been filled</li>
        </ul>
      </div>
    </div>
  );
}
