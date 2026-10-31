import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { translateAuthError } from '../lib/format';
import logo from '../assets/logo.png';
import { Lock, Mail, Loader2 } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
  onDemoLogin?: () => void;
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0E435A] text-[#0d2e37] selection:bg-[#DFD0B8]/30 selection:text-white">
      <div className="w-full max-w-md space-y-5">
        {/* Title Header above login box */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl tracking-wide text-[#FAF6EC] font-bold italic font-['Lora',serif]">
            RSVP Dashboard
          </h1>
        </div>

        {/* Login Form Card */}
        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/25">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#88a5ad] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E435A] focus:border-[#0E435A] transition"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#88a5ad] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E435A] focus:border-[#0E435A] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-[#DFD0B8] bg-[#0E435A] hover:bg-[#144d66] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#DFD0B8]" />
                  <span>Memeriksa kredensial...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard</span>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#ede5d4] text-center">
            <p className="text-xs text-[#52717b] leading-relaxed">
              Akses khusus pengantin dan administrator yang telah terdaftar.
            </p>
          </div>
        </div>

        {/* Joyever Logo positioned below the login box */}
        <div className="text-center pt-2">
          <img
            src="/logo-joyever-clean.png"
            alt="Joyever Logo"
            className="h-10 sm:h-12 w-auto mx-auto object-contain transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = logo;
            }}
          />
        </div>
      </div>
    </div>
  );
};
