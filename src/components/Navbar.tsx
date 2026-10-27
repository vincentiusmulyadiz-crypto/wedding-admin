import React, { useState } from 'react';
import type { Customer } from '../types/database';
import logo from '../assets/logo.png';
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Users,
  MessageCircle,
  Shield,
  Settings,
  Check,
  BookOpen,
  Armchair,
} from 'lucide-react';

export type TabType = 'overview' | 'guests' | 'links' | 'tables' | 'tutorial' | 'customers';

interface NavbarProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  isAdmin: boolean;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  userEmail: string | null;
  onLogout: () => void;
  onOpenConfig: () => void;
  hasQrCheckin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  isAdmin,
  activeTab,
  onSelectTab,
  userEmail,
  onLogout,
  onOpenConfig,
  hasQrCheckin = true,
}) => {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Tab definitions dengan istilah bahasa awam
  const tabs: { id: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Ringkasan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'guests', label: 'Daftar Tamu', icon: <Users className="w-4 h-4" /> },
    { id: 'links', label: 'Tautan Tamu', icon: <MessageCircle className="w-4 h-4 text-emerald-600" /> },
    ...(hasQrCheckin
      ? [
          {
            id: 'tables' as TabType,
            label: 'Manajemen Meja',
            icon: <Armchair className="w-4 h-4 text-amber-500" />,
          },
        ]
      : []),
    { id: 'tutorial', label: 'Tutorial', icon: <BookOpen className="w-4 h-4 text-teal-700" /> },
    ...(isAdmin
      ? [
          {
            id: 'customers' as TabType,
            label: 'Kelola Undangan',
            icon: <Shield className="w-4 h-4 text-amber-600" />,
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* 1. Header Sticky Atas (Desktop & Mobile Top Bar) - Gaya Persis joyever.id */}
      <header className="sticky top-0 z-40 bg-[#0E435A] border-b border-[#154B64] text-[#FAF6EC] shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand & Customer Switcher */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-joyever-clean.png"
                  alt="Joyever Logo"
                  className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 hover:scale-105 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = logo;
                  }}
                />
              </div>

              {/* Customer Switcher */}
              {customers.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen(!switcherOpen)}
                    disabled={customers.length <= 1}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      customers.length > 1
                        ? 'bg-[#144d66] hover:bg-[#1a5b78] border-[#1d6382] text-[#FAF6EC] cursor-pointer shadow-xs'
                        : 'bg-[#10475f] border-[#16516d] text-[#c2dbe4] cursor-default'
                    }`}
                    aria-expanded={switcherOpen}
                  >
                    <span className="truncate max-w-[110px] sm:max-w-[190px]">
                      {selectedCustomer ? selectedCustomer.couple_names : 'Pilih Undangan'}
                    </span>
                    {customers.length > 1 && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#DFD0B8] transition-transform ${
                          switcherOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {switcherOpen && customers.length > 1 && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setSwitcherOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-64 bg-[#fffdfa] border border-[#ded4be] rounded-2xl shadow-xl py-1 z-30 max-h-72 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-[#66848e] uppercase tracking-wider border-b border-[#eee6d5]">
                          Pilih Undangan ({customers.length})
                        </div>
                        {customers.map((c) => {
                          const isSelected = selectedCustomer?.id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onSelectCustomer(c);
                                setSwitcherOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#f3eedf] transition ${
                                isSelected ? 'bg-[#ebe3cf] text-[#0e2c34] font-bold' : 'text-[#2b4c56]'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="truncate text-[#0e2c34] font-medium">{c.couple_names}</p>
                                <p className="text-[10px] text-[#6d8b94] font-mono">/{c.slug}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#0f3b47] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Tab Navigation (Sidebar / Tab Atas di Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5 bg-[#093548] p-1 rounded-xl border border-[#164a63]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#DFD0B8] text-[#0E435A] font-bold shadow-xs'
                        : 'text-[#a1cbda] hover:text-[#FAF6EC] hover:bg-[#11475e]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Controls (Desktop & Mobile Header Actions) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onOpenConfig}
                title="Pengaturan Database Supabase"
                className="p-2 rounded-xl text-[#DFD0B8] hover:text-white hover:bg-[#16516b] border border-transparent hover:border-[#206383] transition"
              >
                <Settings className="w-4 h-4" />
              </button>

              {userEmail && (
                <span
                  className="hidden lg:inline-block text-xs text-[#DFD0B8]/80 font-mono max-w-[140px] truncate"
                  title={userEmail}
                >
                  {userEmail}
                </span>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition"
                title="Keluar dari akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Tab Bawah di Mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0E435A]/95 backdrop-blur-md border-t border-[#154B64] shadow-lg flex items-center justify-around py-1.5 px-2 safe-area-pb text-[#FAF6EC]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition ${
                isActive
                  ? 'text-[#DFD0B8] font-bold bg-[#16516b]'
                  : 'text-[#9cc4d3] hover:text-[#FAF6EC]'
              }`}
            >
              <div className="p-0.5">{tab.icon}</div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[75px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
