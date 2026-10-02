import type { SVGProps } from 'react';
import type { PlaceKind } from '../../core/types/places.ts';

/** One ballpoint weight for every icon: 24px grid, 1.9 stroke, round ends. */
type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...rest}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Svg>
);

export const IconLocate = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </Svg>
);

export const IconSwap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4v15" />
    <path d="m4.5 15.5 3.5 3.5 3.5-3.5" />
    <path d="M16 20V5" />
    <path d="m12.5 8.5 3.5-3.5 3.5 3.5" />
  </Svg>
);

/** Trip direction arrow; points the way text reads (left in Arabic, right in English). */
export const IconTripArrow = ({ rtl, ...p }: IconProps & { rtl: boolean }) => (
  <Svg {...p} style={{ width: 16, height: 16, verticalAlign: '-2px', ...(p.style ?? {}) }}>
    {rtl ? <path d="M19 12H5m5-5-5 5 5 5" /> : <path d="M5 12h14m-5-5 5 5-5 5" />}
  </Svg>
);

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
  </Svg>
);

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconCube = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z" />
    <path d="M4 7l8 4.2L20 7M12 11.2v10" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 5.5v13M15.5 5.5v13" />
  </Svg>
);

export const IconOffline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.3-2.8M11 5.6a15 15 0 0 1 11 3.9" />
    <path d="M12 20h.01" />
  </Svg>
);

const StationGlyph = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="13" rx="3" />
    <path d="M5 11h14M8.5 17v3M15.5 17v3" />
    <path d="M8.5 14h.01M15.5 14h.01" />
  </Svg>
);

const CityGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.5h17" />
    <path d="M5 20.5V9l5-3v14.5M10 20.5V4h7v16.5M17 20.5V11h2.5v9.5" />
  </Svg>
);

const UniversityGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
    <path d="M6.5 11.2v4.3c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.3M21.5 9v5" />
  </Svg>
);

const TrainGlyph = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="3.5" width="12" height="13" rx="3" />
    <path d="M6 10.5h12M9 16.5 7 20.5M15 16.5l2 4M9.5 13.5h.01M14.5 13.5h.01" />
  </Svg>
);

export function PlaceKindIcon({ kind }: { kind: PlaceKind }) {
  switch (kind) {
    case 'station':
      return <StationGlyph />;
    case 'city':
    case 'town':
    case 'district':
    case 'village':
      return <CityGlyph />;
    case 'university':
      return <UniversityGlyph />;
    case 'metro':
    case 'rail':
      return <TrainGlyph />;
    case 'gps':
      return <IconLocate />;
    default:
      return <IconPin />;
  }
}

/** Side silhouettes for the vehicle picker. Always drawn nose to the right, never mirrored. */
export function MicrobusSilhouette() {
  return (
    <svg viewBox="0 0 132 44" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M8 34V12c0-3 2-5 5-5h78c6 0 10 2 14 6l14 12c2 2 3 4 3 7v2" />
        <path d="M8 34h9M35 34h55M108 34h14" />
        <path d="M16 12h16v10H16zM36 12h16v10H36zM56 12h16v10H56zM76 12h14v10H76z" />
        <path d="M94 12h8l12 10H94z" />
        <path d="M74 12v22" strokeDasharray="3 3" />
        <circle cx="26" cy="35" r="6" />
        <circle cx="99" cy="35" r="6" />
      </g>
    </svg>
  );
}

export function BusSilhouette() {
  return (
    <svg viewBox="0 0 132 44" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 34V9c0-2.5 1.5-4 4-4h108c5 0 8 3 9 7l3 14v8" />
        <path d="M4 34h10M34 34h68M120 34h8" />
        <path d="M10 11h92v11H10z" />
        <path d="M31 11v11M52 11v11M73 11v11" />
        <path d="M108 11h10l3 13h-13z" />
        <circle cx="24" cy="35" r="6" />
        <circle cx="111" cy="35" r="6" />
      </g>
    </svg>
  );
}

/** The sun as the notebook draws it: a highlighter disc with a deeper rim. */
export function SunDot({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="8" fill="#ffe03a" stroke="#f5b800" strokeWidth="2" />
    </svg>
  );
}

export const IconGitHub = (p: IconProps) => (
  <Svg {...p} className={`icon icon-solid ${p.className ?? ''}`.trim()}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
  </Svg>
);

export const IconLinkedIn = (p: IconProps) => (
  <Svg {...p} className={`icon icon-solid ${p.className ?? ''}`.trim()}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
  </Svg>
);

/** Brand mark: a sun cut by a window frame, drawn in ink and highlighter. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" aria-hidden="true">
      <rect x="2" y="5" width="30" height="24" rx="5" fill="#fbfcfe" stroke="#1b2f7c" strokeWidth="2.2" />
      <path d="M17 5v24" stroke="#1b2f7c" strokeWidth="2.2" />
      <circle cx="24.5" cy="17" r="5" fill="#ffe03a" stroke="#f5b800" strokeWidth="1.6" />
      <path d="M5.5 25 13 12" stroke="#8f98a4" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 25l4-7" stroke="#8f98a4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
