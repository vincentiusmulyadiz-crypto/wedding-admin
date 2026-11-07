import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import type { Customer } from '../types/database';
import {
  buildGuestQrPayload,
  generateGuestPassId,
  encodeGuestCode,
} from '../lib/guestCode';
import { getCustomerCoverPhoto, getWeddingEventDetails } from '../lib/tableSync';

export interface EntrancePassGuestInfo {
  name: string;
  code?: string;
  passId?: string;
  max_guests?: number;
  category?: string;
  table_id?: string;
  tableName?: string;
  seat_numbers?: string;
  invitationLink?: string;
}

interface EntrancePassModalProps {
  guest: EntrancePassGuestInfo;
  customer: Customer;
  tableName?: string;
  seatNumbers?: string;
  useTableManagement?: boolean;
  guestCategoryEnabled?: boolean;
  invitationLink?: string;
  onClose: () => void;
}

export const EntrancePassModal: React.FC<EntrancePassModalProps> = ({
  guest,
  customer,
  tableName,
  seatNumbers,
  useTableManagement = true,
  guestCategoryEnabled = true,
  invitationLink,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvLink, setCopiedInvLink] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>(() => getCustomerCoverPhoto(customer));

  useEffect(() => {
    setCoverPhotoUrl(getCustomerCoverPhoto(customer));
    const handleUpdate = () => setCoverPhotoUrl(getCustomerCoverPhoto(customer));
    window.addEventListener('joyever:cover-photo-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('joyever:cover-photo-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [customer]);

  const cleanName = guest.name || 'Tamu Undangan';
  const passId = guest.passId || generateGuestPassId(cleanName, customer.slug || customer.couple_names);
  const guestCode = guest.code || encodeGuestCode(cleanName, guest.max_guests || 2);
  const cleanCat = (guest.category || '').trim().toUpperCase();
  const isVipOrVvip = guestCategoryEnabled && (cleanCat === 'VIP' || cleanCat === 'VVIP');
  const categoryBadge = isVipOrVvip ? `${cleanCat} PASS` : 'ENTRANCE PASS';
  const maxGuests = guest.max_guests || 2;
  const coupleTitle = customer.couple_names || 'Romeo & Juliet';

  const { venueName, formattedDate } = getWeddingEventDetails(customer);
  const venueDate = `${venueName} · ${formattedDate}`;

  const invitationHost = customer.domain || (customer.slug ? `${customer.slug}.joyever.id` : 'demo-joyfulday.joyever.id');
  const baseInvitation = invitationHost.startsWith('http') ? invitationHost : `https://${invitationHost}`;
  const finalInvitationUrl =
    guest.invitationLink ||
    invitationLink ||
    `${baseInvitation.replace(/\/+$/, '')}/?to=${encodeURIComponent(cleanName)}&c=${guestCode}`;

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

  const handleCopyInvLink = () => {
    navigator.clipboard.writeText(finalInvitationUrl);
    setCopiedInvLink(true);
    setTimeout(() => setCopiedInvLink(false), 2000);
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

      // 2. Draw Top Luxury Header with Cover Photo
      const bannerHeight = 160;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(30, 30, canvas.width - 60, bannerHeight, [28, 28, 0, 0]);
      ctx.clip();

      // Base background
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(30, 30, canvas.width - 60, bannerHeight);

      // Load & Draw Cover Photo Image (with fallback)
      const coverImg = new Image();
      coverImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        coverImg.onload = () => {
          try {
            const imgAspect = coverImg.width / coverImg.height;
            const bannerWidth = canvas.width - 60;
            const bannerAspect = bannerWidth / bannerHeight;
            let drawWidth = bannerWidth;
            let drawHeight = bannerHeight;
            let drawX = 30;
            let drawY = 30;

            if (imgAspect > bannerAspect) {
              drawWidth = bannerHeight * imgAspect;
              drawX = 30 - (drawWidth - bannerWidth) / 2;
            } else {
              drawHeight = bannerWidth / imgAspect;
              drawY = 30 - (drawHeight - bannerHeight) / 2;
            }
            ctx.drawImage(coverImg, drawX, drawY, drawWidth, drawHeight);
          } catch {
            // ignore if draw fails
          }
          resolve();
        };
        coverImg.onerror = () => {
          if (!coverImg.src.includes('wedding-cover.jpg')) {
            coverImg.src = '/wedding-cover.jpg';
          } else {
            resolve();
          }
        };
        coverImg.src = coverPhotoUrl || '/wedding-cover.jpg';
      });

      // Dark gradient overlay matching the web UI
      const headerGrad = ctx.createLinearGradient(0, 30, 0, 30 + bannerHeight);
      headerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      headerGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
      headerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(30, 30, canvas.width - 60, bannerHeight);

      // Gold Badge Pill on Header
      ctx.fillStyle = '#DFD0B8';
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 100, 62, 200, 34, 17);
      ctx.fill();

      ctx.fillStyle = '#0E435A';
      ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(categoryBadge, canvas.width / 2, 84);

      // Subtitle "JOYEVER DIGITAL ACCESS PASS"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 10px Arial, Helvetica, sans-serif';
      ctx.fillText('JOYEVER DIGITAL ACCESS PASS', canvas.width / 2, 122);
      ctx.restore();

      // 3. Card Body Header (Couple Names)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
      ctx.fillText(coupleTitle, canvas.width / 2, 248);

      // Venue & Date
      ctx.fillStyle = '#52525B';
      ctx.font = '14px Arial, Helvetica, sans-serif';
      ctx.fillText(venueDate, canvas.width / 2, 282);

      // Thin Divider
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, 318);
      ctx.lineTo(canvas.width - 70, 318);
      ctx.stroke();

      // 4. Draw QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          const qrSize = 300;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 345;

          // Box border
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

      // Bottom Divider
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, 688);
      ctx.lineTo(canvas.width - 70, 688);
      ctx.stroke();

      // 5. Guest Salutation & Details
      ctx.fillStyle = '#18181B';
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
      ctx.fillText(`Dear, ${cleanName}`, canvas.width / 2, 730);

      ctx.fillStyle = '#52525B';
      ctx.font = '15px Arial, Helvetica, sans-serif';
      ctx.fillText(`Valid for (${maxGuests}) person(s)`, canvas.width / 2, 765);

      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(passId, canvas.width / 2, 798);

      // Table Assignment (if any and table management is enabled)
      if (
        useTableManagement &&
        assignedTableText &&
        !assignedTableText.toLowerCase().includes('bebas') &&
        !assignedTableText.toLowerCase().includes('resepsi')
      ) {
        const seatPart = assignedSeatText ? ` · Kursi ${assignedSeatText}` : '';
        const tablePillText = `Meja: ${assignedTableText}${seatPart}`;

        ctx.font = 'bold 14px Arial, Helvetica, sans-serif';
        const textMetrics = ctx.measureText(tablePillText);
        const pillWidth = Math.max(textMetrics.width + 36, 160);
        const pillHeight = 32;
        const pillX = (canvas.width - pillWidth) / 2;
        const pillY = 824;

        ctx.fillStyle = '#faf5ec';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 16);
        ctx.fill();

        ctx.strokeStyle = '#e4d7c0';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#0E435A';
        ctx.textAlign = 'center';
        ctx.fillText(tablePillText, canvas.width / 2, pillY + 21);
      }

      // Footer note
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '12px Arial, Helvetica, sans-serif';
      ctx.fillText(
        'Please present this card at the reception table upon arrival.',
        canvas.width / 2,
        960
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
        {/* Top Luxury Joyever Header with Cover Photo */}
        <div className="relative h-28 sm:h-32 bg-stone-900 overflow-hidden flex flex-col items-center justify-center text-center text-white p-4">
          <img
            src={coverPhotoUrl}
            alt="Wedding Cover"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/wedding-cover.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/40 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#DFD0B8] text-[#0E435A] text-[10px] sm:text-[11px] font-extrabold tracking-wider rounded-full uppercase shadow-xs mb-1">
              {categoryBadge}
            </div>
            <p className="text-[9px] sm:text-[10px] tracking-widest uppercase font-bold text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              Joyever Digital Access Pass
            </p>
          </div>

          {/* Top Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer shadow-md z-20 backdrop-blur-xs"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-7 space-y-3.5 font-arial text-center">
          <div>
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

            {useTableManagement &&
              assignedTableText &&
              !assignedTableText.toLowerCase().includes('bebas') &&
              !assignedTableText.toLowerCase().includes('resepsi') && (
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

          {/* Link Undangan & QR Code Entrance Pass */}
          <div className="pt-2.5 border-t border-zinc-100 text-left space-y-2">
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                <span className="font-semibold text-zinc-700">Link Undangan Digital:</span>
                <button
                  type="button"
                  onClick={handleCopyInvLink}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E435A] hover:underline cursor-pointer"
                >
                  {copiedInvLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedInvLink ? 'Tersalin' : 'Salin Undangan'}
                </button>
              </div>
              <p className="text-[10px] font-mono text-zinc-600 bg-zinc-50 p-2 rounded-xl border border-zinc-200 break-all select-all">
                {finalInvitationUrl}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                <span className="font-semibold text-zinc-700">Link QR Entrance Pass:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E435A] hover:underline cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Tersalin' : 'Salin QR Pass'}
                </button>
              </div>
              <p className="text-[10px] font-mono text-zinc-600 bg-zinc-50 p-2 rounded-xl border border-zinc-200 break-all select-all">
                {qrTargetUrl}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
