import type { Side, SunDirection, VerdictStatus, ConfidenceLevel } from '../../core/types/vehicle.ts';
import type { RouteSource } from '../../core/types/routes.ts';
import type { PlaceKind } from '../../core/types/places.ts';
import type { GpsNaming } from '../../app/trip/locate-me.ts';

export type AppLanguage = 'ar' | 'en';

/**
 * Copy deck. Egyptian colloquial first, English second.
 * Sides are always named by what the rider sees inside: the driver side and the door side.
 */
export const COPY = {
  ar: {
    brand: 'اقعد فين؟',
    intro: 'قولنا رايح فين وإمتى، نقولك تقعد <strong>ناحية أنهي شباك</strong> عشان الشمس ما تاكلكش طول السكة.',
    langToggle: 'EN',
    langToggleLabel: 'Switch to English',
    offline: 'من غير نت',
    from: 'من',
    to: 'إلى',
    fromPlaceholder: 'راكب منين؟',
    toPlaceholder: 'نازل فين؟',
    swap: 'اعكس الاتجاه',
    when: 'إمتى؟',
    date: 'اليوم',
    time: 'الساعة',
    now: 'دلوقتي',
    in30: 'بعد نص ساعة',
    in60: 'بعد ساعة',
    tomorrow: 'بكرة',
    today: 'النهارده',
    vehicle: 'راكب إيه؟',
    microbus: 'ميكروباص',
    microbusSeats: '14 كرسي',
    bus: 'أتوبيس',
    busSeats: '49 كرسي',
    cta: 'اعرف أقعد فين',
    ctaBusy: 'بنحسب الشمس والطريق',
    recents: 'مشاويرك الأخيرة',
    errMissing: 'اختار رايح منين ورايح فين',
    errSame: 'المكانين واحد، اختار مكان وصول تاني',
    // Picker
    searchPlaceholderFrom: 'اكتب موقف، حي، جامعة، أي مكان',
    searchPlaceholderTo: 'اكتب موقف، حي، جامعة، أي مكان',
    back: 'رجوع',
    clear: 'امسح',
    myLocation: 'موقعي دلوقتي',
    useMyLocation: 'أنا راكب من هنا',
    myLocationHint: 'هنستخدمه للحسبة بس، مش بنحفظه',
    locating: 'بنحدد مكانك',
    gpsDenied: 'ما قدرناش نوصل لمكانك. اكتب اسم المكان بدل كده',
    gpsNear: (name: string) => `قريب من ${name}`,
    myLocationName: 'موقعي',
    popular: 'أماكن مشهورة',
    localResults: 'أماكن في مصر',
    onlineResults: 'من الخريطة',
    searchingOnline: 'بندور في الخريطة',
    noResults: 'مش لاقيين المكان ده. جرب اسم أقرب حي أو مدينة',
    offlineSearch: 'النت فاصل، بندور في الأماكن المحفوظة بس',
    osm: 'بيانات الأماكن والطرق من © OpenStreetMap',
    // Result
    edit: 'تعديل',
    share: 'شير',
    shareText: (verdict: string, from: string, to: string) => `${verdict} في المشوار من ${from} إلى ${to}. اعرف مشوارك إنت:`,
    copied: 'اتنسخ اللينك، ابعته لصحابك',
    sideDriver: 'ناحية السواق',
    sideDoor: 'ناحية الباب',
    sitOn: 'اقعد',
    slightlyBetter: 'أحسن شوية',
    verdictTie: 'الجنبين زي بعض',
    verdictNoMatter: 'مش فارقة',
    verdictNight: 'مفيش شمس',
    subClear: (sunny: string, sunnyMin: string, other: string, otherMin: string, trip: string) =>
      `كرسي الشباك <b>${sunny}</b> هياخد شمس حوالي <b>${sunnyMin}</b> في المتوسط من رحلة ${trip}، و<b>${other}</b> حوالي <b>${otherMin}</b> بس.`,
    subTieSwitch: (first: string, firstFor: string, second: string) =>
      `الشمس هتبقى ${first} أول ${firstFor}، وبعد كده هتلف ${second}. الفرق بين الجنبين صغير، اقعد في النص لو لقيت.`,
    subTie: (min: string) => `الجنبين هياخدوا شمس قريبة من بعض (حوالي ${min}). الكراسي اللي في النص أبرد.`,
    subNoMatterHigh: 'اقعد في أي حتة: الشمس عالية فوق السقف، والشبابيك مش هيدخل منها شمس تذكر.',
    subNoMatterLow: 'اقعد في أي حتة: الشمس هتبقى قدام أو ورا العربية أو واطية أوي، فمش هتفرق جنب عن جنب.',
    subNight: (sunrise: string) => `الرحلة كلها بالليل${sunrise ? `، والشمس بتطلع ${sunrise}` : ''}. اقعد في أي كرسي يريحك.`,
    teacherClear: 'صح كده',
    confidence: {
      HIGH: 'النتيجة ثابتة حتى لو اتأخرت أو اتقدمت نص ساعة',
      MEDIUM: 'النتيجة ثابتة في أغلب الحالات، إلا لو ميعادك اتغير كتير',
      LOW: 'النتيجة ممكن تتقلب لو ميعادك اتغير نص ساعة'
    } as Record<ConfidenceLevel, string>,
    bestSeats: 'أحسن كراسي',
    seatPlan: 'الكراسي',
    seatPlanHint: 'الأصفر شمس والأبيض ضل. الرقم تحت كل كرسي هو دقايق الشمس اللي هتقع على اللي قاعد عليه. دوس على أي كرسي.',
    seatPlanLive: (time: string) => `الشمس الساعة ${time}`,
    seatPlanTotal: 'مجموع الرحلة',
    front: 'قدام',
    driver: 'السواق',
    door: 'الباب',
    legendSun: 'شمس معظم الوقت',
    legendSome: 'شمس شوية',
    legendShade: 'ضل',
    seat: 'كرسي',
    seatSunMinutes: (m: string) => `${m} شمس`,
    seatNoSun: 'مفيش شمس خالص',
    seatWindow: 'جنب الشباك',
    seatInner: 'مش جنب الشباك',
    sunAlongTrip: 'الشمس طول الطريق',
    rulerHint: 'حرّك المؤشر وشوف الشمس فين في أي لحظة',
    rulerAverage: 'رجّع لمجموع الرحلة',
    departure: 'التحرك',
    arrival: 'الوصول',
    sunNow: (side: string) => side,
    spanOn: (side: string, from: string, to: string) => `${from} لـ ${to}: ${side}`,
    dir: {
      left: 'الشمس جاية من ناحية السواق',
      right: 'الشمس جاية من ناحية الباب',
      front: 'الشمس قدام العربية',
      rear: 'الشمس ورا العربية',
      overhead: 'الشمس فوق السقف',
      none: 'مفيش شمس'
    } as Record<SunDirection, string>,
    routeFigure: 'الطريق والشمس',
    routeCaption: (km: string, heading: string) => `المسافة ${km} كم، والطريق رايح ناحية ${heading} في المتوسط.`,
    north: 'ش',
    source: {
      precomputed: 'طريق حقيقي من الخريطة',
      live: 'طريق حقيقي من الخريطة',
      cached: 'طريق حقيقي محفوظ على موبايلك',
      straight: 'مسار تقريبي (خط مستقيم) لأن النت مش متاح'
    } as Record<RouteSource, string>,
    compass: ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي'],
    threeTitle: 'شوفها من جوه العربية',
    threeLoad: 'افتح العربية 3D',
    threeCost: 'بيحمّل حوالي 160 KB مرة واحدة بس',
    threeLoading: 'بنجهز العربية',
    threeFailed: 'العرض 3D مش شغال على الموبايل ده. خريطة الكراسي فوق فيها نفس النتيجة.',
    threeViews: { outside: 'من برة', top: 'من فوق', seat: 'من كرسيك' },
    threePlay: 'شغّل الرحلة',
    threePause: 'وقف',
    howTitle: 'حسبناها إزاي؟',
    how: [
      'جبنا الطريق الحقيقي من خريطة OpenStreetMap، وعرفنا العربية رايحة ناحية فين في كل دقيقة من المشوار.',
      'حسبنا مكان الشمس في السما لكل دقيقة بتوقيت القاهرة، على الموبايل نفسه من غير نت.',
      'رمينا شعاع من كل راكب ناحية الشمس: لو عدى من شباك يبقى شمس، ولو خبط في السقف أو في راكب جنبه يبقى ضل.'
    ],
    howAssume: 'افترضنا إن العربية مليانة والشبابيك من غير ستاير ولا فاميه، والشمس ما عليهاش سحاب.',
    sensitivityTitle: 'لو ميعادك اتغير',
    scenario: { early: 'لو اتحركت بدري نص ساعة', late: 'لو اتأخرت نص ساعة', slow: 'لو الطريق زحمة', fast: 'لو الطريق فاضي' } as Record<string, string>,
    either: 'زي بعض',
    weatherCloudy: (pct: number) => `السما فيها سحاب حوالي ${pct}%، الشمس ممكن تبقى أخف من كده.`,
    busCurtains: 'الأتوبيس فيه ستاير غالبا، بس الجنب اللي فيه شمس هيفضل أحر.',
    newVersion: 'فيه نسخة جديدة من الموقع',
    update: 'حدّث',
    calcYours: 'احسب مشوارك إنت'
  },
  en: {
    brand: 'Sit Where?',
    intro: 'Tell us where and when, and we tell you <strong>which window side</strong> stays out of the sun for the whole ride.',
    langToggle: 'عربي',
    langToggleLabel: 'التبديل للعربية',
    offline: 'Offline',
    from: 'From',
    to: 'To',
    fromPlaceholder: 'Getting on where?',
    toPlaceholder: 'Getting off where?',
    swap: 'Swap direction',
    when: 'When?',
    date: 'Day',
    time: 'Time',
    now: 'Now',
    in30: 'In 30 min',
    in60: 'In 1 hour',
    tomorrow: 'Tomorrow',
    today: 'Today',
    vehicle: 'Riding what?',
    microbus: 'Microbus',
    microbusSeats: '14 seats',
    bus: 'Coach',
    busSeats: '49 seats',
    cta: 'Show me where to sit',
    ctaBusy: 'Working out sun and road',
    recents: 'Recent trips',
    errMissing: 'Pick where you are going from and to',
    errSame: 'Both places are the same, pick another destination',
    searchPlaceholderFrom: 'Terminal, district, university, anywhere',
    searchPlaceholderTo: 'Terminal, district, university, anywhere',
    back: 'Back',
    clear: 'Clear',
    myLocation: 'My current location',
    useMyLocation: 'Start from where I am',
    myLocationHint: 'Used for this calculation only, never stored',
    locating: 'Finding you',
    gpsDenied: 'Could not get your location. Type the place instead',
    gpsNear: (name: string) => `near ${name}`,
    myLocationName: 'My location',
    popular: 'Popular places',
    localResults: 'Places in Egypt',
    onlineResults: 'From the map',
    searchingOnline: 'Searching the map',
    noResults: 'No match. Try the nearest district or city',
    offlineSearch: 'You are offline, searching saved places only',
    osm: 'Place and road data © OpenStreetMap',
    edit: 'Edit',
    share: 'Share',
    shareText: (verdict: string, from: string, to: string) => `${verdict} on the trip from ${from} to ${to}. Check your own trip:`,
    copied: 'Link copied, send it to friends',
    sideDriver: 'the driver side',
    sideDoor: 'the door side',
    sitOn: 'Sit on',
    slightlyBetter: 'is slightly better',
    verdictTie: 'Both sides are about equal',
    verdictNoMatter: 'It does not matter',
    verdictNight: 'No sun',
    subClear: (sunny: string, sunnyMin: string, other: string, otherMin: string, trip: string) =>
      `A window seat on <b>${sunny}</b> gets about <b>${sunnyMin}</b> of sun on average over a ${trip} trip; on <b>${other}</b>, only <b>${otherMin}</b>.`,
    subTieSwitch: (first: string, firstFor: string, second: string) =>
      `The sun is on ${first} for the first ${firstFor}, then moves to ${second}. The difference is small; the middle seats stay coolest.`,
    subTie: (min: string) => `Both sides get similar sun (about ${min}). The middle seats stay coolest.`,
    subNoMatterHigh: 'Sit anywhere: the sun is high over the roof and hardly any comes through the windows.',
    subNoMatterLow: 'Sit anywhere: the sun stays ahead, behind, or too low, so neither side gets much.',
    subNight: (sunrise: string) => `The whole trip is after dark${sunrise ? `; the sun rises at ${sunrise}` : ''}. Sit wherever you like.`,
    teacherClear: 'Correct',
    confidence: {
      HIGH: 'Holds even if you leave 30 minutes earlier or later',
      MEDIUM: 'Holds in most cases unless your time changes a lot',
      LOW: 'Could flip if you leave 30 minutes earlier or later'
    } as Record<ConfidenceLevel, string>,
    bestSeats: 'Best seats',
    seatPlan: 'Seats',
    seatPlanHint: 'Yellow is sun, white is shade. The number under each seat is minutes of sun. Tap any seat.',
    seatPlanLive: (time: string) => `Sun at ${time}`,
    seatPlanTotal: 'Whole trip',
    front: 'Front',
    driver: 'Driver',
    door: 'Door',
    legendSun: 'Sun most of the time',
    legendSome: 'Some sun',
    legendShade: 'Shade',
    seat: 'Seat',
    seatSunMinutes: (m: string) => `${m} of sun`,
    seatNoSun: 'No sun at all',
    seatWindow: 'Window seat',
    seatInner: 'Not by a window',
    sunAlongTrip: 'Sun along the road',
    rulerHint: 'Drag to see where the sun is at any moment',
    rulerAverage: 'Back to whole trip',
    departure: 'Leave',
    arrival: 'Arrive',
    sunNow: (side: string) => side,
    spanOn: (side: string, from: string, to: string) => `${from} to ${to}: ${side}`,
    dir: {
      left: 'Sun coming from the driver side',
      right: 'Sun coming from the door side',
      front: 'Sun ahead',
      rear: 'Sun behind',
      overhead: 'Sun over the roof',
      none: 'No sun'
    } as Record<SunDirection, string>,
    routeFigure: 'Road and sun',
    routeCaption: (km: string, heading: string) => `${km} km, heading ${heading} on average.`,
    north: 'N',
    source: {
      precomputed: 'Real road route from the map',
      live: 'Real road route from the map',
      cached: 'Real road route saved on your phone',
      straight: 'Approximate straight line, no connection right now'
    } as Record<RouteSource, string>,
    compass: ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west'],
    threeTitle: 'See it inside the vehicle',
    threeLoad: 'Open the 3D view',
    threeCost: 'Loads about 160 KB, once',
    threeLoading: 'Preparing the vehicle',
    threeFailed: '3D does not work on this phone. The seat map above shows the same result.',
    threeViews: { outside: 'Outside', top: 'From above', seat: 'From your seat' },
    threePlay: 'Play the trip',
    threePause: 'Pause',
    howTitle: 'How did we work it out?',
    how: [
      'We take the real road from OpenStreetMap and the direction the vehicle faces at every minute of the trip.',
      'We compute where the sun is for every minute in Cairo time, on your phone, with no internet.',
      'We cast a ray from each passenger towards the sun: through a window means sun, into the roof or a neighbor means shade.'
    ],
    howAssume: 'We assume a full vehicle, no curtains or tint, and a clear sky.',
    sensitivityTitle: 'If your time changes',
    scenario: { early: 'Leave 30 min earlier', late: 'Leave 30 min later', slow: 'Heavy traffic', fast: 'Empty road' } as Record<string, string>,
    either: 'Equal',
    weatherCloudy: (pct: number) => `About ${pct}% cloud cover; the sun may be softer than this.`,
    busCurtains: 'Coaches usually have curtains, but the sunny side still runs hotter.',
    newVersion: 'A new version is available',
    update: 'Update',
    calcYours: 'Check your own trip'
  }
} as const;

/** How a GPS fix is named in both languages. */
export const GPS_NAMING: GpsNaming = {
  nameAr: COPY.ar.myLocationName,
  nameEn: COPY.en.myLocationName,
  nearAr: COPY.ar.gpsNear,
  nearEn: COPY.en.gpsNear
};

export function sideName(side: Side, lang: AppLanguage): string {
  const c = COPY[lang];
  return side === 'left' ? c.sideDriver : c.sideDoor;
}

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

/** Egyptian colloquial durations: "دقيقة", "دقيقتين", "5 دقايق", "ساعة و 20 دقيقة". */
export function formatDuration(totalMinutes: number, lang: AppLanguage): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (lang === 'en') {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h} h` : `${h} h ${r} min`;
  }
  const minutes = (n: number) => (n === 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? `${n} دقايق` : `${n} دقيقة`);
  const hours = (n: number) => (n === 1 ? 'ساعة' : n === 2 ? 'ساعتين' : n <= 10 ? `${n} ساعات` : `${n} ساعة`);
  if (m === 0) return 'ولا دقيقة';
  if (m < 60) return minutes(m);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return hours(h);
  if (r === 30) return `${hours(h)} ونص`;
  if (r === 15) return `${hours(h)} وربع`;
  return `${hours(h)} و${minutes(r)}`;
}

export function compassName(deg: number, lang: AppLanguage): string {
  const names = COPY[lang].compass;
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

export function verdictHeadline(status: VerdictStatus, side: Side | 'either', lang: AppLanguage): { lead: string; mark: string; tail: string } {
  const c = COPY[lang];
  if (status === 'CLEAR' && side !== 'either') return { lead: `${c.sitOn} `, mark: sideName(side, lang), tail: '' };
  if (status === 'LEANING' && side !== 'either') {
    return lang === 'ar'
      ? { lead: '', mark: sideName(side, lang), tail: ` ${c.slightlyBetter}` }
      : { lead: `${c.sitOn} `, mark: sideName(side, lang), tail: ', slightly better' };
  }
  if (status === 'TIE') return { lead: '', mark: c.verdictTie, tail: '' };
  if (status === 'NIGHT') return { lead: '', mark: c.verdictNight, tail: '' };
  return { lead: '', mark: c.verdictNoMatter, tail: '' };
}

export function placeKindLabel(kind: PlaceKind, lang: AppLanguage): string {
  const ar: Record<PlaceKind, string> = {
    station: 'موقف',
    city: 'مدينة',
    town: 'مدينة',
    district: 'حي',
    village: 'قرية',
    university: 'جامعة',
    metro: 'مترو',
    rail: 'محطة قطر',
    poi: 'مكان',
    gps: 'موقعك'
  };
  const en: Record<PlaceKind, string> = {
    station: 'Terminal',
    city: 'City',
    town: 'Town',
    district: 'District',
    village: 'Village',
    university: 'University',
    metro: 'Metro',
    rail: 'Railway',
    poi: 'Place',
    gps: 'You'
  };
  return (lang === 'ar' ? ar : en)[kind];
}
