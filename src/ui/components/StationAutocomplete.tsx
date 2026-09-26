import { useState, useMemo } from 'react';
import type { Place } from '../../core/types/places.ts';
import { defaultPlacesRepository } from '../../adapters/places-repository.ts';
import { COPY_DECK, type AppLanguage } from '../i18n/copy.ts';

export interface StationAutocompleteProps {
  id: string;
  label: string;
  placeholder: string;
  selectedPlace: Place | null;
  onSelect: (place: Place) => void;
  lang: AppLanguage;
  hasError?: boolean;
  showGpsButton?: boolean;
}

export function StationAutocomplete({
  id,
  label,
  placeholder,
  selectedPlace,
  onSelect,
  lang,
  hasError = false,
  showGpsButton = false
}: StationAutocompleteProps) {
  const copy = COPY_DECK[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    return defaultPlacesRepository.search(query, 6);
  }, [query]);

  const popularHubs = useMemo(() => {
    return defaultPlacesRepository.getPopular(5);
  }, []);

  const handleSelect = (place: Place) => {
    onSelect(place);
    setQuery('');
    setIsOpen(false);
    setGpsError(null);
  };

  const handleGpsClick = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError(lang === 'ar' ? 'تحديد الموقع غير مدعوم في المتصفح' : 'Geolocation not supported');
      return;
    }
    setIsLocatingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const nearest = defaultPlacesRepository.findNearest(
          pos.coords.latitude,
          pos.coords.longitude,
          80
        );
        if (nearest) {
          handleSelect(nearest);
        } else {
          setGpsError(lang === 'ar' ? 'اختر أقرب موقف يدوياً' : 'Select nearest station manually');
        }
      },
      () => {
        setIsLocatingGps(false);
        setGpsError(lang === 'ar' ? 'تعذر الوصول للموقع — اختر من القائمة' : 'Location unavailable');
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  };

  const displayTitle = selectedPlace
    ? lang === 'ar'
      ? selectedPlace.nameAr
      : selectedPlace.nameEn
    : placeholder;

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}
      >
        <label
          htmlFor={`${id}-trigger`}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: hasError ? '#DC2626' : '#475569'
          }}
        >
          {label}
        </label>
        {showGpsButton && (
          <button
            type="button"
            onClick={handleGpsClick}
            disabled={isLocatingGps}
            data-testid={`${id}-gps-btn`}
            style={{
              minHeight: '32px',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#EFF6FF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              cursor: 'pointer'
            }}
          >
            {isLocatingGps ? copy.btn_gps_loading : copy.btn_gps}
          </button>
        )}
      </div>

      {!isOpen ? (
        <button
          id={`${id}-trigger`}
          type="button"
          data-testid={`${id}-trigger`}
          onClick={() => setIsOpen(true)}
          className="touch-target"
          style={{
            width: '100%',
            minHeight: '52px',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: hasError ? '#FEF2F2' : '#F8FAFC',
            border: `2px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
            borderRadius: '14px',
            color: selectedPlace ? '#0F172A' : '#64748B',
            fontWeight: selectedPlace ? 700 : 500,
            textAlign: lang === 'ar' ? 'right' : 'left'
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayTitle}
          </span>
          <span style={{ fontSize: '13px', color: '#6366F1', fontWeight: 700 }}>
            {lang === 'ar' ? 'تغيير ▾' : 'Change ▾'}
          </span>
        </button>
      ) : (
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #6366F1',
            borderRadius: '14px',
            padding: '8px'
          }}
        >
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input
              id={`${id}-input`}
              data-testid={`${id}-input`}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                flex: 1,
                minHeight: '48px',
                padding: '8px 12px',
                fontSize: '16px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                outline: 'none',
                color: '#0F172A',
                background: '#F8FAFC'
              }}
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="touch-target"
              aria-label={lang === 'ar' ? 'إغلاق البحث' : 'Close search'}
              style={{
                minHeight: '48px',
                minWidth: '48px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                color: '#334155',
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>

          <div
            role="listbox"
            aria-label={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '220px',
              overflowY: 'auto'
            }}
          >
            {suggestions.length === 0 ? (
              <div
                data-testid={`${id}-empty`}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#64748B',
                  fontWeight: 600
                }}
              >
                {copy.empty_stations}
              </div>
            ) : (
              suggestions.map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`${id}-option-${place.id}`}
                    onClick={() => handleSelect(place)}
                    className="touch-target"
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isSelected ? '#EEF2FF' : '#F8FAFC',
                      border: `1px solid ${isSelected ? '#6366F1' : '#E2E8F0'}`,
                      borderRadius: '10px',
                      color: '#0F172A',
                      textAlign: lang === 'ar' ? 'right' : 'left'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>
                      {lang === 'ar' ? place.nameAr : place.nameEn}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#E2E8F0',
                        color: '#334155'
                      }}
                    >
                      {place.governorateAr}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 1-Tap Popular Quick Chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '6px'
        }}
      >
        {popularHubs.map((hub) => {
          const active = selectedPlace?.id === hub.id;
          const shortNameAr = hub.aliases[0] || hub.nameAr;
          const shortNameEn = hub.nameEn.split(' ')[0] || hub.nameEn;
          return (
            <button
              key={hub.id}
              type="button"
              data-testid={`${id}-chip-${hub.id}`}
              onClick={() => handleSelect(hub)}
              style={{
                minHeight: '36px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                border: `1px solid ${active ? '#0F172A' : '#CBD5E1'}`,
                background: active ? '#0F172A' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#334155',
                cursor: 'pointer'
              }}
            >
              {lang === 'ar' ? shortNameAr : shortNameEn}
            </button>
          );
        })}
      </div>

      {gpsError && (
        <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
          {gpsError}
        </div>
      )}
    </div>
  );
}
