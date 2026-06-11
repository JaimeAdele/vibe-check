import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
}

export default function SignInModal({ onClose }: Props) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const result = await login(email, password);
    if (result) {
      onClose();
      if (result.role === 'ORGANIZER' && result.slug) navigate(`/${result.slug}`);
      else if (result.role === 'ADMIN') navigate('/admin');
    } else {
      setError(true);
    }
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'
      onClick={onClose}
    >
      <div
        className='bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-white font-semibold text-lg'>
            {showAdminForm ? 'Admin sign in' : 'Sign in'}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-white transition-colors cursor-pointer'
            aria-label='Close'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
            </svg>
          </button>
        </div>

        {!showAdminForm ? (
          <div className='flex flex-col gap-3'>
            <a
              href='/api/auth/google'
              className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer'
            >
              <svg width='18' height='18' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'/>
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
              </svg>
              Sign in with Google
            </a>

            <div className='flex items-center gap-3 my-1'>
              <div className='flex-1 h-px bg-gray-800' />
              <span className='text-xs text-gray-600'>or</span>
              <div className='flex-1 h-px bg-gray-800' />
            </div>

            <button
              onClick={() => setShowAdminForm(true)}
              className='w-full text-gray-500 hover:text-gray-300 text-sm py-1 transition-colors cursor-pointer'
            >
              Sign in as admin
            </button>
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            <button
              onClick={() => { setShowAdminForm(false); setError(false); setEmail(''); setPassword(''); }}
              className='flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm transition-colors cursor-pointer w-fit -mt-1 mb-1'
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='15 18 9 12 15 6'/>
              </svg>
              Back
            </button>
            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='Email'
                autoFocus
                className='w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
              />
              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='Password'
                  className='w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(p => !p)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94'/>
                      <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19'/>
                      <line x1='1' y1='1' x2='23' y2='23'/>
                    </svg>
                  ) : (
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/>
                      <circle cx='12' cy='12' r='3'/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                type='submit'
                disabled={!email || !password}
                className='w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer'
              >
                Sign in
              </button>
              {error && (
                <p className='text-red-400 text-sm text-center'>Invalid email or password</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
