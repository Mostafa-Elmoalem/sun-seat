import { useTripStore } from '../store/trip-store.ts';
import { COPY_DECK } from '../i18n/copy.ts';
import { StationAutocomplete } from './StationAutocomplete.tsx';
import { TimeSelector } from './TimeSelector.tsx';

export function HomeView() {
  const {
    lang,
    origin,
    destination,
    vehicleId,
    departureDateUtc,
    isNowMode,
    swapCount,
    isCalculating,
    errorCode,
    recentTrips,
    setOrigin,
    setDestination,
    swapPlaces,
    setVehicleId,
    setDepartureDateUtc,
    setDepartureNow,
    addMinutesToDeparture,
    calculateTrip,
    applyRecentTrip
  } = useTripStore();

  const copy = COPY_DECK[lang];

  const errorMessage =
    errorCode === 'SAME_PLACE'
      ? copy.err_same_place
      : errorCode === 'MISSING_PLACES'
      ? copy.err_missing_places
      : errorCode === 'ROUTE_ERROR'
      ? copy.err_route_missing
      : null;

  return (
    <main className="home-screen-layout" data-testid="home-input-screen">
      {/* Top Greeting & Recent Trips Chip (Story 4.1 AC-4) */}
      <div>
        <div style={{ padding: '4px 4px 8px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.25
            }}
          >
            {copy.greeting_headline}
          </h1>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
            {copy.app_tagline}
          </p>
        </div>

        {recentTrips.length > 0 && (
          <div
            data-testid="recent-trips-section"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              padding: '4px 0 8px'
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#475569',
                whiteSpace: 'nowrap'
              }}
            >
              {copy.recent_trips_label}
            </span>
            {recentTrips.map((item) => {
              const fromShort =
                lang === 'ar'
                  ? item.originNameAr.replace('موقف ', '').split(' (')[0]
                  : item.originNameEn.split(' (')[0];
              const toShort =
                lang === 'ar'
                  ? item.destinationNameAr.replace('موقف ', '').split(' (')[0]
                  : item.destinationNameEn.split(' (')[0];
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`recent-trip-chip-${item.originId}-${item.destinationId}`}
                  onClick={() => {
                    void applyRecentTrip(item);
                  }}
                  className="touch-target"
                  style={{
                    minHeight: '48px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: '#EEF2FF',
                    border: '1.5px solid #6366F1',
                    color: '#312E81',
                    fontSize: '13px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⚡ {fromShort} ↔ {toShort}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Thumb-Zone Controls (Story 4.1 AC-1: all interactive inputs >= 48px) */}
      <div className="thumb-zone-container" data-testid="thumb-zone-controls">
        {/* Origin & Destination Bento Card */}
        <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StationAutocomplete
            id="origin-station"
            label={`📍 ${copy.input_from}`}
            placeholder={copy.input_from_placeholder}
            selectedPlace={origin}
            onSelect={setOrigin}
            lang={lang}
            hasError={errorCode === 'SAME_PLACE' || (errorCode === 'MISSING_PLACES' && !origin)}
            showGpsButton={true}
          />

          {/* Swap Direction Button (Story 4.1 AC-3: >= 48px touch target + rotation animation) */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
            <button
              type="button"
              data-testid="swap-direction-btn"
              onClick={swapPlaces}
              className="touch-target"
              style={{
                minHeight: '48px',
                padding: '6px 18px',
                borderRadius: '999px',
                background: '#F1F5F9',
                border: '1.5px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 800,
                gap: '6px'
              }}
            >
              <span
                className="swap-btn-rotate"
                style={{
                  display: 'inline-block',
                  transform: `rotate(${swapCount * 180}deg)`
                }}
              >
                ⇅
              </span>
              <span>{lang === 'ar' ? 'عكس الاتجاه' : 'Swap'}</span>
            </button>
          </div>

          <StationAutocomplete
            id="dest-station"
            label={`🏁 ${copy.input_to}`}
            placeholder={copy.input_to_placeholder}
            selectedPlace={destination}
            onSelect={setDestination}
            lang={lang}
            hasError={errorCode === 'SAME_PLACE' || (errorCode === 'MISSING_PLACES' && !destination)}
            showGpsButton={false}
          />

          {errorMessage && (
            <div
              role="alert"
              data-testid="input-error-banner"
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#FEF2F2',
                border: '1.5px solid #EF4444',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: 800,
                textAlign: 'center'
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Vehicle Profile Segmented Control (48px min height) */}
        <div
          role="radiogroup"
          aria-label={lang === 'ar' ? 'نوع المركبة' : 'Vehicle type'}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={vehicleId === 'microbus-14'}
            data-testid="vehicle-chip-microbus-14"
            onClick={() => setVehicleId('microbus-14')}
            className="touch-target"
            style={{
              minHeight: '48px',
              background: vehicleId === 'microbus-14' ? '#0F172A' : '#FFFFFF',
              color: vehicleId === 'microbus-14' ? '#FFFFFF' : '#0F172A',
              border: `2px solid ${vehicleId === 'microbus-14' ? '#0F172A' : '#CBD5E1'}`,
              fontWeight: 800,
              fontSize: '15px'
            }}
          >
            {copy.vehicle_microbus}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={vehicleId === 'bus-49'}
            data-testid="vehicle-chip-bus-49"
            onClick={() => setVehicleId('bus-49')}
            className="touch-target"
            style={{
              minHeight: '48px',
              background: vehicleId === 'bus-49' ? '#0F172A' : '#FFFFFF',
              color: vehicleId === 'bus-49' ? '#FFFFFF' : '#0F172A',
              border: `2px solid ${vehicleId === 'bus-49' ? '#0F172A' : '#CBD5E1'}`,
              fontWeight: 800,
              fontSize: '15px'
            }}
          >
            {copy.vehicle_bus}
          </button>
        </div>

        {/* Departure Time Selector Card */}
        <TimeSelector
          departureDateUtc={departureDateUtc}
          isNowMode={isNowMode}
          onSetNow={setDepartureNow}
          onAddMinutes={addMinutesToDeparture}
          onChangeCustomDate={setDepartureDateUtc}
          lang={lang}
        />

        {/* Primary Calculate CTA (56px Height, High Contrast > 14:1) */}
        <button
          type="button"
          data-testid="calculate-trip-btn"
          disabled={isCalculating}
          onClick={() => {
            void calculateTrip();
          }}
          className="btn-primary-cta"
        >
          {isCalculating ? copy.btn_calculating : copy.btn_calculate}
        </button>
      </div>
    </main>
  );
}
