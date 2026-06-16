#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[خطأ] لم يتم العثور على Node.js"
  echo "نزّل وثبّت Node.js من: https://nodejs.org/"
  read -p "اضغط Enter للإغلاق"
  exit 1
fi

node boot.js
