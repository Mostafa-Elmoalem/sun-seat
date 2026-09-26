import { useEffect, useRef, useState } from 'react';
import type { TripExposureVerdict } from '../../core/types/vehicle.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

export type ShareCardFormat = 'story' | 'feed';

export interface ShareCardOptions {
  format: ShareCardFormat;
  originName: string;
  destinationName: string;
  vehicleName: string;
  departureTimeFormatted: string;
  verdict: TripExposureVerdict;
  lang: AppLanguage;
}

export interface ShareCardDescriptor {
  format: ShareCardFormat;
  width: number;
  height: number;
  headlineText: string;
  routeLine: string;
  metaLine: string;
  bestSeatsLabel: string;
  shadePercentage: number;
  recommendedSide: TripExposureVerdict['recommendedSide'];
  brandFooter: string;
}

/**
 * Pure, deterministic, zero-dependency generator that builds the layout descriptor
 * for the Native HTML Canvas Share Card in < 1ms (Story 7.1 AC-1 & AC-3).
 */
export function generateShareCardCanvasData(options: ShareCardOptions): ShareCardDescriptor {
  const {
    format,
    originName,
    destinationName,
    vehicleName,
    departureTimeFormatted,
    verdict,
    lang
  } = options;

  const width = format === 'story' ? 1080 : 1200;
  const height = format === 'story' ? 1920 : 630;
  const copy = COPY_DECK[lang];

  let headlineText = verdict.headlineAr;
  if (lang === 'en') {
    if (verdict.status === 'NIGHT') headlineText = copy.verdict_night;
    else if (verdict.status === 'DOES_NOT_MATTER') headlineText = copy.verdict_noon;
    else if (verdict.recommendedSide === 'left') headlineText = copy.verdict_left;
    else if (verdict.recommendedSide === 'right') headlineText = copy.verdict_right;
    else headlineText = copy.verdict_tie;
  }

  const bestShadePct = Math.max(
    verdict.sidePercentages.leftShade,
    verdict.sidePercentages.rightShade
  );

  const cleanOrigin = originName.replace('موقف ', '').split(' (')[0];
  const cleanDest = destinationName.replace('موقف ', '').split(' (')[0];
  const routeLine = `${cleanOrigin} ➔ ${cleanDest}`;
  const metaLine = `${vehicleName} • ${departureTimeFormatted}`;
  const bestSeatNums = verdict.bestSeatIds.slice(0, 3).join(' ، ');
  const bestSeatsLabel =
    lang === 'ar'
      ? `أبرد الكراسي: كرسي رقم ${bestSeatNums} (${bestShadePct}% ضل)`
      : `Coolest seats: #${bestSeatNums} (${bestShadePct}% shade)`;

  const brandFooter =
    lang === 'ar'
      ? 'اقعد فين؟ • دليلك الفوري للهروب من شمس المواصلات في مصر'
      : 'Eq3od Fein? • Escape the sun on Egyptian public transit';

  return {
    format,
    width,
    height,
    headlineText,
    routeLine,
    metaLine,
    bestSeatsLabel,
    shadePercentage: bestShadePct,
    recommendedSide: verdict.recommendedSide,
    brandFooter
  };
}

/**
 * Renders the ShareCardDescriptor directly onto a Native HTML5 2D Canvas context
 * in < 20ms with zero DOM-to-Image external libraries.
 */
export function renderShareCardToCanvas(
  canvas: HTMLCanvasElement,
  descriptor: ShareCardDescriptor
): void {
  canvas.width = descriptor.width;
  canvas.height = descriptor.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, format } = descriptor;
  const isStory = format === 'story';

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(0.55, '#0C4A6E');
  bgGrad.addColorStop(1, '#0284C7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative solar glow in top corner
  const sunGrad = ctx.createRadialGradient(width * 0.82, height * 0.16, 20, width * 0.82, height * 0.16, 260);
  sunGrad.addColorStop(0, 'rgba(245, 158, 11, 0.85)');
  sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, width, height);

  // Inner Bento Card
  const padX = isStory ? 72 : 64;
  const padY = isStory ? 180 : 56;
  const cardW = width - padX * 2;
  const cardH = height - padY * 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(padX, padY, cardW, cardH, 36);
  } else {
    ctx.rect(padX, padY, cardW, cardH);
  }
  ctx.fill();

  ctx.textAlign = 'center';
  const centerX = width / 2;

  // Route header pill
  ctx.fillStyle = '#0369A1';
  ctx.font = `800 ${isStory ? 44 : 32}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(descriptor.routeLine, centerX, padY + (isStory ? 130 : 90));

  ctx.fillStyle = '#475569';
  ctx.font = `700 ${isStory ? 32 : 24}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(descriptor.metaLine, centerX, padY + (isStory ? 195 : 138));

  // Main Headline Verdict
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 ${isStory ? 68 : 50}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(descriptor.headlineText, centerX, padY + (isStory ? 360 : 240));

  // Shade badge
  ctx.fillStyle = '#0284C7';
  ctx.font = `800 ${isStory ? 42 : 30}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(descriptor.bestSeatsLabel, centerX, padY + (isStory ? 460 : 315));

  // Simplified Physical Seat Map Illustration (Strict Physical Left/Right)
  const busW = isStory ? 460 : 380;
  const busH = isStory ? 560 : 140;
  const busX = centerX - busW / 2;
  const busY = padY + (isStory ? 560 : 350);

  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(busX, busY, busW, busH, 24);
  } else {
    ctx.rect(busX, busY, busW, busH);
  }
  ctx.fill();
  ctx.stroke();

  // Highlight Recommended Physical Side
  const isLeftRecommended = descriptor.recommendedSide === 'left';
  const isRightRecommended = descriptor.recommendedSide === 'right';

  // Left Half
  ctx.fillStyle = isLeftRecommended ? 'rgba(14, 165, 233, 0.28)' : 'rgba(245, 158, 11, 0.22)';
  ctx.fillRect(busX + 12, busY + 12, busW / 2 - 18, busH - 24);

  // Right Half
  ctx.fillStyle = isRightRecommended ? 'rgba(14, 165, 233, 0.28)' : 'rgba(245, 158, 11, 0.22)';
  ctx.fillRect(centerX + 6, busY + 12, busW / 2 - 18, busH - 24);

  ctx.fillStyle = '#0F172A';
  ctx.font = `800 ${isStory ? 30 : 22}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    isLeftRecommended ? '❄️ LEFT (ضل)' : '☀️ LEFT',
    busX + busW * 0.25,
    busY + busH / 2 + 8
  );
  ctx.fillText(
    isRightRecommended ? '❄️ RIGHT (ضل)' : '☀️ RIGHT',
    busX + busW * 0.75,
    busY + busH / 2 + 8
  );

  // Footer Brand
  ctx.fillStyle = '#334155';
  ctx.font = `800 ${isStory ? 30 : 22}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(descriptor.brandFooter, centerX, padY + cardH - (isStory ? 64 : 26));
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  originName: string;
  destinationName: string;
  vehicleName: string;
  departureTimeFormatted: string;
  verdict: TripExposureVerdict;
  shareUrl: string;
  lang: AppLanguage;
}

export function ShareModal({
  isOpen,
  onClose,
  originName,
  destinationName,
  vehicleName,
  departureTimeFormatted,
  verdict,
  shareUrl,
  lang
}: ShareModalProps) {
  const [format, setFormat] = useState<ShareCardFormat>('story');
  const [copiedLink, setCopiedLink] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const descriptor = generateShareCardCanvasData({
    format,
    originName,
    destinationName,
    vehicleName,
    departureTimeFormatted,
    verdict,
    lang
  });

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    renderShareCardToCanvas(canvasRef.current, descriptor);
  }, [isOpen, descriptor]);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sun-seat-${format}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Ignore in headless test environments without canvas toDataURL support
    }
  };

  const handleCopyUrl = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // Ignore clipboard errors
      }
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="share-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="bento-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
            {lang === 'ar' ? '📤 مشاركة كارت النصيحة' : '📤 Share Verdict Card'}
          </h3>
          <button
            type="button"
            data-testid="close-share-modal-btn"
            onClick={onClose}
            className="touch-target"
            style={{
              minHeight: '48px',
              minWidth: '48px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Aspect Ratio Switcher: Story (9:16) vs Feed (1.91:1) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            data-testid="share-format-story"
            onClick={() => setFormat('story')}
            className="touch-target"
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: format === 'story' ? '2px solid #0284C7' : '1px solid #CBD5E1',
              background: format === 'story' ? '#E0F2FE' : '#F8FAFC',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '13px'
            }}
          >
            📱 {lang === 'ar' ? 'ستوري (9:16)' : 'Story (9:16)'}
          </button>
          <button
            type="button"
            data-testid="share-format-feed"
            onClick={() => setFormat('feed')}
            className="touch-target"
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: format === 'feed' ? '2px solid #0284C7' : '1px solid #CBD5E1',
              background: format === 'feed' ? '#E0F2FE' : '#F8FAFC',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '13px'
            }}
          >
            🖼️ {lang === 'ar' ? 'بوست فيد (1.91:1)' : 'Feed Post (1.91:1)'}
          </button>
        </div>

        {/* Scaled Canvas Preview */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#0F172A',
            borderRadius: '14px',
            padding: '10px',
            overflow: 'hidden'
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid="share-card-canvas"
            style={{
              width: format === 'story' ? '150px' : '260px',
              height: format === 'story' ? '266px' : '136px',
              borderRadius: '8px'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            data-testid="download-share-png-btn"
            onClick={handleDownloadPng}
            className="touch-target"
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              background: '#0284C7',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ⬇️ {lang === 'ar' ? 'تحميل صورة PNG' : 'Download PNG'}
          </button>
          <button
            type="button"
            data-testid="copy-share-link-btn"
            onClick={() => {
              void handleCopyUrl();
            }}
            className="touch-target"
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: '1.5px solid #0F172A',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔗 {copiedLink ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
