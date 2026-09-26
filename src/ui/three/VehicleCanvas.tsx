import { useState, useEffect, useRef, useMemo } from 'react';
import type {
  VehicleProfile,
  TripExposureVerdict,
  TimelineStep
} from '../../core/types/vehicle.ts';
import type { AppLanguage } from '../i18n/copy.ts';
import {
  computeSceneLightingFromStep,
  mapSeatExposureTo3DColor,
  getCameraPresetTransform,
  getAdaptiveQualityConfig,
  SceneResourceTracker,
  type CameraPreset
} from './SunOrbitScene.ts';
import { buildVehicle3DMeshData } from './VehicleModel.ts';
import { calculateInstantSeatExposure } from '../store/trip-store.ts';

export interface VehicleCanvasProps {
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  currentStep: TimelineStep;
  scrubIndex: number;
  onScrubChange: (index: number) => void;
  onFallbackTo2D: () => void;
  selectedSeatId?: number | null;
  onSelectSeat?: (seatId: number) => void;
  forceWebGLUnavailable?: boolean;
  lang: AppLanguage;
}

function detectWebGLSupport(forceUnavailable?: boolean): boolean {
  if (forceUnavailable) return false;
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Projects a 3D point [x, y, z] into 2D viewport coordinates [sx, sy, depth]
 * using camera yaw, pitch, and distance.
 */
function project3DPoint(
  pt: [number, number, number],
  yawDeg: number,
  pitchDeg: number,
  distance: number,
  width: number,
  height: number
): { sx: number; sy: number; depth: number } {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;

  const [x, y, z] = pt;

  // Rotate around Y axis (yaw)
  const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
  const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);

  // Rotate around X axis (pitch)
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

  const fovScale = Math.min(width, height) * 0.92;
  const camZ = Math.max(1.8, distance + z2);
  const perspective = fovScale / camZ;

  return {
    sx: Number((width / 2 + x1 * perspective).toFixed(1)),
    sy: Number((height * 0.56 - y2 * perspective).toFixed(1)),
    depth: z2
  };
}

export default function VehicleCanvas({
  vehicle,
  verdict,
  currentStep,
  scrubIndex,
  onScrubChange,
  onFallbackTo2D,
  selectedSeatId = null,
  onSelectSeat,
  forceWebGLUnavailable = false,
  lang
}: VehicleCanvasProps) {
  const [webGLSupported, setWebGLSupported] = useState<boolean>(() =>
    detectWebGLSupport(forceWebGLUnavailable)
  );
  const [preset, setPreset] = useState<CameraPreset>('orbit');
  const initialCam = useMemo(
    () => getCameraPresetTransform('orbit', vehicle, verdict.recommendedSide),
    [vehicle, verdict.recommendedSide]
  );
  const [yawDeg, setYawDeg] = useState<number>(initialCam.yawDeg);
  const [pitchDeg, setPitchDeg] = useState<number>(initialCam.pitchDeg);
  const [distance, setDistance] = useState<number>(initialCam.distance);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<SceneResourceTracker>(new SceneResourceTracker());

  const quality = useMemo(() => getAdaptiveQualityConfig(), []);
  const meshData = useMemo(() => buildVehicle3DMeshData(vehicle), [vehicle]);
  const lighting = useMemo(
    () => computeSceneLightingFromStep(currentStep, vehicle, 4.2),
    [currentStep, vehicle]
  );
  const instantSeats = useMemo(
    () => calculateInstantSeatExposure(vehicle, currentStep),
    [vehicle, currentStep]
  );

  // Allocate & dispose WebGL context and buffers cleanly on mount/unmount (Q5)
  useEffect(() => {
    if (forceWebGLUnavailable) {
      setWebGLSupported(false);
      return;
    }

    const tracker = trackerRef.current;
    const canvas = glCanvasRef.current;
    let gl: WebGLRenderingContext | null = null;
    let buffer: WebGLBuffer | null = null;

    if (canvas) {
      try {
        gl = (canvas.getContext('webgl', {
          antialias: !quality.isLowEndDevice,
          powerPreference: 'low-power'
        }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

        if (!gl) {
          setWebGLSupported(false);
          return;
        }

        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 0, 1]), gl.STATIC_DRAW);
      } catch {
        setWebGLSupported(false);
      }
    }

    tracker.allocateCycleResources(vehicle.totalSeats, () => {
      if (gl && buffer) {
        gl.deleteBuffer(buffer);
      }
    });

    return () => {
      tracker.disposeAll();
    };
  }, [vehicle.totalSeats, forceWebGLUnavailable, quality.isLowEndDevice]);

  // Update WebGL sky background color on lighting change (idle-stopped: only runs when lighting changes!)
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas || !webGLSupported) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    if (currentStep.isNight) {
      gl.clearColor(0.06, 0.09, 0.22, 1.0);
    } else {
      gl.clearColor(0.07, 0.11, 0.21, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
  }, [currentStep, webGLSupported]);

  // Play / Pause timeline animation with tab-visibility guard (Q3)
  useEffect(() => {
    if (!isPlaying) return;

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        setIsPlaying(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const total = verdict.timeline.length;
      if (total <= 1) return;
      const nextIdx = (scrubIndex + 1) % total;
      onScrubChange(nextIdx);
    }, 120);

    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [isPlaying, scrubIndex, verdict.timeline.length, onScrubChange]);

  const applyCameraPreset = (nextPreset: CameraPreset) => {
    setPreset(nextPreset);
    const cam = getCameraPresetTransform(nextPreset, vehicle, verdict.recommendedSide);
    setYawDeg(cam.yawDeg);
    setPitchDeg(cam.pitchDeg);
    setDistance(cam.distance);
  };

  if (!webGLSupported) {
    return (
      <div
        data-testid="webgl-fallback-banner"
        className="bento-card"
        style={{
          textAlign: 'center',
          padding: '20px 16px',
          background: '#FEF3C7',
          border: '1.5px solid #F59E0B',
          color: '#92400E'
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>🚐🛡️</div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>
          {lang === 'ar'
            ? 'العرض ثلاثي الأبعاد غير متاح على هذا المتصفح'
            : '3D WebGL view is unavailable on this device'}
        </h3>
        <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
          {lang === 'ar'
            ? 'ولا يهمك! مخطط الكراسي 2.5D شغال بكامل الدقة وبيوضح نسبة الضل لكل كرسي.'
            : 'No problem! The 2.5D seat map is fully active with exact shade percentages.'}
        </p>
        <button
          type="button"
          data-testid="fallback-to-2d-btn"
          onClick={onFallbackTo2D}
          className="touch-target"
          style={{
            minHeight: '48px',
            padding: '8px 18px',
            background: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 800
          }}
        >
          {lang === 'ar' ? '💺 العودة لمخطط الكراسي 2.5D' : '💺 Back to 2.5D Seat Map'}
        </button>
      </div>
    );
  }

  const viewW = 340;
  const viewH = 265;

  // Project Sun, Chassis, Shadow, Seats, and 3D Orientation Labels
  const sunProj = project3DPoint(lighting.sunPosition3D, yawDeg, pitchDeg, distance, viewW, viewH);
  const centerProj = project3DPoint([0, 0.5, 0], yawDeg, pitchDeg, distance, viewW, viewH);

  // Dynamic ground shadow offset opposite to sun vector
  const shadowOffsetX = -lighting.sunDirection.x * 1.45;
  const shadowOffsetZ = lighting.sunDirection.y * 1.1;
  const halfW = meshData.widthM / 2;
  const halfL = meshData.lengthM / 2;

  const shadowCorners: [number, number, number][] = [
    [-halfW + shadowOffsetX, 0.02, -halfL + shadowOffsetZ],
    [halfW + shadowOffsetX, 0.02, -halfL + shadowOffsetZ],
    [halfW + shadowOffsetX, 0.02, halfL + shadowOffsetZ],
    [-halfW + shadowOffsetX, 0.02, halfL + shadowOffsetZ]
  ];
  const shadowPolygon = shadowCorners
    .map((c) => {
      const p = project3DPoint(c, yawDeg, pitchDeg, distance, viewW, viewH);
      return `${p.sx},${p.sy}`;
    })
    .join(' ');

  const floorCorners: [number, number, number][] = [
    [-halfW, 0.15, -halfL],
    [halfW, 0.15, -halfL],
    [halfW, 0.15, halfL],
    [-halfW, 0.15, halfL]
  ];
  const floorPolygon = floorCorners
    .map((c) => {
      const p = project3DPoint(c, yawDeg, pitchDeg, distance, viewW, viewH);
      return `${p.sx},${p.sy}`;
    })
    .join(' ');

  const roofCorners: [number, number, number][] = [
    [-(halfW - 0.08), meshData.heightM * 0.72, -(halfL - 0.15)],
    [halfW - 0.08, meshData.heightM * 0.72, -(halfL - 0.15)],
    [halfW - 0.08, meshData.heightM * 0.72, halfL - 0.15],
    [-(halfW - 0.08), meshData.heightM * 0.72, halfL - 0.15]
  ];
  const roofPolygon = roofCorners
    .map((c) => {
      const p = project3DPoint(c, yawDeg, pitchDeg, distance, viewW, viewH);
      return `${p.sx},${p.sy}`;
    })
    .join(' ');

  const frontLabelProj = project3DPoint(
    meshData.orientationLabels.frontPos,
    yawDeg,
    pitchDeg,
    distance,
    viewW,
    viewH
  );
  const leftLabelProj = project3DPoint(
    meshData.orientationLabels.leftPos,
    yawDeg,
    pitchDeg,
    distance,
    viewW,
    viewH
  );
  const rightLabelProj = project3DPoint(
    meshData.orientationLabels.rightPos,
    yawDeg,
    pitchDeg,
    distance,
    viewW,
    viewH
  );

  // Sort seats back-to-front by projected depth (Painter's algorithm)
  const projectedSeats = meshData.seatBoxes
    .map((box) => {
      const p = project3DPoint(box.center, yawDeg, pitchDeg, distance, viewW, viewH);
      const seatExp = instantSeats.find((s) => s.seatId === box.seatId);
      const shadePct = seatExp ? seatExp.shadePercentage : 50;
      const colorStyle = mapSeatExposureTo3DColor(shadePct);
      const sunPatch = lighting.seatSunPatchIntensity.get(box.seatId) ?? 0;
      return {
        box,
        p,
        shadePct,
        colorStyle,
        sunPatch
      };
    })
    .sort((a, b) => b.p.depth - a.p.depth);

  return (
    <div className="bento-card" data-testid="vehicle-3d-canvas-card" style={{ padding: '12px' }}>
      {/* Camera Presets & Play/Pause Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          marginBottom: '10px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="cam-preset-orbit"
            onClick={() => applyCameraPreset('orbit')}
            className="touch-target"
            style={{
              minHeight: '48px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 800,
              background: preset === 'orbit' ? '#0F172A' : '#F8FAFC',
              color: preset === 'orbit' ? '#FFFFFF' : '#0F172A',
              border: '1.5px solid #CBD5E1'
            }}
          >
            {lang === 'ar' ? '🔄 مدار 360°' : '🔄 Orbit'}
          </button>
          <button
            type="button"
            data-testid="cam-preset-top"
            onClick={() => applyCameraPreset('top')}
            className="touch-target"
            style={{
              minHeight: '48px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 800,
              background: preset === 'top' ? '#0F172A' : '#F8FAFC',
              color: preset === 'top' ? '#FFFFFF' : '#0F172A',
              border: '1.5px solid #CBD5E1'
            }}
          >
            {lang === 'ar' ? '🔼 من فوق' : '🔼 Top'}
          </button>
          <button
            type="button"
            data-testid="cam-preset-inside"
            onClick={() => applyCameraPreset('inside')}
            className="touch-target"
            style={{
              minHeight: '48px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 800,
              background: preset === 'inside' ? '#0F172A' : '#F8FAFC',
              color: preset === 'inside' ? '#FFFFFF' : '#0F172A',
              border: '1.5px solid #CBD5E1'
            }}
          >
            {lang === 'ar' ? '👀 من جوه الكرسي' : '👀 Inside'}
          </button>
        </div>

        <button
          type="button"
          data-testid="three-play-pause-btn"
          onClick={() => setIsPlaying((p) => !p)}
          className="touch-target"
          style={{
            minHeight: '48px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 800,
            background: isPlaying ? '#F59E0B' : '#EEF2FF',
            color: isPlaying ? '#0F172A' : '#312E81',
            border: `1.5px solid ${isPlaying ? '#D97706' : '#6366F1'}`
          }}
        >
          {isPlaying
            ? lang === 'ar'
              ? '⏸️ إيقاف'
              : '⏸️ Pause'
            : lang === 'ar'
            ? '▶️ تحريك الشمس'
            : '▶️ Play Sun'}
        </button>
      </div>

      {/* Strictly Un-Mirrored (dir="ltr") Interactive 3D Viewport */}
      <div
        dir="ltr"
        data-testid="three-viewport-ltr"
        onPointerDown={(e) => {
          dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            yaw: yawDeg,
            pitch: pitchDeg
          };
        }}
        onPointerMove={(e) => {
          if (!dragStartRef.current) return;
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          setYawDeg((dragStartRef.current.yaw + dx * 0.6) % 360);
          setPitchDeg(Math.min(86, Math.max(8, dragStartRef.current.pitch + dy * 0.4)));
        }}
        onPointerUp={() => {
          dragStartRef.current = null;
        }}
        onPointerLeave={() => {
          dragStartRef.current = null;
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '265px',
          borderRadius: '18px',
          overflow: 'hidden',
          background: currentStep.isNight
            ? 'radial-gradient(circle at 50% 20%, #1E1B4B 0%, #0F172A 100%)'
            : 'radial-gradient(circle at 50% 15%, #1E293B 0%, #0F172A 100%)',
          touchAction: 'none',
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        {/* WebGL Hardware Backing Canvas */}
        <canvas
          ref={glCanvasRef}
          width={Math.round(viewW * quality.pixelRatio)}
          height={Math.round(viewH * quality.pixelRatio)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.35,
            pointerEvents: 'none'
          }}
        />

        {/* 3D Projected Vector Scene (Vehicle, Shadows, Sun Orbit, Seats & Orientation Labels) */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewW} ${viewH}`}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Cast Ground Shadow Polygon (Opposite to Directional Sun Vector) */}
          {!currentStep.isNight && (
            <polygon
              data-testid="vehicle-cast-shadow"
              points={shadowPolygon}
              fill="rgba(2, 6, 23, 0.58)"
            />
          )}

          {/* Vehicle Chassis Floor */}
          <polygon
            points={floorPolygon}
            fill="rgba(30, 41, 59, 0.92)"
            stroke="#64748B"
            strokeWidth="2"
          />

          {/* Directional Sunlight Beam & Orbiting 3D Sun Sphere */}
          {!currentStep.isNight && (
            <>
              <line
                data-testid="directional-sun-ray"
                x1={sunProj.sx}
                y1={sunProj.sy}
                x2={centerProj.sx}
                y2={centerProj.sy}
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="5 4"
                opacity="0.85"
              />
              <circle
                cx={sunProj.sx}
                cy={sunProj.sy}
                r="16"
                fill="rgba(245, 158, 11, 0.28)"
              />
              <circle
                data-testid="sun-orb-3d"
                cx={sunProj.sx}
                cy={sunProj.sy}
                r="9"
                fill="#F59E0B"
                stroke="#FEF3C7"
                strokeWidth="2"
              />
            </>
          )}

          {/* 3D Seats Colored by Exposure Score + Projected Sun Patches */}
          {projectedSeats.map(({ box, p, shadePct, colorStyle, sunPatch }) => {
            const seatRadius = vehicle.type === 'bus' ? 8 : 11;
            const isSelected = selectedSeatId === box.seatId;
            return (
              <g
                key={box.seatId}
                data-testid={`seat-3d-node-${box.seatId}`}
                data-sun-patch={sunPatch}
                onClick={() => onSelectSeat?.(box.seatId)}
                style={{ cursor: 'pointer' }}
              >
                {/* Sun Patch Glow on Sunny Seats */}
                {sunPatch > 0.4 && (
                  <circle
                    cx={p.sx + (lighting.sunDirection.x > 0 ? 3 : -3)}
                    cy={p.sy}
                    r={seatRadius + 3}
                    fill="rgba(245, 158, 11, 0.38)"
                  />
                )}
                <rect
                  x={p.sx - seatRadius}
                  y={p.sy - seatRadius * 0.85}
                  width={seatRadius * 2}
                  height={seatRadius * 1.7}
                  rx="4"
                  fill={colorStyle.fillHex}
                  stroke={isSelected ? '#FFFFFF' : colorStyle.strokeHex}
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                />
                <text
                  x={p.sx}
                  y={p.sy + 3}
                  textAnchor="middle"
                  fontSize={vehicle.type === 'bus' ? '7' : '8.5'}
                  fontWeight="900"
                  fill="#0F172A"
                >
                  {box.seatId}
                </text>
                <title>{`#${box.seatId} - ${shadePct}%`}</title>
              </g>
            );
          })}

          {/* Translucent Stylized Roof Frame & Pillars */}
          {preset !== 'top' && (
            <polygon
              points={roofPolygon}
              fill="rgba(248, 250, 252, 0.12)"
              stroke="rgba(148, 163, 184, 0.65)"
              strokeWidth="1.5"
            />
          )}

          {/* 3D Orientation Labels ("قدام", "شمال", "يمين") */}
          <text
            x={frontLabelProj.sx}
            y={frontLabelProj.sy}
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#38BDF8"
          >
            {lang === 'ar'
              ? meshData.orientationLabels.frontAr
              : meshData.orientationLabels.frontEn}
          </text>
          <text
            x={leftLabelProj.sx}
            y={leftLabelProj.sy}
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#E0F2FE"
          >
            {lang === 'ar'
              ? meshData.orientationLabels.leftAr
              : meshData.orientationLabels.leftEn}
          </text>
          <text
            x={rightLabelProj.sx}
            y={rightLabelProj.sy}
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#FDE68A"
          >
            {lang === 'ar'
              ? meshData.orientationLabels.rightAr
              : meshData.orientationLabels.rightEn}
          </text>
        </svg>

        {/* Bottom Touch Gesture Hint Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '10px',
            right: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#E2E8F0',
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <span>
            {lang === 'ar' ? '↻ لف العربية بإصبعك 360°' : '↻ Drag with 1 finger to orbit 360°'}
          </span>
          <span style={{ color: '#FBBF24' }}>
            ☀️ {currentStep.timeCairoFormatted} ({currentStep.solarElevationDeg}°)
          </span>
        </div>
      </div>
    </div>
  );
}
