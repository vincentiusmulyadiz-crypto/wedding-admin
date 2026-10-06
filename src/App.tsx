import { useEffect, useState, useCallback } from 'react';
import type { Customer } from './types/database';
import { getSupabase } from './lib/supabase';
import { Navbar, type TabType } from './components/Navbar';
import { Login } from './components/Login';
import { OverviewTab } from './components/OverviewTab';
import { GuestsTab } from './components/GuestsTab';
import { GuestLinksTab } from './components/GuestLinksTab';
import { CustomerAdminTab } from './components/CustomerAdminTab';
import { ConfigModal } from './components/ConfigModal';
import { Loader2, Sparkles, FolderX, Copy, Check, AlertTriangle, RotateCw } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [copiedUid, setCopiedUid] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const checkSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (err) {
      console.error('Session error:', err);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) {
        setCustomers([]);
        setSelectedCustomer(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const [customersError, setCustomersError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!session?.user) return;
    setCustomersLoading(true);
    setCustomersError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('couple_names', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error.message);
        setCustomersError(error.message);
        return;
      }

      const list: Customer[] = (data as Customer[]) || [];
      setCustomers(list);

      if (list.length > 0) {
        setSelectedCustomer((prev) => {
          if (prev && list.some((c) => c.id === prev.id)) {
            return list.find((c) => c.id === prev.id) || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedCustomer(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pelanggan';
      setCustomersError(msg);
      console.error('Error fetching customers:', err);
    } finally {
      setCustomersLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      checkAdminStatus(session.user.id);
      fetchCustomers();
    }
  }, [session, checkAdminStatus, fetchCustomers]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setSession(null);
      setCustomers([]);
      setSelectedCustomer(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // 1. Initial loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9f6ee] flex flex-col items-center justify-center p-4 text-[#5e7d87] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f3b47]" />
        <p className="text-xs font-bold text-[#0f3b47]">Memuat sesi dashboard joyever...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Login screen
  if (!session) {
    return (
      <>
        <Login
          onSuccess={checkSession}
          onOpenConfig={() => setConfigOpen(true)}
        />
        <ConfigModal
          isOpen={configOpen}
          onClose={() => setConfigOpen(false)}
          onSaved={() => {
            checkSession();
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f6ee] text-[#0d2e37] flex flex-col selection:bg-[#cfe6ec] selection:text-[#0b2931]">
      {/* Top Navigation */}
      <Navbar
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        isAdmin={isAdmin}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userEmail={session.user.email || null}
        onLogout={handleLogout}
        onOpenConfig={() => setConfigOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {customersLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#5e7d87] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f3b47]" />
            <p className="text-xs font-semibold">Memuat data undangan...</p>
          </div>
        ) : customers.length === 0 ? (
          /* Empty state with diagnostics */
          <div className="max-w-xl mx-auto my-10 bg-[#fffdf9] border border-[#e3dac8] rounded-3xl p-6 sm:p-8 space-y-5 shadow-md">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#f0ebd9] border border-[#d8cdb8] text-[#0f3b47] flex items-center justify-center mx-auto">
                <FolderX className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-[#0f3b47]">
                Belum ada undangan untuk akun ini
              </h2>
              <p className="text-xs text-[#5e7d87] max-w-md mx-auto leading-relaxed">
                Akun <span className="text-[#0f3b47] font-mono font-bold">{session.user.email}</span> belum terhubung ke data undangan di tabel <code className="text-[#0f3b47] font-bold">customers</code>.
              </p>
            </div>

            {/* Error Banner jika ada kegagalan query Supabase */}
            {customersError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-900">Pesan Error Database Supabase:</p>
                  <p className="font-mono text-[11px]">{customersError}</p>
                  <p className="text-rose-700">Pastikan tabel <code>customers</code> sudah dibuat di Supabase.</p>
                </div>
              </div>
            )}

            {/* Kotak Informasi Akun & UID */}
            <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#d8cdb8] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5e7d87] font-bold">UID Akun Anda:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(session.user.id);
                    setCopiedUid(true);
                    setTimeout(() => setCopiedUid(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                    copiedUid
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-[#f0ebd9] border-[#d8cdb8] text-[#0f3b47] hover:bg-[#e6deca]'
                  }`}
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUid ? 'Tersalin!' : 'Salin UID'}</span>
                </button>
              </div>
              <p className="font-mono text-[#0f3b47] font-bold text-[11px] break-all bg-[#fffdfa] p-2.5 rounded-xl border border-[#ded4be]">
                {session.user.id}
              </p>
            </div>

            {/* Petunjuk SQL Cepat */}
            <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#d8cdb8] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f3b47]">Solusi Cepat via SQL Editor Supabase:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sql = `INSERT INTO public.admins (user_id) VALUES ('${session.user.id}') ON CONFLICT (user_id) DO NOTHING;\nINSERT INTO public.customers (slug, couple_names, event_date, owner_id) VALUES ('pernikahan-saya', 'Yana & Edo', '2026-10-24', '${session.user.id}') ON CONFLICT (slug) DO UPDATE SET owner_id = EXCLUDED.owner_id;`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    copiedSql ? 'text-emerald-700' : 'text-[#0f3b47] hover:underline'
                  }`}
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Tersalin!' : 'Salin Query SQL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#5e7d87] leading-relaxed">
                Jalankan query di bawah ini di <strong>SQL Editor Supabase</strong> untuk mendaftarkan akun ini sebagai admin dan pemilik undangan:
              </p>
              <pre className="font-mono text-[10px] text-[#0f3b47] bg-[#fffdfa] p-2.5 rounded-xl border border-[#ded4be] overflow-x-auto whitespace-pre-wrap font-semibold">
{`INSERT INTO public.admins (user_id) VALUES ('${session.user.id}') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.customers (slug, couple_names, event_date, owner_id) 
VALUES ('pernikahan-saya', 'Yana & Edo', '2026-10-24', '${session.user.id}')
ON CONFLICT (slug) DO UPDATE SET owner_id = EXCLUDED.owner_id;`}
              </pre>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  checkAdminStatus(session.user.id);
                  fetchCustomers();
                }}
                disabled={customersLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] shadow-xs transition"
              >
                <RotateCw className={`w-3.5 h-3.5 ${customersLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan / Cek Ulang Sekarang</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Buka Tab Kelola Undangan (Admin)</span>
                </button>
              )}
            </div>
          </div>
        ) : !selectedCustomer ? (
          <div className="text-center py-20 text-[#5e7d87] text-xs">
            Silakan pilih undangan melalui menu atas.
          </div>
        ) : (
          /* Render Active Tab */
          <div>
            {activeTab === 'overview' && (
              <OverviewTab customer={selectedCustomer} />
            )}

            {activeTab === 'guests' && (
              <GuestsTab customer={selectedCustomer} />
            )}

            {activeTab === 'links' && (
              <GuestLinksTab customer={selectedCustomer} />
            )}

            {activeTab === 'customers' && isAdmin && (
              <CustomerAdminTab
                customers={customers}
                onRefreshCustomers={fetchCustomers}
                currentUserId={session.user.id}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e3dac8] py-6 text-center text-xs text-[#6e8b94] bg-[#f5eedf]">
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-sm text-[#0f3b47]">joyever</span>
          <span>•</span>
          <span>Panel Kontrol Tamu & Undangan Digital</span>
        </div>
      </footer>

      {/* Supabase Configuration Modal (Only for Admin) */}
      {isAdmin && (
        <ConfigModal
          isOpen={configOpen}
          onClose={() => setConfigOpen(false)}
          onSaved={() => {
            checkSession();
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

export default App;
