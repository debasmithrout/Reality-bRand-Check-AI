import React from 'react';
import { SubmissionItem } from '../../types';
import { getScoreBadgeColor } from '../../utils/formatters';

interface SubmissionsTableProps {
  submissions: SubmissionItem[];
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissions }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recent Content Submissions</h3>
          <p className="text-xs text-gray-500">Live feed of marketing assets audited by brand compliance checks (Sample Data)</p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
          {submissions.length} Total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Campaign / Copy Title</th>
              <th className="px-6 py-3">Brand</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((sub) => {
              const statusColors = {
                Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'Needs Revision': 'bg-amber-50 text-amber-700 border-amber-200',
                'Pending Review': 'bg-blue-50 text-blue-700 border-blue-200',
              };

              return (
                <tr key={sub.id} className="hover:bg-gray-50/75 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{sub.title}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{sub.id}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{sub.brand}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 rounded text-gray-700">
                      {sub.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreBadgeColor(
                        sub.score
                      )}`}
                    >
                      {sub.score}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                        statusColors[sub.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{sub.submittedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

