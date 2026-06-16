#!/bin/bash
# سكربت النشر الآمن — يأخذ نسخة احتياطية قبل أي push
# الاستخدام: bash SAFE_DEPLOY.sh "رسالة الـ commit"

set -e

MSG="${1:-update}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup/auto-$TIMESTAMP"

cd /home/user/workspace/railway-repo

echo "════════════════════════════════════════════"
echo "  Safe Deploy — $TIMESTAMP"
echo "════════════════════════════════════════════"

# 1) تحقق أن main نظيف من تغييرات غير محفوظة
if [ -z "$(git status --porcelain)" ]; then
  echo "[خطأ] لا توجد تغييرات. اخرج."
  exit 1
fi

# 2) أنشئ branch احتياطي من آخر commit ناجح (HEAD الحالي قبل التغييرات)
echo "[1/4] إنشاء نسخة احتياطية من النسخة الحالية..."
CURRENT_COMMIT=$(git rev-parse HEAD)
git branch "$BACKUP_BRANCH" "$CURRENT_COMMIT"
git push origin "$BACKUP_BRANCH"
echo "  ✅ Backup branch: $BACKUP_BRANCH (من commit $CURRENT_COMMIT)"

# 3) Tag على النسخة الحالية قبل النشر
git tag -a "pre-deploy-$TIMESTAMP" -m "قبل: $MSG"
git push origin "pre-deploy-$TIMESTAMP"
echo "  ✅ Tag: pre-deploy-$TIMESTAMP"

# 4) Commit + push التغييرات الجديدة
echo "[2/4] رفع التحديث..."
git add -A
git commit -m "$MSG"
git push origin main
echo "  ✅ تم الـ push"

# 5) عرض إجراء rollback
NEW_COMMIT=$(git rev-parse HEAD)
echo ""
echo "[3/4] إذا فشل النشر، استخدم أحد هذه الأوامر للـ rollback:"
echo "  أ) git reset --hard $CURRENT_COMMIT && git push origin main --force-with-lease"
echo "  ب) git revert $NEW_COMMIT && git push origin main"
echo "  ج) git checkout $BACKUP_BRANCH -- . && git commit -m 'rollback' && git push"
echo ""
echo "[4/4] انتظر دقيقتين، ثم اختبر:"
echo "  curl -I https://qiyasat-production.up.railway.app/"
echo ""
echo "════════════════════════════════════════════"
echo "✅ تم. النسخة الاحتياطية: $BACKUP_BRANCH"
echo "════════════════════════════════════════════"
