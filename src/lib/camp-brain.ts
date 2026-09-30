import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";

/* ────────────────────────────────────────────────────────────────────────────
 * CAMP BRAIN — local knowledge engine (NO AI model required).
 *
 * The chatbot answers DIRECTLY from the site's live database:
 *   settings (dates, fee, seats, location, contacts, slogans…),
 *   registrations (real seat occupancy), FAQs (admin-editable — instantly
 *   extends the bot), speakers and latest announcements.
 *
 * Pipeline for every user question:
 *   1. answerLocally()   → keyword/phrase intents + FAQ fuzzy matching (always on)
 *   2. optional AI       → only when the local engine has no confident answer
 *                          AND AI_API_URL/AI_API_KEY are configured
 *   3. graceful fallback → helpful "didn't understand" reply with topic list
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CampSnapshot {
  name: string;
  edition: number;
  startDate: Date | null;
  endDate: Date | null;
  locationAr: string;
  locationFr: string;
  descAr: string;
  descFr: string;
  sloganAr: string;
  sloganFr: string;
  fee: number;
  studentFee: number;
  totalSeats: number;
  occupied: number;
  seatsLeft: number;
  registrationOpen: boolean;
  whatsapp: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  faqs: { questionAr: string; answerAr: string; questionFr: string; answerFr: string }[];
  speakers: { name: string; nameAr: string; activityAr: string; activityFr: string }[];
  announcements: { titleAr: string; titleFr: string; bodyAr: string; bodyFr: string }[];
}

export async function loadCampSnapshot(): Promise<CampSnapshot> {
  await ensureSeed();
  const c = await collections();
  const settings = await c.settings.findOne({ key: "main" });
  const confirmed = await c.registrations.countDocuments({ status: "confirmed" });
  const pending = await c.registrations.countDocuments({ status: "pending" });
  const totalSeats = settings?.totalSeats ?? 60;
  const occupied = confirmed + pending;

  const [faqs, speakers, announcements] = await Promise.all([
    c.faqs
      .find({ active: true })
      .sort({ order: 1 })
      .toArray()
      .then((rows) =>
        rows.map((f) => ({
          questionAr: String(f.questionAr ?? ""),
          answerAr: String(f.answerAr ?? ""),
          questionFr: String(f.questionFr ?? ""),
          answerFr: String(f.answerFr ?? ""),
        })),
      ),
    c.speakers
      .find({ active: true })
      .sort({ order: 1 })
      .toArray()
      .then((rows) =>
        rows.map((s) => ({
          name: String(s.name ?? ""),
          nameAr: String(s.nameAr ?? ""),
          activityAr: String(s.activityAr ?? ""),
          activityFr: String(s.activityFr ?? ""),
        })),
      ),
    c.announcements
      .find({ active: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()
      .then((rows) =>
        rows.map((a) => ({
          titleAr: String(a.titleAr ?? ""),
          titleFr: String(a.titleFr ?? ""),
          bodyAr: String(a.bodyAr ?? "").slice(0, 220),
          bodyFr: String(a.bodyFr ?? "").slice(0, 220),
        })),
      ),
  ]);

  return {
    name: settings?.nameEn || "Happy inside experience",
    edition: settings?.edition ?? 1,
    startDate: settings?.startDate ? new Date(settings.startDate) : null,
    endDate: settings?.endDate ? new Date(settings.endDate) : null,
    locationAr: settings?.locationAr || "زموري، بومرداس — الجزائر",
    locationFr: settings?.locationFr || "Zemmouri, Boumerdès — Algérie",
    descAr: settings?.descAr || "",
    descFr: settings?.descFr || "",
    sloganAr: settings?.sloganAr || "",
    sloganFr: settings?.sloganFr || "",
    fee: typeof settings?.fee === "number" ? settings.fee : 0,
    studentFee:
      typeof settings?.studentFee === "number"
        ? settings.studentFee
        : typeof settings?.fee === "number"
          ? settings.fee
          : 0,
    totalSeats,
    occupied,
    seatsLeft: Math.max(0, totalSeats - occupied),
    registrationOpen: Boolean(settings?.registrationOpen),
    whatsapp: settings?.whatsappNumber ? String(settings.whatsappNumber) : "",
    email: settings?.email || "",
    facebookUrl: settings?.facebookUrl || "",
    instagramUrl: settings?.instagramUrl || "",
    faqs,
    speakers,
    announcements,
  };
}

/* ── text normalization (Arabic + French tolerant) ────────────────────────── */

export function normText(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // diacritics + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[éèêë]/g, "e")
    .replace(/[àâä]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/[''`]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(t: string): string[] {
  return normText(t)
    .split(" ")
    .map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w))
    .filter(Boolean);
}

const STOP = new Set([
  "هل","ما","ماذا","من","في","عن","علي","الي","الى","و","او","هي","هو","هذا","هذه","مع",
  "je","tu","il","elle","nous","vous","on","le","la","les","un","une","des","de","du","d","l",
  "est","et","a","au","aux","ce","c","que","qui","quoi","comment","pour","avec","dans","sur",
  "the","is","are","what","how","do","i","you","we","it","to","of","for","and",
]);

function contentTokens(t: string): string[] {
  return tokensOf(t).filter((w) => !STOP.has(w));
}

/* ── intent dictionary (all keywords pre-normalized) ──────────────────────── */

interface Intent {
  id: string;
  phrases: string[]; // multi-word / distinctive — weight 3
  tokens: string[]; // single words — weight 2
  weak?: string[]; // ambiguous words — weight 1
}

const INTENTS: Intent[] = [
  {
    id: "seats",
    phrases: [
      "كم مقعد","كم من مقعد","شحال من مقعد","عدد المقاعد","عدد الاماكن","كم باقي","باقي كم",
      "شحال باقي","places restantes","il reste combien","combien de places","how many seats",
      "places left","places disponibles","reste t il des places",
    ],
    tokens: ["مقاعد","مقعد","اماكن","places","place","seat","seats","capacite"],
  },
  {
    id: "dates",
    phrases: [
      "متى المخيم","متى يبدا","متى ينتهي","متى يقام","تواريخ المخيم","ايام المخيم","موعد المخيم",
      "quand a lieu","quand commence","quand se deroule","quand est le camp","dates du camp",
      "when is the camp","when does it start",
    ],
    tokens: ["متى","تاريخ","تواريخ","موعد","يبدا","ينتهي","نهايه","ايام","ليالي","مدة","اكتوبر","october","octobre","date","dates","quand","debut","commence","termine"],
  },
  {
    id: "location",
    phrases: [
      "وين المخيم","وين يقام","اين يقام","مكان المخيم","موقع المخيم","في اي ولاية","اين يقع",
      "ou se situe","ou se trouve","ou a lieu","ca se passe ou","le camp se situe ou",
      "lieu du camp","adresse du camp","where is the camp",
    ],
    tokens: ["وين","اين","فين","مكان","عنوان","ولايه","زموري","بومرداس","lieu","adresse","situe","trouve","localisation","zemmouri","boumerdes"],
    weak: ["موقع"],
  },
  {
    id: "fee",
    phrases: [
      "كم السعر","كم ثمن","كم تكلفه","بكم المخيم","شحال السعر","شحال التسجيل","سعر التسجيل",
      "ثمن التسجيل","سعر المخيم","combien ca coute","combien coute","quel est le prix",
      "quel prix","prix du camp","prix d inscription","how much does it cost","how much is it",
    ],
    tokens: ["سعر","اسعار","ثمن","تكلفه","بكام","دينار","دج","مجاني","gratuit","gratuite","prix","tarif","cout","coute","payant","fee","cost","price"],
  },
  {
    id: "register",
    phrases: [
      "كيف اسجل","كيفية التسجيل","طريقة التسجيل","اريد التسجيل","اريد ان اسجل","كيفاش نسجل",
      "كيف نسجل","ابغي اسجل","نحب نسجل","comment s inscrire","comment m inscrire",
      "je veux m inscrire","s inscrire au camp","formulaire d inscription","how to register",
      "how do i register",
    ],
    tokens: ["تسجيل","اسجل","نسجل","اشتراك","انضم","inscription","inscrire","rejoindre","participer","register","signup"],
  },
  {
    id: "regstatus",
    phrases: [
      "التسجيل مفتوح","التسجيل مغلق","هل التسجيل مفتوح","هل التسجيل مغلق","مازال التسجيل",
      "هل مازال","inscriptions ouvertes","inscription ouverte","inscription fermee",
      "est ce ouvert","is registration open",
    ],
    tokens: ["مفتوح","مفتوحه","مغلقه","مغلق","ouvert","ouverte","ferme","fermee","cloture"],
  },
  {
    id: "program",
    phrases: [
      "ما هو البرنامج","شنو البرنامج","برنامج المخيم","ماذا ستفعلون","شنو راح تديرو",
      "quel est le programme","programme du camp","qu est ce qu on fait","les activites du camp",
      "what is the program","what will we do",
    ],
    tokens: ["برنامج","برامج","انشطه","نشاط","محاور","محور","ورشات","ورشه","جلسات","جلسه","تفريغ","programme","atelier","ateliers","activites","activite","seances","seance","planning","deroulement","agenda"],
  },
  {
    id: "speakers",
    phrases: [
      "من هم المتحدثون","من المتحدثون","من هم المتحدثين","من المدربون","les intervenants",
      "qui sont les intervenants","qui anime","qui va animer","les formateurs","who are the speakers",
    ],
    tokens: ["متحدث","متحدثون","متحدثين","مدرب","مدربين","ضيوف","ضيف","مداخلات","intervenant","intervenants","conferencier","formateur","speakers"],
  },
  {
    id: "about",
    phrases: [
      "ما هو المخيم","شنو هو المخيم","عن المخيم","احك لي عن المخيم","لي هو المخيم",
      "من يمكنه الالتحاق","لمن هذا المخيم","لمن المخيم","فكرة المخيم","c est quoi le camp",
      "qu est ce que le camp","a propos du camp","pour qui","who can join","what is the camp",
      "tell me about the camp",
    ],
    tokens: ["فكره","هدف","اهداف","موجه","جمهور","psychologue","psychologues","psychologist"],
    weak: ["مخيم","camp"],
  },
  {
    id: "contact",
    phrases: [
      "كيف اتواصل","رقم الهاتف","رقم الواتساب","بريد المخيم","comment contacter",
      "contacter l equipe","comment vous joindre","numero de telephone","adresse mail",
      "contact du camp","how to contact",
    ],
    tokens: ["تواصل","اتصل","اتصال","هاتف","واتساب","واتس","بريد","ايميل","contact","contacter","whatsapp","mail","email","telephone","joindre"],
    weak: ["رقم"],
  },
  {
    id: "announcements",
    phrases: [
      "اي اعلانات","اخر الاخبار","ما الجديد","اخبار المخيم","اي جديد","dernieres annonces",
      "les annonces","quoi de neuf","any news",
    ],
    tokens: ["اعلان","اعلانات","اخبار","جديد","annonce","annonces","news","actualite"],
  },
  {
    id: "botself",
    phrases: [
      "من انت","وش انت","شنو انت","ماذا تستطيع","كيف تعمل","شنو تقدر","تقدر تساعدني",
      "t es qui","tu es qui","qui es tu","tu sais faire quoi","what can you do","who are you",
    ],
    tokens: ["robot"],
    weak: ["مساعد","bot","aide","مساعده"],
  },
  {
    id: "greeting",
    phrases: ["السلام عليكم","كيف حالك","شخبارك","comment ca va","comment vas tu","ca va"],
    tokens: ["مرحبا","هلا","اهلا","صباح","مساء","سلام","لاباس","bonjour","bonsoir","salut","hello","hi","coucou","hey"],
  },
  {
    id: "thanks",
    phrases: ["شكرا جزيلا","thank you very much","merci beaucoup"],
    tokens: ["شكرا","متشكر","بارك","merci","thanks","thx","thank"],
  },
];

const SMALLTALK = new Set(["greeting", "thanks", "botself"]);

function scoreIntent(text: string, textTokens: Set<string>, intent: Intent): number {
  let score = 0;
  for (const p of intent.phrases) if (text.includes(p)) score += 3;
  for (const t of intent.tokens) if (textTokens.has(t)) score += 2;
  for (const t of intent.weak ?? []) if (textTokens.has(t)) score += 1;
  return score;
}

/* ── formatting helpers ───────────────────────────────────────────────────── */

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","ماي","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

function fmtDate(d: Date, lang: "ar" | "fr"): string {
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  return lang === "ar" ? `${day} ${MONTHS_AR[month] ?? ""} ${year}` : `${day} ${MONTHS_FR[month] ?? ""} ${year}`;
}

function fmtMoney(amount: number, lang: "ar" | "fr"): string {
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return lang === "ar" ? `${grouped} دج` : `${grouped} DA`;
}

export function fmtPhone(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (digits.startsWith("213") && digits.length >= 12) {
    const rest = digits.slice(3);
    return `+213 ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7)}`.trim();
  }
  return `+${digits}`;
}

function campDates(s: CampSnapshot, lang: "ar" | "fr"): string {
  if (!s.startDate) return lang === "ar" ? "تُحدَّد لاحقاً" : "à confirmer";
  const days = s.endDate
    ? Math.max(1, Math.round((s.endDate.getTime() - s.startDate.getTime()) / 864e5) + 1)
    : null;
  const range = s.endDate
    ? `${fmtDate(s.startDate, lang)} → ${fmtDate(s.endDate, lang)}`
    : fmtDate(s.startDate, lang);
  const daysLabel = days ? (lang === "ar" ? ` (${days} أيام)` : ` (${days} jours)`) : "";
  return range + daysLabel;
}

/* ── answer templates (filled with LIVE data) ─────────────────────────────── */

const PROGRAM_PILLARS: Record<"ar" | "fr", string[]> = {
  ar: [
    "🗣️ جلسات نقاش حول واقع الممارسة المهنية",
    "🤝 تبادل الخبرات والتجارب بين الممارسين",
    "🧠 تقنيات وأساليب حديثة",
    "🎲 ألعاب وأنشطة تفاعلية",
    "📝 وسائل وأنشطة تفريغية",
    "☕ مساحة للحوار والتواصل والاستمتاع",
    "🌿 وقت مخصص للعناية بالنفس المهنية",
  ],
  fr: [
    "🗣️ Discussions sur la réalité de la pratique professionnelle",
    "🤝 Échange d'experiences entre praticiens",
    "🧠 Techniques et approches modernes",
    "🎲 Jeux et activités interactives",
    "📝 Activités libératrices",
    "☕ Espace dialogue, réseau et plaisir",
    "🌿 Soin de soi professionnel",
  ],
};

export function topicsList(lang: "ar" | "fr"): string {
  return lang === "ar"
    ? "• عدد المقاعد المتاحة\n• التواريخ والمدة\n• مكان الإقامة\n• سعر التسجيل\n• طريقة التسجيل\n• برنامج المخيم وأنشطته\n• المتحدثون\n• آخر الإعلانات\n• التواصل مع الفريق"
    : "• Le nombre de places disponibles\n• Les dates et la durée\n• Le lieu du camp\n• Le tarif d'inscription\n• Comment s'inscrire\n• Le programme et les activités\n• Les intervenants\n• Les dernières annonces\n• Contacter l'équipe";
}

function render(intent: string, s: CampSnapshot, lang: "ar" | "fr"): string {
  const wa = s.whatsapp ? fmtPhone(s.whatsapp) : "";
  const seatsLine =
    lang === "ar"
      ? `📊 الحجز: ${s.occupied}/${s.totalSeats} مقعد — المتبقي: ${s.seatsLeft}.`
      : `📊 Réservations : ${s.occupied}/${s.totalSeats} places — restantes : ${s.seatsLeft}.`;
  const openLine =
    lang === "ar"
      ? s.registrationOpen
        ? "✅ التسجيل مفتوح حالياً."
        : "⛔ التسجيل مغلق حالياً."
      : s.registrationOpen
        ? "✅ Les inscriptions sont ouvertes."
        : "⛔ Les inscriptions sont fermées.";
  const waLine = wa
    ? lang === "ar"
      ? `لأي استفسار آخر: واتساب ${wa} 💬`
      : `Pour toute autre question : WhatsApp ${wa} 💬`
    : "";

  switch (intent) {
    case "seats":
      return lang === "ar"
        ? `🌿 ${openLine}\n${seatsLine}\nالمقاعد محدودة والحجز بالأسبقية — سارع بالتسجيل من صفحة «التسجيل في المخيم»! 🎯`
        : `🌿 ${openLine}\n${seatsLine}\nLes places sont limitées, premier arrivé premier servi — dépêchez-vous depuis la page d'inscription ! 🎯`;

    case "dates":
      return lang === "ar"
        ? `📅 التواريخ: ${campDates(s, "ar")}.\n${openLine}\n${seatsLine}`
        : `📅 Dates : ${campDates(s, "fr")}.\n${openLine}\n${seatsLine}`;

    case "location":
      return lang === "ar"
        ? `📍 مكان المخيم: ${s.locationAr}.\nتفاصيل الوصول واللوجيستيك تُرسل للمسجلين قبل الانطلاق.\n${waLine}`
        : `📍 Lieu du camp : ${s.locationFr}.\nLes détails d'accès et de logistique sont envoyés aux inscrits avant le départ.\n${waLine}`;

    case "fee": {
      const arPrices =
        s.fee > 0 || s.studentFee > 0
          ? `💰 سعر الأخصائيين: ${s.fee > 0 ? fmtMoney(s.fee, "ar") : "سيُعلن قريباً"} — سعر الطلبة: ${s.studentFee > 0 ? fmtMoney(s.studentFee, "ar") : "سيُعلن قريباً"}.`
          : "💰 الأسعار: سيُعلن قريباً.";
      const frPrices =
        s.fee > 0 || s.studentFee > 0
          ? `💰 Tarif spécialistes : ${s.fee > 0 ? fmtMoney(s.fee, "fr") : "bientôt annoncé"} — tarif étudiants : ${s.studentFee > 0 ? fmtMoney(s.studentFee, "fr") : "bientôt annoncé"}.`
          : "💰 Tarifs : bientôt annoncés.";
      return lang === "ar"
        ? `${arPrices}\n${openLine}\n${seatsLine}\n${waLine}`
        : `${frPrices}\n${openLine}\n${seatsLine}\n${waLine}`;
    }

    case "register":
      return lang === "ar"
        ? `📝 التسجيل سهل جداً:\n1️⃣ أنشئ حساباً برقم هاتفك وكلمة المرور (صفحة «إنشاء حساب»).\n2️⃣ من صفحة التسجيل في المخيم احجز مقعدك.\n3️⃣ بعد تأكيد الدفع من الإدارة يصلك إشعار.\n${s.fee > 0 || s.studentFee > 0 ? `💰 الرسوم: الأخصائيون ${fmtMoney(s.fee, "ar")} / الطلبة ${fmtMoney(s.studentFee, "ar")}.\n` : ""}${openLine}\n${seatsLine}`
        : `📝 L'inscription est simple :\n1️⃣ Créez un compte avec votre numéro de téléphone et un mot de passe (page « Inscription »).\n2️⃣ Réservez votre place depuis la page du camp.\n3️⃣ Après confirmation du paiement par l'équipe, vous recevez une notification.\n${s.fee > 0 || s.studentFee > 0 ? `💰 Tarifs : spécialistes ${fmtMoney(s.fee, "fr")} / étudiants ${fmtMoney(s.studentFee, "fr")}.\n` : ""}${openLine}\n${seatsLine}`;

    case "regstatus":
      return lang === "ar"
        ? `${openLine}\n${seatsLine}\n${s.registrationOpen ? "سارع بالحجز من صفحة «التسجيل في المخيم» 🚀" : "تابع الإعلانات لمعرفة موعد فتح التسجيل 🔔"}`
        : `${openLine}\n${seatsLine}\n${s.registrationOpen ? "Réservez depuis la page d'inscription 🚀" : "Suivez les annonces pour la réouverture 🔔"}`;

    case "program":
      return lang === "ar"
        ? `🎯 برنامج المخيم — 7 محاور:\n${PROGRAM_PILLARS.ar.join("\n")}\nالصور التفصيلية للبرنامج متوفرة في الصفحة الرئيسية (اضغط على الصورة للتكبير 🔍)`
        : `🎯 Programme du camp — 7 piliers :\n${PROGRAM_PILLARS.fr.join("\n")}\nLes images détaillées du programme sont sur la page d'accueil (cliquez pour zoomer 🔍)`;

    case "speakers":
      if (!s.speakers.length)
        return lang === "ar"
          ? `🎙️ سيُعلن عن المتحدثين قريباً — تابع صفحة «المتحدثون» والإعلانات!`
          : `🎙️ Les intervenants seront annoncés bientôt — suivez la page « Intervenants » et les annonces !`;
      return lang === "ar"
        ? `🎙️ متحدثو الطبعة ${s.edition}:\n${s.speakers.map((x) => `• ${x.nameAr || x.name} — ${x.activityAr}`).join("\n")}\nتفاصيل أكثر في صفحة «المتحدثون» ✨`
        : `🎙️ Intervenants de l'édition ${s.edition} :\n${s.speakers.map((x) => `• ${x.name} — ${x.activityFr}`).join("\n")}\nPlus de détails sur la page « Intervenants » ✨`;

    case "about":
      return lang === "ar"
        ? `🌿 «${s.name}» — الطبعة ${s.edition}: مخيّم خاص بأخصائيي وعاملات القطاع النفسي في **مختلف ولايات الجزائر**${s.descAr ? `\n${s.descAr}` : ""}\n📅 ${campDates(s, "ar")} — 📍 ${s.locationAr}\n${s.sloganAr ? `« ${s.sloganAr} »` : ""}`
        : `🌿 « ${s.name} » — édition ${s.edition} : un camp dédié aux psychologues et praticiens du secteur psychologique de **toutes les wilayas d'Algérie**${s.descFr ? `\n${s.descFr}` : ""}\n📅 ${campDates(s, "fr")} — 📍 ${s.locationFr}\n${s.sloganFr ? `« ${s.sloganFr} »` : ""}`;

    case "contact":
      return lang === "ar"
        ? `📞 التواصل مع فريق المخيم:${wa ? `\n💬 واتساب: ${wa}` : ""}${s.email ? `\n✉️ البريد: ${s.email}` : ""}\nكما يمكنك من صفحة «اتصل بنا» إرسال رسالة مباشرة 💌`
        : `📞 Contacter l'équipe du camp :${wa ? `\n💬 WhatsApp : ${wa}` : ""}${s.email ? `\n✉️ E-mail : ${s.email}` : ""}\nVous pouvez aussi écrire depuis la page « Contact » 💌`;

    case "announcements":
      if (!s.announcements.length)
        return lang === "ar"
          ? `🔔 لا توجد إعلانات جديدة حالياً — فعّل الإشعارات لتصلك أخبار المخيم أولاً بأول!`
          : `🔔 Aucune nouvelle annonce pour le moment — activez les notifications pour être informé en premier !`;
      return lang === "ar"
        ? `🔔 آخر الإعلانات:\n${s.announcements.map((a) => `• ${a.titleAr}${a.bodyAr ? ` — ${a.bodyAr}` : ""}`).join("\n")}\nالتفاصيل في صفحة «الإعلانات»`
        : `🔔 Dernières annonces :\n${s.announcements.map((a) => `• ${a.titleFr || a.titleAr}${a.bodyFr ? ` — ${a.bodyFr}` : ""}`).join("\n")}\nDétails sur la page « Annonces »`;

    case "botself":
      return lang === "ar"
        ? `🤖 أنا «مساعد Happy Inside» — أجيب مباشرة من معلومات موقع المخيم الحية (بدون أي مصادر خارجية).\nيمكنك سؤالي عن:\n${topicsList("ar")}`
        : `🤖 Je suis « l'Assistant Happy Inside » — je réponds directement depuis les informations en direct du site du camp (aucune source externe).\nVous pouvez me demander :\n${topicsList("fr")}`;

    case "greeting":
      return lang === "ar"
        ? `🌿 أهلاً بك! أنا مساعد مخيم «${s.name}».\nاسألني عن المقاعد، التواريخ، السعر، البرنامج، المتحدثين أو التسجيل — وأجاوبك فوراً! 😊`
        : `🌿 Bienvenue ! Je suis l'assistant du camp « ${s.name} ».\nDemandez-moi les places, les dates, le tarif, le programme, les intervenants ou l'inscription — je réponds aussitôt ! 😊`;

    case "thanks":
      return lang === "ar"
        ? `🤍 العفو! سعيد بمساعدتك — نتمنى رؤيتك في المخيم! 🌿\n${openLine}`
        : `🤍 Avec plaisir ! Au plaisir de vous voir au camp ! 🌿\n${openLine}`;

    default:
      return "";
  }
}

/* ── FAQ fuzzy matching (admin-editable knowledge base) ───────────────────── */

function bestFaq(userText: string, s: CampSnapshot, lang: "ar" | "fr"): string | null {
  const u = normText(userText);
  const uTokens = new Set(contentTokens(userText));
  if (uTokens.size === 0) return null;
  let best: { score: number; idx: number } | null = null;

  s.faqs.forEach((f, idx) => {
    for (const q of [lang === "ar" ? f.questionAr : f.questionFr, lang === "ar" ? f.questionFr : f.questionAr]) {
      if (!q) continue;
      const qNorm = normText(q);
      if (!qNorm) continue;
      // containment = instant match
      if (u.includes(qNorm) || qNorm.includes(u)) {
        best = { score: 2, idx };
        return;
      }
      const qTokens = contentTokens(q);
      if (!qTokens.length) continue;
      const inter = qTokens.filter((t) => uTokens.has(t)).length;
      const score = inter / Math.sqrt(qTokens.length * uTokens.size);
      if (!best || score > best.score) best = { score, idx };
    }
  });

  if (best && best.score >= 0.4) {
    const f = s.faqs[best.idx];
    if (!f) return null;
    const answer = lang === "ar" ? f.answerAr || f.answerFr : f.answerFr || f.answerAr;
    return answer ? `🌿 ${answer}` : null;
  }
  return null;
}

/* ── public entry: try to answer with zero AI ─────────────────────────────── */

export function answerLocally(
  userText: string,
  s: CampSnapshot,
  lang: "ar" | "fr",
): { reply: string; intent: string } | null {
  const text = normText(userText);
  if (!text) return null;
  const tokenSet = new Set(tokensOf(userText));

  let bestIntent: { id: string; score: number } | null = null;
  for (const intent of INTENTS) {
    if (SMALLTALK.has(intent.id)) continue; // content intents first
    const score = scoreIntent(text, tokenSet, intent);
    if (score >= 2 && (!bestIntent || score > bestIntent.score)) bestIntent = { id: intent.id, score };
  }

  // Small talk only when no content intent matched
  if (!bestIntent) {
    for (const intent of INTENTS) {
      if (!SMALLTALK.has(intent.id)) continue;
      const score = scoreIntent(text, tokenSet, intent);
      if (score >= 2 && (!bestIntent || score > bestIntent.score)) bestIntent = { id: intent.id, score };
    }
  }

  if (bestIntent) {
    const reply = render(bestIntent.id, s, lang);
    if (reply) return { reply, intent: bestIntent.id };
  }

  // Admin-editable FAQs (extends the bot without any code)
  const faqReply = bestFaq(userText, s, lang);
  if (faqReply) return { reply: faqReply, intent: "faq" };

  return null;
}

/* ── AI context builder (used only when AI is configured) ─────────────────── */

export function buildAiContext(s: CampSnapshot): string {
  const registered = s.occupied;
  const ctx: string[] = [];
  ctx.push(`=== CAMP INFO (source of truth - never invent info) ===`);
  ctx.push(`Camp name: ${s.name} (never translate this name)`);
  ctx.push(`Edition: #${s.edition}`);
  ctx.push(`Dates: ${campDates(s, "fr")}.`);
  ctx.push(`Location: ${s.locationAr} / ${s.locationFr}`);
  ctx.push(`Audience: psychologists & psychological practitioners from ALL wilayas of Algeria`);
  ctx.push(`Slogan AR: ${s.sloganAr}`);
  ctx.push(`Slogan FR: ${s.sloganFr}`);
  ctx.push(`Fees: specialists ${s.fee > 0 ? `${s.fee} DZD` : "TBA"} / students ${s.studentFee > 0 ? `${s.studentFee} DZD` : "TBA"}`);
  ctx.push(`Seats: ${registered}/${s.totalSeats} taken, ${s.seatsLeft} left. Registration ${s.registrationOpen ? "OPEN" : "CLOSED"}`);
  ctx.push(`WhatsApp: ${s.whatsapp ? fmtPhone(s.whatsapp) : "n/a"}`);
  ctx.push(`Email: ${s.email}`);

  ctx.push(`\n=== PROGRAM (7 pillars) ===`);
  PROGRAM_PILLARS.fr.forEach((p, i) => ctx.push(`${i + 1}. ${p}`));

  if (s.speakers.length) {
    ctx.push(`\n=== SPEAKERS ===`);
    for (const sp of s.speakers) ctx.push(`- ${sp.name} (${sp.nameAr}): ${sp.activityAr} / ${sp.activityFr}`);
  }

  if (s.announcements.length) {
    ctx.push(`\n=== LATEST ANNOUNCEMENTS ===`);
    for (const a of s.announcements) ctx.push(`- ${a.titleAr} | ${a.titleFr}: ${a.bodyAr}`);
  }

  if (s.faqs.length) {
    ctx.push(`\n=== FAQ ===`);
    for (const f of s.faqs) ctx.push(`Q(${f.questionAr} / ${f.questionFr}) => A(${f.answerAr} / ${f.answerFr})`);
  }

  ctx.push(`\n=== HOW TO REGISTER ===`);
  ctx.push(`Create an account with phone number + password, then reserve a seat on the registration page. Seats are limited, first come first served.`);

  return ctx.join("\n");
}
