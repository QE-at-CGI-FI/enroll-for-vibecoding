'use client';

import { useState, FormEvent, useEffect } from 'react';
import { ParticipationType, SESSIONS, DEFAULT_SESSION_ID } from '@/types';
import { getEnrollmentService } from '@/lib/enrollment';

interface EnrollmentFormProps {
  onEnroll: () => void;
  selectedSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export default function EnrollmentForm({ onEnroll, selectedSessionId, onSessionChange }: EnrollmentFormProps) {
  const [name, setName] = useState('');
  const [needsDiversityQuota, setNeedsDiversityQuota] = useState<boolean>(false);
  const [participationType, setParticipationType] = useState<ParticipationType>('local');
  const [sessionId, setSessionId] = useState(selectedSessionId || DEFAULT_SESSION_ID);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSession = SESSIONS.find(s => s.id === sessionId);

  // Update local sessionId when selectedSessionId prop changes
  useEffect(() => {
    if (selectedSessionId && selectedSessionId !== sessionId) {
      setSessionId(selectedSessionId);
    }
  }, [selectedSessionId, sessionId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const service = getEnrollmentService();
      const result = await service.enroll({
        name,
        needsDiversityQuota,
        participationType,
        sessionId,
      });

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setName('');
        setNeedsDiversityQuota(false);
        onEnroll();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setMessage({ type: 'error', text: 'Failed to enroll. Please try again.' });
    }

    setIsSubmitting(false);
  };

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
    if (onSessionChange) {
      onSessionChange(newSessionId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">Enroll for Workshop</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Event Date: {selectedSession?.date.toLocaleDateString('en-GB', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} • {selectedSession?.timeSlot}
      </p>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="session" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Workshop Session *
          </label>
          <select
            id="session"
            value={sessionId}
            onChange={(e) => handleSessionChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cgi-purple focus:border-cgi-purple dark:bg-black dark:text-white"
          >
            {SESSIONS.filter(session => session.id !== 'session-2').map((session) => (
              <option key={session.id} value={session.id}>
                {session.date.toLocaleDateString('en-GB', { 
                  month: 'long',
                  day: 'numeric'
                })} • {session.timeSlot}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cgi-purple focus:border-cgi-purple dark:bg-black dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Do you need to use the diversity quota reserved only for men? *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="diversityQuota"
                checked={needsDiversityQuota === true}
                onChange={() => setNeedsDiversityQuota(true)}
                required
                className="mr-2 accent-cgi-purple"
              />
              <span className="text-gray-700 dark:text-gray-300">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="diversityQuota"
                checked={needsDiversityQuota === false}
                onChange={() => setNeedsDiversityQuota(false)}
                required
                className="mr-2 accent-cgi-purple"
              />
              <span className="text-gray-700 dark:text-gray-300">No</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="participationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Participation Type *
          </label>
          <select
            id="participationType"
            value={participationType}
            onChange={(e) => setParticipationType(e.target.value as ParticipationType)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cgi-purple focus:border-cgi-purple dark:bg-black dark:text-white"
          >
            <option value="local">Local, at Karvaamokuja</option>
            <option value="remote">Remote, in Teams</option>
          </select>
        </div>

        {message && (
          <div
            className={`p-3 rounded-md ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-cgi-red dark:text-red-200 border border-cgi-red'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-cgi-purple hover:bg-cgi-purple/90 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isSubmitting ? 'Enrolling...' : 'Enroll'}
        </button>
      </div>
    </form>
  );
}
