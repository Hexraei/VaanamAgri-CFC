export interface Panchayat {
  id: string;
  name: string;
  name_ta: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD (IST)
  tmin: number;
  tmax: number;
  precipMm: number;
  precipProbMax: number; // 0-100
  humidityAvg: number; // 0-100
  windMaxKmh: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PanchayatForecast {
  panchayat: Panchayat;
  elevationM: number;
  generatedAt: string;
  days: DayForecast[];
}

export interface AdvisoryAction {
  ruleId: string;
  severity: 'info' | 'medium' | 'high';
  en: string;
  ta: string;
}

export interface Advisory {
  panchayat: Panchayat;
  crop: string;
  stage: string;
  lang: 'ta' | 'en';
  generatedAt: string;
  generatedBy: 'gemini' | 'rules';
  summaryEn: string;
  summaryTa: string;
  actions: AdvisoryAction[];
  forecastDays: DayForecast[];
}
