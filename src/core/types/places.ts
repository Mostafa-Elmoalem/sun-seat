export interface Place {
  id: string;                      // e.g. "cairo-abboud", "giza-dokki"
  nameAr: string;                  // e.g. "موقف عبود", "الدقي"
  nameEn: string;                  // e.g. "Abboud Station", "Dokki"
  governorateAr: string;           // e.g. "القاهرة", "الجيزة"
  aliases: string[];               // e.g. ["عبود", "موقف عبود رمسيس", "abboud"]
  location: {
    lat: number;                   // 30.0832
    lng: number;                   // 31.2588
  };
  type: 'station' | 'district' | 'city' | 'corridor';
  isPopular: boolean;              // Top chips for 1-tap quick pick
}
