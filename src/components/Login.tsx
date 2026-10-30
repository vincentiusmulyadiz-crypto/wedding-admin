import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { translateAuthError } from '../lib/format';
import logo from '../assets/logo.png';
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
  onDemoLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onDemoLogin }) => {
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
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-block">
            <img
              src="/logo-joyever-clean.png"
              alt="Joyever Logo"
              className="h-11 sm:h-13 w-auto mx-auto object-contain transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = logo;
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-wide text-[#FAF6EC] font-bold italic font-['Lora',serif]">
              RSVP Dashboard
            </h1>
          </div>
        </div>

        {/* Form Card */}
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
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-[#DFD0B8] bg-[#0E435A] hover:bg-[#144d66] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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

          {/* Demo Account Button */}
          <div className="mt-5 pt-4 border-t border-[#ede5d4]">
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-[#0E435A] bg-[#f0ebd9] hover:bg-[#e7dec8] border border-[#d8cdb8] active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Masuk sebagai Akun Demo (Romeo & Juliet)</span>
            </button>
            <p className="text-[10.5px] text-[#6e8a93] text-center mt-1.5">
              Coba fitur dashboard langsung tanpa akun Supabase
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#ede5d4] text-center">
            <p className="text-xs text-[#6e8a93]">
              Akses khusus pengantin dan administrator. Pendaftaran akun baru tidak disediakan di aplikasi ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
