import type { TripExposureVerdict, VehicleProfile } from '../../../core/types/vehicle.ts';
import { COPY, verdictHeadline, type AppLanguage } from '../../i18n/copy.ts';
import { formatDay, formatTime } from '../../format.ts';
import { IconEdit, IconShare, IconTripArrow } from '../../shared/Icons.tsx';

/** Edit the trip, see which trip this is, share the answer. */
export function ResultBar({
  from,
  to,
  departure,
  vehicle,
  verdict,
  onEdit,
  onToast,
  lang
}: {
  from: string;
  to: string;
  departure: Date;
  vehicle: VehicleProfile;
  verdict: TripExposureVerdict;
  onEdit: () => void;
  onToast: (text: string) => void;
  lang: AppLanguage;
}) {
  const c = COPY[lang];

  const share = async () => {
    const head = verdictHeadline(verdict.status, verdict.recommendedSide, lang);
    const text = c.shareText(`${head.lead}${head.mark}${head.tail}`, from, to);
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: c.brand, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      onToast(c.copied);
    } catch {
      // The rider closed the share sheet; nothing to do.
    }
  };

  return (
    <div className="result-bar">
      <button type="button" className="btn btn-outline" onClick={onEdit} data-testid="edit-trip">
        <IconEdit />
        {c.edit}
      </button>
      <div className="trip-summary" data-testid="trip-summary">
        <p className="trip-summary-route">
          {from} <IconTripArrow rtl={lang === 'ar'} /> {to}
        </p>
        <p className="trip-summary-time">
          {formatDay(departure, lang)} · {formatTime(departure, lang)} · {vehicle.type === 'bus' ? c.bus : c.microbus}
        </p>
      </div>
      <button type="button" className="btn btn-outline" onClick={() => void share()} data-testid="share-btn">
        <IconShare />
        {c.share}
      </button>
    </div>
  );
}
