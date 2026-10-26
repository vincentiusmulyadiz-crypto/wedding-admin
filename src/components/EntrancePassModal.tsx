import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import type { Customer } from '../types/database';
import {
  buildGuestQrPayload,
  generateGuestPassId,
  encodeGuestCode,
} from '../lib/guestCode';

export interface EntrancePassGuestInfo {
  name: string;
  code?: string;
  passId?: string;
  max_guests?: number;
  category?: string;
  table_id?: string;
  tableName?: string;
  seat_numbers?: string;
}

interface EntrancePassModalProps {
  guest: EntrancePassGuestInfo;
  customer: Customer;
  tableName?: string;
  seatNumbers?: string;
  onClose: () => void;
}

export const EntrancePassModal: React.FC<EntrancePassModalProps> = ({
  guest,
  customer,
  tableName,
  seatNumbers,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const cleanName = guest.name || 'Tamu Undangan';
  const passId = guest.passId || generateGuestPassId(cleanName);
  const guestCode = guest.code || encodeGuestCode(cleanName, guest.max_guests || 2);
  const categoryBadge = `${(guest.category || 'VIP').toUpperCase()} ACCESS PASS`;
  const maxGuests = guest.max_guests || 2;
  const coupleTitle = customer.couple_names || 'Romeo & Juliet';
  const venueDate = customer.event_date
    ? `The Grand Chapel Hall · ${customer.event_date}`
    : 'The Grand Chapel Hall · Jumat, 16 Oktober 2026';

  const assignedTableText = tableName || guest.tableName;
  const assignedSeatText = seatNumbers || guest.seat_numbers;

  // Joyever QR URL requested by user:
  // e.g. https://joyever.id/myqrcode/demo-joyfulday.joyever.id/380-6aac106eb14f4
  const qrTargetUrl = buildGuestQrPayload({
    coupleNames: customer.couple_names,
    slug: customer.slug,
    guestName: cleanName,
    code: guestCode,
    passId,
    maxGuests,
    category: guest.category,
    tableName: assignedTableText,
    invitationLink: customer.domain || (customer.slug ? `${customer.slug}.joyever.id` : 'demo-joyfulday.joyever.id'),
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(
    qrTargetUrl
  )}`;

  const handleDownloadCard = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. White rounded card background
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(30, 30, canvas.width - 60, canvas.height - 60, 28);
      ctx.fill();

      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. Draw Top Luxury Header
      const bannerHeight = 160;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(30, 30, canvas.width - 60, bannerHeight, [28, 28, 0, 0]);
      ctx.clip();

      const bgGrad = ctx.createLinearGradient(0, 30, 0, bannerHeight + 30);
      bgGrad.addColorStop(0, '#0E435A');
      bgGrad.addColorStop(1, '#072430');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(30, 30, canvas.width - 60, bannerHeight);

      // Gold Badge Pill on Header
      ctx.fillStyle = '#DFD0B8';
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 110, 60, 220, 38, 19);
      ctx.fill();

      ctx.fillStyle = '#0E435A';
      ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(categoryBadge, canvas.width / 2, 84);

      // Subtitle "JOYEVER DIGITAL PASS"
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
      ctx.fillText('JOYEVER DIGITAL PASS', canvas.width / 2, 125);
      ctx.restore();

      // 3. Card Body Header
      ctx.textAlign = 'center';

      // Subtitle
      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
      ctx.fillText('ENTRANCE PASS', canvas.width / 2, 230);

      // Couple Names
      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
      ctx.fillText(coupleTitle, canvas.width / 2, 270);

      // Venue & Date
      ctx.fillStyle = '#52525B';
      ctx.font = '14px Arial, Helvetica, sans-serif';
      ctx.fillText(venueDate, canvas.width / 2, 300);

      // Divider
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, 330);
      ctx.lineTo(canvas.width - 70, 330);
      ctx.stroke();

      // 4. Draw QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          const qrSize = 310;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 360;

          ctx.strokeStyle = '#18181B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 20);
          ctx.stroke();

          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = qrImageUrl;
      });

      // 5. Guest Salutation & Details
      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
      ctx.fillText(`Dear, ${cleanName}`, canvas.width / 2, 740);

      ctx.fillStyle = '#52525B';
      ctx.font = '15px Arial, Helvetica, sans-serif';
      ctx.fillText(`Valid for (${maxGuests}) person(s)`, canvas.width / 2, 775);

      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(passId, canvas.width / 2, 807);

      if (assignedTableText) {
        ctx.fillStyle = '#0E435A';
        ctx.font = 'bold 15px Arial, Helvetica, sans-serif';
        const seatPart = assignedSeatText ? ` · Kursi ${assignedSeatText}` : '';
        ctx.fillText(`Meja: ${assignedTableText}${seatPart}`, canvas.width / 2, 898);
      }

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '12px Arial, Helvetica, sans-serif';
      ctx.fillText(
        'Please present this card at the reception table upon arrival.',
        canvas.width / 2,
        970
      );

      const link = document.createElement('a');
      link.download = `Access-Pass-${cleanName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export Entrance Pass:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] sm:max-w-[400px] bg-white text-zinc-900 rounded-3xl overflow-hidden shadow-2xl text-left font-arial border border-zinc-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Luxury Joyever Header */}
        <div className="relative bg-gradient-to-b from-[#0E435A] to-[#072430] py-5 px-6 text-center text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DFD0B8] text-[#0E435A] text-[11px] sm:text-xs font-extrabold tracking-wider rounded-full uppercase shadow-xs mb-1.5">
            {categoryBadge}
          </div>
          <p className="text-[10px] tracking-widest uppercase font-bold text-white/60">
            Joyever Digital Access Pass
          </p>

          {/* Top Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer shadow-md"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-7 space-y-3.5 font-arial text-center">
          <div>
            <p className="font-arial text-[11px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-widest">
              Entrance Pass
            </p>
            <h3 className="font-arial text-xl sm:text-2xl text-zinc-900 font-bold leading-snug pt-0.5">
              {coupleTitle}
            </h3>
            <p className="font-arial text-xs sm:text-sm text-zinc-500 leading-snug pt-0.5">
              {venueDate}
            </p>
          </div>

          {/* Large Clear QR Code */}
          <div className="flex justify-center py-1">
            <div className="p-3 border-2 border-zinc-900 rounded-2xl bg-white shadow-md">
              <img
                src={qrImageUrl}
                alt={`QR Entrance Pass for ${cleanName}`}
                className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                crossOrigin="anonymous"
              />
            </div>
          </div>

          {/* Guest Details */}
          <div className="space-y-1 pt-1.5 border-t border-zinc-100">
            <p className="font-arial text-base sm:text-lg text-zinc-900 font-bold">
              Dear, {cleanName}
            </p>
            <p className="font-arial text-xs sm:text-sm text-zinc-600 font-medium">
              Valid for ({maxGuests}) person(s)
            </p>
            <p className="font-arial text-xs text-zinc-400 font-mono tracking-wider pt-0.5">
              {passId}
            </p>

            {assignedTableText && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf5ec] text-[#0E435A] border border-[#e4d7c0] text-xs font-bold">
                  Meja {assignedTableText}
                  {assignedSeatText ? ` · Kursi ${assignedSeatText}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2a1710] hover:bg-[#412419] text-white text-xs sm:text-sm font-semibold transition shadow-md border border-[#af805c]/45 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Menyiapkan...' : 'Download Pass'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};