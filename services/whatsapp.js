const axios = require('axios');

const API_URL = 'https://graph.facebook.com/v25.0';

/**
 * WhatsApp Business Cloud API üzerinden mesaj gönder
 */
async function sendMessage(to, text) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    const response = await axios.post(
      `${API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[WhatsApp] Mesaj gönderildi → ${to}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp] Mesaj gönderilemedi → ${to}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

/**
 * Gelen webhook payload'ından mesaj bilgisini çıkar
 */
function extractMessage(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) return null;

    const msg = value.messages[0];
    const contact = value.contacts?.[0];

    return {
      from: msg.from,
      text: msg.text?.body?.trim() || '',
      name: contact?.profile?.name || '',
      messageId: msg.id,
      timestamp: msg.timestamp
    };
  } catch (e) {
    console.error('[WhatsApp] Mesaj parse hatası:', e.message);
    return null;
  }
}

module.exports = { sendMessage, extractMessage };
