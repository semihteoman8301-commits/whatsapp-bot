const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { queries } = require('../db/database');
const { sendMessage } = require('../services/whatsapp');
const { authMiddleware } = require('../middleware/auth');

// ===== AUTH =====
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
  res.json({ success: true, token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ===== STATS =====
router.get('/stats', authMiddleware, (req, res) => {
  res.json(queries.stats());
});

// ===== CUSTOMERS =====
router.get('/customers', authMiddleware, (req, res) => {
  const { search, tag, page: p, limit: l } = req.query;
  const page = parseInt(p) || 1;
  const limit = parseInt(l) || 50;
  const offset = (page - 1) * limit;

  let customers;
  if (search) {
    customers = queries.searchCustomers(search);
  } else if (tag) {
    customers = queries.customersByTag(parseInt(tag));
  } else {
    customers = queries.listCustomers(limit, offset);
  }

  // Attach tags to each customer
  customers = customers.map(c => ({
    ...c,
    tags: queries.getCustomerTags(c.id)
  }));

  const { total } = queries.countCustomers();
  res.json({ customers, total, page, pages: Math.ceil(total / limit) });
});

router.get('/customers/support', authMiddleware, (req, res) => {
  const customers = queries.supportCustomers().map(c => ({
    ...c,
    tags: queries.getCustomerTags(c.id)
  }));
  res.json(customers);
});

router.post('/customers/:id/resolve', authMiddleware, (req, res) => {
  queries.resolveSupport(req.params.id);
  res.json({ success: true });
});

// ===== CUSTOMER DETAIL =====
router.get('/customers/:id', authMiddleware, (req, res) => {
  const customer = queries.getCustomerById(parseInt(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });
  customer.tags = queries.getCustomerTags(customer.id);
  res.json(customer);
});

router.put('/customers/:id/notes', authMiddleware, (req, res) => {
  queries.updateCustomerNotes(parseInt(req.params.id), req.body.notes || '');
  res.json({ success: true });
});

// ===== MESSAGES =====
router.get('/customers/:id/messages', authMiddleware, (req, res) => {
  res.json(queries.getCustomerMessages(parseInt(req.params.id)));
});

router.get('/messages', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const messages = queries.getMessages(limit, offset);
  const { total } = queries.countMessages();
  res.json({ messages, total, page, pages: Math.ceil(total / limit) });
});

// ===== SEND MESSAGE FROM ADMIN =====
router.post('/send-message', authMiddleware, async (req, res) => {
  const { customerId, message } = req.body;
  if (!customerId || !message) {
    return res.status(400).json({ error: 'customerId ve message gerekli' });
  }

  const customer = queries.getCustomerById(parseInt(customerId));
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });

  // Send via WhatsApp API
  const result = await sendMessage(customer.phone, message);

  // Log to DB regardless
  queries.logMessage(customer.id, 'outgoing', message);

  if (result.success) {
    console.log(`[Admin] Mesaj gönderildi → ${customer.phone}`);
    res.json({ success: true });
  } else {
    // Still log it, but warn admin
    console.warn(`[Admin] Mesaj API hatası → ${customer.phone}: ${result.error}`);
    res.json({ success: true, warning: 'Mesaj kaydedildi fakat WhatsApp API yanıt vermedi: ' + result.error });
  }
});

// ===== TAGS =====
router.get('/tags', authMiddleware, (req, res) => {
  res.json(queries.allTags());
});

router.post('/tags', authMiddleware, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Etiket adı gerekli' });
  try {
    const tag = queries.createTag(name, color || '#25D366');
    res.json(tag);
  } catch (e) {
    res.status(400).json({ error: 'Bu etiket zaten mevcut' });
  }
});

router.delete('/tags/:id', authMiddleware, (req, res) => {
  queries.deleteTag(parseInt(req.params.id));
  res.json({ success: true });
});

// ===== CUSTOMER TAGS =====
router.post('/customers/:id/tags', authMiddleware, (req, res) => {
  const { tagId } = req.body;
  queries.addCustomerTag(parseInt(req.params.id), parseInt(tagId));
  const tags = queries.getCustomerTags(parseInt(req.params.id));
  res.json(tags);
});

router.delete('/customers/:cid/tags/:tid', authMiddleware, (req, res) => {
  queries.removeCustomerTag(parseInt(req.params.cid), parseInt(req.params.tid));
  const tags = queries.getCustomerTags(parseInt(req.params.cid));
  res.json(tags);
});

// ===== SETTINGS =====
router.get('/settings', authMiddleware, (req, res) => {
  const settings = queries.allSettings();
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  res.json(obj);
});

router.put('/settings', authMiddleware, (req, res) => {
  const allowed = ['welcome_message', 'menu_1', 'menu_2', 'menu_3', 'menu_4', 'menu_5', 'unknown_message'];
  for (const [key, value] of Object.entries(req.body)) {
    if (allowed.includes(key) && typeof value === 'string') {
      queries.updateSetting(value, key);
    }
  }
  res.json({ success: true });
});

module.exports = router;
