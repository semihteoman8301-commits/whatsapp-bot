# WhatsApp Otomasyon Botu

Küçük işletmeler için WhatsApp Business Cloud API üzerinden çalışan otomatik mesajlaşma ve menü yönlendirme sistemi.

## ✨ Özellikler

- 📱 WhatsApp Business Cloud API webhook entegrasyonu
- 👋 Otomatik karşılama mesajı
- 📋 Numaralı menü sistemi (1-5)
- 💬 Hazır cevap yönetimi (admin panelden düzenlenebilir)
- 👥 Müşteri kaydı ve takibi
- 🆘 Canlı destek talep sistemi
- 📊 Dashboard istatistikleri
- 📝 Mesaj loglama (gelen/giden)
- 🔐 JWT tabanlı admin panel güvenliği

## 🚀 Kurulum

### 1. Bağımlılıkları yükle
```bash
npm install
```

### 2. Ortam değişkenlerini ayarla
```bash
cp .env.example .env
```

`.env` dosyasını düzenle:
```
WHATSAPP_TOKEN=your_whatsapp_api_token
PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=my_custom_verify_token_123
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=guclu_sifre_123
JWT_SECRET=rastgele_uzun_secret_key
PORT=3000
```

### 3. Sunucuyu başlat
```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### 4. Admin panele giriş
Tarayıcıda `http://localhost:3000/login` adresine git.

## 📱 WhatsApp Business API Kurulumu

### Meta Developer Hesabı
1. [developers.facebook.com](https://developers.facebook.com) adresine git
2. Yeni uygulama oluştur → "Business" seç
3. WhatsApp ürününü ekle
4. Test numarası al

### Webhook Ayarları
1. WhatsApp > Configuration > Webhook'a git
2. Callback URL: `https://your-domain.com/webhook`
3. Verify Token: `.env` dosyasındaki `VERIFY_TOKEN` ile aynı olmalı
4. Subscribe: `messages` alanını seç

### Webhook Doğrulama
WhatsApp bir GET isteği gönderir:
```
GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```
Bot otomatik olarak doğrulamayı yapar.

### Local Test (ngrok)
```bash
# ngrok ile tunnel aç
ngrok http 3000

# Verilen HTTPS URL'ini Meta webhook ayarlarına yapıştır
```

## 📁 Proje Yapısı

```
whatsapp-bot/
├── server.js              # Express ana sunucu
├── package.json
├── .env                   # Ortam değişkenleri
├── .env.example           # Örnek ortam dosyası
├── db/
│   └── database.js        # SQLite şema ve sorguları
├── routes/
│   ├── webhook.js         # WhatsApp webhook endpoint
│   └── api.js             # Admin panel API
├── services/
│   ├── whatsapp.js        # WhatsApp API istemcisi
│   └── bot.js             # Bot mantığı ve menü yönlendirme
├── middleware/
│   └── auth.js            # JWT kimlik doğrulama
└── public/
    ├── login.html         # Admin giriş sayfası
    └── admin.html         # Admin panel
```

## 🗄 Veritabanı Tabloları

| Tablo | Açıklama |
|-------|----------|
| customers | Müşteri bilgileri, destek durumu |
| messages | Gelen/giden tüm mesaj logları |
| settings | Hazır cevap metinleri |

## 📋 Menü Akışı

```
Kullanıcı ilk mesaj → Karşılama mesajı
  "1" → Hizmetler listesi
  "2" → Fiyat bilgisi
  "3" → Adres ve Google Maps linki
  "4" → Çalışma saatleri
  "5" → Canlı destek talebi (admin panelde görünür)
  "0" → Ana menüye dön
  Diğer → "Anlayamadım" mesajı + menü tekrarı
```

## 🔧 Deploy

### Railway / Render
1. GitHub'a push et
2. Railway veya Render'da yeni servis oluştur
3. Environment variables ekle
4. Deploy et
5. HTTPS URL'ini WhatsApp webhook'a ekle

### VPS (PM2)
```bash
npm install -g pm2
pm2 start server.js --name whatsapp-bot
pm2 save
pm2 startup
```

## 📜 Lisans

MIT
