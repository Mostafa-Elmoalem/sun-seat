/**
 * Bilingual Copy Deck (Arabic Egyptian Colloquial primary, English secondary).
 * Exact tokens and copy from docs/front-end-spec.md (Section 7).
 */

export type AppLanguage = 'ar' | 'en';

export interface CopyDeck {
  app_title: string;
  app_tagline: string;
  greeting_headline: string;
  input_from: string;
  input_to: string;
  input_from_placeholder: string;
  input_to_placeholder: string;
  btn_swap: string;
  btn_gps: string;
  btn_gps_loading: string;
  vehicle_microbus: string;
  vehicle_bus: string;
  time_label: string;
  input_time_now: string;
  chip_plus_30m: string;
  chip_plus_1h: string;
  btn_calculate: string;
  btn_calculating: string;
  recent_trips_label: string;
  popular_stations_label: string;
  empty_stations: string;
  offline_badge: string;
  slow_network_badge: string;
  err_same_place: string;
  err_missing_places: string;
  err_route_missing: string;
  approx_route_badge: string;
  verdict_left: string;
  verdict_right: string;
  verdict_leaning_left: string;
  verdict_leaning_right: string;
  verdict_night: string;
  verdict_noon: string;
  verdict_tie: string;
  orientation_hint: string;
  front_of_vehicle: string;
  driver_label: string;
  aisle_label: string;
  left_side_label: string;
  right_side_label: string;
  shade_word: string;
  sun_word: string;
  confidence_high: string;
  confidence_med: string;
  confidence_low: string;
  tab_seats_2d: string;
  tab_model_3d: string;
  scrubber_title: string;
  scrubber_average_btn: string;
  scrubber_flip_alert: string;
  scrubber_disabled_night: string;
  scrubber_disabled_noon: string;
  drawer_trigger: string;
  drawer_title: string;
  drawer_step1_title: string;
  drawer_step2_title: string;
  drawer_step3_title: string;
  youtube_cta: string;
  btn_edit_trip: string;
  btn_share: string;
  btn_calc_yours: string;
  share_copied_toast: string;
  preview_3d_title: string;
  preview_3d_desc: string;
}

export const COPY_DECK: Record<AppLanguage, CopyDeck> = {
  ar: {
    app_title: 'اقعد فين؟',
    app_tagline: 'اهرب من شمس الميكروباص في ثواني',
    greeting_headline: '👋 رايح فين النهاردة؟',
    input_from: 'هتركب منين؟',
    input_to: 'رايح فين؟',
    input_from_placeholder: 'موقف عبود، الدقي، رمسيس...',
    input_to_placeholder: 'محرم بك، التجمع، طنطا...',
    btn_swap: '⇅ عكس الاتجاه',
    btn_gps: '📍 موقعي الحالي',
    btn_gps_loading: '⏳ بنحدد أقرب موقف...',
    vehicle_microbus: '🚐 ميكروباص 14',
    vehicle_bus: '🚌 أتوبيس 49',
    time_label: '🕒 ميعاد التحرك:',
    input_time_now: 'دلوقتي حالا',
    chip_plus_30m: '+30 دقيقة',
    chip_plus_1h: '+ساعة',
    btn_calculate: '🚀 احسب الضل ومكان القعدة',
    btn_calculating: '⏳ بنحسب مسار الشمس...',
    recent_trips_label: '🕒 آخر رحلاتك:',
    popular_stations_label: 'أشهر المواقف السريعة:',
    empty_stations: 'مفيش موقف بالاسم ده.. جرب أقرب مدينة',
    offline_badge: 'شغال أوفلاين بدون نت ⚡',
    slow_network_badge: 'شبكة ضعيفة.. شغالين محلياً ⚡',
    err_same_place: 'إنت كده ما اتحركتش من مكانك.. اختار محطة وصول تانية',
    err_missing_places: 'اختار محطة الانطلاق والوصول الأول',
    err_route_missing: 'المسار ده لسه بنجهزه.. جرب أقرب موقف رئيسي',
    approx_route_badge: 'مسار تقريبي (خط طيران مباشر)',
    verdict_left: 'اقعد شمال! 🪟',
    verdict_right: 'اقعد يمين! 🪟',
    verdict_leaning_left: 'خليك في الشمال أحسن 🪟',
    verdict_leaning_right: 'خليك في اليمين أحسن 🪟',
    verdict_night: 'مفيش شمس.. اركب في أي حتة براحتك 🌙',
    verdict_noon: 'الشمس فوق راسك بالظبط.. السقف حاميك ومش فارق الجنب ☀️',
    verdict_tie: 'الجنبين زي بعض تقريباً.. اركب اللي يعجبك ⚖️',
    orientation_hint: '* شمالك وإنت راكب وباصص لقدام ناحية السائق *',
    front_of_vehicle: '▲ مقدمة العربية (السائق)',
    driver_label: 'السائق 🛞',
    aisle_label: 'ممر',
    left_side_label: 'الجنب الشمال',
    right_side_label: 'الجنب اليمين',
    shade_word: 'ضل',
    sun_word: 'شمس',
    confidence_high: 'نصيحة مضمونة (الشمس ثابتة طول الطريق)',
    confidence_med: 'الشمس هتنقل في نص السكة (درجة ثقة متوسطة)',
    confidence_low: 'فرق قريب بين الجنبين (تتأثر بوقت التحرك)',
    tab_seats_2d: '💺 مخطط الكراسي 2.5D',
    tab_model_3d: '🌐 مجسم 3D',
    scrubber_title: '🕒 حرك الوقت وشوف الشمس بتلف إزاي:',
    scrubber_average_btn: 'عرض متوسط الرحلة كاملة',
    scrubber_flip_alert: '🔄 الشمس بتعكس جنبها في النقطة دي!',
    scrubber_disabled_night: '🌙 الرحلة كلها بالليل — ضل 100% طول الطريق',
    scrubber_disabled_noon: '☀️ الشمس عمودية فوق السقف معظم وقت الرحلة',
    drawer_trigger: '💡 شوف حسبناها إزاي (فلك وجغرافيا)',
    drawer_title: '🌍 ليه تقعد في الجنب ده؟',
    drawer_step1_title: '1. اتجاه المسار الجغرافي',
    drawer_step2_title: '2. موضع الشمس الفلكي (NOAA)',
    drawer_step3_title: '3. النتيجة الهندسية وحساسية الوقت',
    youtube_cta: '🎥 شوف فيديو: الجغرافيا بتنفع في إيه؟',
    btn_edit_trip: '← تعديل الرحلة',
    btn_share: '📤 شير',
    btn_calc_yours: '✨ احسب رحلتك إنت كمان',
    share_copied_toast: 'تم نسخ رابط الرحلة! ابعته لصحابك 🚐☀️',
    preview_3d_title: 'المجسم ثلاثي الأبعاد (3D WebGL)',
    preview_3d_desc: 'بيتحمل عند الطلب فقط لحماية باقة الموبايل — متاح في وضع العرض الثلاثي.'
  },
  en: {
    app_title: 'Sit Where?',
    app_tagline: 'Dodge the microbus sun in seconds',
    greeting_headline: '👋 Where are you heading today?',
    input_from: 'Departure station',
    input_to: 'Destination station',
    input_from_placeholder: 'Abboud, Dokki, Ramses...',
    input_to_placeholder: 'Moharam Bek, Tagamoa, Tanta...',
    btn_swap: '⇅ Swap Direction',
    btn_gps: '📍 Nearest to me',
    btn_gps_loading: '⏳ Locating nearest hub...',
    vehicle_microbus: '🚐 Microbus 14',
    vehicle_bus: '🚌 Coach Bus 49',
    time_label: '🕒 Departure time:',
    input_time_now: 'Right now',
    chip_plus_30m: '+30 min',
    chip_plus_1h: '+1 hour',
    btn_calculate: '🚀 Calculate Shaded Seats',
    btn_calculating: '⏳ Calculating sun path...',
    recent_trips_label: '🕒 Recent trips:',
    popular_stations_label: 'Popular hubs:',
    empty_stations: 'No station found with this name.. try nearest city',
    offline_badge: 'Offline Ready ⚡',
    slow_network_badge: 'Slow network.. running locally ⚡',
    err_same_place: 'Same origin and destination.. pick a different arrival station',
    err_missing_places: 'Please select both origin and destination stations',
    err_route_missing: 'Route coming soon.. try nearest main hub',
    approx_route_badge: 'Approximate route (direct bearing)',
    verdict_left: 'Sit on the LEFT side! 🪟',
    verdict_right: 'Sit on the RIGHT side! 🪟',
    verdict_leaning_left: 'Leaning LEFT side 🪟',
    verdict_leaning_right: 'Leaning RIGHT side 🪟',
    verdict_night: 'No sun at night, sit anywhere 🌙',
    verdict_noon: 'Sun directly overhead, roof protects you ☀️',
    verdict_tie: 'Both sides are practically equal ⚖️',
    orientation_hint: '* Your physical left facing forward towards the driver *',
    front_of_vehicle: '▲ Front of Vehicle (Driver)',
    driver_label: 'Driver 🛞',
    aisle_label: 'Aisle',
    left_side_label: 'Left Side',
    right_side_label: 'Right Side',
    shade_word: 'Shade',
    sun_word: 'Sun',
    confidence_high: 'High confidence advice (sun stays on one side)',
    confidence_med: 'Medium confidence (sun shifts mid-route)',
    confidence_low: 'Close call (sensitive to departure time)',
    tab_seats_2d: '💺 2.5D Seat Map',
    tab_model_3d: '🌐 3D Model',
    scrubber_title: '🕒 Scrub timeline to watch the sun move:',
    scrubber_average_btn: 'Show full-trip average',
    scrubber_flip_alert: '🔄 Sun flips sides at this point!',
    scrubber_disabled_night: '🌙 Night trip — 100% shade all the way',
    scrubber_disabled_noon: '☀️ High overhead sun — roof blocks direct rays',
    drawer_trigger: '💡 How we calculated it (Astronomy & Geography)',
    drawer_title: '🌍 Why sit on this side?',
    drawer_step1_title: '1. Route Bearing & Heading',
    drawer_step2_title: '2. Solar Azimuth & Elevation (NOAA)',
    drawer_step3_title: '3. Geometric Result & Time Sensitivity',
    youtube_cta: '🎥 Watch Video: What is geography even good for?',
    btn_edit_trip: '← Edit Trip',
    btn_share: '📤 Share',
    btn_calc_yours: '✨ Calculate your own trip',
    share_copied_toast: 'Trip link copied! Share it with friends 🚐☀️',
    preview_3d_title: 'Interactive 3D Vehicle View',
    preview_3d_desc: 'Lazy-loaded on demand to save mobile data.'
  }
};
