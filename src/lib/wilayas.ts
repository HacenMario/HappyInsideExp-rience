/* ============================================================
   The 69 official wilayas of the Algerian Republic
   (48 historical + 10 created in 2019 + 11 created on
   16 November 2025 — territorial reform).
   Code follows the official wilaya numbering.
   The canonical stored value in the database is the ARABIC
   name (`ar`), so existing free-text data stays compatible.
   ============================================================ */

export interface Wilaya {
  code: number;
  ar: string;
  fr: string;
}

export const WILAYAS: Wilaya[] = [
  { code: 1, ar: "أدرار", fr: "Adrar" },
  { code: 2, ar: "الشلف", fr: "Chlef" },
  { code: 3, ar: "الأغواط", fr: "Laghouat" },
  { code: 4, ar: "أم البواقي", fr: "Oum El Bouaghi" },
  { code: 5, ar: "باتنة", fr: "Batna" },
  { code: 6, ar: "بجاية", fr: "Béjaïa" },
  { code: 7, ar: "بسكرة", fr: "Biskra" },
  { code: 8, ar: "بشار", fr: "Béchar" },
  { code: 9, ar: "البليدة", fr: "Blida" },
  { code: 10, ar: "البويرة", fr: "Bouira" },
  { code: 11, ar: "تمنراست", fr: "Tamanrasset" },
  { code: 12, ar: "تبسة", fr: "Tébessa" },
  { code: 13, ar: "تلمسان", fr: "Tlemcen" },
  { code: 14, ar: "تيارت", fr: "Tiaret" },
  { code: 15, ar: "تيزي وزو", fr: "Tizi Ouzou" },
  { code: 16, ar: "الجزائر", fr: "Alger" },
  { code: 17, ar: "الجلفة", fr: "Djelfa" },
  { code: 18, ar: "جيجل", fr: "Jijel" },
  { code: 19, ar: "سطيف", fr: "Sétif" },
  { code: 20, ar: "سعيدة", fr: "Saïda" },
  { code: 21, ar: "سكيكدة", fr: "Skikda" },
  { code: 22, ar: "سيدي بلعباس", fr: "Sidi Bel Abbès" },
  { code: 23, ar: "عنابة", fr: "Annaba" },
  { code: 24, ar: "قالمة", fr: "Guelma" },
  { code: 25, ar: "قسنطينة", fr: "Constantine" },
  { code: 26, ar: "المدية", fr: "Médéa" },
  { code: 27, ar: "مستغانم", fr: "Mostaganem" },
  { code: 28, ar: "المسيلة", fr: "M'Sila" },
  { code: 29, ar: "معسكر", fr: "Mascara" },
  { code: 30, ar: "ورقلة", fr: "Ouargla" },
  { code: 31, ar: "وهران", fr: "Oran" },
  { code: 32, ar: "البيض", fr: "El Bayadh" },
  { code: 33, ar: "إليزي", fr: "Illizi" },
  { code: 34, ar: "برج بوعريريج", fr: "Bordj Bou Arréridj" },
  { code: 35, ar: "بومرداس", fr: "Boumerdès" },
  { code: 36, ar: "الطارف", fr: "El Tarf" },
  { code: 37, ar: "تندوف", fr: "Tindouf" },
  { code: 38, ar: "تيسمسيلت", fr: "Tissemsilt" },
  { code: 39, ar: "الوادي", fr: "El Oued" },
  { code: 40, ar: "خنشلة", fr: "Khenchela" },
  { code: 41, ar: "سوق أهراس", fr: "Souk Ahras" },
  { code: 42, ar: "تيبازة", fr: "Tipaza" },
  { code: 43, ar: "ميلة", fr: "Mila" },
  { code: 44, ar: "عين الدفلى", fr: "Aïn Defla" },
  { code: 45, ar: "النعامة", fr: "Naâma" },
  { code: 46, ar: "عين تموشنت", fr: "Aïn Témouchent" },
  { code: 47, ar: "غرداية", fr: "Ghardaïa" },
  { code: 48, ar: "غليزان", fr: "Relizane" },
  { code: 49, ar: "تيميمون", fr: "Timimoun" },
  { code: 50, ar: "برج باجي مختار", fr: "Bordj Badji Mokhtar" },
  { code: 51, ar: "أولاد جلال", fr: "Ouled Djellal" },
  { code: 52, ar: "بني عباس", fr: "Béni Abbès" },
  { code: 53, ar: "عين صالح", fr: "In Salah" },
  { code: 54, ar: "عين قزام", fr: "In Guezzam" },
  { code: 55, ar: "تقرت", fr: "Touggourt" },
  { code: 56, ar: "جانت", fr: "Djanet" },
  { code: 57, ar: "المغير", fr: "El M'Ghair" },
  { code: 58, ar: "المنيعة", fr: "El Meniaa" },
  // --- 11 new wilayas created on 16 November 2025 ---
  { code: 59, ar: "أفلو", fr: "Aflou" },
  { code: 60, ar: "الأبيض سيدي الشيخ", fr: "El Abiodh Sidi Cheikh" },
  { code: 61, ar: "العريشة", fr: "El Aricha" },
  { code: 62, ar: "القنطرة", fr: "El Kantara" },
  { code: 63, ar: "بريكة", fr: "Barika" },
  { code: 64, ar: "بوسعادة", fr: "Bou Saâda" },
  { code: 65, ar: "بئر العاتر", fr: "Bir El Ater" },
  { code: 66, ar: "قصر البخاري", fr: "Ksar El Boukhari" },
  { code: 67, ar: "قصر الشلالة", fr: "Ksar Chellala" },
  { code: 68, ar: "عين وسارة", fr: "Aïn Oussera" },
  { code: 69, ar: "مسعد", fr: "Messaad" },
];

/** Lookup a wilaya by its canonical (Arabic) stored value. */
export function findWilayaByAr(ar: string): Wilaya | undefined {
  const v = (ar || "").trim();
  return WILAYAS.find((w) => w.ar === v);
}

/** Loose lookup that tolerates legacy free-text (French name, case, spacing). */
export function findWilayaLoose(value: string): Wilaya | undefined {
  const v = (value || "").trim().toLowerCase();
  if (!v) return undefined;
  return (
    WILAYAS.find((w) => w.ar === (value || "").trim()) ||
    WILAYAS.find((w) => w.fr.toLowerCase() === v) ||
    WILAYAS.find((w) => w.ar.replace(/ة$/u, "") === v.replace(/ة$/u, "")) ||
    WILAYAS.find((w) => w.fr.toLowerCase().replace(/[^a-z]/g, "") === v.replace(/[^a-z]/g, ""))
  );
}

/** Localized display label: "16 · الجزائر" (AR) / "16 · Alger" (FR). */
export function wilayaLabel(w: Wilaya, lang: "ar" | "fr"): string {
  return `${String(w.code).padStart(2, "0")} · ${lang === "ar" ? w.ar : w.fr}`;
}
