import type {
  VehicleProfile,
  VehicleSeat,
  SeatExposure,
  TimelineStep
} from '../../core/types/vehicle.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

export interface SeatHeatmap2DProps {
  vehicle: VehicleProfile;
  seatsExposure: SeatExposure[];
  bestSeatIds: number[];
  selectedSeatId: number | null;
  onSelectSeat: (seatId: number) => void;
  currentTimelineStep?: TimelineStep;
  isScrubbing?: boolean;
  lang: AppLanguage;
}

export function SeatHeatmap2D({
  vehicle,
  seatsExposure,
  bestSeatIds,
  selectedSeatId,
  onSelectSeat,
  currentTimelineStep,
  isScrubbing = false,
  lang
}: SeatHeatmap2DProps) {
  const copy = COPY_DECK[lang];

  const exposureMap = new Map<number, SeatExposure>();
  for (const exp of seatsExposure) {
    exposureMap.set(exp.seatId, exp);
  }

  // Group seats by row, sorted ascending (Row 0 = front towards driver)
  const rowsMap = new Map<number, VehicleSeat[]>();
  for (const seat of vehicle.seats) {
    const list = rowsMap.get(seat.row) ?? [];
    list.push(seat);
    rowsMap.set(seat.row, list);
  }

  const sortedRows = Array.from(rowsMap.entries()).sort((a, b) => a[0] - b[0]);
  for (const [, rowSeats] of sortedRows) {
    // Strictly sort left-to-right (col ascending / x ascending)
    rowSeats.sort((a, b) => a.col - b.col);
  }

  const selectedSeat =
    vehicle.seats.find((s) => s.id === selectedSeatId) ?? vehicle.seats[0]!;
  const selectedExposure = exposureMap.get(selectedSeat.id);

  const handleSeatClick = (seatId: number) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore vibration permission errors
      }
    }
    onSelectSeat(seatId);
  };

  const renderSeatButton = (seat: VehicleSeat) => {
    const exp = exposureMap.get(seat.id);
    const shadePct = exp ? exp.shadePercentage : 50;
    const isBest = bestSeatIds.includes(seat.id);
    const isSelected = selectedSeatId === seat.id;

    let statusClass = 'seat-shade-moderate';
    let icon = '⛅';
    if (shadePct >= 70) {
      statusClass = 'seat-shade-optimal';
      icon = isBest ? '🏆' : '🛡️';
    } else if (shadePct < 45) {
      statusClass = 'seat-sun-exposed';
      icon = '☀️';
    } else {
      statusClass = 'seat-shade-moderate';
      icon = '🛡️';
    }

    const sideTextAr =
      seat.side === 'left'
        ? 'شباك شمال'
        : seat.side === 'right'
        ? 'شباك يمين'
        : 'كرسي وسط';
    const sideTextEn =
      seat.side === 'left'
        ? 'Left window'
        : seat.side === 'right'
        ? 'Right window'
        : 'Middle seat';

    const ariaLabel =
      lang === 'ar'
        ? `مقعد رقم ${seat.id}، ${sideTextAr}، نسبة الظل ${shadePct}%`
        : `Seat ${seat.id}, ${sideTextEn}, shade ${shadePct}%`;

    return (
      <button
        key={seat.id}
        type="button"
        data-seat-id={seat.id}
        data-seat-side={seat.side}
        data-testid={`seat-btn-${seat.id}`}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        onClick={() => handleSeatClick(seat.id)}
        className={`seat-btn-25d ${statusClass} ${isSelected ? 'seat-selected' : ''}`}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, lineHeight: 1.1 }}>
          #{seat.id} {icon}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 900, lineHeight: 1.2 }}>
          {shadePct}%
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85 }}>
          {copy.shade_word}
        </span>
      </button>
    );
  };

  const sunSideIndicator = currentTimelineStep?.sunSide ?? 'none';

  return (
    <div className="bento-card" data-testid="seat-heatmap-card">
      {/* Header & Live Scrubbing Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '6px'
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
          {lang === 'ar' ? vehicle.nameAr : vehicle.nameEn}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '999px',
            background: isScrubbing ? '#FEF3C7' : '#E0F2FE',
            color: isScrubbing ? '#92400E' : '#075985'
          }}
        >
          {isScrubbing && currentTimelineStep
            ? lang === 'ar'
              ? `لحظياً الساعة ${currentTimelineStep.timeCairoFormatted}`
              : `Live at ${currentTimelineStep.timeCairoFormatted}`
            : lang === 'ar'
            ? 'متوسط الرحلة بالكامل'
            : 'Full-trip average'}
        </span>
      </div>

      {/* STRICT PHYSICAL ORIENTATION CONTAINER: dir="ltr" is mandatory so Left is ALWAYS Left */}
      <div
        dir="ltr"
        data-testid="vehicle-chassis-ltr"
        className="vehicle-chassis-ltr"
      >
        {/* Front Windshield & Direction Indicator */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: '#334155',
            background: 'rgba(255,255,255,0.75)',
            borderRadius: '18px 18px 8px 8px',
            padding: '6px 10px',
            marginBottom: '10px',
            borderBottom: '2px solid #94A3B8'
          }}
        >
          {copy.front_of_vehicle}
        </div>

        {/* Left & Right Physical Side Labels + Live Sun Beam Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 800,
            marginBottom: '8px',
            padding: '0 4px'
          }}
        >
          <span
            style={{
              color: sunSideIndicator === 'left' ? '#B45309' : '#0369A1',
              background: sunSideIndicator === 'left' ? '#FEF3C7' : '#E0F2FE',
              padding: '2px 8px',
              borderRadius: '999px'
            }}
          >
            ◀ {lang === 'ar' ? 'شمال (سائق)' : 'LEFT (Driver)'}{' '}
            {sunSideIndicator === 'left' ? '☀️' : '🛡️'}
          </span>
          <span
            style={{
              color: sunSideIndicator === 'right' ? '#B45309' : '#0369A1',
              background: sunSideIndicator === 'right' ? '#FEF3C7' : '#E0F2FE',
              padding: '2px 8px',
              borderRadius: '999px'
            }}
          >
            {sunSideIndicator === 'right' ? '☀️' : '🛡️'}{' '}
            {lang === 'ar' ? 'يمين (باب)' : 'RIGHT (Door)'} ▶
          </span>
        </div>

        {/* Vehicle Rows Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vehicle.type === 'microbus' ? (
            sortedRows.map(([rowIdx, rowSeats]) => {
              if (rowIdx === 0) {
                // Front Row: Driver on Left (col 0) + Seat 1 (col 1) + Seat 2 (col 2)
                return (
                  <div
                    key={rowIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <div
                      aria-label={copy.driver_label}
                      style={{
                        minHeight: '52px',
                        borderRadius: '10px',
                        background: '#CBD5E1',
                        color: '#1E293B',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: '2px dashed #64748B'
                      }}
                    >
                      <span>🛞</span>
                      <span>{lang === 'ar' ? 'السائق' : 'Driver'}</span>
                    </div>
                    {rowSeats.map((seat) => renderSeatButton(seat))}
                  </div>
                );
              }

              return (
                <div
                  key={rowIdx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  {rowSeats.map((seat) => renderSeatButton(seat))}
                </div>
              );
            })
          ) : (
            // Bus 49-Seater (2+2 layout with aisle, plus 5-seat back row)
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 0.45fr 1fr 1fr',
                  gap: '6px',
                  marginBottom: '4px'
                }}
              >
                <div
                  style={{
                    gridColumn: '1 / 3',
                    minHeight: '42px',
                    borderRadius: '10px',
                    background: '#CBD5E1',
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800
                  }}
                >
                  {copy.driver_label}
                </div>
                <div />
                <div
                  style={{
                    gridColumn: '4 / 6',
                    minHeight: '42px',
                    borderRadius: '10px',
                    background: '#E2E8F0',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  🚪 {lang === 'ar' ? 'باب الأتوبيس' : 'Front Door'}
                </div>
              </div>
              {sortedRows.map(([rowIdx, rowSeats]) => {
                if (rowSeats.length === 5) {
                  return (
                    <div
                      key={rowIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '4px'
                      }}
                    >
                      {rowSeats.map((seat) => renderSeatButton(seat))}
                    </div>
                  );
                }
                return (
                  <div
                    key={rowIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 0.35fr 1fr 1fr',
                      gap: '6px',
                      alignItems: 'center'
                    }}
                  >
                    {rowSeats[0] && renderSeatButton(rowSeats[0])}
                    {rowSeats[1] && renderSeatButton(rowSeats[1])}
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#64748B',
                        fontWeight: 700
                      }}
                    >
                      {rowIdx}
                    </div>
                    {rowSeats[2] && renderSeatButton(rowSeats[2])}
                    {rowSeats[3] && renderSeatButton(rowSeats[3])}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Explicit RTL Physical Orientation Hint Badge */}
      <div
        data-testid="orientation-hint-badge"
        style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 800,
          color: '#92400E',
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: '12px',
          padding: '6px 10px'
        }}
      >
        {copy.orientation_hint}
      </div>

      {/* Tactile Selected Seat Details Card (Story 4.2 AC-3) */}
      {selectedSeat && selectedExposure && (
        <div
          data-testid="selected-seat-detail-card"
          style={{
            marginTop: '10px',
            padding: '10px 14px',
            borderRadius: '14px',
            background: selectedExposure.shadePercentage >= 60 ? '#E0F2FE' : '#FEF3C7',
            border: `1.5px solid ${selectedExposure.shadePercentage >= 60 ? '#0EA5E9' : '#F59E0B'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              💺 {lang === 'ar' ? selectedSeat.labelAr : selectedSeat.labelEn}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              {selectedSeat.isWindow
                ? lang === 'ar'
                  ? 'بجانب الشباك مباشرة'
                  : 'Direct window seat'
                : lang === 'ar'
                ? 'مقعد داخلي / ممر (محمي نسبياً)'
                : 'Aisle / middle seat (partially shielded)'}
            </div>
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 900,
              padding: '4px 12px',
              borderRadius: '999px',
              background: '#FFFFFF',
              color: '#0F172A',
              boxShadow: '0 2px 6px rgba(15,23,42,0.08)'
            }}
          >
            {selectedExposure.shadePercentage >= 60 ? '🛡️ ' : '☀️ '}
            {selectedExposure.shadePercentage}% {copy.shade_word}
          </div>
        </div>
      )}
    </div>
  );
}
