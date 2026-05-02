const { queries } = require('../db/database');
const { sendMessage } = require('./whatsapp');

/**
 * Gelen mesajı işle ve otomatik cevap gönder
 */
async function handleIncomingMessage(phone, text, senderName) {
  // 1) Müşteriyi bul veya oluştur
  let customer = queries.findCustomer(phone);
  const isNewCustomer = !customer;

  if (isNewCustomer) {
    customer = queries.createCustomer(phone, text);
    console.log(`[Bot] Yeni müşteri: ${phone}`);
  }

  // 2) Gelen mesajı logla
  queries.logMessage(customer.id, 'incoming', text);

  // 3) Menü seçimi belirle
  const choice = text.trim();
  let responseKey;
  let needsSupport = customer.needs_support;

  if (isNewCustomer || choice === '0' || choice.toLowerCase() === 'merhaba' || choice.toLowerCase() === 'selam' || choice.toLowerCase() === 'hi') {
    responseKey = 'welcome_message';
    needsSupport = 0;
  } else if (choice === '1') {
    responseKey = 'menu_1';
  } else if (choice === '2') {
    responseKey = 'menu_2';
  } else if (choice === '3') {
    responseKey = 'menu_3';
  } else if (choice === '4') {
    responseKey = 'menu_4';
  } else if (choice === '5') {
    responseKey = 'menu_5';
    needsSupport = 1;
  } else {
    responseKey = 'unknown_message';
  }

  // 4) Cevap metnini veritabanından al
  const setting = queries.getSetting(responseKey);
  const responseText = setting?.value || 'Bir hata oluştu. Lütfen tekrar deneyin.';

  // 5) Müşteriyi güncelle
  queries.updateCustomer(text, responseKey, needsSupport, customer.id);

  // 6) Cevabı WhatsApp ile gönder
  const result = await sendMessage(phone, responseText);

  // 7) Giden mesajı logla
  if (result.success) {
    queries.logMessage(customer.id, 'outgoing', responseText);
  }

  return { customer, responseKey, responseText, sent: result.success };
}

module.exports = { handleIncomingMessage };
