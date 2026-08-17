import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '../api';

export default function Moderation() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('open');

  const reports = useQuery({
    queryKey: ['reports', status],
    queryFn: () => api.reports(status),
  });

  const resolve = useMutation({
    mutationFn: ({ id, hide }: { id: number; hide: boolean }) => api.resolveReport(id, hide),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Moderation</h1>
          <p className="page-sub">
            Content flagged by members. Posts are also pre-screened by the AI before publishing.
          </p>
        </div>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reported</th>
              <th>Content</th>
              <th>Reason</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(reports.data ?? []).map((report) => (
              <tr key={report.id}>
                <td className="cell-muted">
                  {new Date(report.created_at).toLocaleDateString()}
                  <div className="cell-muted">
                    {report.post_id ? `Post #${report.post_id}` : `Thread #${report.thread_id}`}
                  </div>
                </td>
                <td style={{ maxWidth: 380 }}>{report.excerpt || '—'}</td>
                <td className="cell-muted">{report.reason || '—'}</td>
                <td>
                  <span className={`pill ${report.status === 'open' ? 'warn' : 'ok'}`}>
                    {report.status}
                  </span>
                </td>
                <td>
                  {report.status === 'open' ? (
                    <div className="row-actions">
                      <button
                        className="btn ghost small"
                        onClick={() => resolve.mutate({ id: report.id, hide: false })}
                      >
                        Dismiss
                      </button>
                      <button
                        className="btn danger small"
                        onClick={() => resolve.mutate({ id: report.id, hide: true })}
                      >
                        Hide content
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(reports.data ?? []).length === 0 ? (
          <div className="empty">Nothing in the queue. 🎉</div>
        ) : null}
      </div>
    </>
  );
}
