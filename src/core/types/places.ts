export type PlaceKind =
  | 'station'
  | 'city'
  | 'town'
  | 'district'
  | 'village'
  | 'university'
  | 'metro'
  | 'rail'
  | 'poi'
  | 'gps';

export interface Place {
  /** Hub slug ("cairo-abboud"), gazetteer id ("g:123") or coordinate id ("p:30.106,31.254"). */
  id: string;
  nameAr: string;
  nameEn: string;
  /** Short disambiguation line, e.g. the governorate or "قريب من طنطا". */
  contextAr?: string;
  contextEn?: string;
  /** Colloquial names people actually type ("عبود", "محطة مصر"). */
  aliases?: string[];
  location: {
    lat: number;
    lng: number;
  };
  kind: PlaceKind;
  /** Shown as a one-tap chip before the user types anything. */
  isPopular?: boolean;
}
