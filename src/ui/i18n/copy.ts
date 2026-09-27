import type { Side, SunDirection, VerdictStatus, ConfidenceLevel, EndAdvice } from '../../core/types/vehicle.ts';
import type { RouteSource } from '../../core/types/routes.ts';
import type { PlaceKind } from '../../core/types/places.ts';

export type AppLanguage = 'ar' | 'en';

/**
 * Copy deck. Egyptian colloquial first, English second. Short on purpose: the
 * pictures carry the answer, the words only name what the rider is looking at.
 * Sides are always named by what the rider sees inside: the driver side and the door side.
 */
export const COPY = {
  ar: {
    brand: 'اقعد فين؟',
    tagline: 'بنحسب الشمس على كل كرسي في مشوارك',
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
    sunHeight: (deg: number) => `الشمس على ارتفاع ${deg}°`,
    sunDown: 'الشمس غايبة في الميعاد ده',
    vehicle: 'راكب إيه؟',
    microbus: 'ميكروباص',
    microbusSeats: '14 كرسي',
    bus: 'أتوبيس',
    busSeats: '49 كرسي',
    cta: 'اعرف أقعد فين',
    ctaBusy: 'بنحسب الشمس والطريق',
    recents: 'آخر مشاوير',
    errMissing: 'اختار رايح منين ورايح فين',
    errSame: 'المكانين واحد، اختار مكان وصول تاني',
    // Picker
    searchPlaceholderFrom: 'اكتب موقف، حي، جامعة، أي مكان',
    searchPlaceholderTo: 'اكتب موقف، حي، جامعة، أي مكان',
    back: 'رجوع',
    clear: 'امسح',
    myLocation: 'موقعي دلوقتي',
    useMyLocation: 'أنا هنا',
    useMyLocationLabel: 'استخدم موقعي كمكان الركوب',
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
    sideDriverShort: 'السواق',
    sideDoorShort: 'الباب',
    sitOn: 'اقعد',
    slightlyBetter: 'أحسن شوية',
    verdictTie: 'الناحيتين زي بعض',
    verdictNoMatter: 'مش فارقة',
    verdictNight: 'مفيش شمس',
    subSides: (sunny: string, sunnyMin: string, good: string, goodMin: string) =>
      `شباك ${sunny} هياخد شمس <b>${sunnyMin}</b>، وشباك ${good} <b>${goodMin}</b> بس.`,
    subTieSwitch: (first: string, firstFor: string, second: string) => `الشمس ${first} أول ${firstFor}، وبعدين تلف ${second}.`,
    subTie: (min: string) => `الناحيتين هياخدوا حوالي ${min}. الكراسي اللي في النص أبرد.`,
    subNoMatterHigh: 'الشمس عالية فوق السقف.',
    subNoMatterLow: 'الشمس قدام أو ورا العربية أغلب الوقت.',
    subNight: (sunrise: string) => `الرحلة كلها بالليل${sunrise ? `، والشمس بتطلع ${sunrise}` : ''}.`,
    endAdvice: {
      'avoid-back': 'ابعد عن الكنبة الورانية',
      'avoid-front': 'ابعد عن الكراسي اللي قدام'
    } as Record<Exclude<EndAdvice, null>, string>,
    endAdviceWhy: {
      'avoid-back': 'الشمس داخلة من الإزاز الورّاني على ضهر اللي قاعدين فيها',
      'avoid-front': 'الشمس داخلة من الإزاز الأمامي'
    } as Record<Exclude<EndAdvice, null>, string>,
    backSun: 'شمس في الضهر',
    frontSun: 'شمس من قدام',
    confidence: {
      HIGH: 'ثابتة حتى لو اتأخرت أو اتقدمت نص ساعة',
      MEDIUM: 'ثابتة في أغلب الحالات، إلا لو ميعادك اتغير كتير',
      LOW: 'ممكن تتقلب لو ميعادك اتغير نص ساعة'
    } as Record<ConfidenceLevel, string>,
    bestSeats: 'أحسن كراسي',
    seatsLabel: 'الكراسي',
    wholeTrip: 'الرحلة كلها',
    atTime: (time: string) => `الساعة ${time}`,
    backToTrip: 'ارجع للرحلة كلها',
    front: 'قدام',
    driver: 'السواق',
    legendStrong: 'شمس',
    legendLight: 'شمس خفيفة',
    legendShade: 'ضل',
    seat: 'كرسي',
    seatStrong: (m: string) => `${m} شمس`,
    seatLight: (m: string) => `${m} شمس خفيفة`,
    seatNoSun: 'ضل طول السكة',
    seatNow: { strong: 'في الشمس دلوقتي', light: 'شمس خفيفة دلوقتي', none: 'في الضل دلوقتي' },
    minutesShort: (n: number) => `${n} د`,
    stripLabel: 'حرّك الوقت وشوف الشمس بتتحرك',
    departure: 'التحرك',
    arrival: 'الوصول',
    dir: {
      left: 'الشمس جاية من ناحية السواق',
      right: 'الشمس جاية من ناحية الباب',
      front: 'الشمس قدام العربية',
      rear: 'الشمس ورا العربية',
      overhead: 'الشمس فوق السقف',
      none: 'مفيش شمس'
    } as Record<SunDirection, string>,
    routeFigure: 'الطريق والشمس',
    routeCaption: (km: string, heading: string) => `${km} كم، رايح ناحية ${heading} في المتوسط`,
    north: 'ش',
    source: {
      precomputed: 'طريق حقيقي من الخريطة',
      live: 'طريق حقيقي من الخريطة',
      cached: 'طريق حقيقي محفوظ على موبايلك',
      straight: 'مسار تقريبي (خط مستقيم) لأن النت مش متاح'
    } as Record<RouteSource, string>,
    compass: ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي'],
    threeLabel: 'العربية 3D',
    threeLoad: 'اعرض العربية 3D',
    threeCost: (kb: number) => `حوالي ${kb} KB مرة واحدة بس`,
    threeLoading: 'بنجهز العربية',
    threeFailed: 'العرض 3D مش شغال على الموبايل ده. مخطط الكراسي فوق فيه نفس النتيجة.',
    threeViews: { outside: 'من برة', top: 'من فوق', seat: 'من كرسيك' },
    threePlay: 'شغّل الرحلة',
    threePause: 'وقف',
    threeYou: 'إنت هنا',
    howTitle: 'إزاي حسبناها؟',
    sidesTitle: 'الشمس على كل ناحية',
    sidesCaption: 'متوسط كرسي الشباك في كل ناحية',
    how: [
      'الطريق الحقيقي من خريطة OpenStreetMap، واتجاه العربية في كل دقيقة.',
      'مكان الشمس في كل دقيقة بتوقيت القاهرة، محسوب على موبايلك.',
      'شعاع من كل راكب ناحية الشمس: لو عدى من إزاز يبقى شمس، ولو خبط في السقف أو كرسي أو راكب يبقى ضل.'
    ],
    howAssume: 'افترضنا العربية مليانة، والشبابيك من غير ستاير ولا فاميه، والسما صافية.',
    sensitivityTitle: 'لو ميعادك اتغير',
    scenario: { early: 'بدري نص ساعة', late: 'متأخر نص ساعة', slow: 'الطريق زحمة', fast: 'الطريق فاضي' } as Record<string, string>,
    either: 'زي بعض',
    caseLabel: 'الحالة',
    sitLabel: 'اقعد',
    weatherCloudy: (pct: number) => `السما فيها سحاب حوالي ${pct}%، الشمس ممكن تبقى أخف.`,
    busCurtains: 'الأتوبيس فيه ستاير غالبا، بس الناحية اللي فيها شمس هتفضل أحر.',
    newVersion: 'فيه نسخة جديدة من الموقع',
    update: 'حدّث',
    calcYours: 'احسب مشوارك إنت',
    another: 'احسب مشوار تاني',
    footer: 'الشمس محسوبة على موبايلك. الأماكن والطرق من © OpenStreetMap. مش بنحفظ مكانك.'
  },
  en: {
    brand: 'Sit Where?',
    tagline: 'We work out the sun on every seat of your trip',
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
    sunHeight: (deg: number) => `Sun ${deg}° above the horizon`,
    sunDown: 'The sun is down at this time',
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
    useMyLocation: 'I am here',
    useMyLocationLabel: 'Use my location as the start',
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
    sideDriverShort: 'Driver',
    sideDoorShort: 'Door',
    sitOn: 'Sit on',
    slightlyBetter: 'is slightly better',
    verdictTie: 'Both sides are about equal',
    verdictNoMatter: 'It does not matter',
    verdictNight: 'No sun',
    subSides: (sunny: string, sunnyMin: string, good: string, goodMin: string) =>
      `A window on ${sunny} gets <b>${sunnyMin}</b> of sun; on ${good}, only <b>${goodMin}</b>.`,
    subTieSwitch: (first: string, firstFor: string, second: string) => `The sun is on ${first} for the first ${firstFor}, then moves to ${second}.`,
    subTie: (min: string) => `Both sides get about ${min}. The middle seats stay coolest.`,
    subNoMatterHigh: 'The sun is high over the roof.',
    subNoMatterLow: 'The sun stays ahead of or behind the vehicle.',
    subNight: (sunrise: string) => `The whole trip is after dark${sunrise ? `; sunrise is at ${sunrise}` : ''}.`,
    endAdvice: {
      'avoid-back': 'Avoid the back bench',
      'avoid-front': 'Avoid the front seats'
    } as Record<Exclude<EndAdvice, null>, string>,
    endAdviceWhy: {
      'avoid-back': 'The sun comes through the rear glass onto their backs',
      'avoid-front': 'The sun comes through the windshield'
    } as Record<Exclude<EndAdvice, null>, string>,
    backSun: 'Sun on backs',
    frontSun: 'Sun from ahead',
    confidence: {
      HIGH: 'Holds even if you leave 30 minutes earlier or later',
      MEDIUM: 'Holds in most cases unless your time changes a lot',
      LOW: 'Could flip if you leave 30 minutes earlier or later'
    } as Record<ConfidenceLevel, string>,
    bestSeats: 'Best seats',
    seatsLabel: 'Seats',
    wholeTrip: 'Whole trip',
    atTime: (time: string) => `At ${time}`,
    backToTrip: 'Back to the whole trip',
    front: 'Front',
    driver: 'Driver',
    legendStrong: 'Sun',
    legendLight: 'Light sun',
    legendShade: 'Shade',
    seat: 'Seat',
    seatStrong: (m: string) => `${m} of sun`,
    seatLight: (m: string) => `${m} of light sun`,
    seatNoSun: 'Shade all the way',
    seatNow: { strong: 'In the sun now', light: 'Light sun now', none: 'In shade now' },
    minutesShort: (n: number) => `${n}m`,
    stripLabel: 'Slide the time and watch the sun move',
    departure: 'Leave',
    arrival: 'Arrive',
    dir: {
      left: 'Sun coming from the driver side',
      right: 'Sun coming from the door side',
      front: 'Sun ahead',
      rear: 'Sun behind',
      overhead: 'Sun over the roof',
      none: 'No sun'
    } as Record<SunDirection, string>,
    routeFigure: 'Road and sun',
    routeCaption: (km: string, heading: string) => `${km} km, heading ${heading} on average`,
    north: 'N',
    source: {
      precomputed: 'Real road route from the map',
      live: 'Real road route from the map',
      cached: 'Real road route saved on your phone',
      straight: 'Approximate straight line, no connection right now'
    } as Record<RouteSource, string>,
    compass: ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west'],
    threeLabel: 'The vehicle in 3D',
    threeLoad: 'Show the vehicle in 3D',
    threeCost: (kb: number) => `About ${kb} KB, once`,
    threeLoading: 'Preparing the vehicle',
    threeFailed: '3D does not work on this phone. The seat plan above shows the same result.',
    threeViews: { outside: 'Outside', top: 'From above', seat: 'From your seat' },
    threePlay: 'Play the trip',
    threePause: 'Pause',
    threeYou: 'You',
    howTitle: 'How did we work it out?',
    sidesTitle: 'Sun on each side',
    sidesCaption: 'Average window seat on each side',
    how: [
      'The real road from OpenStreetMap, and the direction the vehicle faces every minute.',
      'The sun position for every minute in Cairo time, computed on your phone.',
      'A ray from each passenger towards the sun: through glass is sun; into the roof, a seat or a person is shade.'
    ],
    howAssume: 'We assume a full vehicle, no curtains or tint, and a clear sky.',
    sensitivityTitle: 'If your time changes',
    scenario: { early: '30 min earlier', late: '30 min later', slow: 'Heavy traffic', fast: 'Empty road' } as Record<string, string>,
    either: 'Equal',
    caseLabel: 'Case',
    sitLabel: 'Sit',
    weatherCloudy: (pct: number) => `About ${pct}% cloud cover; the sun may be softer.`,
    busCurtains: 'Coaches usually have curtains, but the sunny side still runs hotter.',
    newVersion: 'A new version is available',
    update: 'Update',
    calcYours: 'Check your own trip',
    another: 'Check another trip',
    footer: 'The sun is computed on your phone. Places and roads © OpenStreetMap. Your location is never stored.'
  }
} as const;

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
