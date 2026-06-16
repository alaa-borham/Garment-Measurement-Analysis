# دليل الـ Rollback السريع 🚨

## إذا توقف الموقع بعد deploy

### الخطوة 1 — تحقق من الحالة

```bash
curl -I https://qiyasat-production.up.railway.app/
```

إذا أعطى 502 لأكثر من 3 دقائق → ابدأ rollback.

### الخطوة 2 — rollback فوري (الأسرع)

**الطريقة أ — العودة إلى آخر نسخة مستقرة معروفة:**

```bash
cd /home/user/workspace/railway-repo
git fetch origin
git reset --hard production-known-good
git push origin main --force-with-lease
```

**الطريقة ب — العودة إلى commit محدد:**

```bash
git log --oneline -10                 # شاهد آخر commits
git reset --hard <COMMIT_HASH>
git push origin main --force-with-lease
```

**الطريقة ج — revert (لا يعيد كتابة التاريخ):**

```bash
git revert HEAD              # ينشئ commit عكسي
git push origin main
```

### الخطوة 3 — تحقق

```bash
# انتظر دقيقتين، ثم:
curl -I https://qiyasat-production.up.railway.app/
# يجب أن ترى: HTTP/2 200
```

---

## نقاط الاسترداد المحفوظة

| Tag/Branch                  | الوصف                             |
| --------------------------- | --------------------------------- |
| `production-known-good`     | آخر نسخة مؤكدة تعمل (Wave 1)      |
| `stable-wave1-20260616`     | نسخة Wave 1 بتاريخ 2026-06-16     |
| `backup/wave1-stable`       | فرع نسخة احتياطية كامل من Wave 1  |
| `backup/auto-YYYYMMDD-HHMM` | نسخ تلقائية من سكربت SAFE_DEPLOY  |
| `pre-deploy-YYYYMMDD-HHMM`  | tag قبل كل deploy عبر SAFE_DEPLOY |

---

## لاستخدام النشر الآمن

```bash
cd /home/user/workspace/railway-repo
# انسخ ملفاتك الجديدة...
bash SAFE_DEPLOY.sh "رسالة الـ commit هنا"
```

السكربت تلقائياً:

1. يأخذ نسخة احتياطية من النسخة الحالية (branch + tag)
2. يرفع التغييرات
3. يعرض أوامر rollback جاهزة

---

## ⚠️ قواعد ذهبية

- ❌ لا تلمس `package.json` أو `boot.js` أبداً (سبب كارثة Wave 2)
- ❌ لا تلمس `package-lock.json`
- ❌ لا تنسخ `package.json` من `qiyasat-source/` — هما مختلفان
- ✅ انسخ فقط: `dist/server.cjs`, `dist/public/*`, ملفات source المعدّلة
- ✅ احذف assets/\*.js و \*.css القديمة قبل نسخ الجديدة
- ✅ استخدم `git push --force-with-lease` لا `--force`
- ✅ بعد كل push: انتظر دقيقتين + Ctrl+Shift+R
