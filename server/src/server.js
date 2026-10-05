require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 8081;

async function startServer() {
  try {
    // Sync database
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı kuruldu.');

    await sequelize.sync({ alter: false });
    console.log('✅ Veritabanı tabloları senkronize edildi.');

    app.listen(PORT, () => {
      console.log(`🚀 ÖnderKamp API sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
      console.log(`📊 Admin paneli: http://localhost:5173/admin/login`);
      console.log(`🌍 Ortam: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Sunucu başlatılamadı:', error);
    process.exit(1);
  }
}

startServer();
