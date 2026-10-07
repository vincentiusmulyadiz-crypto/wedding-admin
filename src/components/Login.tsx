import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { translateAuthError } from '../lib/format';
import logo from '../assets/logo.png';
import { Lock, Mail, Loader2 } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(translateAuthError(error.message));
        return;
      }

      if (data.session) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk';
      setErrorMessage(translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9f6ee] text-[#0d2e37] selection:bg-[#cfe6ec] selection:text-[#0b2931]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-block p-1 rounded-2xl border border-[#d8cdb8] bg-[#ffffff] shadow-sm">
            <img
              src={logo}
              alt="joyever logo"
              className="w-16 h-16 rounded-xl object-cover"
            />
          </div>
          <div>
            <h1 className="font-bold text-3xl tracking-tight text-[#0f3b47]">
              joyever
            </h1>
            <p className="text-xs text-[#5d7c86] tracking-wider uppercase mt-0.5">
              Admin Undangan Pernikahan
            </p>
          </div>
        </div>

        <div className="bg-[#fffdf8] border border-[#e3dac8] rounded-3xl p-6 md:p-8 shadow-md">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed flex items-start gap-2.5">
              <span className="font-bold shrink-0">✕</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#75959f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@wedding.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#88a5ad] text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3b47] focus:border-[#0f3b47] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#75959f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#88a5ad] text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3b47] focus:border-[#0f3b47] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#d2ebf0]" />
                  <span>Memeriksa kredensial...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#ede5d4] text-center">
            <p className="text-xs text-[#6e8a93]">
              Akses khusus pengantin dan administrator. Pendaftaran akun baru tidak disediakan di aplikasi ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
