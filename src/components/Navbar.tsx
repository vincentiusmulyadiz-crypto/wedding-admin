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
  Menu,
  X,
  Check,
} from 'lucide-react';

export type TabType = 'overview' | 'guests' | 'links' | 'customers';

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
}) => {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Ringkasan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'guests', label: 'Konfirmasi RSVP', icon: <Users className="w-4 h-4" /> },
    { id: 'links', label: 'Tamu & WhatsApp', icon: <MessageCircle className="w-4 h-4 text-emerald-600" /> },
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
    <header className="sticky top-0 z-40 bg-[#faf6ee]/95 backdrop-blur-md border-b border-[#e5dcce] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Customer Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="joyever"
                className="h-9 w-9 rounded-xl object-cover border border-[#d8cdb8] shadow-xs shrink-0"
              />
              <div className="hidden sm:block">
                <span className="font-bold text-lg tracking-tight text-[#0f3b47] block leading-none">
                  joyever
                </span>
                <span className="text-[10px] text-[#5d7c86] tracking-wider uppercase mt-0.5 block">
                  Admin Dashboard
                </span>
              </div>
            </div>

            {/* Customer Switcher */}
            {customers.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  disabled={customers.length <= 1}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    customers.length > 1
                      ? 'bg-[#f0ebd9] hover:bg-[#e8e1cd] border-[#d8cdb8] text-[#0f3b47] cursor-pointer shadow-xs'
                      : 'bg-[#f4efe0] border-[#ded4be] text-[#345863] cursor-default'
                  }`}
                  aria-expanded={switcherOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate max-w-[130px] sm:max-w-[190px]">
                    {selectedCustomer ? selectedCustomer.couple_names : 'Pilih Undangan'}
                  </span>
                  {customers.length > 1 && (
                    <ChevronDown className={`w-3.5 h-3.5 text-[#5d7c86] transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Dropdown Menu */}
                {switcherOpen && customers.length > 1 && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setSwitcherOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-[#fffdfa] border border-[#d8cdb8] rounded-xl shadow-xl py-1 z-30 max-h-72 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-[#66848e] uppercase tracking-wider border-b border-[#eee6d5]">
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
                              isSelected ? 'bg-[#ebe3cf] text-[#0f3b47] font-bold' : 'text-[#2b4c56]'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate text-[#0f3b47] font-medium">{c.couple_names}</p>
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

          {/* Desktop Tab Navigation (Dominant Cream Palette with Deep Teal Active) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#ede5d3] p-1 rounded-xl border border-[#ded3bd]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#0f3b47] text-[#fffef8] shadow-sm'
                      : 'text-[#355863] hover:text-[#0f3b47] hover:bg-[#e3d9c4]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Controls */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenConfig}
              title="Pengaturan Supabase"
              className="p-2 rounded-xl text-[#5d7c86] hover:text-[#0f3b47] hover:bg-[#eee6d5] border border-transparent hover:border-[#ded3bd] transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {userEmail && (
              <span className="text-xs text-[#52717b] font-mono max-w-[150px] truncate" title={userEmail}>
                {userEmail}
              </span>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-800 bg-rose-100/80 hover:bg-rose-200 border border-rose-300 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-[#ede5d3] border border-[#d8cdb8] text-[#0f3b47]"
              aria-label="Buka menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e2d8c3] bg-[#f5eedf] px-4 pt-3 pb-4 space-y-3">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#0f3b47] text-[#fffef8]'
                      : 'text-[#355863] hover:bg-[#e7decb] hover:text-[#0f3b47]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#e0d6c0] flex items-center justify-between">
            <div className="text-xs text-[#52717b] font-mono truncate max-w-[180px]">
              {userEmail}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenConfig();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-[#5d7c86] hover:bg-[#e7decb]"
                title="Pengaturan Supabase"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-800 bg-rose-100/90 hover:bg-rose-200 border border-rose-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
