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

  const { formattedDate } = getWeddingEventDetails(customer);
  const eventDateOnly = formattedDate;

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
      const hasTablePill = Boolean(
        useTableManagement &&
          assignedTableText &&
          !assignedTableText.toLowerCase().includes('bebas') &&
          !assignedTableText.toLowerCase().includes('resepsi')
      );

      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = hasTablePill ? 860 : 812;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Tight full-bleed rounded card background
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 28);
      ctx.fill();

      // 2. Draw Top Luxury Header with Cover Photo (156px height)
      const bannerHeight = 156;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, bannerHeight, [28, 28, 0, 0]);
      ctx.clip();

      // Base background
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, canvas.width, bannerHeight);

      // Load & Draw Cover Photo Image (with fallback)
      const coverImg = new Image();
      coverImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        coverImg.onload = () => {
          try {
            const imgAspect = coverImg.width / coverImg.height;
            const bannerWidth = canvas.width;
            const bannerAspect = bannerWidth / bannerHeight;
            let drawWidth = bannerWidth;
            let drawHeight = bannerHeight;
            let drawX = 0;
            let drawY = 0;

            if (imgAspect > bannerAspect) {
              drawWidth = bannerHeight * imgAspect;
              drawX = -(drawWidth - bannerWidth) / 2;
            } else {
              drawHeight = bannerWidth / imgAspect;
              drawY = -(drawHeight - bannerHeight) / 2;
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
      const headerGrad = ctx.createLinearGradient(0, 0, 0, bannerHeight);
      headerGrad.addColorStop(0, 'rgba(0, 0, 0, 0.30)');
      headerGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
      headerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, canvas.width, bannerHeight);

      // Gold Badge Pill on Header
      ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, Helvetica, sans-serif';
      const badgeMetrics = ctx.measureText(categoryBadge);
      const badgeWidth = Math.max(204, badgeMetrics.width + 44);
      ctx.fillStyle = '#E4D8C4';
      ctx.beginPath();
      ctx.roundRect((canvas.width - badgeWidth) / 2, 46, badgeWidth, 34, 17);
      ctx.fill();

      ctx.fillStyle = '#18242B';
      ctx.textAlign = 'center';
      ctx.fillText(categoryBadge, canvas.width / 2, 68);

      // Subtitle "JOYEVER DIGITAL ACCESS PASS"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.font = 'bold 11px "Plus Jakarta Sans", Arial, Helvetica, sans-serif';
      ctx.fillText('JOYEVER DIGITAL ACCESS PASS', canvas.width / 2, 106);
      ctx.restore();

      // 3. Card Body Header (Couple Names)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 31px "Plus Jakarta Sans", Georgia, serif';
      ctx.fillText(coupleTitle, canvas.width / 2, 232);

      // Event Date Only
      ctx.fillStyle = '#71717A';
      ctx.font = '500 17px "Plus Jakarta Sans", Arial, Helvetica, sans-serif';
      ctx.fillText(eventDateOnly, canvas.width / 2, 270);

      // 4. Draw QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          const qrBoxSize = 310;
          const qrBoxX = (canvas.width - qrBoxSize) / 2;
          const qrBoxY = 304;
          const qrSize = 270;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = qrBoxY + 20;

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22);
          ctx.fill();

          ctx.strokeStyle = '#18181B';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = qrImageUrl;
      });

      // Bottom Divider
      ctx.strokeStyle = '#F1F1F4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(46, 650);
      ctx.lineTo(canvas.width - 46, 650);
      ctx.stroke();

      // 5. Guest Salutation & Details
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px "Plus Jakarta Sans", Georgia, serif';
      ctx.fillText(`Dear, ${cleanName}`, canvas.width / 2, 696);

      ctx.fillStyle = '#52525B';
      ctx.font = '500 17px "Plus Jakarta Sans", Arial, Helvetica, sans-serif';
      ctx.fillText(`Valid for (${maxGuests}) person(s)`, canvas.width / 2, 735);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 14px "JetBrains Mono", "Courier New", monospace';
      ctx.fillText(passId, canvas.width / 2, 768);

      // Table Assignment (if any and table management is enabled)
      if (hasTablePill && assignedTableText) {
        const seatPart = assignedSeatText ? ` · Kursi ${assignedSeatText}` : '';
        const tablePillText = `Meja: ${assignedTableText}${seatPart}`;

        ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, Helvetica, sans-serif';
        const textMetrics = ctx.measureText(tablePillText);
        const pillWidth = Math.max(textMetrics.width + 36, 170);
        const pillHeight = 32;
        const pillX = (canvas.width - pillWidth) / 2;
        const pillY = 790;

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

      // Outer card subtle border
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 28);
      ctx.stroke();

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
              {eventDateOnly}
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
