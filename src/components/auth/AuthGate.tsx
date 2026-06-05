import { useState, useEffect, useRef } from 'react';
import { loginToIntranet, getStoredSession, pingSession, type ZymoUser } from '../../services/authService';

export interface AuthSession {
  user: ZymoUser;
  intranetUrl: string;
}

interface Props {
  onAuthenticated: (session: AuthSession) => void;
}

type Phase = 'checking' | 'login';

export function AuthGate({ onAuthenticated }: Props) {
  const [phase,       setPhase]       = useState<Phase>('checking');
  const [url,         setUrl]         = useState('https://zymointranet.com');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [rememberMe,  setRememberMe]  = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [shake,       setShake]       = useState(false);
  const [showUrl,     setShowUrl]     = useState(false);
  const [exiting,     setExiting]     = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // ── Silent session check on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = await getStoredSession();
      if (stored.loggedIn) {
        const ping = await pingSession();
        if (ping.loggedIn && ping.user) {
          fireSuccess(ping.user, stored.intranetUrl);
          return;
        }
      }
      setPhase('login');
      setTimeout(() => emailRef.current?.focus(), 150);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fireSuccess(user: ZymoUser, intranetUrl: string) {
    setExiting(true);
    setTimeout(() => onAuthenticated({ user, intranetUrl }), 550);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await loginToIntranet(url.replace(/\/$/, ''), email.trim(), password, rememberMe);
      if (res.ok && res.user) {
        fireSuccess(res.user, url.replace(/\/$/, ''));
      } else {
        setError(res.error ?? 'Credenciales incorrectas');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Checking phase — invisible ─────────────────────────────────
  if (phase === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#06060d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.3 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4a8fff',
            animation: 'ag-pulse-ring 1.2s ease-out infinite',
          }} />
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11, color: '#4a8fff', letterSpacing: 3 }}>
            VERIFICANDO
          </span>
        </div>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────
  const cardAnim = exiting
    ? 'ag-exit 0.55s cubic-bezier(0.4,0,0.2,1) forwards'
    : 'ag-enter 0.5s cubic-bezier(0.16,1,0.3,1) forwards';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#06060d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: 'Consolas, "Courier New", monospace',
    }}>

      {/* Dot grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #1a2a4a 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        opacity: 0.35,
      }} />

      {/* Center radial glow */}
      <div style={{
        position: 'absolute',
        width: '70vw', height: '70vh',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(30,80,200,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 380,
        margin: '0 16px',
        animation: cardAnim,
        animationFillMode: 'both',
        ...(shake ? { animation: 'ag-shake 0.55s ease' } : {}),
      }}>

        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52,
            border: '2px solid #2a4a9f',
            background: 'linear-gradient(135deg, #0d1a35 0%, #091224 100%)',
            marginBottom: 14,
            position: 'relative',
          }}>
            <span style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 26, fontWeight: 700,
              color: '#4a8fff',
              letterSpacing: -1,
              lineHeight: 1,
            }}>N</span>
            {/* Corner accents */}
            <div style={{ position: 'absolute', top: -2, left: -2, width: 8, height: 8, borderTop: '2px solid #4a8fff', borderLeft: '2px solid #4a8fff' }} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderBottom: '2px solid #4a8fff', borderRight: '2px solid #4a8fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf2', letterSpacing: 4, marginBottom: 3 }}>
              NETVAULT
            </div>
            <div style={{ fontSize: 10, color: '#3d5080', letterSpacing: 2 }}>
              POWERED BY ZYMO INTRANET
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background: '#0a0c14',
          border: '1px solid #1a2540',
          padding: '28px 28px 24px',
          boxShadow: '0 0 40px rgba(30,60,180,0.08), 0 20px 60px rgba(0,0,0,0.6)',
        }}>

          {/* URL selector */}
          <div style={{ marginBottom: 22 }}>
            <div
              onClick={() => setShowUrl(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#0d1020',
                border: '1px solid #1a2540',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 10, color: '#3d5890', letterSpacing: 1 }}>SERVIDOR</span>
              <span style={{ fontSize: 11, color: '#5a7ac0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url.replace(/^https?:\/\//, '')}
              </span>
              <span style={{ fontSize: 9, color: '#2d3d60' }}>{showUrl ? '▲' : '▼'}</span>
            </div>
            {showUrl && (
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 10px',
                  background: '#070910',
                  border: '1px solid #1e2d50',
                  borderTop: 'none',
                  color: '#8aacf0',
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: 'Consolas, monospace',
                }}
              />
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 9, color: '#3d5280', letterSpacing: 2, marginBottom: 6 }}>
                CORREO
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="usuario@zymo.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px',
                  background: '#070910',
                  border: '1px solid #1a2540',
                  borderBottom: '1px solid #2a4090',
                  color: '#c8d4f0',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Consolas, monospace',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#4a8fff'; e.target.style.borderBottomColor = '#4a8fff'; }}
                onBlur={e => { e.target.style.borderColor = '#1a2540'; e.target.style.borderBottomColor = '#2a4090'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 9, color: '#3d5280', letterSpacing: 2, marginBottom: 6 }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px',
                  background: '#070910',
                  border: '1px solid #1a2540',
                  borderBottom: '1px solid #2a4090',
                  color: '#c8d4f0',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Consolas, monospace',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#4a8fff'; e.target.style.borderBottomColor = '#4a8fff'; }}
                onBlur={e => { e.target.style.borderColor = '#1a2540'; e.target.style.borderBottomColor = '#2a4090'; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(200,40,40,0.08)',
                border: '1px solid rgba(200,40,40,0.25)',
                color: '#f06060',
                fontSize: 11,
                letterSpacing: 0.5,
              }}>
                {error}
              </div>
            )}

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => setRememberMe(v => !v)}
                style={{
                  width: 36, height: 20,
                  background: rememberMe ? '#1a4adf' : '#0d1020',
                  border: `1px solid ${rememberMe ? '#3a6aff' : '#2a3550'}`,
                  borderRadius: 10,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 2, left: rememberMe ? 18 : 2,
                  width: 14, height: 14,
                  background: rememberMe ? '#8ab8ff' : '#3d5070',
                  borderRadius: '50%',
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
              <span
                onClick={() => setRememberMe(v => !v)}
                style={{ fontSize: 11, color: '#4a6090', cursor: 'pointer', letterSpacing: 1, userSelect: 'none' }}
              >
                RECORDARME
              </span>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              style={{
                width: '100%',
                padding: '13px',
                marginTop: 4,
                background: loading ? '#0f2050' : '#1840c0',
                border: '1px solid #2a5aff',
                color: loading ? '#3a5a90' : '#c8d8ff',
                fontSize: 12,
                fontFamily: 'Consolas, monospace',
                letterSpacing: 3,
                cursor: loading ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#2050e0'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#1840c0'; }}
            >
              {/* Shimmer on hover */}
              {!loading && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                  animation: 'ag-shimmer 2.2s ease-in-out infinite',
                }} />
              )}

              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-block', width: 12, height: 12,
                    border: '2px solid #2a4a80',
                    borderTopColor: '#4a8fff',
                    borderRadius: '50%',
                    animation: 'ag-spin 0.7s linear infinite',
                  }} />
                  VERIFICANDO
                </span>
              ) : (
                'INGRESAR →'
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 4px',
        }}>
          <span style={{ fontSize: 9, color: '#1d2a40', letterSpacing: 2 }}>
            NETVAULT v1.0
          </span>
          <span style={{ fontSize: 9, color: '#1d2a40', letterSpacing: 1 }}>
            © ZYMO · {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
}
