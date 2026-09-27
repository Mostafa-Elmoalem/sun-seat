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

/** Brand mark: a mashrabiya cell of four lattice openings, one of them lit by the sun. */
export function BrandMark() {
  const rhombus = (cx: number, cy: number, r: number) => `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" fill="#123e44" />
      <path d={rhombus(11, 11, 5.6)} fill="#2a5a60" />
      <path d={rhombus(23, 11, 5.6)} fill="#ffb52e" />
      <path d={rhombus(11, 23, 5.6)} fill="#2a5a60" />
      <path d={rhombus(23, 23, 5.6)} fill="#2a5a60" />
    </svg>
  );
}

/** A lattice opening with light in it: the sun as this app draws it. */
export function SunGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 1.5 20.5 11 11 20.5 1.5 11Z" fill="#ffb52e" />
      <path d="M11 6.5 15.5 11 11 15.5 6.5 11Z" fill="#fff3d9" />
    </svg>
  );
}
