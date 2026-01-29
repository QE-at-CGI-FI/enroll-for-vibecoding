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
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Enrollment Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
          <div className="text-sm font-medium text-cgi-purple dark:text-cgi-purple">Total Enrolled</div>
          <div className="text-3xl font-bold text-black dark:text-white">{stats.total} / {20}</div>
        </div>

        <div className="bg-cgi-purple/10 dark:bg-cgi-purple/20 border border-cgi-purple/30 p-4 rounded-lg">
          <div className="text-sm font-medium text-cgi-purple dark:text-cgi-purple">Diversity Quota (Men)</div>
          <div className="text-3xl font-bold text-cgi-purple dark:text-cgi-purple">{stats.men} / {3}</div>
          <div className="text-xs text-cgi-purple dark:text-cgi-purple mt-1">
            {stats.menQuotaRemaining > 0 ? `${stats.menQuotaRemaining} quota spots remaining` : 'Quota filled'}
          </div>
        </div>

        <div className="bg-cgi-red/10 dark:bg-cgi-red/20 border border-cgi-red/30 p-4 rounded-lg">
          <div className="text-sm font-medium text-cgi-red dark:text-cgi-red">Women & Non-binary</div>
          <div className="text-3xl font-bold text-cgi-red dark:text-cgi-red">{stats.women} / {17}</div>
          <div className="text-xs text-cgi-red dark:text-cgi-red mt-1">
            {stats.womenNonBinarySpotsRemaining > 0 ? `${stats.womenNonBinarySpotsRemaining} spots remaining` : 'Spots filled'}
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Spots</div>
          <div className="text-3xl font-bold text-black dark:text-white">{stats.availableSpots}</div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Waiting Queue</div>
          <div className="text-3xl font-bold text-black dark:text-white">{stats.waitingQueueLength}</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Participation</div>
          <div className="text-lg font-semibold text-black dark:text-white">
            Local: {stats.local} | Remote: {stats.remote}
          </div>
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
        <h3 className="font-semibold text-black dark:text-white mb-2">Enrollment Rules:</h3>
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
