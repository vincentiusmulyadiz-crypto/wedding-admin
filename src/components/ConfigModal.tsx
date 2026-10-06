import React, { useState } from 'react';
import { getStoredConfig, saveStoredConfig, resetStoredConfig, cleanSupabaseUrl, cleanSupabaseKey } from '../lib/supabase';
import { Settings, ShieldAlert, Check, RefreshCw } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSaved }) => {
  const current = getStoredConfig();
  const [url, setUrl] = useState(current.isPlaceholder ? '' : current.url);
  const [key, setKey] = useState(current.isPlaceholder ? '' : current.key);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = cleanSupabaseUrl(url);
    const cleanKey = cleanSupabaseKey(key);

    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      setError('URL Supabase tidak valid. Gunakan format "https://[proyek-id].supabase.co" (bukan URL browser dashboard).');
      return;
    }

    if (!cleanKey || cleanKey.length < 20) {
      setError('Publishable/Anon Key tidak valid atau terlalu pendek.');
      return;
    }

    saveStoredConfig(cleanUrl, cleanKey);
    onSaved();
    onClose();
  };

  const handleReset = () => {
    if (confirm('Kembalikan konfigurasi ke nilai default .env?')) {
      resetStoredConfig();
      const updated = getStoredConfig();
      setUrl(updated.isPlaceholder ? '' : updated.url);
      setKey(updated.isPlaceholder ? '' : updated.key);
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#f0ebd9] border border-[#d8cdb8] text-[#0f3b47]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f3b47]">Konfigurasi Supabase</h2>
              <p className="text-xs text-[#5e7d87]">Atur kredensial publik proyek Supabase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6d8a93] hover:text-[#0f3b47] text-sm font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex gap-3 text-amber-900 text-xs leading-relaxed">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
          <p>
            <strong>Penting:</strong> Gunakan <strong>Publishable (Anon) Key</strong> publik. Jangan pernah memasukkan Service Role Key demi keamanan data aplikasi!
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="text"
              required
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
              Supabase Publishable / Anon Key
            </label>
            <textarea
              required
              rows={3}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[#5e7d87] hover:text-[#0f3b47] flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset ke default .env
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#3d5e68] hover:text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Check className="w-4 h-4 text-[#d1ebf0]" />
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
