import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { api, clearToken, getToken, setToken, type AdminUser } from './api';
import Dashboard from './pages/Dashboard';
import Lawyers from './pages/Lawyers';
import Moderation from './pages/Moderation';
import Topics from './pages/Topics';
import Users from './pages/Users';

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));

  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: authed,
    retry: false,
  });

  if (!authed || me.isError) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  if (me.isLoading) {
    return <div className="empty">Loading…</div>;
  }

  if (me.data && me.data.role !== 'admin') {
    return (
      <Login
        onSuccess={() => setAuthed(true)}
        initialError="That account is not an administrator."
      />
    );
  }

  return (
    <div className="shell">
      <Sidebar
        user={me.data!}
        onSignOut={() => {
          clearToken();
          setAuthed(false);
        }}
      />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lawyers" element={<Lawyers />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/users" element={<Users />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Sidebar({ user, onSignOut }: { user: AdminUser; onSignOut: () => void }) {
  const reports = useQuery({ queryKey: ['reports', 'open'], queryFn: () => api.reports('open') });

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/lawyers', label: 'Advisers' },
    { to: '/topics', label: 'Suggested topics' },
    { to: '/moderation', label: 'Moderation', count: reports.data?.length },
    { to: '/users', label: 'Users' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">AI</div>
        <div>
          <div className="brand-name">AI Lawyer</div>
          <div className="brand-sub">Admin portal</div>
        </div>
      </div>

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          {link.label}
          {link.count ? <span className="nav-count">{link.count}</span> : null}
        </NavLink>
      ))}

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <div className="cell-muted" style={{ padding: '0 12px 10px' }}>
          {user.email}
        </div>
        <button className="btn ghost" style={{ width: '100%' }} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function Login({
  onSuccess,
  initialError = '',
}: {
  onSuccess: () => void;
  initialError?: string;
}) {
  const [email, setEmail] = useState('admin@ailawyer.app');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.login(email, password);
      if (res.user.role !== 'admin') {
        setError('That account is not an administrator.');
        return;
      }
      setToken(res.access_token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand" style={{ padding: 0, marginBottom: 6 }}>
          <div className="brand-mark">AI</div>
          <div>
            <div className="brand-name">AI Lawyer</div>
            <div className="brand-sub">Admin portal</div>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error ? <div className="error-note">{error}</div> : null}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
