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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Enrolled Participants ({state.enrolled.length})
        </h2>
        {state.enrolled.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No participants enrolled yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {state.enrolled.map((participant: Participant) => (
              <div
                key={participant.id}
                className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{participant.name}</div>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        participant.needsDiversityQuota
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200'
                      }`}>
                        {participant.needsDiversityQuota ? 'Diversity Quota' : 'Women/Non-binary'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        participant.participationType === 'local'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
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

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Waiting Queue ({state.waitingQueue.length})
        </h2>
        {state.waitingQueue.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No one in the waiting queue.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {state.waitingQueue.map((participant: Participant) => (
              <div
                key={participant.id}
                className="border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{participant.name}</div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200">
                        Women/Non-binary
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        participant.participationType === 'local'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
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
