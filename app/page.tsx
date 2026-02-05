'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import EnrollmentForm from '@/components/EnrollmentForm';
import EnrollmentStats from '@/components/EnrollmentStats';
import ParticipantList from '@/components/ParticipantList';
import { initializeEnrollmentService, getEnrollmentService } from '@/lib/enrollment';
import { startConnectivityMonitoring } from '@/lib/connectivity';
import { SESSIONS, DEFAULT_SESSION_ID, SECOND_SESSION_CUTOFF } from '@/types';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(DEFAULT_SESSION_ID);

  const selectedSession = SESSIONS.find(s => s.id === selectedSessionId);

  useEffect(() => {
    const initialize = async () => {
      await initializeEnrollmentService();
      setIsInitialized(true);
      
      // Start connectivity monitoring for better error diagnosis
      if (typeof window !== 'undefined') {
        startConnectivityMonitoring();
      }
    };
    initialize();
  }, []);

  const handleEnroll = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const service = getEnrollmentService();
      service.setCurrentSession(selectedSessionId);
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
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="text-center lg:text-left lg:flex-1">
            <div className="flex items-center justify-center lg:justify-start mb-4">
              <Image
                src={`${process.env.NODE_ENV === 'production' ? '/enroll-for-vibecoding' : ''}/logo.png`}
                alt="CGI Logo"
                width={100}
                height={66}
                className="mr-4 logo-image"
                priority
              />
            </div>
            <div className="flex items-center justify-center lg:justify-start mb-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Vibe Coding Workshop
              </h1>
              <button
                onClick={() => setShowEventInfo(true)}
                className="ml-3 p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="Event Information"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            <p className="text-sm italic text-purple-600 dark:text-purple-400 mb-3">
              Adding women-hours to coding!
            </p>
            
            <div className="mb-4">
              <label htmlFor="session-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Workshop Session:
              </label>
              <select
                id="session-select"
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cgi-purple focus:border-cgi-purple dark:bg-black dark:text-white"
              >
                {SESSIONS.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.date.toLocaleDateString('en-GB', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} • {session.timeSlot}
                  </option>
                ))}
              </select>
            </div>
            
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
          
          <div className="mt-6 lg:mt-0 lg:ml-8 lg:max-w-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule</p>
              <p className="mb-4">
                Workshop runs from 11:00 to 14:00 with lunch break included.
              </p>
              
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Privacy Notice</p>
              <p className="mb-4">
                Your name will be displayed on the participant list for event organization. 
                All participant data will be permanently deleted after the workshop concludes.
              </p>
              
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Cancellation Policy</p>
              <p>
                If you need to cancel, contact Maaret Pyhäjärvi.
              </p>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <EnrollmentStats refreshTrigger={refreshTrigger} sessionId={selectedSessionId} />
          </div>
          <div>
            <EnrollmentForm 
              onEnroll={handleEnroll} 
              selectedSessionId={selectedSessionId}
              onSessionChange={handleSessionChange}
            />
          </div>
        </div>

        <ParticipantList refreshTrigger={refreshTrigger} sessionId={selectedSessionId} />
      </div>

      {/* Event Info Modal */}
      {showEventInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  About Vibe Coding Workshop
                </h2>
                <button
                  onClick={() => setShowEventInfo(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Turning all women of CGI in Finland into programmers - armed with vibe coding. 
                  Come to a beginner-friendly event to build your own application. We start building 
                  together so you can build what we started with, or take control to build to your own idea.
                </p>
                <p>
                  For prep, create a GitHub account if you don't have one yet and join the 
                  "One new developer per second" phenomena that GitHub reports on in their Octoverse report 2025.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
