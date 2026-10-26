import React, { useState, useEffect, useMemo } from 'react';
import type { Customer } from '../types/database';
import {
  type WeddingTable,
  type TableShape,
  type GuestCategory,
  loadStoredTables,
  saveSharedConfigToCloud,
  loadSharedConfigFromCloud,
  formatSeatCode,
  getShapePrefix,
} from '../lib/tableSync';
import {
  type InvitedGuest,
  loadStoredGuests,
  saveGuestsForCustomer,
  saveGuestsToCloud,
  loadGuestsFromCloud,
} from './GuestLinksTab';
import { showToast } from '../lib/toast';
import {
  Armchair,
  Plus,
  Edit3,
  Trash2,
  Crown,
  Circle,
  Square,
  UserPlus,
  X,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface TableManagementTabProps {
  customer: Customer;
  userId?: string | null;
}

export const TableManagementTab: React.FC<TableManagementTabProps> = ({
  customer,
  userId,
}) => {
  const [tables, setTables] = useState<WeddingTable[]>(() => loadStoredTables(customer));
  const [guests, setGuests] = useState<InvitedGuest[]>(() =>
    loadStoredGuests(customer, userId || undefined)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSession, setFilterSession] = useState<string>('all');

  // Modal Tambah/Edit Meja
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<WeddingTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableShape, setTableShape] = useState<TableShape>('round');
  const [tableCapacity, setTableCapacity] = useState<number>(8);
  const [tableCategory, setTableCategory] = useState<GuestCategory>('Reguler');
  const [tableSession, setTableSession] = useState<
    WeddingTable['session']
  >('Semua Sesi');
  const [tableNotes, setTableNotes] = useState('');

  // Modal Assign Tamu ke Meja
  const [assigningTable, setAssigningTable] = useState<WeddingTable | null>(null);
  const [guestSearch, setGuestSearch] = useState('');

  useEffect(() => {
    let isCancelled = false;
    setTables(loadStoredTables(customer));
    setGuests(loadStoredGuests(customer, userId || undefined));

    const syncData = async () => {
      const shared = await loadSharedConfigFromCloud(customer);
      if (!isCancelled && shared.tables && shared.tables.length > 0) {
        setTables(shared.tables);
      }
      const cloudGuests = await loadGuestsFromCloud(customer);
      if (!isCancelled && cloudGuests && cloudGuests.length > 0) {
        setGuests(cloudGuests);
      }
    };
    syncData();
    return () => {
      isCancelled = true;
    };
  }, [customer.id, customer.slug, userId]);

  const persistTablesAndGuests = async (
    nextTables: WeddingTable[],
    nextGuests: InvitedGuest[]
  ) => {
    setTables(nextTables);
    setGuests(nextGuests);
    saveGuestsForCustomer(customer, nextGuests, userId || undefined);
    await saveSharedConfigToCloud(customer, nextTables);
    await saveGuestsToCloud(customer, nextGuests);
  };

  const getNextAvailableCode = (pfx: string, excludeId?: string) => {
    const existingCodes = new Set(
      tables
        .filter((t) => !excludeId || t.id !== excludeId)
        .map((t) => (t.code || t.name || '').toUpperCase())
    );
    let idx = 1;
    while (existingCodes.has(`${pfx}${idx}`)) {
      idx++;
    }
    return `${pfx}${idx}`;
  };

  const handleOpenAddTable = () => {
    setEditingTable(null);
    const pfx = getShapePrefix('round');
    const code = getNextAvailableCode(pfx);
    setTableName(code);
    setTableShape('round');
    setTableCapacity(8);
    setTableCategory('Reguler');
    setTableSession('Semua Sesi');
    setTableNotes('');
    setShowTableModal(true);
  };

  const handleOpenEditTable = (tbl: WeddingTable) => {
    setEditingTable(tbl);
    setTableName(tbl.code || tbl.name);
    setTableShape(tbl.shape);
    setTableCapacity(tbl.capacity);
    setTableCategory(tbl.category);
    setTableSession(tbl.session);
    setTableNotes(tbl.notes || '');
    setShowTableModal(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const pfx = getShapePrefix(tableShape);
    const autoCode = getNextAvailableCode(pfx, editingTable?.id);
    const code = tableName.trim() || autoCode;

    let nextTables: WeddingTable[];
    if (editingTable) {
      nextTables = tables.map((t) =>
        t.id === editingTable.id
          ? {
              ...t,
              code,
              name: code,
              shape: tableShape,
              capacity: tableCapacity,
              category: tableCategory,
              session: tableSession,
              notes: tableNotes.trim() || undefined,
            }
          : t
      );
      showToast(`Meja ${code} berhasil diperbarui!`, 'success');
    } else {
      const newTbl: WeddingTable = {
        id: `tbl-${code.toLowerCase()}-${Date.now()}`,
        code,
        name: code,
        shape: tableShape,
        capacity: tableCapacity,
        category: tableCategory,
        session: tableSession,
        notes: tableNotes.trim() || undefined,
      };
      nextTables = [...tables, newTbl];
      showToast(`Meja ${code} berhasil ditambahkan!`, 'success');
    }

    setShowTableModal(false);
    await persistTablesAndGuests(nextTables, guests);
  };

  const handleDeleteTable = async (tbl: WeddingTable) => {
    if (!window.confirm(`Hapus "${tbl.name}"? Tamu di meja ini akan dilepas dari meja.`)) return;
    const nextTables = tables.filter((t) => t.id !== tbl.id);
    const nextGuests = guests.map((g) =>
      g.table_id === tbl.id ? { ...g, table_id: undefined } : g
    );
    await persistTablesAndGuests(nextTables, nextGuests);
    showToast(`Meja "${tbl.name}" telah dihapus.`, 'info');
  };

  const handleAssignGuestToTable = async (guestId: string, tableId: string | undefined) => {
    const nextGuests = guests.map((g) =>
      g.id === guestId ? { ...g, table_id: tableId } : g
    );
    await persistTablesAndGuests(tables, nextGuests);
    showToast(tableId ? 'Tamu berhasil ditempatkan ke meja!' : 'Tamu dilepas dari meja.', 'success');
  };

  // Enrich tables with seated guests and seat numbers
  const enrichedTables = useMemo(() => {
    return tables
      .filter((t) => {
        const matchSearch =
          !searchQuery.trim() ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchSession = filterSession === 'all' || t.session === filterSession;
        return matchSearch && matchSession;
      })
      .map((tbl) => {
        const assignedGuests = guests.filter((g) => g.table_id === tbl.id);
        let currentSeat = 1;
        const seatedBreakdown = assignedGuests.map((g) => {
          const pax = g.max_guests && g.max_guests > 0 ? g.max_guests : 2;
          const startSeat = currentSeat;
          const endSeat = currentSeat + pax - 1;
          currentSeat += pax;
          const seatLabel =
            pax === 1 ? `Seat ${startSeat}` : `Seat ${startSeat}–${endSeat}`;
          return {
            ...g,
            pax,
            seatLabel,
          };
        });
        const filledSeats = currentSeat - 1;
        return {
          ...tbl,
          seatedBreakdown,
          filledSeats,
          availableSeats: Math.max(0, tbl.capacity - filledSeats),
        };
      });
  }, [tables, guests, searchQuery, filterSession]);

  const totalCapacity = useMemo(
    () => tables.reduce((acc, t) => acc + t.capacity, 0),
    [tables]
  );
  const totalFilled = useMemo(
    () =>
      guests
        .filter((g) => g.table_id && tables.some((t) => t.id === g.table_id))
        .reduce((acc, g) => acc + (g.max_guests && g.max_guests > 0 ? g.max_guests : 2), 0),
    [guests, tables]
  );
  const unassignedGuests = useMemo(
    () => guests.filter((g) => !g.table_id || !tables.some((t) => t.id === g.table_id)),
    [guests, tables]
  );

  // Helper visual kursi meja tipe A (Bundar), B (Persegi Panjang), C (Persegi Sama Sisi)
  const renderTableShapePreview = (
    tbl: WeddingTable,
    filledSeats: number
  ) => {
    const tableCode = tbl.code || tbl.name || 'A1';
    const capacity = tbl.capacity;
    const seats = Array.from({ length: capacity }, (_, i) => i < filledSeats);

    if (tbl.shape === 'round') {
      return (
        <div className="relative w-32 h-32 mx-auto my-2 flex items-center justify-center">
          {seats.map((isFilled, idx) => {
            const angle = (idx / capacity) * 2 * Math.PI - Math.PI / 2;
            const radius = 50;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <div
                key={idx}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                title={`${formatSeatCode(tableCode, idx + 1)}: ${isFilled ? 'Terisi' : 'Kosong'}`}
                className={`absolute w-5 h-5 rounded-full border text-[8px] font-bold flex items-center justify-center transition ${
                  isFilled
                    ? 'bg-[#0f3b47] text-[#DFD0B8] border-[#0f3b47] shadow-xs'
                    : 'bg-[#fffdfa] text-[#7c97a0] border-[#d5c8ad]'
                }`}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>
            );
          })}
          {/* Meja A (Bundar) Tengah: Menampilkan kode meja A1 */}
          <div className="w-16 h-16 rounded-full bg-[#f0ebd9] border-2 border-[#cdbe9f] flex flex-col items-center justify-center text-center shadow-inner">
            <span className="text-base font-black text-[#0f3b47] font-mono tracking-wider">{tableCode}</span>
          </div>
        </div>
      );
    }

    if (tbl.shape === 'rect') {
      const topHalf = Math.ceil(capacity / 2);
      const topSeats = seats.slice(0, topHalf);
      const bottomSeats = seats.slice(topHalf);

      return (
        <div className="w-full py-3 flex flex-col items-center justify-center gap-1.5 my-1">
          <div className="flex items-center justify-center gap-1.5">
            {topSeats.map((isFilled, idx) => (
              <div
                key={idx}
                className={`w-6 h-5 rounded-t-md border text-[8px] font-bold flex items-center justify-center ${
                  isFilled
                    ? 'bg-[#0f3b47] text-[#DFD0B8] border-[#0f3b47]'
                    : 'bg-[#fffdfa] text-[#7c97a0] border-[#d5c8ad]'
                }`}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>
            ))}
          </div>

          <div className="w-36 h-10 rounded-xl bg-[#f0ebd9] border-2 border-[#cdbe9f] flex items-center justify-center shadow-inner px-3">
            <span className="text-base font-black text-[#0f3b47] font-mono tracking-wider">{tableCode}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {bottomSeats.map((isFilled, idx) => (
              <div
                key={idx}
                className={`w-6 h-5 rounded-b-md border text-[8px] font-bold flex items-center justify-center ${
                  isFilled
                    ? 'bg-[#0f3b47] text-[#DFD0B8] border-[#0f3b47]'
                    : 'bg-[#fffdfa] text-[#7c97a0] border-[#d5c8ad]'
                }`}
              >
                {String(topHalf + idx + 1).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // tbl.shape === 'square' (Tipe C - Meja Persegi Sama Sisi)
    return (
      <div className="relative w-32 h-32 mx-auto my-2 flex items-center justify-center">
        {seats.map((isFilled, idx) => {
          const side = idx % 4;
          const offset = Math.floor(idx / 4);
          const baseDist = 48;
          const spread = offset === 0 ? 0 : (offset % 2 === 1 ? -16 : 16);
          let x = 0;
          let y = 0;
          if (side === 0) { x = spread; y = -baseDist; }
          else if (side === 1) { x = baseDist; y = spread; }
          else if (side === 2) { x = spread; y = baseDist; }
          else { x = -baseDist; y = spread; }

          return (
            <div
              key={idx}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              className={`absolute w-5 h-5 rounded-md border text-[8px] font-bold flex items-center justify-center ${
                isFilled
                  ? 'bg-[#0f3b47] text-[#DFD0B8] border-[#0f3b47]'
                  : 'bg-[#fffdfa] text-[#7c97a0] border-[#d5c8ad]'
              }`}
            >
              {String(idx + 1).padStart(2, '0')}
            </div>
          );
        })}
        <div className="w-16 h-16 rounded-xl bg-[#f0ebd9] border-2 border-[#cdbe9f] flex flex-col items-center justify-center text-center shadow-inner">
          <span className="text-base font-black text-[#0f3b47] font-mono tracking-wider">{tableCode}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0e2c34] flex items-center gap-2">
            <Armchair className="w-6 h-6 text-[#0f3b47]" />
            <span>Manajemen Meja (Table Management)</span>
          </h1>
          <p className="text-xs text-[#52717b] mt-1">
            Atur meja bundar atau persegi, kapasitas kursi, dan pemetaan posisi duduk tamu untuk sinkronisasi langsung ke aplikasi QR Check-In
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddTable}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Meja Baru</span>
        </button>
      </div>

      {/* Ringkasan Statistik Kursi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#5e7d87] block">Total Meja</span>
          <p className="text-2xl font-extrabold text-[#0e2c34] mt-1">{tables.length} Meja</p>
          <span className="text-[11px] text-[#6d8b94] mt-0.5 block">
            {tables.filter((t) => t.shape === 'round').length} Bundar •{' '}
            {tables.filter((t) => t.shape === 'rect').length} Persegi
          </span>
        </div>

        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#5e7d87] block">Kursi Terisi / Kapasitas</span>
          <p className="text-2xl font-extrabold text-teal-800 mt-1">
            {totalFilled} / {totalCapacity}
          </p>
          <div className="w-full h-1.5 bg-[#eee5d4] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#0f3b47] rounded-full transition-all"
              style={{
                width: `${totalCapacity > 0 ? Math.min(100, Math.round((totalFilled / totalCapacity) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#5e7d87] block">Sisa Kursi Kosong</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {Math.max(0, totalCapacity - totalFilled)} Kursi
          </p>
          <span className="text-[11px] text-[#6d8b94] mt-0.5 block">Tersedia untuk ditempati</span>
        </div>

        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#5e7d87] block">Tamu Belum Dapat Meja</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            {unassignedGuests.length} Undangan
          </p>
          <span className="text-[11px] text-[#6d8b94] mt-0.5 block">
            Klik "+ Tempatkan Tamu" di meja
          </span>
        </div>
      </div>

      {/* Filter & Pencarian Meja */}
      <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#73929c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama meja atau catatan lokasi..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#52717b] font-semibold">Sesi Acara:</span>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs font-semibold text-[#0e2c34]"
          >
            <option value="all">Semua Sesi</option>
            <option value="Semua Sesi">Semua Sesi</option>
            <option value="Akad / Pemberkatan">Akad / Pemberkatan</option>
            <option value="Resepsi">Resepsi</option>
          </select>
        </div>
      </div>

      {/* Grid Kartu Meja */}
      {enrichedTables.length === 0 ? (
        <div className="bg-[#fffdfa] border border-[#e3dac8] rounded-3xl p-12 text-center space-y-3">
          <Armchair className="w-10 h-10 text-[#85a1ab] mx-auto" />
          <h3 className="text-base font-bold text-[#0e2c34]">Belum ada meja yang dibuat</h3>
          <p className="text-xs text-[#52717b] max-w-md mx-auto">
            Tambahkan meja bundar atau meja persegi untuk mengatur tempat duduk keluarga, VVIP, VIP, dan tamu reguler.
          </p>
          <button
            type="button"
            onClick={handleOpenAddTable}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Meja Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enrichedTables.map((tbl) => {
            const isOverCapacity = tbl.filledSeats > tbl.capacity;
            const catClass =
              tbl.category === 'VVIP'
                ? 'bg-amber-950 text-amber-200 border-amber-700'
                : tbl.category === 'VIP'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-[#ebe3cf] text-[#0e2c34] border-[#d5c8ad]';

            return (
              <div
                key={tbl.id}
                className="bg-[#fffdfa] border border-[#e3dac8] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-[#cdbe9f] transition"
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e7d87]">
                          {tbl.session}
                        </span>
                        <span>•</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${catClass}`}
                        >
                          <Crown className="w-2.5 h-2.5" />
                          <span>{tbl.category}</span>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0e2c34] mt-1">{tbl.name}</h3>
                      {tbl.notes && (
                        <p className="text-[11px] text-[#5e7d87]">{tbl.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTable(tbl)}
                        className="p-1.5 rounded-lg bg-[#f0ebd9] hover:bg-[#e5dec8] text-[#0e2c34] border border-[#ded4be] transition"
                        title="Edit meja"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(tbl)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                        title="Hapus meja"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5e7d87] font-medium font-mono">
                        MEJA <strong className="text-[#0e2c34] font-black">{tbl.code || tbl.name}</strong>
                      </span>
                      <span
                        className={`font-bold ${
                          isOverCapacity ? 'text-rose-700' : 'text-[#0f3b47]'
                        }`}
                      >
                        {tbl.filledSeats}/{tbl.capacity} Kursi
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#eee5d4] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverCapacity ? 'bg-rose-600' : 'bg-[#0f3b47]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((tbl.filledSeats / tbl.capacity) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Visualisasi Denah Meja */}
                  <div className="bg-[#faf6ee] border border-[#eee5d4] rounded-2xl p-2">
                    {renderTableShapePreview(tbl, tbl.filledSeats)}
                  </div>

                  {/* Daftar Kursi & Tamu di Meja Ini */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0e2c34]">
                        Daftar Tamu di Meja ({tbl.seatedBreakdown.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningTable(tbl);
                          setGuestSearch('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f3b47] hover:underline"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Tempatkan Tamu</span>
                      </button>
                    </div>

                    {tbl.seatedBreakdown.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#faf6ee] border border-dashed border-[#d8cdb8] text-center text-[11px] text-[#6d8b94]">
                        Belum ada tamu yang ditempatkan di meja ini.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {tbl.seatedBreakdown.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#e3dac8] text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] font-bold text-[#0f3b47] bg-[#e6f0f2] px-1.5 py-0.5 rounded mr-1.5">
                                {item.seatLabel}
                              </span>
                              <span className="font-bold text-[#0e2c34] truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-[#5e7d87] ml-1">
                                ({item.pax} org)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAssignGuestToTable(item.id, undefined)}
                              className="text-rose-600 hover:text-rose-800 p-0.5 shrink-0"
                              title="Lepas tamu dari meja ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Meja */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0e2c34]">
                <Armchair className="w-5 h-5 text-[#0f3b47]" />
                <h3 className="text-base font-bold">
                  {editingTable ? 'Edit Konfigurasi Meja' : 'Tambah Meja Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="text-[#6d8a93] hover:text-[#0e2c34] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0e2c34] mb-1">
                  Nama / Nomor Meja <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Contoh: Table 1 (Keluarga Mempelai)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
              </div>

              {/* Pilihan Bentuk Meja: Tipe A / B / C */}
              <div>
                <label className="block font-bold text-[#0e2c34] mb-1.5">
                  Pilih Bentuk Meja
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTableShape('round');
                      if (!editingTable) setTableName(getNextAvailableCode('A'));
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      tableShape === 'round'
                        ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-sm'
                        : 'bg-[#faf6ee] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    <Circle className="w-5 h-5 text-[#DFD0B8]" />
                    <span className="font-black font-mono text-xs">TIPE A</span>
                    <span className="text-[9px] opacity-80">Meja Bundar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTableShape('rect');
                      if (!editingTable) setTableName(getNextAvailableCode('B'));
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      tableShape === 'rect'
                        ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-sm'
                        : 'bg-[#faf6ee] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    <Square className="w-5 h-5 text-[#DFD0B8]" />
                    <span className="font-black font-mono text-xs">TIPE B</span>
                    <span className="text-[9px] opacity-80">Persegi Panjang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTableShape('square');
                      if (!editingTable) setTableName(getNextAvailableCode('C'));
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      tableShape === 'square'
                        ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-sm'
                        : 'bg-[#faf6ee] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    <Square className="w-5 h-5 text-emerald-400" />
                    <span className="font-black font-mono text-xs">TIPE C</span>
                    <span className="text-[9px] opacity-80">Persegi Sama Sisi</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0e2c34] mb-1">
                    Kapasitas Kursi
                  </label>
                  <select
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(parseInt(e.target.value, 10) || 8)}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] font-semibold"
                  >
                    {[4, 5, 6, 8, 10, 12, 14, 16].map((num) => (
                      <option key={num} value={num}>
                        {num} Kursi
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0e2c34] mb-1">
                    Kategori Meja
                  </label>
                  <select
                    value={tableCategory}
                    onChange={(e) => setTableCategory(e.target.value as GuestCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] font-semibold"
                  >
                    <option value="VVIP">👑 VVIP</option>
                    <option value="VIP">★ VIP</option>
                    <option value="Reguler">Reguler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0e2c34] mb-1">
                    Sesi Acara
                  </label>
                  <select
                    value={tableSession}
                    onChange={(e) => setTableSession(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] font-semibold"
                  >
                    <option value="Semua Sesi">Semua Sesi</option>
                    <option value="Akad / Pemberkatan">Akad / Pemberkatan</option>
                    <option value="Resepsi">Resepsi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0e2c34] mb-1">
                    Catatan Lokasi
                  </label>
                  <input
                    type="text"
                    value={tableNotes}
                    onChange={(e) => setTableNotes(e.target.value)}
                    placeholder="Misal: Dekat Pelaminan"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee5d4]">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-[#52717b] hover:bg-[#f0ebd9]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e]"
                >
                  {editingTable ? 'Simpan Meja' : 'Tambah Meja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tempatkan Tamu ke Meja */}
      {assigningTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0e2c34]">
                  Tempatkan Tamu ke {assigningTable.name}
                </h3>
                <p className="text-[11px] text-[#5e7d87]">
                  Pilih tamu dari daftar undangan Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="text-[#6d8a93] hover:text-[#0e2c34] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#73929c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Cari nama tamu..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34]"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {guests
                .filter(
                  (g) =>
                    !guestSearch.trim() ||
                    g.name.toLowerCase().includes(guestSearch.toLowerCase())
                )
                .map((g) => {
                  const isAssignedHere = g.table_id === assigningTable.id;
                  const otherTable =
                    g.table_id && g.table_id !== assigningTable.id
                      ? tables.find((t) => t.id === g.table_id)
                      : null;

                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#0e2c34] truncate">{g.name}</p>
                        <p className="text-[10px] text-[#5e7d87]">
                          {g.category || 'Reguler'} • Jatah {g.max_guests || 2} Tamu
                          {otherTable ? ` • Saat ini di ${otherTable.name}` : ''}
                        </p>
                      </div>

                      {isAssignedHere ? (
                        <button
                          type="button"
                          onClick={() => handleAssignGuestToTable(g.id, undefined)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px]"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Terpilih</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssignGuestToTable(g.id, assigningTable.id)}
                          className="px-3 py-1 rounded-lg bg-[#0f3b47] text-white font-bold text-[11px] hover:bg-[#154e5e]"
                        >
                          + Pilih
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#eee5d4]">
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
