import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

interface Operator {
  id: string;
  name: string;
  slug: string;
  activeEventCount: number;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user !== null && user.role !== 'ADMIN') navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    fetch('/api/operators')
      .then(r => r.json())
      .then(data => setOperators(data.operators ?? []));
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    // Auto-fill slug from name until the user manually edits it
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setSlugEdited(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/register-operator', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      setSuccess(`Operator "${data.name}" created — /${data.slug}`);
      setOperators(prev => [...prev, { id: data.id, name: data.name, slug: data.slug, activeEventCount: 0 }]);
      setName(''); setSlug(''); setSlugEdited(false); setEmail(''); setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-base sm:text-sm';
  const canSubmit = name.trim() && slug.trim() && email.trim() && password.trim() && !submitting;

  return (
    <Layout title='Admin' subtitle='Manage operators' backTo='/'>

      {/* Create operator form */}
      <div className='bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8'>
        <h2 className='text-white font-semibold mb-4'>Create operator account</h2>
        <form onSubmit={handleCreate} className='flex flex-col gap-3'>
          <input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder='Display name'
            className={inputClass}
          />

          <div>
            <input
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder='URL slug'
              className={inputClass}
            />
            <p className='text-xs text-gray-600 mt-1 pl-1'>
              /{slug || 'slug'} · lowercase letters, digits, hyphens · 3–40 chars
            </p>
          </div>

          <input
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='Email'
            className={inputClass}
          />
          <input
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder='Password'
            className={inputClass}
          />

          <button
            type='submit'
            disabled={!canSubmit}
            className='w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer'
          >
            {submitting ? 'Creating…' : 'Create operator'}
          </button>

          {error && <p className='text-red-400 text-sm'>{error}</p>}
          {success && <p className='text-green-400 text-sm'>{success}</p>}
        </form>
      </div>

      {/* Operator list */}
      <h2 className='text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4'>
        All operators
      </h2>
      {operators.length === 0 ? (
        <p className='text-gray-600 text-sm text-center py-8'>No operators yet</p>
      ) : (
        <ul className='flex flex-col gap-3'>
          {operators.map(op => (
            <li key={op.id}>
              <button
                onClick={() => navigate(`/${op.slug}`)}
                className='w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors cursor-pointer text-left'
              >
                <div>
                  <p className='text-white font-medium'>{op.name}</p>
                  <p className='text-gray-500 text-xs mt-0.5'>/{op.slug}</p>
                </div>
                {op.activeEventCount > 0 && (
                  <span className='text-xs font-medium bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full shrink-0 ml-3'>
                    {op.activeEventCount} {op.activeEventCount === 1 ? 'event' : 'events'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

    </Layout>
  );
}
