import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, type Topic } from '../api';

const blank = {
  practice: 'immigration',
  jurisdiction: 'ALL',
  icon: 'document-text',
  title_en: '',
  title_es: '',
  subtitle_en: '',
  subtitle_es: '',
  prompt_en: '',
  prompt_es: '',
  sort_order: 0,
  is_published: true,
};

type Draft = typeof blank & { id?: number };

const ICONS = [
  'document-text', 'briefcase', 'school', 'people', 'home',
  'laptop', 'time', 'card', 'globe', 'shield', 'alert',
  'business', 'cash', 'calculator', 'git-network', 'layers', 'receipt', 'swap',
];

export default function Topics() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const topics = useQuery({ queryKey: ['admin-topics'], queryFn: api.topics });

  const save = useMutation({
    mutationFn: (draft: Draft) => {
      const { id, ...body } = draft;
      return id ? api.updateTopic(id, body) : api.createTopic(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: api.deleteTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-topics'] }),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Suggested topics</h1>
          <p className="page-sub">
            The tappable cards on the app's home screen. Edits go live immediately — no deploy.
          </p>
        </div>
        <button className="btn" onClick={() => setEditing({ ...blank })}>
          Add topic
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Practice</th>
              <th>Jurisdiction</th>
              <th>English</th>
              <th>Spanish</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(topics.data ?? []).map((topic: Topic) => (
              <tr key={topic.id}>
                <td className="cell-muted">{topic.sort_order}</td>
                <td>
                  <span className={`pill ${topic.practice === 'tax' ? 'ok' : ''}`}>
                    {topic.practice}
                  </span>
                </td>
                <td>
                  <span className="pill">{topic.jurisdiction}</span>
                </td>
                <td>
                  <div className="cell-strong">{topic.title_en}</div>
                  <div className="cell-muted">{topic.subtitle_en}</div>
                </td>
                <td>
                  <div className="cell-strong">{topic.title_es}</div>
                  <div className="cell-muted">{topic.subtitle_es}</div>
                </td>
                <td>
                  <span className={`pill ${topic.is_published ? 'ok' : 'warn'}`}>
                    {topic.is_published ? 'Published' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn ghost small"
                      onClick={() => setEditing({ ...blank, ...topic })}
                    >
                      Edit
                    </button>
                    <button
                      className="btn danger small"
                      onClick={() => {
                        if (confirm('Delete this topic?')) remove.mutate(topic.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(topics.data ?? []).length === 0 ? (
          <div className="empty">No topics yet.</div>
        ) : null}
      </div>

      {editing ? (
        <div className="drawer-backdrop" onClick={() => setEditing(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <h2>{editing.id ? 'Edit topic' : 'Add topic'}</h2>

            <div className="form-grid">
              <div className="form-field">
                <label>Practice</label>
                <select
                  className="select"
                  value={editing.practice}
                  onChange={(e) => setEditing({ ...editing, practice: e.target.value })}
                >
                  <option value="immigration">Immigration</option>
                  <option value="tax">Tax &amp; structuring</option>
                </select>
              </div>

              <div className="form-field">
                <label>Jurisdiction</label>
                <select
                  className="select"
                  value={editing.jurisdiction}
                  onChange={(e) => setEditing({ ...editing, jurisdiction: e.target.value })}
                >
                  <option value="ALL">All</option>
                  <option value="UK">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="EU">European Union</option>
                  <option value="ES">Spain</option>
                </select>
              </div>

              <div className="form-field">
                <label>Icon</label>
                <select
                  className="select"
                  value={editing.icon}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                >
                  {ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <Field label="Title (EN)" value={editing.title_en} onChange={(v) => setEditing({ ...editing, title_en: v })} />
              <Field label="Title (ES)" value={editing.title_es} onChange={(v) => setEditing({ ...editing, title_es: v })} />
              <Field label="Subtitle (EN)" value={editing.subtitle_en} onChange={(v) => setEditing({ ...editing, subtitle_en: v })} />
              <Field label="Subtitle (ES)" value={editing.subtitle_es} onChange={(v) => setEditing({ ...editing, subtitle_es: v })} />

              <div className="form-field wide">
                <label>Prompt (EN) — dropped into the composer when tapped</label>
                <textarea
                  value={editing.prompt_en}
                  onChange={(e) => setEditing({ ...editing, prompt_en: e.target.value })}
                />
              </div>
              <div className="form-field wide">
                <label>Prompt (ES)</label>
                <textarea
                  value={editing.prompt_es}
                  onChange={(e) => setEditing({ ...editing, prompt_es: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Sort order</label>
                <input
                  className="input"
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: Number(e.target.value) })
                  }
                />
              </div>

              <div className="form-field">
                <label>Published</label>
                <select
                  className="select"
                  value={editing.is_published ? 'yes' : 'no'}
                  onChange={(e) =>
                    setEditing({ ...editing, is_published: e.target.value === 'yes' })
                  }
                >
                  <option value="yes">Published</option>
                  <option value="no">Hidden</option>
                </select>
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="btn"
                onClick={() => save.mutate(editing)}
                disabled={!editing.title_en || !editing.title_es || save.isPending}
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
