'use client';

import { useState } from 'react';
import Image from 'next/image';
import EnrollmentForm from '@/components/EnrollmentForm';
import EnrollmentStats from '@/components/EnrollmentStats';
import ParticipantList from '@/components/ParticipantList';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEnroll = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-white dark:from-black dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="CGI Logo"
              width={120}
              height={80}
              className="mr-4"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            Vibe Coding Workshop
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Enrollment System
          </p>
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
