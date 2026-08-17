import { useQuery } from '@tanstack/react-query';

import { api } from '../api';

export default function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });

  if (stats.isLoading) return <div className="empty">Loading…</div>;
  if (stats.isError || !stats.data) {
    return <div className="empty">Could not load stats. Is the backend running?</div>;
  }

  const data = stats.data;
  const tiles = [
    { label: 'Users', value: data.users },
    { label: 'Advisers', value: data.lawyers },
    { label: 'Consultations', value: data.chat_sessions },
    { label: 'Messages', value: data.messages },
    { label: 'Case analyses', value: data.case_profiles },
    { label: 'Structure analyses', value: data.tax_profiles },
    { label: 'Bookings', value: data.consultations },
    { label: 'Discussions', value: data.threads },
    { label: 'Open reports', value: data.open_reports },
  ];

  const maxSessions = Math.max(1, ...data.top_jurisdictions.map((j) => j.sessions));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Everything running through the AI Lawyer platform.</p>
        </div>
      </div>

      <div className="stat-grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="card stat">
            <div className="stat-label">{tile.label}</div>
            <div className="stat-value">{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h2>Consultations by jurisdiction</h2>
        {data.top_jurisdictions.length === 0 ? (
          <p className="cell-muted">No consultations yet.</p>
        ) : (
          data.top_jurisdictions.map((row) => (
            <div key={row.jurisdiction} className="bar-row">
              <span className="bar-label">{row.jurisdiction}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(row.sessions / maxSessions) * 100}%` }}
                />
              </div>
              <span className="bar-value">{row.sessions}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
