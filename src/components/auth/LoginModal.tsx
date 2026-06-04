import { useState, useRef } from 'react';
import { Wifi, WifiOff, Loader2, Eye, EyeOff, Server, Lock, Mail, LogIn } from 'lucide-react';
import { loginToIntranet, pingSession, type ZymoUser } from '../../services/authService';

interface Props {
  onLoginSuccess: (user: ZymoUser, intranetUrl: string) => void;
  onDismiss?: () => void;
}

export function LoginModal({ onLoginSuccess, onDismiss }: Props) {
  const [url,      setUrl]      = useState('http://');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim() || !email.trim() || !password) {
      setError('Completa todos los campos'); return;
    }
    const baseUrl = url.replace(/\/$/, '');
    setLoading(true);
    try {
      const res = await loginToIntranet(baseUrl, email, password);
      if (!res.ok) { setError(res.error ?? 'Error al conectar'); return; }
      // verificar sesión guardada
      const session = await pingSession();
      if (session.loggedIn && session.user) {
        onLoginSuccess(session.user, baseUrl);
      } else {
        setError('Sesión inválida tras login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1e1e1e] border border-[#3e3e3e] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0d2337] px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Conectar a ZYMO</h2>
            <p className="text-blue-300/70 text-xs">Intranet · NetVault</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-auto text-[#888] hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* URL */}
          <div className="space-y-1">
            <label className="text-xs text-[#aaa] flex items-center gap-1">
              <Server className="w-3 h-3" /> URL del servidor
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={() => emailRef.current?.focus()}
              placeholder="http://192.168.1.100:8000"
              className="w-full bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm text-white
                         placeholder-[#555] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs text-[#aaa] flex items-center gap-1">
              <Mail className="w-3 h-3" /> Correo electrónico
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@zymo.com"
              autoComplete="username"
              className="w-full bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-3 py-2 text-sm text-white
                         placeholder-[#555] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs text-[#aaa] flex items-center gap-1">
              <Lock className="w-3 h-3" /> Contraseña
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#2a2a2a] border border-[#3e3e3e] rounded-lg px-3 py-2 pr-10 text-sm text-white
                           placeholder-[#555] focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#aaa] transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2">
              <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-xs">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2.5
                       text-white font-medium text-sm transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Conectando…</>
              : <><LogIn className="w-4 h-4" /> Conectar</>
            }
          </button>

          <p className="text-center text-[#555] text-xs">
            Sin conexión al servidor, la app funciona en modo local.
          </p>
        </form>
      </div>
    </div>
  );
}
