require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Routes
app.use('/webhook', require('./routes/webhook'));
app.use('/api', require('./routes/api'));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Hata:', err.message);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// Start
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n  ✅ WhatsApp Bot çalışıyor → http://localhost:${PORT}`);
    console.log(`  📱 Webhook: /webhook`);
    console.log(`  🔧 Admin:   /admin`);
    console.log(`  🔑 Login:   /login\n`);
  });
}

start().catch(err => {
  console.error('Başlatma hatası:', err);
  process.exit(1);
});
