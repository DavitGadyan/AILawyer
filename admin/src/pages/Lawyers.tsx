import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { api, type Lawyer } from '../api';

const SPECIALTIES: Record<string, string[]> = {
  immigration: [
    'work_visa',
    'student_visa',
    'family_reunification',
    'asylum',
    'citizenship',
    'investor_visa',
    'golden_visa',
    'deportation_defense',
    'appeals',
    'permanent_residency',
    'digital_nomad',
    'business_immigration',
  ],
  tax: [
    'corporate_structuring',
    'cross_border_tax',
    'us_uk_tax',
    'transfer_pricing',
    'permanent_establishment',
    'vat_sales_tax',
    'rd_credits',
    'crypto_tax',
    'exit_planning',
    'personal_tax',
  ],
};

const PRACTICES = ['immigration', 'tax'];

const CURRENCY: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
const symbol = (code: string) => CURRENCY[code] ?? `${code} `;

const blank = {
  name: '',
  headline: 'Immigration Lawyer',
  avatar_url: '',
  bio: '',
  city: '',
  country: '',
  jurisdiction: 'US',
  bar_admission: '',
  practices: ['immigration'] as string[],
  specialties: [] as string[],
  languages: ['en'] as string[],
  hourly_rate: 100,
  currency: 'EUR',
  rating: 4.5,
  reviews_count: 0,
  years_experience: 5,
  cases_count: 0,
  email: '',
  whatsapp: '',
  offers_free_consult: true,
  is_published: true,
  firm_id: null as number | null,
};

type Draft = typeof blank;

export default function Lawyers() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft & { id?: number } | null>(null);
  const [search, setSearch] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [practice, setPractice] = useState('');

  const lawyers = useQuery({ queryKey: ['admin-lawyers'], queryFn: api.lawyers });

  const save = useMutation({
    mutationFn: (draft: Draft & { id?: number }) => {
      const { id, ...body } = draft;
      return id ? api.updateLawyer(id, body) : api.createLawyer(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lawyers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: api.deleteLawyer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lawyers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const rows = useMemo(() => {
    const all = lawyers.data ?? [];
    return all.filter((l) => {
      const matchesSearch =
        !search ||
        `${l.name} ${l.city} ${l.headline}`.toLowerCase().includes(search.toLowerCase());
      const matchesJurisdiction = !jurisdiction || l.jurisdiction === jurisdiction;
      const matchesPractice = !practice || (l.practices ?? []).includes(practice);
      return matchesSearch && matchesJurisdiction && matchesPractice;
    });
  }, [lawyers.data, search, jurisdiction, practice]);

  const startEdit = (lawyer: Lawyer) =>
    setEditing({
      ...blank,
      ...lawyer,
      firm_id: lawyer.firm?.id ?? null,
      is_published: true,
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Advisers</h1>
          <p className="page-sub">
            {rows.length}
            {rows.length === lawyers.data?.length ? '' : ` of ${lawyers.data?.length ?? 0}`} in
            the directory across the UK, US, EU and Spain.
          </p>
        </div>
        <button className="btn" onClick={() => setEditing({ ...blank })}>
          Add adviser
        </button>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name, city or focus"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select
          className="select"
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
        >
          <option value="">All practices</option>
          <option value="immigration">Immigration</option>
          <option value="tax">Tax &amp; structuring</option>
        </select>
        <select
          className="select"
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
        >
          <option value="">All jurisdictions</option>
          <option value="UK">United Kingdom</option>
          <option value="US">United States</option>
          <option value="EU">European Union</option>
          <option value="ES">Spain</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Practice</th>
              <th>Jurisdiction</th>
              <th>Location</th>
              <th>Specialties</th>
              <th>Rate</th>
              <th>Rating</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((lawyer) => (
              <tr key={lawyer.id}>
                <td>
                  <div className="name-cell">
                    <img className="avatar" src={lawyer.avatar_url} alt="" />
                    <div>
                      <div className="cell-strong">{lawyer.name}</div>
                      <div className="cell-muted">{lawyer.headline}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="tag-row">
                    {(lawyer.practices ?? []).map((p) => (
                      <span key={p} className={`pill ${p === 'tax' ? 'ok' : ''}`}>
                        {p === 'tax' ? 'tax' : 'immigration'}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="pill">{lawyer.jurisdiction}</span>
                </td>
                <td className="cell-muted">
                  {lawyer.city}, {lawyer.country}
                </td>
                <td>
                  <div className="tag-row">
                    {lawyer.specialties.slice(0, 2).map((s) => (
                      <span key={s} className="pill">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {lawyer.specialties.length > 2 ? (
                      <span className="pill">+{lawyer.specialties.length - 2}</span>
                    ) : null}
                  </div>
                </td>
                <td className="cell-strong">
                  {symbol(lawyer.currency)}
                  {lawyer.hourly_rate}
                </td>
                <td className="cell-strong">
                  {lawyer.rating.toFixed(1)}{' '}
                  <span className="cell-muted">({lawyer.reviews_count})</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn ghost small" onClick={() => startEdit(lawyer)}>
                      Edit
                    </button>
                    <button
                      className="btn danger small"
                      onClick={() => {
                        if (confirm(`Delete ${lawyer.name}?`)) remove.mutate(lawyer.id);
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
        {rows.length === 0 ? <div className="empty">No lawyers match those filters.</div> : null}
      </div>

      {editing ? (
        <div className="drawer-backdrop" onClick={() => setEditing(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <h2>{editing.id ? `Edit ${editing.name}` : 'Add adviser'}</h2>

            <div className="form-grid">
              <Text label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} wide />
              <Text label="Headline" value={editing.headline} onChange={(v) => setEditing({ ...editing, headline: v })} wide />
              <Text label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
              <Text label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} />

              <div className="form-field">
                <label>Jurisdiction</label>
                <select
                  className="select"
                  value={editing.jurisdiction}
                  onChange={(e) => setEditing({ ...editing, jurisdiction: e.target.value })}
                >
                  <option value="UK">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="EU">European Union</option>
                  <option value="ES">Spain</option>
                </select>
              </div>

              <div className="form-field">
                <label>Currency</label>
                <select
                  className="select"
                  value={editing.currency}
                  onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <Num label="Hourly rate" value={editing.hourly_rate} onChange={(v) => setEditing({ ...editing, hourly_rate: v })} />
              <Num label="Years experience" value={editing.years_experience} onChange={(v) => setEditing({ ...editing, years_experience: v })} />
              <Num label="Rating" step={0.1} value={editing.rating} onChange={(v) => setEditing({ ...editing, rating: v })} />
              <Num label="Reviews" value={editing.reviews_count} onChange={(v) => setEditing({ ...editing, reviews_count: v })} />
              <Num label="Cases" value={editing.cases_count} onChange={(v) => setEditing({ ...editing, cases_count: v })} />
              <Text label="Bar admission" value={editing.bar_admission} onChange={(v) => setEditing({ ...editing, bar_admission: v })} />
              <Text label="Email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
              <Text label="WhatsApp" value={editing.whatsapp} onChange={(v) => setEditing({ ...editing, whatsapp: v })} />
              <Text label="Avatar URL" value={editing.avatar_url} onChange={(v) => setEditing({ ...editing, avatar_url: v })} wide />

              <div className="form-field wide">
                <label>Practice areas</label>
                <div className="tag-row">
                  {PRACTICES.map((slug) => {
                    const on = editing.practices.includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        className={`btn small ${on ? '' : 'ghost'}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            practices: on
                              ? editing.practices.filter((p) => p !== slug)
                              : [...editing.practices, slug],
                          })
                        }
                      >
                        {slug === 'tax' ? 'Tax & structuring' : 'Immigration'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-field wide">
                <label>Specialties</label>
                <div className="tag-row">
                  {editing.practices.flatMap((p) => SPECIALTIES[p] ?? []).map((slug) => {
                    const on = editing.specialties.includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        className={`btn small ${on ? '' : 'ghost'}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            specialties: on
                              ? editing.specialties.filter((s) => s !== slug)
                              : [...editing.specialties, slug],
                          })
                        }
                      >
                        {slug.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-field wide">
                <label>Languages</label>
                <div className="tag-row">
                  {['en', 'es'].map((code) => {
                    const on = editing.languages.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        className={`btn small ${on ? '' : 'ghost'}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            languages: on
                              ? editing.languages.filter((l) => l !== code)
                              : [...editing.languages, code],
                          })
                        }
                      >
                        {code === 'es' ? 'Español' : 'English'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-field wide">
                <label>Bio</label>
                <textarea
                  value={editing.bio}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                />
              </div>
            </div>

            <div className="drawer-actions">
              <button
                className="btn"
                onClick={() => save.mutate(editing)}
                disabled={!editing.name || save.isPending}
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

function Text({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={`form-field${wide ? ' wide' : ''}`}>
      <label>{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        className="input"
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
