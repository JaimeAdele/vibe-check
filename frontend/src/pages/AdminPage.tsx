import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import AdminVenuesPanel from '../components/AdminVenuesPage';

interface Organizer {
  id: string;
  name: string;
  slug: string;
  activeEventCount: number;
}

interface LookupResult {
  id: string;
  name: string;
  email: string;
}

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-base sm:text-sm';

type Tab = 'organizers' | 'venues';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('organizers');
  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  // Promote flow
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [promoteSlug, setPromoteSlug] = useState('');
  const [showPromoteSlug, setShowPromoteSlug] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (user !== null && user.role !== 'ADMIN') navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    fetch('/api/organizers')
      .then(r => r.json())
      .then(data => setOrganizers(data.organizers ?? []));
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError(null);
    setShowPromoteSlug(false);
    setPromoteSlug('');
    setPromoteError(null);
    setPromoteSuccess(null);

    try {
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(lookupEmail)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? 'Something went wrong'); return; }
      setLookupResult(data);
    } finally {
      setLookupLoading(false);
    }
  }

  function handlePromoteClick() {
    if (!lookupResult) return;
    const confirmed = window.confirm(
      `Promote ${lookupResult.name} (${lookupResult.email}) to organizer?\n\nThey will have full access to create and manage events.`
    );
    if (confirmed) setShowPromoteSlug(true);
  }

  async function handlePromoteConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupResult) return;
    setPromoting(true);
    setPromoteError(null);

    try {
      const res = await fetch(`/api/users/${lookupResult.id}/promote`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: promoteSlug }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoteError(data.error ?? 'Something went wrong'); return; }

      setOrganizers(prev => [...prev, { id: data.id, name: data.name, slug: data.slug, activeEventCount: 0 }]);
      setPromoteSuccess(`${data.name} has been promoted to organizer.`);
      setLookupEmail('');
      setLookupResult(null);
      setShowPromoteSlug(false);
      setPromoteSlug('');
    } finally {
      setPromoting(false);
    }
  }

  function startEdit(org: Organizer) {
    setEditingId(org.id);
    setEditName(org.name);
    setEditSlug(org.slug ?? '');
    setEditEmail('');
    setEditPassword('');
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSave(org: Organizer) {
    setSaving(true);
    setEditError(null);

    try {
      const body: Record<string, string> = {};
      if (editName !== org.name) body.name = editName;
      if (editSlug !== org.slug) body.slug = editSlug;
      if (editEmail) body.email = editEmail;
      if (editPassword) body.password = editPassword;

      const res = await fetch(`/api/organizers/${org.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { setEditError(data.error ?? 'Something went wrong'); return; }

      setOrganizers(prev => prev.map(o =>
        o.id === org.id ? { ...o, name: data.name, slug: data.slug } : o
      ));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title='Admin' subtitle={tab === 'organizers' ? 'Manage organizers' : 'Manage venues'} backTo='/'>

      {/* Tab bar */}
      <div className='flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-8'>
        {(['organizers', 'venues'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize ${
              tab === t
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'venues' && <AdminVenuesPanel />}

      {tab === 'organizers' && <>

        {/* Promote user to organizer */}
        <div className='bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8'>
          <h2 className='text-white font-semibold mb-1'>Promote user to organizer</h2>
          <p className='text-xs text-gray-500 mb-4'>The user must have signed in with Google at least once to have an account.</p>

          <form onSubmit={handleLookup} className='flex gap-2 mb-3'>
            <input
              type='email'
              value={lookupEmail}
              onChange={e => { setLookupEmail(e.target.value); setLookupResult(null); setLookupError(null); setShowPromoteSlug(false); setPromoteSuccess(null); }}
              placeholder='User email address'
              className={inputClass + ' flex-1'}
            />
            <button
              type='submit'
              disabled={!lookupEmail.trim() || lookupLoading}
              className='bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-xl transition-colors text-sm cursor-pointer shrink-0'
            >
              {lookupLoading ? 'Finding…' : 'Find'}
            </button>
          </form>

          {lookupError && <p className='text-red-400 text-sm mb-3'>{lookupError}</p>}
          {promoteSuccess && <p className='text-green-400 text-sm mb-3'>{promoteSuccess}</p>}

          {lookupResult && !showPromoteSlug && (
            <div className='flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3'>
              <div>
                <p className='text-white text-sm font-medium'>{lookupResult.name}</p>
                <p className='text-gray-500 text-xs'>{lookupResult.email}</p>
              </div>
              <button
                onClick={handlePromoteClick}
                className='text-xs font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-3'
              >
                Promote
              </button>
            </div>
          )}

          {showPromoteSlug && lookupResult && (
            <form onSubmit={handlePromoteConfirm} className='flex flex-col gap-3'>
              <div>
                <input
                  value={promoteSlug}
                  onChange={e => setPromoteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder='URL slug (e.g. my-collective)'
                  autoFocus
                  className={inputClass}
                />
                <p className='text-xs text-gray-600 mt-1 pl-1'>
                  /{promoteSlug || 'slug'} · lowercase letters, digits, hyphens · 3–40 chars
                </p>
              </div>
              {promoteError && <p className='text-red-400 text-sm'>{promoteError}</p>}
              <div className='flex gap-2'>
                <button
                  type='submit'
                  disabled={!promoteSlug.trim() || promoting}
                  className='flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer'
                >
                  {promoting ? 'Promoting…' : 'Confirm promotion'}
                </button>
                <button
                  type='button'
                  onClick={() => { setShowPromoteSlug(false); setPromoteError(null); }}
                  className='flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer'
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Organizer list */}
        <h2 className='text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4'>
          All organizers
        </h2>
        {organizers.length === 0 ? (
          <p className='text-gray-600 text-sm text-center py-8'>No organizers yet</p>
        ) : (
          <ul className='flex flex-col gap-3'>
            {organizers.map(org => (
              <li key={org.id}>
                {editingId === org.id ? (
                  /* Edit form */
                  <div className='bg-gray-900 border border-accent/40 rounded-xl px-5 py-4'>
                    <div className='flex flex-col gap-3'>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder='Display name'
                        className={inputClass}
                      />
                      <div>
                        <input
                          value={editSlug}
                          onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder='URL slug'
                          className={inputClass}
                        />
                        <p className='text-xs text-gray-600 mt-1 pl-1'>/{editSlug || 'slug'}</p>
                      </div>
                      <input
                        type='email'
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        placeholder='New email (leave blank to keep current)'
                        className={inputClass}
                      />
                      <input
                        type='password'
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder='New password (leave blank to keep current)'
                        className={inputClass}
                      />
                      {editError && <p className='text-red-400 text-sm'>{editError}</p>}
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleSave(org)}
                          disabled={saving || !editName.trim() || !editSlug.trim()}
                          className='flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer'
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className='flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer'
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Organizer card */
                  <div className='flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-4'>
                    <button
                      onClick={() => navigate(`/${org.slug}`)}
                      className='flex-1 text-left'
                    >
                      <p className='text-white font-medium'>{org.name}</p>
                      <p className='text-gray-500 text-xs mt-0.5'>/{org.slug}</p>
                    </button>
                    <div className='flex items-center gap-2 shrink-0 ml-3'>
                      {org.activeEventCount > 0 && (
                        <span className='text-xs font-medium bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full'>
                          {org.activeEventCount} {org.activeEventCount === 1 ? 'event' : 'events'}
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(org)}
                        className='text-xs text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer'
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </>}

    </Layout>
  );
}
