# Happy inside expérience

موقع مخيّم أخصائيي القطاع النفسي في الجزائر — **الطبعة الأولى: 16–19 أكتوبر 2026** 🌿

> *"نتعلّم، نستمتع، نتبادل، ونعود بطاقة أكبر"*

موقع احترافي ثنائي اللغة (عربي RTL / فرنسي) مبني بـ **Next.js 16 + MongoDB**، جاهز للنشر على **Vercel** أو **Railway** أو أي استضافة Node.js.

---

## ✨ المزايا / Fonctionnalités

- تسجيل و دخول برقم الهاتف + كلمة المرور (مع سؤال استرجاع) + استعادة كلمة المرور
- إدارة مقاعد المخيم مع شريط تقدم حيّ + دورة موافقة على الدفع (قيد الانتظار ← تم الدفع)
- لوحة تحكم إدارية كاملة: التسجيلات، المستخدمون، الإعلانات، الإشعارات، الموسوعة، مقدّمو الأنشطة، الوسائط، الرسائل، المقترحات، الإعدادات
- هوية المخيم قابلة للتخصيص بالكامل من اللوحة: اللوغو، الشعار، صورة الغلاف، صورتا البرنامج (بعرض مكبّر Zoom)
- إشعارات Push فورية (PWA قابلة للتثبيت كتطبيق) + شريط إعلانات + إعلان عائم
- مساعد ذكي ثنائي اللغة + زر واتساب عائم
- ضغط الصور تلقائيًا في المتصفح قبل الرفع (متوافق مع حدود Vercel)

## 🧰 التقنيات / Stack

| المكوّن | التقنية |
|---|---|
| الإطار | Next.js 16 (App Router) + TypeScript 5 |
| الواجهة | Tailwind CSS 4 + shadcn/ui + Lucide |
| قاعدة البيانات | MongoDB (سائق رسمي `mongodb`، تخزين وسائط base64) |
| الأمان | JWT (كوكي HttpOnly) + bcryptjs |
| الإشعارات | web-push (VAPID) + Service Worker |

**المتطلبات:** Node.js ≥ 20.9 — لا شيء آخر.

---

## 🚀 التشغيل المحلي / Lancement local

```bash
npm install
cp .env.example .env        # ثم عدّل القيم / puis modifiez les valeurs
npm run dev                 # http://localhost:3000
```

قاعدة البيانات تُهيَّأ وتُزرع تلقائيًا عند أول تشغيل (الأديمن، الإعدادات، مقدّمو الأنشطة، الأسئلة الشائعة، الإعلان الترحيبي).

للإنتاج المحلي:
```bash
npm run build
npm run start               # يحترم متغير PORT تلقائيًا
```

---

## 🍃 الخطوة الأولى دائمًا: MongoDB Atlas (مجاني)

الموقع يحتاج رابط MongoDB سحابي (أو محلي). الأسهل **Atlas M0 المجاني**:

1. أنشئ حسابًا على [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register) ثم **Build a Database → M0 Free**
2. **Database Access** → أنشئ مستخدمًا وكلمة مرور (Add New Database User)
3. **Network Access** → **Add IP Address → Allow access from anywhere** (`0.0.0.0/0`) — ضروري ليصل إليه Vercel/Railway
4. **Connect → Drivers → Node.js** → انسخ رابط الاتصال، مثال:
   ```
   mongodb+srv://utilisateur:motdepasse@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. ضعه في المتغير `MONGODB_URI`

> 💡 على Railway يمكنك بدلًا من ذلك نشر **MongoDB** كخدمة مرفقة (انظر قسم Railway).

---

## ▲ النشر على Vercel (موصى به للبساطة)

1. ارفع المشروع إلى مستودع **GitHub** (لا ترفع ملف `.env` — كل شيء عبر المتغيرات)
2. على [vercel.com/new](https://vercel.com/new): **Import** المستودع
3. Vercel يكتشف Next.js تلقائيًا — أضف **Environment Variables** التالية قبل الضغط على Deploy:

| المتغير | القيمة | إلزامي |
|---|---|---|
| `MONGODB_URI` | رابط Atlas أعلاه | ✅ |
| `MONGODB_DB` | `happy_inside_experience` | ✅ |
| `AUTH_SECRET` | قيمة عشوائية: `openssl rand -hex 48` | ✅ |
| `ADMIN_PHONE` | رقم الأديمن (مثال `0555555555`) | ✅ |
| `ADMIN_PASSWORD` | كلمة مرور قوية | ✅ |
| `ADMIN_FULLNAME` | اسم الأديمن المعروض | ➖ |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | مفاتيح Push (اختياري — تُولَّد تلقائيًا إن فُرغت) | ➖ |
| `WHATSAPP_NUMBER` / `CONTACT_EMAIL` / `FACEBOOK_URL` / `INSTAGRAM_URL` | معلومات التواصل الافتراضية | ➖ |
| `AI_API_URL` / `AI_API_KEY` / `AI_MODEL` | مزوّد المساعد الذكي (انظر أدناه) | ➖ |

4. **Deploy** — بعد دقيقة يصبح الموقع حيًّا على `https://votre-projet.vercel.app`

**ملاحظات خاصة بـ Vercel:**
- ملف `vercel.json` المرفق يضبط منطقة الخوادم على `cdg1` (باريس — الأقرب للجزائر) لتقليل زمن الاستجابة
- حد حجم الطلب 4.5 ميغابايت: **الصور تُضغط تلقائيًا في المتصفح** قبل الرفع فلا مشكلة؛ تجنّب رفع **فيديوهات** أكبر من ~3 ميغابايت (استخدم Railway إن احتجت فيديوهات كبيرة)
- عند تحديث المستودع يعاد النشر تلقائيًا

---

## 🚂 النشر على Railway

### الطريقة 1 — نشر كامل (الموقع + MongoDB في مكان واحد)

1. على [railway.com/new](https://railway.com/new): **Deploy from GitHub repo** واختر المستودع
2. Railway يستخدم تلقائيًا ملف `railway.json` المرفق: بناء Nixpacks، أمر التشغيل `npm run start`، وفحص صحة `/api/health`
3. أضف **MongoDB**: داخل المشروع ← **+ Create → Database → MongoDB** (يصبح متغير `MONGO_URL` جاهزًا)
4. في خدمة الموقع ← **Variables**، أضف:
   ```
   MONGODB_URI   = ${{MongoDB.MONGO_URL}}
   MONGODB_DB    = happy_inside_experience
   AUTH_SECRET   = <openssl rand -hex 48>
   ADMIN_PHONE   = 0555555555
   ADMIN_PASSWORD= <كلمة مرور قوية>
   ```
   (لمستخدمي Linux: توليد سريع للمفتاح `openssl rand -hex 48`)
5. **Settings → Networking → Generate Domain** — الموقع حيّ على HTTPS

> لا يوجد حد لحجم الطلبات على Railway — مثالي لرفع وسائط كبيرة.

### الطريقة 2 — Railway + MongoDB Atlas
نفس الخطوات مع `MONGODB_URI` = رابط Atlas مباشرة.

### 🐳 بديل: Docker
يوجد `Dockerfile` جاهز (Node 20 Alpine). إن فضّلت البناء بـ Docker، غيّر في `railway.json` السطر `"builder": "NIXPACKS"` إلى `"DOCKERFILE"` — أو استخدم الملف كما هو على أي VPS:
```bash
docker build -t happy-inside .
docker run -p 3000:3000 --env-file .env happy-inside
```

---

## 🔧 المتغيرات البيئية — المرجع الكامل

راجع الملف الموثّق [`‌.env.example`](./.env.example) — يحتوي كل متغير مع شرحه بالعربية والفرنسية وطريقة توليد كل مفتاح.

| المجموعة | المتغيرات |
|---|---|
| قاعدة البيانات | `MONGODB_URI` • `MONGODB_DB` |
| الأديمن | `ADMIN_PHONE` • `ADMIN_PASSWORD` • `ADMIN_FULLNAME` |
| الجلسات | `AUTH_SECRET` • `COOKIE_SECURE` (اختياري) |
| الإشعارات | `VAPID_PUBLIC_KEY` • `VAPID_PRIVATE_KEY` • `VAPID_SUBJECT` |
| التواصل (أول تهيئة) | `WHATSAPP_NUMBER` • `CONTACT_EMAIL` • `FACEBOOK_URL` • `INSTAGRAM_URL` |
| المساعد الذكي (اختياري) | `AI_API_URL` • `AI_API_KEY` • `AI_MODEL` |

---

## 🤖 المساعد الذكي على الاستضافة السحابية

المساعد يعمل تلقائيًا في بيئة التطوير الأصلية. على Vercel/Railway لديك خياران:

1. **بدون أي إعداد:** يرد المساعد برسالة مهذبة توجّه الزائر نحو واتساب (بدون أي خطأ ظاهر)
2. **مزوّد AI حقيقي (موصى به):** أي خدمة متوافقة مع OpenAI تكفي:
   - OpenAI: `AI_API_URL=https://api.openai.com/v1` • `AI_API_KEY=sk-...` • `AI_MODEL=gpt-4o-mini`
   - Groq (مجاني وسريع): `AI_API_URL=https://api.groq.com/openai/v1` • `AI_MODEL=llama-3.3-70b-versatile`
   - OpenRouter: `AI_API_URL=https://openrouter.ai/api/v1`

سياق المساعد (معلومات المخيم، المقاعد المتبقية، الأسئلة الشائعة، المعلنون) يُبنى تلقائيًا من قاعدة البيانات — أي تغيير من لوحة التحكم ينعكس فورًا على إجاباته.

---

## ✅ قائمة التحقق بعد النشر

- [ ] افتح `/api/health` — يجب أن ترى `"status":"ok"` و `"db":"connected"`
- [ ] سجّل الدخول إلى `/admin` برقم وكلمة مرور `ADMIN_PHONE` / `ADMIN_PASSWORD`
- [ ] **غيّر كلمة مرور الأديمن** من `ADMIN_PASSWORD` في المتغيرات وأعد النشر (تُطبَّق تلقائيًا)
- [ ] من **الإعدادات**: الشعار، الشعار النصي، الرسوم، عدد المقاعد، مواعيد، معلومات التواصل، صورتا البرنامج وصورة الغلاف
- [ ] جرّب التسجيل بحساب حقيقي ثم احجز مقعدًا وفعّل الإشعارات 🌿

---

## 🩺 استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `/api/health` يرجع `db: unreachable` | راجع `MONGODB_URI` وأن Network Access في Atlas يسمح بـ `0.0.0.0/0` |
| تسجيل الدخول لا يحفظ الجلسة بعد النشر | تأكد أن الموقع على HTTPS (افتراضي في Vercel/Railway)؛ أو اضبط `COOKIE_SECURE=false` للاستضافة الذاتية عبر HTTP |
| رفع فيديو كبير يفشل على Vercel | حد 4.5 ميغابايت للطلب — ارفع فيديوهات أصغر أو انشر على Railway |
| بيانات مكرّرة في القاعدة | مستحيل تقنيًا: قفل ذرّي + فهارس فريدة + تنظيف تلقائي عند أول تشغيل |
| أريد إعادة زرع البيانات الأساسية | احذف المجموعة `seed_meta` من القاعدة وأعد تشغيل الخدمة |
| نسيت كلمة مرور الأديمن | غيّر `ADMIN_PASSWORD` في المتغيرات البيئية وأعد النشر — تُطبَّق فورًا |

---

## 🛡️ حساب الأديمن الافتراضي

- الهاتف: `0555555555` — كلمة المرور: `HappyInside@2026`
- ⚠️ **غيّرهما فورًا** عبر المتغيرات البيئية قبل الإطلاق الحقيقي
- علم الجزائر في الموقع منسوخ حرفيًا من الملف الرسمي — نسخة طبق الأصل

---

*صُنع بحبّ لكل أخصائيي وعاملات القطاع النفسي في الجزائر 🇩🇿*
