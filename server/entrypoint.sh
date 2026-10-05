#!/bin/sh
set -e

echo "🗄️  Veritabanı oluşturuluyor (yoksa)..."
node -e "
const { Sequelize } = require('sequelize');
const s = new Sequelize('mysql', process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});
s.query('CREATE DATABASE IF NOT EXISTS \`onderkamp\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
  .then(() => { console.log('✅ Veritabanı hazır.'); s.close(); })
  .catch(e => { console.error('DB hatası:', e.message); process.exit(1); });
"

if [ ! -f /app/.migrated ]; then
  echo "🗄️  Tablolar oluşturuluyor..."
  node src/migrate.js
  touch /app/.migrated
else
  echo "🗄️  Tablolar zaten senkronize edilmiş, migrasyon atlanıyor."
  echo "    (Şema değişikliği yaptıysanız imajı yeniden build edin.)"
fi

echo "🌱 Seed verileri ekleniyor..."
node src/seed.js

echo "🚀 Sunucu başlatılıyor..."
exec node src/server.js
