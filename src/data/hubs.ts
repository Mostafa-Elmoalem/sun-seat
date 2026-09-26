import type { Place, PlaceKind } from '../core/types/places.ts';

/**
 * Curated hubs: the microbus terminals, cities, districts and universities people
 * search for most. Bundled with the app so the first search works instantly and
 * offline. Coordinates come from OpenStreetMap (verified 2026-09-26).
 * Everything else comes from the lazily loaded OSM gazetteer or online search.
 */
type HubRow = [
  id: string,
  nameAr: string,
  nameEn: string,
  contextAr: string,
  lat: number,
  lng: number,
  kind: PlaceKind,
  aliases: string[],
  popular?: boolean
];

const ROWS: HubRow[] = [
  // Greater Cairo microbus terminals
  ['cairo-abboud', 'موقف عبود', 'Abboud Terminal', 'شبرا الخيمة', 30.10565, 31.25449, 'station', ['عبود', 'abboud'], true],
  ['cairo-turgoman', 'موقف الترجمان', 'Turgoman Bus Terminal', 'القاهرة', 30.05816, 31.23823, 'station', ['الترجمان', 'ميناء القاهرة البري', 'turgoman', 'cairo gateway']],
  ['cairo-ramses', 'رمسيس (محطة مصر)', 'Ramses Station', 'القاهرة', 30.0626, 31.2466, 'rail', ['رمسيس', 'محطة مصر', 'ميدان رمسيس', 'ramses'], true],
  ['cairo-ahmed-helmy', 'موقف أحمد حلمي', 'Ahmed Helmy Terminal', 'القاهرة', 30.06461, 31.246, 'station', ['احمد حلمي', 'ahmed helmy']],
  ['giza-moneeb', 'موقف المنيب', 'El Moneeb Terminal', 'الجيزة', 29.9838, 31.21263, 'station', ['المنيب', 'moneeb'], true],
  ['cairo-marg', 'موقف المرج الجديدة', 'New Marg Terminal', 'القاهرة', 30.16327, 31.33908, 'station', ['المرج', 'marg']],
  ['cairo-salam', 'موقف السلام', 'El Salam Terminal', 'القاهرة', 30.15506, 31.40837, 'station', ['السلام', 'مدينة السلام', 'salam']],
  ['giza-square', 'ميدان الجيزة', 'Giza Square', 'الجيزة', 30.01551, 31.21225, 'district', ['الجيزة', 'giza']],
  ['cairo-tahrir', 'التحرير (وسط البلد)', 'Tahrir (Downtown)', 'القاهرة', 30.04439, 31.23575, 'district', ['التحرير', 'وسط البلد', 'عبد المنعم رياض', 'downtown', 'tahrir']],

  // Greater Cairo districts and new cities
  ['giza-dokki', 'الدقي', 'Dokki', 'الجيزة', 30.0389, 31.2126, 'district', ['dokki'], true],
  ['giza-mohandessin', 'المهندسين', 'Mohandessin', 'الجيزة', 30.05, 31.2, 'district', ['mohandessin']],
  ['giza-haram', 'الهرم', 'Haram', 'الجيزة', 29.9926, 31.1476, 'district', ['شارع الهرم', 'فيصل', 'haram', 'faisal']],
  ['cairo-heliopolis', 'مصر الجديدة', 'Heliopolis', 'القاهرة', 30.1006, 31.3329, 'district', ['هليوبوليس', 'الكوربة', 'heliopolis']],
  ['cairo-nasr-city', 'مدينة نصر', 'Nasr City', 'القاهرة', 30.0521, 31.3422, 'district', ['نصر', 'nasr city'], true],
  ['cairo-maadi', 'المعادي', 'Maadi', 'القاهرة', 29.9602, 31.2569, 'district', ['maadi']],
  ['cairo-shubra', 'شبرا', 'Shubra', 'القاهرة', 30.0781, 31.2446, 'district', ['شبرا مصر', 'shubra']],
  ['cairo-abbasiya', 'العباسية', 'Abbasiya', 'القاهرة', 30.0725, 31.2844, 'district', ['abbasiya']],
  ['cairo-mokattam', 'المقطم', 'Mokattam', 'القاهرة', 30.01668, 31.28429, 'district', ['mokattam']],
  ['cairo-helwan', 'حلوان', 'Helwan', 'القاهرة', 29.85, 31.3333, 'city', ['helwan']],
  ['cairo-new-cairo', 'التجمع الخامس (القاهرة الجديدة)', 'New Cairo (5th Settlement)', 'القاهرة', 30.0278, 31.4757, 'city', ['التجمع', 'التجمع الخامس', 'القاهرة الجديدة', 'tagamoa', 'new cairo'], true],
  ['cairo-shorouk', 'الشروق', 'El Shorouk', 'القاهرة', 30.1489, 31.6296, 'city', ['shorouk']],
  ['cairo-badr', 'مدينة بدر', 'Badr City', 'القاهرة', 30.1428, 31.7428, 'city', ['بدر', 'badr']],
  ['cairo-new-capital', 'العاصمة الإدارية', 'New Administrative Capital', 'القاهرة', 30.0238, 31.7549, 'city', ['العاصمة', 'العاصمة الادارية الجديدة', 'new capital']],
  ['qalyubia-obour', 'العبور', 'El Obour', 'القليوبية', 30.1914, 31.4505, 'city', ['obour']],
  ['giza-october', '6 أكتوبر', '6th of October', 'الجيزة', 29.9723, 30.9409, 'city', ['اكتوبر', 'السادس من اكتوبر', 'october'], true],
  ['giza-zayed', 'الشيخ زايد', 'Sheikh Zayed', 'الجيزة', 30.0483, 30.9832, 'city', ['زايد', 'zayed']],
  ['sharqia-10th-ramadan', 'العاشر من رمضان', '10th of Ramadan', 'الشرقية', 30.3154, 31.7393, 'city', ['العاشر', '10th of ramadan']],

  // Universities (students are the core audience)
  ['uni-cairo', 'جامعة القاهرة', 'Cairo University', 'الجيزة', 30.025, 31.2049, 'university', ['cairo university', 'جامعه القاهره']],
  ['uni-ain-shams', 'جامعة عين شمس', 'Ain Shams University', 'القاهرة', 30.0758, 31.2855, 'university', ['عين شمس', 'ain shams']],
  ['uni-azhar', 'جامعة الأزهر (مدينة نصر)', 'Al-Azhar University', 'القاهرة', 30.057, 31.3152, 'university', ['الازهر', 'azhar']],
  ['uni-helwan', 'جامعة حلوان', 'Helwan University', 'القاهرة', 29.8668, 31.3152, 'university', ['helwan university']],
  ['uni-alex', 'جامعة الإسكندرية', 'Alexandria University', 'الإسكندرية', 31.2105, 29.9131, 'university', ['alexandria university']],
  ['uni-mansoura', 'جامعة المنصورة', 'Mansoura University', 'الدقهلية', 31.0408, 31.3591, 'university', ['mansoura university']],
  ['uni-zagazig', 'جامعة الزقازيق', 'Zagazig University', 'الشرقية', 30.5885, 31.4819, 'university', ['zagazig university']],
  ['uni-tanta', 'جامعة طنطا', 'Tanta University', 'الغربية', 30.8001, 30.9924, 'university', ['tanta university']],
  ['uni-assiut', 'جامعة أسيوط', 'Assiut University', 'أسيوط', 27.1879, 31.1702, 'university', ['assiut university']],

  // Alexandria
  ['alex-moharam-bek', 'موقف محرم بك', 'Moharam Bek Terminal', 'الإسكندرية', 31.17855, 29.91486, 'station', ['محرم بك', 'الموقف الجديد', 'moharam bek'], true],
  ['alex-sidi-gaber', 'سيدي جابر', 'Sidi Gaber', 'الإسكندرية', 31.22047, 29.94264, 'rail', ['محطة سيدي جابر', 'sidi gaber']],
  ['alex-raml', 'محطة الرمل', 'Raml Station', 'الإسكندرية', 31.20124, 29.90085, 'district', ['الرمل', 'raml']],
  ['alex-smouha', 'سموحة', 'Smouha', 'الإسكندرية', 31.21568, 29.94218, 'district', ['smouha']],
  ['alex-agami', 'العجمي', 'Agami', 'الإسكندرية', 31.1406, 29.7853, 'district', ['agami']],
  ['alex-borg-el-arab', 'برج العرب', 'Borg El Arab', 'الإسكندرية', 30.8981, 29.5424, 'city', ['borg el arab']],

  // Delta
  ['gharbia-tanta', 'طنطا', 'Tanta', 'الغربية', 30.7834, 30.9983, 'city', ['موقف سبرباي', 'tanta'], true],
  ['gharbia-mahalla', 'المحلة الكبرى', 'El Mahalla El Kubra', 'الغربية', 30.97235, 31.1683, 'city', ['المحلة', 'mahalla']],
  ['dakahlia-mansoura', 'المنصورة', 'Mansoura', 'الدقهلية', 31.0376, 31.3865, 'city', ['mansoura'], true],
  ['sharqia-zagazig', 'الزقازيق', 'Zagazig', 'الشرقية', 30.5853, 31.5035, 'city', ['zagazig']],
  ['qalyubia-banha', 'بنها', 'Banha', 'القليوبية', 30.4625, 31.1841, 'city', ['benha', 'banha']],
  ['menoufia-shebin', 'شبين الكوم', 'Shebin El Kom', 'المنوفية', 30.5545, 31.0098, 'city', ['شبين', 'shebin']],
  ['menoufia-sadat', 'مدينة السادات', 'Sadat City', 'المنوفية', 30.36691, 30.52, 'city', ['السادات', 'sadat city']],
  ['kafr-el-sheikh', 'كفر الشيخ', 'Kafr El Sheikh', 'كفر الشيخ', 31.1089, 30.9427, 'city', ['kafr el sheikh']],
  ['beheira-damanhour', 'دمنهور', 'Damanhour', 'البحيرة', 31.0375, 30.4711, 'city', ['damanhour']],
  ['damietta', 'دمياط', 'Damietta', 'دمياط', 31.4167, 31.8214, 'city', ['damietta']],

  // Canal and Sinai
  ['ismailia', 'الإسماعيلية', 'Ismailia', 'الإسماعيلية', 30.6044, 32.2771, 'city', ['موقف الاسماعيلية', 'ismailia']],
  ['suez', 'السويس', 'Suez', 'السويس', 29.9745, 32.5371, 'city', ['suez']],
  ['port-said', 'بورسعيد', 'Port Said', 'بورسعيد', 31.2632, 32.3055, 'city', ['بور سعيد', 'port said']],
  ['arish', 'العريش', 'El Arish', 'شمال سيناء', 31.1236, 33.7984, 'city', ['arish']],
  ['sharm', 'شرم الشيخ', 'Sharm El Sheikh', 'جنوب سيناء', 27.8644, 34.2954, 'city', ['شرم', 'sharm']],
  ['ain-sokhna', 'العين السخنة', 'Ain Sokhna', 'السويس', 29.6396, 32.3057, 'town', ['السخنة', 'sokhna']],

  // Upper Egypt
  ['fayoum', 'الفيوم', 'Fayoum', 'الفيوم', 29.3074, 30.84, 'city', ['fayoum']],
  ['beni-suef', 'بني سويف', 'Beni Suef', 'بني سويف', 29.073, 31.0983, 'city', ['beni suef']],
  ['minya', 'المنيا', 'Minya', 'المنيا', 28.0893, 30.7571, 'city', ['minya']],
  ['assiut', 'أسيوط', 'Assiut', 'أسيوط', 27.1833, 31.1854, 'city', ['assiut', 'asyut']],
  ['sohag', 'سوهاج', 'Sohag', 'سوهاج', 26.5477, 31.6993, 'city', ['sohag']],
  ['qena', 'قنا', 'Qena', 'قنا', 26.1593, 32.7163, 'city', ['qena']],
  ['luxor', 'الأقصر', 'Luxor', 'الأقصر', 25.7021, 32.6472, 'city', ['luxor']],
  ['aswan', 'أسوان', 'Aswan', 'أسوان', 24.0911, 32.8973, 'city', ['aswan']],

  // Coasts
  ['marsa-matruh', 'مرسى مطروح', 'Marsa Matruh', 'مطروح', 31.3529, 27.2395, 'city', ['مطروح', 'matruh']],
  ['alamein', 'العلمين', 'El Alamein', 'مطروح', 30.8339, 28.9493, 'city', ['الساحل', 'الساحل الشمالي', 'alamein']],
  ['hurghada', 'الغردقة', 'Hurghada', 'البحر الأحمر', 27.2226, 33.8307, 'city', ['hurghada']]
];

export const HUBS: Place[] = ROWS.map(([id, nameAr, nameEn, contextAr, lat, lng, kind, aliases, popular]) => ({
  id,
  nameAr,
  nameEn,
  contextAr,
  aliases,
  location: { lat, lng },
  kind,
  isPopular: popular === true
}));

const HUBS_BY_ID = new Map(HUBS.map((h) => [h.id, h]));

export function getHubById(id: string): Place | undefined {
  return HUBS_BY_ID.get(id);
}
