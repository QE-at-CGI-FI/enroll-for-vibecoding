'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import EnrollmentForm from '@/components/EnrollmentForm';
import EnrollmentStats from '@/components/EnrollmentStats';
import ParticipantList from '@/components/ParticipantList';
import { initializeEnrollmentService, getEnrollmentService } from '@/lib/enrollment';
import { EVENT_DATE } from '@/types';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initializeEnrollmentService();
      setIsInitialized(true);
    };
    initialize();
  }, []);

  const handleEnroll = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const service = getEnrollmentService();
      await service.refresh();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
    setIsRefreshing(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white dark:from-black dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading enrollment data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-white dark:from-black dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src={`${process.env.NODE_ENV === 'production' ? '/enroll-for-vibecoding' : ''}/logo.png`}
              alt="CGI Logo"
              width={120}
              height={80}
              className="mr-4 logo-image"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            Vibe Coding Workshop
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            {EVENT_DATE.toLocaleDateString('en-GB', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Enrollment System
          </p>
          <div className="mt-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 rounded-full border-2 border-white border-b-transparent"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <EnrollmentStats refreshTrigger={refreshTrigger} />
          </div>
          <div>
            <EnrollmentForm onEnroll={handleEnroll} />
          </div>
        </div>

        <ParticipantList refreshTrigger={refreshTrigger} />
      </div>
    </main>
  );
}
