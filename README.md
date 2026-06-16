# قياسات

نظام إدارة وتحليل ملفات قياسات الملابس الكبيرة من Excel — بحث وفلترة وإحصاءات وتصدير.

يعمل بنفس الكود في وضعين:

- **محليًا** على Windows و macOS (يفتح المتصفح تلقائيًا)
- **على الإنترنت** عبر Render أو أي منصة Node تدعم قرصًا دائمًا

## التشغيل المحلي

تحتاج **Node.js 18+** من [nodejs.org](https://nodejs.org/).

```bash
npm install
npm start
```

سيفتح المتصفح على `http://localhost:5173`.

### بيانات الدخول الافتراضية

- المستخدم: `admin`
- كلمة المرور: `admin123`

> غيّر كلمة المرور بعد أول دخول.

### مكان حفظ البيانات (محليًا)

- **Windows:** `%APPDATA%\Qiyasat\qiyasat.db`
- **macOS:** `~/Library/Application Support/Qiyasat/qiyasat.db`
- **Linux:** `~/.qiyasat/qiyasat.db`

## النشر على Render

المشروع جاهز للنشر التلقائي عبر ملف `render.yaml`:

1. ارفع المستودع على GitHub
2. ادخل [render.com](https://render.com) → **New** → **Blueprint**
3. اختر المستودع — سيقرأ `render.yaml` ويُنشئ كل شيء تلقائيًا
4. أي `git push` لاحقًا يحدّث الموقع تلقائيًا

البيانات تُحفظ في قرص دائم (`/var/data/qiyasat.db`) لن يُمسح بين النشرات.

## البنية

```
boot.js              نقطة البداية الذكية (محلي vs إنتاج)
dist/server.cjs      الخادم Express المُجمَّع
dist/public/         واجهة React المبنية
prebuilds/           ملفات better-sqlite3 لويندوز/ماك (Linux يُبنى من npm)
render.yaml          إعدادات النشر على Render
```

## الأنظمة المدعومة

| النظام | محلي | على Render |
|--------|------|-----------|
| Windows x64 | ✓ | — |
| macOS Intel | ✓ | — |
| macOS Apple Silicon | ✓ | — |
| Linux (سيرفر) | ✓ | ✓ |
