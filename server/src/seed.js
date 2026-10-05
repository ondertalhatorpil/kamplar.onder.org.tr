require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, Admin, CampCenter, Reservation, ReservationMeal } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı kuruldu.');

    // Seed camp centers
    const centers = await CampCenter.findAll();
    if (centers.length === 0) {
      await CampCenter.bulkCreate([
        {
          name: 'Bursa Kamp Merkezi',
          city: 'Bursa',
          description: 'Bursa\'nın doğal güzelliklerinde yer alan modern kamp merkezimiz, geniş alanları ve doğayla iç içe konumuyla grupların vazgeçilmez buluşma noktasıdır.',
          image_url: '/camp-centers/bursa-kamp-merkezi.jpg',
          capacity: 78,
          has_breakfast: true,
          has_dinner: false,
          breakfast_start_time: '08:00',
          breakfast_end_time: '10:00',
          dinner_start_time: null,
          dinner_end_time: null,
          is_active: true
        },
        {
          name: 'Büyükçekmece Kamp Merkezi',
          city: 'İstanbul',
          description: 'İstanbul\'un batısında, Büyükçekmece Gölü kıyısında yer alan kamp merkezimiz; hem kahvaltı hem akşam yemeği hizmetiyle tam donanımlı bir konaklama imkânı sunar.',
          image_url: '/camp-centers/buyukcekmece-kamp-merkezi.jpg',
          capacity: 48,
          has_breakfast: true,
          has_dinner: true,
          breakfast_start_time: '08:00',
          breakfast_end_time: '10:00',
          dinner_start_time: '18:00',
          dinner_end_time: '20:00',
          is_active: true
        }
      ]);
      console.log('✅ Kamp merkezleri oluşturuldu.');
    } else {
      console.log('ℹ️ Kamp merkezleri zaten mevcut.');
    }

    // Seed admins — genel merkez (2) ve kamp merkezi yöneticileri. İlk parolalar
    // koda yazılmaz, .env'den okunur (SEED_PASSWORD_<KULLANICI ADI>). Hesap zaten
    // varsa parolasına ve telefonuna dokunulmaz; parola değişkeni tanımlı değilse
    // eksik hesap oluşturulmaz.
    const findCenterId = async (keyword) => {
      const center = await CampCenter.findOne({ where: { name: { [Op.like]: `%${keyword}%` } } });
      if (!center) throw new Error(`"${keyword}" kamp merkezi bulunamadı.`);
      return center.id;
    };

    const adminAccounts = [
      { username: 'fadenyigit', first_name: 'Faden', last_name: 'Yiğit', role: 'hq_admin' },
      { username: 'mucahityucel', first_name: 'Mücahit', last_name: 'Yücel', role: 'hq_admin' },
      {
        username: 'buyukcekmecemerkezi',
        first_name: 'Büyükçekmece', last_name: 'Merkez Yöneticisi', role: 'center_admin',
        camp_center_id: await findCenterId('Büyükçekmece')
      },
      {
        username: 'bursakampmerkezi',
        first_name: 'Bursa', last_name: 'Merkez Yöneticisi', role: 'center_admin',
        camp_center_id: await findCenterId('Bursa')
      }
    ];

    for (const account of adminAccounts) {
      const existing = await Admin.findOne({ where: { username: account.username } });
      if (existing) {
        console.log(`ℹ️ Admin zaten mevcut: ${account.username}`);
        continue;
      }
      const envKey = `SEED_PASSWORD_${account.username.toUpperCase()}`;
      const password = process.env[envKey];
      if (!password) {
        console.warn(`⚠️  ${envKey} tanımlı değil — ${account.username} hesabı oluşturulmadı.`);
        continue;
      }
      await Admin.create({ ...account, password_hash: await bcrypt.hash(password, 12), is_active: true });
      console.log(`✅ Admin oluşturuldu: ${account.username}`);
    }

    // Eski ortak admin hesabı kullanımdan kaldırıldı
    await Admin.update({ is_active: false }, { where: { email: 'admin@onderkamp.org' } });

    // Seed sample reservations for testing
    const existingReservations = await Reservation.count();
    if (existingReservations === 0) {
      const now = new Date();
      const sampleData = [
        {
          reservation_number: 'OK-2026-00001',
          authorized_first_name: 'Ahmet',
          authorized_last_name: 'Yılmaz',
          authorized_role: 'Grup Sorumlusu',
          phone: '05551234567',
          email: 'ahmet@example.com',
          institution_name: 'Önder Öğrenci Yurtları',
          province: 'Bursa',
          district: 'Osmangazi',
          group_gender: 'erkek',
          education_level: 'universite',
          participant_count: 45,
          purpose: 'Eğitim',
          camp_center_id: 1,
          start_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 14, 0),
          end_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12, 11, 0),
          total_days: 5,
          total_nights: 4,
          description: 'Liderlik ve kişisel gelişim eğitim programı.',
          status: 'APPROVED',
          document_upload_token: 'sample-token-001-abc123def456',
          token_expires_at: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          participant_file_status: 'NOT_UPLOADED',
          commitment_status: 'NOT_UPLOADED'
        },
        {
          reservation_number: 'OK-2026-00002',
          authorized_first_name: 'Fatma',
          authorized_last_name: 'Kaya',
          authorized_role: 'Öğretmen',
          phone: '05329876543',
          email: 'fatma@example.com',
          institution_name: 'Anadolu Lisesi',
          province: 'İstanbul',
          district: 'Büyükçekmece',
          group_gender: 'kiz',
          education_level: 'lise',
          participant_count: 30,
          purpose: 'Gençlik kampı',
          camp_center_id: 2,
          start_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 12, 0),
          end_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 17, 10, 0),
          total_days: 3,
          total_nights: 2,
          description: 'Kız öğrenciler için gençlik ve liderlik kampı.',
          status: 'PENDING',
          participant_file_status: 'NOT_UPLOADED',
          commitment_status: 'NOT_UPLOADED'
        },
        {
          reservation_number: 'OK-2026-00003',
          authorized_first_name: 'Mehmet',
          authorized_last_name: 'Demir',
          authorized_role: 'Kurum Yöneticisi',
          phone: '05441112233',
          email: 'mehmet@example.com',
          institution_name: 'Demir Holding',
          province: 'Ankara',
          district: 'Çankaya',
          group_gender: 'erkek',
          education_level: 'diger',
          participant_count: 50,
          purpose: 'Seminer',
          camp_center_id: 1,
          start_datetime: new Date(now.getFullYear(), now.getMonth() - 1, 10, 9, 0),
          end_datetime: new Date(now.getFullYear(), now.getMonth() - 1, 13, 18, 0),
          total_days: 3,
          total_nights: 2,
          description: 'Kurumsal seminer ve strateji toplantısı.',
          status: 'COMPLETED',
          participant_file_status: 'UPLOADED',
          commitment_status: 'APPROVED'
        },
        {
          reservation_number: 'OK-2026-00004',
          authorized_first_name: 'Ayşe',
          authorized_last_name: 'Çelik',
          authorized_role: 'Eğitmen',
          phone: '05554445566',
          email: 'ayse@example.com',
          institution_name: 'Gençlik Sanat Atölyesi',
          province: 'İstanbul',
          district: 'Beylikdüzü',
          group_gender: 'kiz',
          education_level: 'ortaokul',
          participant_count: 25,
          purpose: 'Atölye çalışması',
          camp_center_id: 2,
          start_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21, 10, 0),
          end_datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 23, 16, 0),
          total_days: 2,
          total_nights: 1,
          description: 'Yaratıcı yazarlık atölye çalışması.',
          status: 'APPROVED',
          document_upload_token: 'sample-token-004-xyz789uvw012',
          token_expires_at: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          participant_file_status: 'UPLOADED',
          commitment_status: 'UPLOADED'
        },
        {
          reservation_number: 'OK-2026-00005',
          authorized_first_name: 'Hasan',
          authorized_last_name: 'Yıldız',
          authorized_role: 'Proje Sorumlusu',
          phone: '05338889900',
          email: 'hasan@example.com',
          institution_name: 'Yıldız Proje Ofisi',
          province: 'İstanbul',
          district: 'Büyükçekmece',
          group_gender: 'erkek',
          education_level: 'diger',
          participant_count: 20,
          purpose: 'Toplantı',
          camp_center_id: 2,
          start_datetime: new Date(now.getFullYear(), now.getMonth() - 2, 5, 9, 0),
          end_datetime: new Date(now.getFullYear(), now.getMonth() - 2, 7, 17, 0),
          total_days: 2,
          total_nights: 1,
          description: 'Proje değerlendirme toplantısı.',
          status: 'REJECTED',
          rejection_reason: 'Talep edilen tarih aralığında kamp merkezi kapasitesi uygun değildir.',
          participant_file_status: 'NOT_UPLOADED',
          commitment_status: 'NOT_UPLOADED'
        }
      ];

      for (const data of sampleData) {
        await Reservation.create(data);
      }

      // Add sample meals for reservation 1
      const res1 = await Reservation.findOne({ where: { reservation_number: 'OK-2026-00001' } });
      if (res1) {
        const startDate = new Date(res1.start_datetime);
        for (let i = 0; i < 5; i++) {
          const mealDate = new Date(startDate);
          mealDate.setDate(mealDate.getDate() + i);
          await ReservationMeal.create({
            reservation_id: res1.id,
            meal_date: mealDate.toISOString().split('T')[0],
            breakfast_selected: true,
            dinner_selected: false
          });
        }
      }

      // Add sample meals for reservation 4 (Büyükçekmece)
      const res4 = await Reservation.findOne({ where: { reservation_number: 'OK-2026-00004' } });
      if (res4) {
        const startDate = new Date(res4.start_datetime);
        for (let i = 0; i < 2; i++) {
          const mealDate = new Date(startDate);
          mealDate.setDate(mealDate.getDate() + i);
          await ReservationMeal.create({
            reservation_id: res4.id,
            meal_date: mealDate.toISOString().split('T')[0],
            breakfast_selected: true,
            dinner_selected: i === 0
          });
        }
      }

      console.log('✅ Örnek rezervasyonlar oluşturuldu.');
    } else {
      console.log('ℹ️ Rezervasyonlar zaten mevcut.');
    }

    console.log('\n🎉 Seed işlemi tamamlandı!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

seed();
