import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../api';

const ROLES = ['client', 'lawyer', 'admin'];

export default function Users() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['admin-users'], queryFn: api.users });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.setRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="page-sub">{users.data?.length ?? 0} registered accounts.</p>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Language</th>
              <th>Disclaimer</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((user) => (
              <tr key={user.id}>
                <td className="cell-strong">{user.full_name || '—'}</td>
                <td className="cell-muted">{user.email}</td>
                <td>
                  <span className="pill">{user.locale.toUpperCase()}</span>
                </td>
                <td>
                  <span className={`pill ${user.accepted_disclaimer ? 'ok' : 'warn'}`}>
                    {user.accepted_disclaimer ? 'Accepted' : 'Pending'}
                  </span>
                </td>
                <td>
                  <select
                    className="select"
                    value={user.role}
                    onChange={(e) => setRole.mutate({ id: user.id, role: e.target.value })}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users.data ?? []).length === 0 ? <div className="empty">No users yet.</div> : null}
      </div>
    </>
  );
}
