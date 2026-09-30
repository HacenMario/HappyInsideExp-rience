import bcrypt from "bcryptjs";
import type { Collection, Document } from "mongodb";
import { collections, type CampSettingsDoc } from "./mongodb";

const DEFAULT_SETTINGS: CampSettingsDoc = {
  key: "main",
  edition: 1,
  nameEn: "Happy inside experience",
  sloganAr: "نتعلّم، نستمتع، نتبادل، ونعود بطاقة أكبر",
  sloganFr: "Apprendre, s'amuser, échanger et revenir plus fort",
  descAr:
    "مخيّم خاص بأخصائيي وعاملات القطاع النفسي في مختلف ولايات الجزائر، يجمع بين التطوير المهني والعناية بالنفس في أجواء تفاعلية ودّية بعيدة عن الإطار الأكاديمي التقليدي. أربعة أيام وخمس ليالي من النقاش، التبادل، الألعاب والأنشطة التفريغية.",
  descFr:
    "Un camp dédié aux psychologues et praticiens du secteur psychologique de toutes les wilayas d'Algérie, alliant développement professionnel et soin de soi dans une ambiance interactive et conviviale, loin du cadre académique traditionnel. Quatre jours et cinq nuits de discussions, d'échanges, de jeux et d'activités libératrices.",
  locationAr: "زموري، بومرداس — الجزائر",
  locationFr: "Zemmouri, Boumerdès — Algérie",
  startDate: "2026-10-16T00:00:00.000Z",
  endDate: "2026-10-20T23:59:59.000Z",
  totalSeats: 60,
  registrationOpen: true,
  fee: 0,
  logo: null,
  whatsappNumber: process.env.WHATSAPP_NUMBER || "213550000000",
  email: process.env.CONTACT_EMAIL || "contact@happyinside-experience.dz",
  facebookUrl: process.env.FACEBOOK_URL || "https://facebook.com/happyinside.experience",
  instagramUrl: process.env.INSTAGRAM_URL || "https://instagram.com/happyinside.experience",
  announcementBarActive: true,
  announcementBarFloating: false,
  announcementBarTextAr: "✨ التسجيل مفتوح الآن للطبعة الأولى من مخيم Happy inside experience — المقاعد محدودة، سارع بالحجز!",
  announcementBarTextFr: "✨ Les inscriptions sont ouvertes pour la 1ère édition du camp Happy inside experience — places limitées, dépêchez-vous !",
  announcementBarLink: "/register",
};

const DEFAULT_FAQS = [
  {
    questionAr: "من يمكنه الالتحاق بالمخيم؟",
    questionFr: "Qui peut participer au camp ?",
    answerAr: "المخيم مخصص لأخصائيي وعاملات القطاع النفسي في مختلف ولايات الجزائر (أخصائيون نفسيون، أخصائيون في علم النفس المدرسي، ممارسون في المجال النفسي).",
    answerFr: "Le camp est réservé aux psychologues et praticiens du secteur psychologique de toutes les wilayas d'Algérie (psychologues, psychologues scolaires, praticiens du domaine psychologique).",
    order: 1,
    active: true,
  },
  {
    questionAr: "ما هي تواريخ المخيم؟",
    questionFr: "Quelles sont les dates du camp ?",
    answerAr: "يمتد المخيم على مدى أربعة أيام وخمس ليالي، من 16 إلى 19 أكتوبر 2026 (الانطلاق مساء 15 أكتوبر والانتهاء صباح 20 أكتوبر).",
    answerFr: "Le camp dure quatre jours et cinq nuits, du 16 au 19 octobre 2026 (départ le soir du 15 octobre et clôture le matin du 20 octobre).",
    order: 2,
    active: true,
  },
  {
    questionAr: "كيف أسجل في المخيم؟",
    questionFr: "Comment m'inscrire au camp ?",
    answerAr: "أنشئ حساباً برقم هاتفك وكلمة المرور، ثم اضغط على زر «سجّل في المخيم». المقاعد محدودة ويتم الحجز بحسب الأسبقية.",
    answerFr: "Créez un compte avec votre numéro de téléphone et un mot de passe, puis cliquez sur « S'inscrire au camp ». Les places sont limitées et attribuées par ordre d'arrivée.",
    order: 3,
    active: true,
  },
  {
    questionAr: "هل يحتاج المخيم إلى مؤهلات أكاديمية؟",
    questionFr: "Le camp nécessite-t-il des prérequis académiques ?",
    answerAr: "لا، أجواء المخيم تفاعلية وبعيدة تماماً عن الإطار الأكاديمي التقليدي. المطلوب فقط الشغف بالتطور المهني والعناية بالنفس.",
    answerFr: "Non, l'ambiance du camp est interactive et totalement éloignée du cadre académique traditionnel. Seules la passion pour le développement professionnel et le soin de soi sont requises.",
    order: 4,
    active: true,
  },
  {
    questionAr: "ماذا أحضر معي؟",
    questionFr: "Que dois-je apporter ?",
    answerAr: "أغراض شخصية، ملابس مريحة، دفتر ملاحظات، وحماساً كبيراً! سيتم إرسال قائمة مفصلة للمسجلين قبل الانطلاق.",
    answerFr: "Effets personnels, vêtements confortables, carnet et beaucoup d'enthousiasme ! Une liste détaillée sera envoyée aux inscrits avant le départ.",
    order: 5,
    active: true,
  },
  {
    questionAr: "هل توجد شهادة مشاركة؟",
    questionFr: "Y a-t-il un certificat de participation ?",
    answerAr: "نعم، يتوصل كل مشارك بشهادة مشاركة في الطبعة الأولى من المخيم.",
    answerFr: "Oui, chaque participant reçoit un certificat de participation à la première édition du camp.",
    order: 6,
    active: true,
  },
];

let seeded = false;

/* Bump this version to re-run the cleanup (dedupe + indexes + settings
   migration) on existing DBs */
const SEED_VERSION = 5;

/* Remove duplicate documents introduced by concurrent seeding in older
   versions: keeps the OLDEST document per key value. */
async function dedupeByField(coll: Collection<Document>, field: string): Promise<number> {
  const dupes = await coll
    .aggregate([
      { $sort: { _id: 1 } },
      { $group: { _id: `$${field}`, keepId: { $first: "$_id" }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 }, _id: { $nin: [null, ""] } } },
    ])
    .toArray();
  for (const d of dupes) {
    await coll.deleteMany({ [field]: d._id, _id: { $ne: d.keepId } });
  }
  return dupes.length;
}

export async function ensureSeed() {
  if (seeded) return;
  const c = await collections();

  /* ---- Atomic claim (fix for duplicate seeding) ----
     The in-memory `seeded` flag is per process AND per route bundle, so on
     the first page load ~7 API routes ran countDocuments()===0 checks in
     parallel and each inserted the seed data. insertOne on a fixed _id is
     atomic in MongoDB: exactly ONE caller wins, all others skip. */
  const marker = await c.seedMeta.findOne({ _id: "main" });
  if (marker && marker.version >= SEED_VERSION) {
    seeded = true;
    return;
  }
  if (marker) await c.seedMeta.deleteOne({ _id: "main" }); // outdated version
  try {
    await c.seedMeta.insertOne({ _id: "main", version: SEED_VERSION, seededAt: new Date() });
  } catch {
    seeded = true; // another route/process won the claim — nothing to do
    return;
  }

  try {
    /* ---- One-time cleanup of duplicates left by previous versions ---- */
    await dedupeByField(c.users, "phone");
    await dedupeByField(c.settings, "key");
    await dedupeByField(c.faqs, "questionAr");
    await dedupeByField(c.speakers, "name");
    await dedupeByField(c.announcements, "titleAr");

    /* ---- Hard guarantees against future duplicates (idempotent) ---- */
    try {
      await c.users.createIndex({ phone: 1 }, { unique: true });
      await c.settings.createIndex({ key: 1 }, { unique: true });
    } catch (e) {
      console.error("seed: unique index warning", e);
    }

    // Admin account — credentials always synced from .env
    // (change ADMIN_PHONE / ADMIN_PASSWORD in .env and restart: the admin
    //  account is updated automatically, no manual DB edit needed)
    const adminPhone = process.env.ADMIN_PHONE || "0555555555";
    const adminPass = process.env.ADMIN_PASSWORD || "HappyInside@2026";
    const adminName = process.env.ADMIN_FULLNAME || "مدير الموقع / Administrateur";
    const admin = await c.users.findOne({ role: "admin" });
    if (!admin) {
      await c.users.insertOne({
        fullName: adminName,
        phone: adminPhone,
        password: await bcrypt.hash(adminPass, 10),
        gender: "male",
        wilaya: "بومرداس",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        recoveryQuestion: "what_is_the_camp_name",
        recoveryAnswer: await bcrypt.hash("happy inside", 10),
      });
    } else {
      // Sync existing admin account with .env values (phone + password)
      const patch: { phone?: string; password?: string } = {};
      if (adminPhone && admin.phone !== adminPhone) {
        // Never break phone uniqueness: skip if another user already owns it
        const clash = await c.users.findOne({ phone: adminPhone, role: { $ne: "admin" } });
        if (!clash) patch.phone = adminPhone;
      }
      if (adminPass && !(await bcrypt.compare(adminPass, admin.password))) {
        patch.password = await bcrypt.hash(adminPass, 10);
      }
      if (Object.keys(patch).length > 0) {
        await c.users.updateOne({ _id: admin._id }, { $set: patch });
      }
    }

    // Camp settings
    const settings = await c.settings.findOne({ key: "main" });
    if (!settings) {
      await c.settings.insertOne(DEFAULT_SETTINGS);
    } else if (
      settings.fee === undefined ||
      settings.studentFee === undefined ||
      settings.logo === undefined ||
      settings.heroImage === undefined ||
      settings.programImage1 === undefined ||
      settings.programImage2 === undefined
    ) {
      // Migration for DBs created before fee/studentFee/logo/images existed
      const patch: Record<string, unknown> = {};
      if (settings.fee === undefined) patch.fee = 0;
      // studentFee defaults to the existing fee so behaviour never changes
      // silently — the admin adjusts both prices from the settings panel.
      if (settings.studentFee === undefined) patch.studentFee = settings.fee ?? 0;
      if (settings.logo === undefined) patch.logo = null;
      if (settings.heroImage === undefined) patch.heroImage = null;
      if (settings.programImage1 === undefined) patch.programImage1 = null;
      if (settings.programImage2 === undefined) patch.programImage2 = null;
      await c.settings.updateOne({ key: "main" }, { $set: patch });
    }

    // FAQs
    const faqCount = await c.faqs.countDocuments();
    if (faqCount === 0) {
      await c.faqs.insertMany(DEFAULT_FAQS.map((f) => ({ ...f })));
    }

    // Speakers (the three presenting psychologists)
    const speakerCount = await c.speakers.countDocuments();
    if (speakerCount === 0) {
      await c.speakers.insertMany([
      {
        name: "SAHARAOUI LYNDA",
        nameAr: "الأخصائية ليندة صحراوي",
        titleAr: "أخصائية نفسية — مقدّمة نشاط",
        titleFr: "Psychologue — Animatrice d'activité",
        bioAr: "أخصائية نفسية ذات خبرة في المرافقة النفسية، شغوفة بتبادل الخبرات بين الممارسين وتطوير أساليب حديثة في الممارسة المهنية.",
        bioFr: "Psychologue expérimentée en accompagnement psychologique, passionnée par le partage d'experiences entre praticiens et le développement de techniques modernes.",
        activityAr: "جلسات نقاش حول واقع الممارسة المهنية وتبادل الخبرات",
        activityFr: "Discussions sur la réalité de la pratique professionnelle et échange d'experiences",
        photo: null,
        order: 1,
        active: true,
      },
      {
        name: "LAKEL IMENE",
        nameAr: "الأخصائية العاقل إيمان",
        titleAr: "أخصائية نفسية — مقدّمة نشاط",
        titleFr: "Psychologue — Animatrice d'activité",
        bioAr: "أخصائية نفسية مهتمة بالتقنيات الحديثة في العلاج النفسي، تؤمن بأن التعلم يكون أعمق حين نستمتع ونتبادل بصدق.",
        bioFr: "Psychologue intéressée par les techniques modernes en psychothérapie, convaincue que l'apprentissage est plus profond quand on s'amuse et échange sincèrement.",
        activityAr: "تقنيات وأساليب حديثة في الممارسة النفسية",
        activityFr: "Techniques et approches modernes de la pratique psychologique",
        photo: null,
        order: 2,
        active: true,
      },
      {
        name: "GHELLACHE HALLA",
        nameAr: "الأخصائية غلاش هالة",
        titleAr: "أخصائية نفسية — مقدّمة نشاط",
        titleFr: "Psychologue — Animatrice d'activité",
        bioAr: "أخصائية نفسية متخصصة في الأنشطة التفريغية والعناية بالنفس المهنية، تقود أنشطة تفاعلية تساعد الممارسين على التفريغ والتجدد.",
        bioFr: "Psychologue spécialisée dans les activités libératrices et le soin de soi professionnel, elle anime des activités interactives de décharge et de renouveau.",
        activityAr: "أنشطة تفريغية وألعاب تفاعلية للعناية بالنفس المهنية",
        activityFr: "Activités libératrices et jeux interactifs pour le soin de soi professionnel",
        photo: null,
        order: 3,
        active: true,
      },
      ]);
      }

    // Welcome announcement
    const annCount = await c.announcements.countDocuments();
    if (annCount === 0) {
      await c.announcements.insertOne({
        titleAr: "انطلاق الطبعة الأولى من مخيم Happy inside experience ✨",
        titleFr: "Lancement de la 1ère édition du camp Happy inside experience ✨",
        bodyAr: "يسرّنا أن نعلن عن انطلاق التسجيل في الطبعة الأولى من مخيم Happy inside experience المخصص لأخصائيي وعاملات القطاع النفسي في مختلف ولايات الجزائر. أربعة أيام وخمس ليالي من التطوير المهني والعناية بالنفس في أجواء تفاعلية ممتعة. المقاعد محدودة، سارعوا بالتسجيل!",
        bodyFr: "Nous sommes ravis d'annoncer l'ouverture des inscriptions pour la première édition du camp Happy inside experience dédié aux psychologues et praticiens du secteur psychologique de toutes les wilayas d'Algérie. Quatre jours et cinq nuits de développement professionnel et de soin de soi dans une ambiance interactive et ludique. Places limitées, inscrivez-vous vite !",
        pinned: true,
        active: true,
        notify: false,
        createdAt: new Date(),
      });
    }
  } catch (e) {
    // Release the claim so the next boot retries the seeding cleanly
    await c.seedMeta.deleteOne({ _id: "main" }).catch(() => {});
    throw e;
  }

  seeded = true;
}
