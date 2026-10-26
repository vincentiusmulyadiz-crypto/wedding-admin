import React, { useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
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
  const [copiedLink, setCopiedLink] = useState(false);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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

      // 2. Draw Top Banner Photo
      const bannerHeight = 220;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(30, 30, canvas.width - 60, bannerHeight, [28, 28, 0, 0]);
      ctx.clip();

      const bannerImg = new Image();
      bannerImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        bannerImg.onload = () => {
          ctx.drawImage(bannerImg, 30, 30, canvas.width - 60, bannerHeight);
          resolve();
        };
        bannerImg.onerror = () => {
          const grad = ctx.createLinearGradient(0, 30, 0, bannerHeight + 30);
          grad.addColorStop(0, '#1c1917');
          grad.addColorStop(1, '#292524');
          ctx.fillStyle = grad;
          ctx.fillRect(30, 30, canvas.width - 60, bannerHeight);
          resolve();
        };
        bannerImg.src = '/wedding-cover.jpg';
      });

      // Dark gradient overlay
      const darkGrad = ctx.createLinearGradient(0, 30, 0, bannerHeight + 30);
      darkGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      darkGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(30, 30, canvas.width - 60, bannerHeight);

      // Pill Badge on Banner
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.roundRect(55, 55, 170, 36, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(categoryBadge, 140, 78);
      ctx.restore();

      // 3. Card Body Header
      ctx.textAlign = 'center';

      // Subtitle
      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
      ctx.fillText('ENTRANCE PASS', canvas.width / 2, 290);

      // Couple Names
      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
      ctx.fillText(coupleTitle, canvas.width / 2, 330);

      // Venue & Date
      ctx.fillStyle = '#52525B';
      ctx.font = '14px Arial, Helvetica, sans-serif';
      ctx.fillText(venueDate, canvas.width / 2, 360);

      // Divider
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, 390);
      ctx.lineTo(canvas.width - 70, 390);
      ctx.stroke();

      // 4. Draw QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          const qrSize = 310;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 415;

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
      ctx.fillText(`Dear Mr./Mrs./Ms. ${cleanName}`, canvas.width / 2, 795);

      ctx.fillStyle = '#52525B';
      ctx.font = '15px Arial, Helvetica, sans-serif';
      ctx.fillText(`Valid for (${maxGuests}) person(s)`, canvas.width / 2, 830);

      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(passId, canvas.width / 2, 862);

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
        {/* Top Header Photo Banner */}
        <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-zinc-900">
          <img
            src="/wedding-cover.jpg"
            alt="Venue Preview"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
            }}
            className="w-full h-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

          {/* Top Left Category Pill */}
          <div className="absolute top-3.5 left-3.5 px-3 py-1 bg-zinc-900/90 text-white text-[11px] sm:text-xs font-bold tracking-wide rounded-full backdrop-blur-md border border-white/30 uppercase shadow-xs">
            {categoryBadge}
          </div>

          {/* Top Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full transition cursor-pointer shadow-md"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
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
              Dear Mr./Mrs./Ms. {cleanName}
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

          {/* Scan Link Info */}
          <div className="pt-2 border-t border-zinc-100 text-left">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
              <span>Link Barcode Scanner:</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E435A] hover:underline cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                {copiedLink ? 'Tersalin' : 'Salin Link'}
              </button>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 bg-zinc-50 p-1.5 rounded border border-zinc-200 break-all select-all">
              {qrTargetUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};