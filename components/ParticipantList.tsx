'use client';

import { Participant } from '@/types';
import { getEnrollmentService } from '@/lib/enrollment';
import { useEffect, useState } from 'react';

interface ParticipantListProps {
  refreshTrigger: number;
}

export default function ParticipantList({ refreshTrigger }: ParticipantListProps) {
  const [state, setState] = useState(getEnrollmentService().getState());

  useEffect(() => {
    setState(getEnrollmentService().getState());
  }, [refreshTrigger]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
          Enrolled Participants ({state.enrolled.length})
        </h2>
        {state.enrolled.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No participants enrolled yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {state.enrolled.map((participant: Participant) => (
              <div
                key={participant.id}
                className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-black dark:text-white">{participant.name}</div>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        participant.needsDiversityQuota
                          ? 'bg-cgi-purple/20 dark:bg-cgi-purple/30 text-cgi-purple dark:text-cgi-purple border border-cgi-purple/30'
                          : 'bg-cgi-red/20 dark:bg-cgi-red/30 text-cgi-red dark:text-cgi-red border border-cgi-red/30'
                      }`}>
                        {participant.needsDiversityQuota ? 'Diversity Quota' : 'Women/Non-binary'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        participant.participationType === 'local'
                          ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600'
                          : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-gray-400 dark:border-gray-500'
                      }`}>
                        {participant.participationType}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Enrolled: {formatDate(participant.enrolledAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
          Waiting Queue ({state.waitingQueue.length})
        </h2>
        {state.waitingQueue.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No one in the waiting queue.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {state.waitingQueue.map((participant: Participant) => (
              <div
                key={participant.id}
                className="border border-cgi-red/40 dark:border-cgi-red/60 p-3 rounded-lg bg-cgi-red/5 dark:bg-cgi-red/10"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-black dark:text-white">{participant.name}</div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-cgi-red/20 dark:bg-cgi-red/30 text-cgi-red dark:text-cgi-red border border-cgi-red/30">
                        Women/Non-binary
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        participant.participationType === 'local'
                          ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600'
                          : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-gray-400 dark:border-gray-500'
                      }`}>
                        {participant.participationType}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Added: {formatDate(participant.enrolledAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
