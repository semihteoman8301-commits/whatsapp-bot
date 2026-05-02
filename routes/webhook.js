const express = require('express');
const router = express.Router();
const { extractMessage } = require('../services/whatsapp');
const { handleIncomingMessage } = require('../services/bot');

/**
 * GET /webhook — WhatsApp webhook doğrulama
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('[Webhook] Doğrulama başarılı ✓');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Doğrulama başarısız ✗');
  return res.sendStatus(403);
});

/**
 * POST /webhook — Gelen WhatsApp mesajlarını karşıla
 */
router.post('/', async (req, res) => {
  // WhatsApp hızlı 200 yanıt bekler
  res.sendStatus(200);

  try {
    const message = extractMessage(req.body);
    if (!message || !message.text) return;

    console.log(`[Webhook] Mesaj geldi: ${message.from} → "${message.text}"`);

    await handleIncomingMessage(message.from, message.text, message.name);
  } catch (error) {
    console.error('[Webhook] İşleme hatası:', error.message);
  }
});

module.exports = router;
