require('dotenv').config();
const { sequelize } = require('./models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı kuruldu.');

    await sequelize.sync({ alter: true });
    console.log('✅ Tüm tablolar oluşturuldu/güncellendi.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

migrate();
