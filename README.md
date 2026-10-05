# ÖnderKamp — Kamp Merkezi Rezervasyon Sistemi

Bursa ve Büyükçekmece kamp merkezleri için tam kapsamlı rezervasyon, belge yönetimi ve analiz sistemi.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router DOM, Axios, Recharts |
| Backend | Node.js, Express.js, Sequelize ORM |
| Veritabanı | MySQL 8+ |
| Auth | JWT + bcrypt |
| Dosya Yükleme | Multer |
| Excel | SheetJS (xlsx) |
| SMS | Mock (gerçek sağlayıcı bağlanabilir) |

---

## Kurulum

### Gereksinimler
- Node.js 18+
- MySQL 8+
- npm

### 1. MySQL Veritabanı Oluşturun

```sql
CREATE DATABASE onderkamp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Kurulumu

```bash
cd onderkamp/server
npm install
```

`.env` dosyasını düzenleyin:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=onderkamp
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=guclu_bir_jwt_anahtari_buraya_yazin
```

Veritabanı tablolarını oluşturun:
```bash
node src/migrate.js
```

Başlangıç verilerini (admin + kamp merkezleri + örnek rezervasyonlar) ekleyin:
```bash
node src/seed.js
```

Backend'i başlatın:
```bash
npm run dev
```
Sunucu `http://localhost:8082` adresinde çalışacak.

### 3. Frontend Kurulumu

```bash
cd onderkamp/client
npm install
npm run dev
```
Uygulama `http://localhost:5173` adresinde açılacak.

---

## Admin Hesapları ve Yetkiler

Giriş kullanıcı adı ile yapılır. Hesaplar `node src/seed.js` ile oluşturulur (eski `admin@onderkamp.org` hesabı pasiftir).

| Kullanıcı adı | Rol | Yetki |
|---------------|-----|-------|
| `fadenyigit`, `mucahityucel` | Genel merkez | Tüm süreçleri görür; merkezden yönlendirilen talepleri onaylar/reddeder |
| `buyukcekmecemerkezi` | Büyükçekmece kamp merkezi | Yalnızca kendi merkezinin talepleri ve belgeleri |
| `bursakampmerkezi` | Bursa kamp merkezi | Yalnızca kendi merkezinin talepleri ve belgeleri |

Her admin, SMS bildirimlerinin gideceği telefon numarasını ve parolasını panelin sol menüsünden değiştirir.

Hesapların ilk parolaları koda yazılmaz; `.env` içindeki `SEED_PASSWORD_<KULLANICI ADI>` değişkenlerinden okunur (örn. `SEED_PASSWORD_FADENYIGIT`). Değişken tanımlı değilse o hesap oluşturulmaz. Var olan hesabın parolasına seed dokunmaz.

### Güvenlik sınırları

- Admin girişi: 15 dakikada 5 hatalı deneme
- Rezervasyon talebi: IP başına saatte 5 talep (her talep SMS gönderdiği için)
- Belge yükleme: 15 dakikada 30 istek
- Belge linki kampın bitişinden bir gün sonrasına kadar (en az 30 gün) geçerlidir

### Onay Akışı

1. Talep gelir → durum `PENDING`, ilgili merkez yöneticisine SMS.
2. Merkez yöneticisi talepleri seçip (her birine not ekleyerek) **Genel Merkeze Yönlendirir** → `FORWARDED`, genel merkez adminlerine notlu ve linkli SMS. Merkez **Reddederse** red nedeni genel merkeze SMS gider.
3. Genel merkez **Onaylar** → `HQ_APPROVED`, merkez yöneticisine SMS. **Reddederse** red nedeni merkeze SMS gider.
4. Merkez yöneticisi **Son Onayı** verir → `APPROVED`, başvurana belge yükleme linkli SMS.
5. Katılımcı listesi ve taahhütname onayı kamp merkezi yöneticisindedir.

Red SMS'leri başvurana gönderilmez, yalnızca adminlere gider.

---

## Sistem Bölümleri

### Kullanıcı Sayfaları
| Route | Açıklama |
|-------|----------|
| `/` | Ana sayfa |
| `/rezervasyon` | 2 adımlı rezervasyon formu |
| `/rezervasyon/basarili` | Başarılı başvuru sayfası |
| `/rezervasyon-belgeleri/:token` | Belge yükleme sayfası (SMS ile gönderilir) |

### Admin Sayfaları
| Route | Açıklama |
|-------|----------|
| `/admin/login` | Admin girişi |
| `/admin/dashboard` | Genel bakış ve özet kartlar |
| `/admin/rezervasyonlar` | Rezervasyon listesi ve filtreleme |
| `/admin/rezervasyonlar/:id` | Rezervasyon detay, onay/red |
| `/admin/takvim` | Takvim ve kapasite görünümü |
| `/admin/belgeler` | Belge durumu listesi |
| `/admin/belgeler/:id` | Katılımcı listesi ve taahhütname yönetimi |
| `/admin/analiz` | Grafikler ve istatistikler |

---

## API Endpointleri

### Public
```
GET  /api/camp-centers                              Kamp merkezlerini listele
POST /api/reservations                              Rezervasyon talebi oluştur
GET  /api/reservation-documents/:token              Token ile rezervasyon bilgisi
GET  /api/reservation-documents/:token/excel-template  Excel taslağı indir
POST /api/reservation-documents/:token/participants Katılımcı listesi yükle
POST /api/reservation-documents/:token/commitment   Taahhütname yükle
```

### Admin (JWT gerekli)
```
POST  /api/admin/auth/login
GET   /api/admin/reservations
GET   /api/admin/reservations/:id
PATCH /api/admin/reservations/:id/approve
PATCH /api/admin/reservations/:id/reject
GET   /api/admin/calendar
GET   /api/admin/capacity
GET   /api/admin/documents
GET   /api/admin/analytics/summary
... (daha fazlası için routes/index.js)
```

---

## Kamp Merkezleri

| Merkez | Kapasite | Kahvaltı | Akşam Yemeği |
|--------|----------|----------|--------------|
| Bursa Kamp Merkezi | 78 kişi | ✅ 08:00–10:00 | ❌ |
| Büyükçekmece Kamp Merkezi | 54 kişi | ✅ 08:00–10:00 | ✅ 18:00–20:00 |

---

## SMS Sistemi

Geliştirme ortamında SMS mesajları console'a yazdırılır ve `sms_logs` tablosuna kaydedilir.

Gerçek SMS sağlayıcısı için `server/src/services/smsService.js` içindeki `sendRealSms` fonksiyonunu doldurun ve `.env`'deki `SMS_PROVIDER` değerini `real` olarak ayarlayın.

---

## Güvenlik

- JWT tabanlı admin oturumu
- bcrypt ile hashlenmiş parolalar
- Rate limiting (15 dakikada 200 istek)
- Helmet güvenlik başlıkları
- CORS kısıtlaması
- Dosya türü ve boyut doğrulaması
- Token tabanlı belge yükleme erişimi
- Kullanıcıya doluluk/kapasite bilgisi gösterilmez
# kamplar.onder.org.tr
