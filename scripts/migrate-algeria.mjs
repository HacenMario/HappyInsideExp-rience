/* One-off migration: Boumerdès-only audience -> all Algeria + official text fixes
   Run: cd /home/z/my-project && node scripts/migrate-algeria.mjs
*/
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB || "happy_inside_experience";

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);
  const settings = db.collection("camp_settings");
  const speakers = db.collection("speakers");
  const faqs = db.collection("faqs");
  const announcements = db.collection("announcements");

  // 1. Camp settings
  const s = await settings.updateOne(
    { key: "main" },
    {
      $set: {
        descAr:
          "مخيّم خاص بأخصائيي وعاملات القطاع النفسي في مختلف ولايات الجزائر، يجمع بين التطوير المهني والعناية بالنفس في أجواء تفاعلية ودّية بعيدة عن الإطار الأكاديمي التقليدي. أربعة أيام وخمس ليالي من النقاش، التبادل، الألعاب والأنشطة التفريغية.",
        descFr:
          "Un camp dédié aux psychologues et praticiens du secteur psychologique de toutes les wilayas d'Algérie, alliant développement professionnel et soin de soi dans une ambiance interactive et conviviale, loin du cadre académique traditionnel. Quatre jours et cinq nuits de discussions, d'échanges, de jeux et d'activités libératrices.",
        locationAr: "زموري، بومرداس — الجزائر",
        locationFr: "Zemmouri, Boumerdès — Algérie",
        announcementBarTextAr:
          "✨ التسجيل مفتوح الآن للطبعة الأولى من مخيم Happy inside expérience — المقاعد محدودة، سارع بالحجز!",
        announcementBarTextFr:
          "✨ Les inscriptions sont ouvertes pour la 1ère édition du camp Happy inside expérience — places limitées, dépêchez-vous !",
      },
    }
  );
  console.log("settings updated:", s.modifiedCount);

  // 2. Speaker name
  const spk = await speakers.updateMany(
    { name: "SAHARAOUI Lynda" },
    { $set: { name: "SAHARAOUI LYNDA" } }
  );
  console.log("speakers updated:", spk.modifiedCount);

  // 3. FAQs eligibility
  const faq = await faqs.updateMany({ answerAr: { $regex: "بولاية بومرداس" } }, [
    {
      $set: {
        answerAr: {
          $replaceOne: { input: "$answerAr", find: "بولاية بومرداس", replacement: "في مختلف ولايات الجزائر" },
        },
        answerFr: {
          $replaceOne: {
            input: "$answerFr",
            find: "de la wilaya de Boumerdès",
            replacement: "de toutes les wilayas d'Algérie",
          },
        },
      },
    },
  ]);
  console.log("faqs updated:", faq.modifiedCount);

  // 4. Welcome announcement body (Boumerdès -> all Algeria) via JS string ops (safer than $replaceOne across versions)
  const docs = await announcements.find({}).toArray();
  let n = 0;
  for (const d of docs) {
    const set = {};
    if (typeof d.bodyAr === "string" && d.bodyAr.includes("بأخصائيي بومرداس")) {
      set.bodyAr = d.bodyAr.replace(
        "بأخصائيي بومرداس",
        "المخصص لأخصائيي وعاملات القطاع النفسي في مختلف ولايات الجزائر"
      );
    }
    if (typeof d.bodyFr === "string" && d.bodyFr.includes("des psychologues de Boumerdès")) {
      set.bodyFr = d.bodyFr.replace(
        "des psychologues de Boumerdès",
        "dédié aux psychologues et praticiens du secteur psychologique de toutes les wilayas d'Algérie"
      );
    }
    if (typeof d.titleAr === "string" && d.titleAr.includes("🌴")) set.titleAr = d.titleAr.replaceAll("🌴", "✨");
    if (typeof d.titleFr === "string" && d.titleFr.includes("🌴")) set.titleFr = d.titleFr.replaceAll("🌴", "✨");
    if (typeof d.bodyAr === "string" && d.bodyAr.includes("Happy inside experience")) {
      set.bodyAr = set.bodyAr || d.bodyAr;
      set.bodyAr = set.bodyAr.replaceAll("Happy inside experience", "Happy inside expérience");
    }
    if (Object.keys(set).length) {
      await announcements.updateOne({ _id: d._id }, { $set: set });
      n++;
    }
  }
  console.log("announcements updated:", n);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
