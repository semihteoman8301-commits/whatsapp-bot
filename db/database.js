const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bot.db');
let db;

// ===== INIT =====
async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      first_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message TEXT DEFAULT '',
      last_menu_choice TEXT DEFAULT '',
      needs_support INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      notes TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#25D366'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customer_tags (
      customer_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (customer_id, tag_id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Add notes column if not exists (migration)
  try { db.run(`ALTER TABLE customers ADD COLUMN notes TEXT DEFAULT ''`); } catch(e) {}

  // Default tags
  const defaultTags = [
    { name: 'Sıcak', color: '#ef4444' },
    { name: 'Fiyat Sordu', color: '#f59e0b' },
    { name: 'Takip Edilecek', color: '#3b82f6' },
    { name: 'VIP', color: '#8b5cf6' },
    { name: 'Tamamlandı', color: '#22c55e' }
  ];
  for (const t of defaultTags) {
    const existing = db.exec(`SELECT id FROM tags WHERE name = '${t.name.replace(/'/g, "''")}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`INSERT INTO tags (name, color) VALUES (?, ?)`, [t.name, t.color]);
    }
  }

  // Default settings
  const defaults = {
    welcome_message: `Merhaba 👋\nBize ulaştığınız için teşekkür ederiz.\n\nSize nasıl yardımcı olabiliriz?\n\n1️⃣ Hizmetler\n2️⃣ Fiyat Bilgisi\n3️⃣ Adres / Konum\n4️⃣ Çalışma Saatleri\n5️⃣ Canlı Destek`,
    menu_1: `📋 *Hizmetlerimiz*\n\n• Web Tasarım\n• Mobil Uygulama\n• SEO Optimizasyonu\n• Sosyal Medya Yönetimi\n• Grafik Tasarım\n\nDetaylı bilgi için 2️⃣ yazabilirsiniz.\nAna menü için 0️⃣ yazın.`,
    menu_2: `💰 *Fiyat Bilgisi*\n\nHizmet fiyatlarımız projeye göre değişmektedir.\n\nÜcretsiz keşif görüşmesi için 5️⃣ yazarak canlı destek talep edebilirsiniz.\n\nAna menü için 0️⃣ yazın.`,
    menu_3: `📍 *Adres / Konum*\n\nAdresimiz: Levent Mah. Caddebostan Sok. No:15 Beşiktaş/İstanbul\n\n🗺 Google Maps: https://maps.google.com/?q=41.0821,29.0112\n\nAna menü için 0️⃣ yazın.`,
    menu_4: `🕐 *Çalışma Saatleri*\n\nPazartesi - Cuma: 09:00 - 18:00\nCumartesi: 10:00 - 14:00\nPazar: Kapalı\n\nAna menü için 0️⃣ yazın.`,
    menu_5: `✅ *Canlı Destek*\n\nTalebiniz yetkili kişiye iletildi.\nEn kısa sürede size dönüş yapılacaktır.\n\nTeşekkür ederiz 🙏`,
    unknown_message: `Anlayamadım 🤔\n\nLütfen menüden bir seçenek seçin:\n\n1️⃣ Hizmetler\n2️⃣ Fiyat Bilgisi\n3️⃣ Adres / Konum\n4️⃣ Çalışma Saatleri\n5️⃣ Canlı Destek\n\nAna menü için 0️⃣ yazın.`
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = db.exec(`SELECT key FROM settings WHERE key = '${key.replace(/'/g, "''")}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }

  save();
  console.log('[DB] Veritabanı başlatıldı ✓');
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ===== HELPERS =====
function run(sql, params = []) { db.run(sql, params); save(); }

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ===== QUERIES =====
const queries = {
  // Customers
  findCustomer: (phone) => get('SELECT * FROM customers WHERE phone = ?', [phone]),
  getCustomerById: (id) => get('SELECT * FROM customers WHERE id = ?', [id]),

  createCustomer: (phone, lastMessage) => {
    run('INSERT INTO customers (phone, last_message, last_menu_choice) VALUES (?, ?, ?)', [phone, lastMessage, '']);
    return get('SELECT * FROM customers WHERE phone = ?', [phone]);
  },

  updateCustomer: (lastMessage, menuChoice, needsSupport, id) => {
    run(`UPDATE customers SET last_message_at = datetime('now'), last_message = ?, last_menu_choice = ?, needs_support = ?, message_count = message_count + 1 WHERE id = ?`,
      [lastMessage, menuChoice, needsSupport, id]);
  },

  updateCustomerNotes: (id, notes) => {
    run('UPDATE customers SET notes = ? WHERE id = ?', [notes, id]);
  },

  listCustomers: (limit, offset) => all('SELECT * FROM customers ORDER BY last_message_at DESC LIMIT ? OFFSET ?', [limit, offset]),
  
  searchCustomers: (query) => all(`SELECT * FROM customers WHERE phone LIKE ? OR name LIKE ? ORDER BY last_message_at DESC LIMIT 50`, [`%${query}%`, `%${query}%`]),
  
  customersByTag: (tagId) => all(`
    SELECT c.* FROM customers c
    JOIN customer_tags ct ON ct.customer_id = c.id
    WHERE ct.tag_id = ?
    ORDER BY c.last_message_at DESC
  `, [tagId]),

  countCustomers: () => get('SELECT COUNT(*) as total FROM customers'),
  supportCustomers: () => all('SELECT * FROM customers WHERE needs_support = 1 ORDER BY last_message_at DESC'),
  resolveSupport: (id) => run('UPDATE customers SET needs_support = 0 WHERE id = ?', [id]),

  // Messages
  logMessage: (customerId, direction, text) => {
    run('INSERT INTO messages (customer_id, direction, message_text) VALUES (?, ?, ?)', [customerId, direction, text]);
  },

  getMessages: (limit, offset) => all(`SELECT m.*, c.phone FROM messages m JOIN customers c ON c.id = m.customer_id ORDER BY m.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]),
  getCustomerMessages: (customerId) => all('SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at ASC LIMIT 200', [customerId]),
  countMessages: () => get('SELECT COUNT(*) as total FROM messages'),

  // Settings
  getSetting: (key) => get('SELECT value FROM settings WHERE key = ?', [key]),
  updateSetting: (value, key) => run(`UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?`, [value, key]),
  allSettings: () => all('SELECT * FROM settings ORDER BY key'),

  // Tags
  allTags: () => all('SELECT * FROM tags ORDER BY name'),
  createTag: (name, color) => {
    run('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color]);
    return get('SELECT * FROM tags WHERE name = ?', [name]);
  },
  deleteTag: (id) => {
    run('DELETE FROM customer_tags WHERE tag_id = ?', [id]);
    run('DELETE FROM tags WHERE id = ?', [id]);
  },

  // Customer Tags
  getCustomerTags: (customerId) => all(`
    SELECT t.* FROM tags t
    JOIN customer_tags ct ON ct.tag_id = t.id
    WHERE ct.customer_id = ?
    ORDER BY t.name
  `, [customerId]),

  addCustomerTag: (customerId, tagId) => {
    const existing = get('SELECT * FROM customer_tags WHERE customer_id = ? AND tag_id = ?', [customerId, tagId]);
    if (!existing) run('INSERT INTO customer_tags (customer_id, tag_id) VALUES (?, ?)', [customerId, tagId]);
  },

  removeCustomerTag: (customerId, tagId) => {
    run('DELETE FROM customer_tags WHERE customer_id = ? AND tag_id = ?', [customerId, tagId]);
  },

  // Stats
  stats: () => get(`
    SELECT
      (SELECT COUNT(*) FROM customers) as total_customers,
      (SELECT COUNT(*) FROM customers WHERE needs_support = 1) as support_waiting,
      (SELECT COUNT(*) FROM messages) as total_messages,
      (SELECT COUNT(*) FROM messages WHERE created_at > datetime('now', '-24 hours')) as messages_today
  `)
};

module.exports = { initDatabase, queries };
