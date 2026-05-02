const TOKEN = localStorage.getItem('token');
if (!TOKEN) window.location.href = '/login';
const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

let allTags = [];
let activeChatId = null;
let activeChatPhone = '';

async function api(url, opts = {}) {
  const res = await fetch(url, { headers, ...opts });
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res.json();
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2500); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d + 'Z'); return dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
function shortDate(d) { if (!d) return ''; const dt = new Date(d + 'Z'); return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function tagHtml(t, removable, cid) {
  const bg = t.color + '22';
  const rm = removable ? `<span class="tag-remove" onclick="event.stopPropagation();removeTag(${cid},${t.id})">✕</span>` : '';
  return `<span class="tag" style="background:${bg};color:${t.color};border:1px solid ${t.color}33">${esc(t.name)}${rm}</span>`;
}

// ===== NAV =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + item.dataset.page).classList.add('active');
    loadPage(item.dataset.page);
  });
});

async function loadPage(p) {
  if (p === 'dashboard') loadDashboard();
  else if (p === 'chat') loadChatList();
  else if (p === 'customers') loadCustomers();
  else if (p === 'support') loadSupport();
  else if (p === 'tags') loadTags();
  else if (p === 'settings') loadSettings();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  const s = await api('/api/stats'); if (!s) return;
  document.getElementById('s-customers').textContent = s.total_customers;
  document.getElementById('s-messages').textContent = s.total_messages;
  document.getElementById('s-today').textContent = s.messages_today;
  document.getElementById('s-support').textContent = s.support_waiting;
  document.getElementById('supportBadge').textContent = s.support_waiting;
  const md = await api('/api/messages?limit=10'); if (!md) return;
  document.getElementById('dashMessages').innerHTML = md.messages.map(m => `
    <tr><td class="phone" onclick="openChatByPhone('${esc(m.phone)}')">${esc(m.phone)}</td>
    <td><span class="dir-badge ${m.direction === 'incoming' ? 'in' : 'out'}">${m.direction === 'incoming' ? 'Gelen' : 'Giden'}</span></td>
    <td class="msg-text">${esc(m.message_text)}</td>
    <td style="font-size:.8rem;color:#64748b">${fmtDate(m.created_at)}</td></tr>`).join('');
}

// ===== CHAT =====
async function loadChatList(search) {
  const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : '/api/customers?limit=100';
  const data = await api(url); if (!data) return;
  allTags = await api('/api/tags') || [];
  const list = document.getElementById('chatList');
  list.innerHTML = data.customers.map(c => `
    <div class="chat-item ${c.id === activeChatId ? 'active' : ''}" onclick="openChat(${c.id},'${esc(c.phone)}')">
      <div class="avatar">${(c.phone || '').slice(-2)}</div>
      <div class="chat-info">
        <div class="chat-phone">${esc(c.phone)}</div>
        <div class="chat-preview">${esc(c.last_message)}</div>
      </div>
      ${c.needs_support ? '<div class="support-dot"></div>' : ''}
      <div class="chat-time">${shortDate(c.last_message_at)}</div>
    </div>`).join('') || '<div style="padding:30px;text-align:center;color:#475569">Henüz konuşma yok</div>';
}

document.getElementById('chatSearch')?.addEventListener('input', (e) => {
  loadChatList(e.target.value);
});

async function openChat(id, phone) {
  activeChatId = id;
  activeChatPhone = phone;
  // Highlight
  document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
  event?.target?.closest('.chat-item')?.classList.add('active');
  // Load messages
  const msgs = await api(`/api/customers/${id}/messages`); if (!msgs) return;
  const customer = await api(`/api/customers/${id}`);
  const tagsHtml = (customer?.tags || []).map(t => tagHtml(t, false)).join('');
  document.getElementById('chatMain').innerHTML = `
    <div class="chat-top">
      <div class="avatar">${phone.slice(-2)}</div>
      <div class="chat-top-info">
        <div class="name">${esc(phone)}</div>
        <div class="status">${customer?.message_count || 0} mesaj · ${customer?.needs_support ? '🔴 Destek bekliyor' : '🟢 Aktif'}</div>
      </div>
      <div class="chat-top-tags">${tagsHtml}</div>
      <button class="btn-detail" onclick="toggleDetail(${id})">ℹ️ Detay</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      ${msgs.map(m => `<div class="bubble ${m.direction}"><div>${esc(m.message_text)}</div><div class="btime">${shortDate(m.created_at)}</div></div>`).join('')}
    </div>
    <div class="chat-input-bar">
      <textarea id="msgInput" placeholder="Mesaj yaz..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg()}"></textarea>
      <button class="btn-send" onclick="sendMsg()">Gönder ➤</button>
    </div>`;
  const mc = document.getElementById('chatMessages');
  mc.scrollTop = mc.scrollHeight;
}

async function openChatByPhone(phone) {
  // Switch to chat tab, find customer
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector('[data-page="chat"]').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-chat').classList.add('active');
  const data = await api(`/api/customers?search=${encodeURIComponent(phone)}`);
  if (data?.customers?.[0]) {
    await loadChatList();
    openChat(data.customers[0].id, data.customers[0].phone);
  }
}

async function sendMsg() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !activeChatId) return;
  input.value = '';
  // Optimistic UI
  const mc = document.getElementById('chatMessages');
  mc.innerHTML += `<div class="bubble outgoing"><div>${esc(text)}</div><div class="btime">şimdi</div></div>`;
  mc.scrollTop = mc.scrollHeight;
  await api('/api/send-message', { method: 'POST', body: JSON.stringify({ customerId: activeChatId, message: text }) });
}

// ===== DETAIL PANEL =====
async function toggleDetail(id) {
  const panel = document.getElementById('chatDetail');
  if (panel.style.display === 'flex') { panel.style.display = 'none'; return; }
  panel.style.display = 'flex';
  const c = await api(`/api/customers/${id}`); if (!c) return;
  allTags = await api('/api/tags') || [];
  const cTags = c.tags || [];
  const availTags = allTags.filter(t => !cTags.find(ct => ct.id === t.id));
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-section"><div class="ds-label">Telefon</div><div class="ds-value phone">${esc(c.phone)}</div></div>
    <div class="detail-section"><div class="ds-label">İlk Mesaj</div><div class="ds-value">${fmtDate(c.first_message_at)}</div></div>
    <div class="detail-section"><div class="ds-label">Son Mesaj</div><div class="ds-value">${fmtDate(c.last_message_at)}</div></div>
    <div class="detail-section"><div class="ds-label">Mesaj Sayısı</div><div class="ds-value">${c.message_count}</div></div>
    <div class="detail-section"><div class="ds-label">Durum</div><div class="ds-value">${c.needs_support ? '<span class="badge-support">Destek Bekliyor</span>' : '<span class="badge-ok">Normal</span>'}</div></div>
    <div class="detail-section">
      <div class="ds-label">Etiketler</div>
      <div class="detail-tags" id="detailTags">${cTags.map(t => tagHtml(t, true, c.id)).join('') || '<span style="color:#475569;font-size:.8rem">Etiket yok</span>'}</div>
      <div class="detail-tag-add">
        <select id="addTagSelect">${availTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        <button class="btn-sm green" onclick="addTag(${c.id})" ${availTags.length === 0 ? 'disabled' : ''}>+</button>
      </div>
    </div>
    <div class="detail-section">
      <div class="ds-label">Notlar</div>
      <textarea id="custNotes" onblur="saveNotes(${c.id})">${esc(c.notes || '')}</textarea>
    </div>
    ${c.needs_support ? `<button class="btn-sm green" style="width:100%;padding:10px;margin-top:8px" onclick="resolveFromDetail(${c.id})">✓ Destek Çözüldü</button>` : ''}`;
}

function closeDetail() { document.getElementById('chatDetail').style.display = 'none'; }

async function addTag(cid) {
  const sel = document.getElementById('addTagSelect');
  if (!sel.value) return;
  await api(`/api/customers/${cid}/tags`, { method: 'POST', body: JSON.stringify({ tagId: sel.value }) });
  toggleDetail(cid); // refresh
  toast('Etiket eklendi ✓');
}

async function removeTag(cid, tid) {
  await api(`/api/customers/${cid}/tags/${tid}`, { method: 'DELETE' });
  toggleDetail(cid);
  toast('Etiket kaldırıldı');
}

async function saveNotes(cid) {
  const notes = document.getElementById('custNotes').value;
  await api(`/api/customers/${cid}/notes`, { method: 'PUT', body: JSON.stringify({ notes }) });
  toast('Not kaydedildi ✓');
}

async function resolveFromDetail(id) {
  await api(`/api/customers/${id}/resolve`, { method: 'POST' });
  toast('Destek talebi kapatıldı ✓');
  toggleDetail(id);
  loadChatList();
}

// ===== CUSTOMERS =====
async function loadCustomers() {
  allTags = await api('/api/tags') || [];
  const sel = document.getElementById('custTagFilter');
  sel.innerHTML = '<option value="">Tüm Etiketler</option>' + allTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const data = await api('/api/customers?limit=100'); if (!data) return;
  renderCustomerTable(data.customers);
}

function renderCustomerTable(customers) {
  document.getElementById('customerList').innerHTML = customers.map(c => `
    <tr>
      <td class="phone" onclick="openChatByPhone('${esc(c.phone)}')">${esc(c.phone)}</td>
      <td>${(c.tags || []).map(t => tagHtml(t, false)).join(' ') || '—'}</td>
      <td class="msg-text">${esc(c.last_message)}</td>
      <td>${c.message_count}</td>
      <td>${c.needs_support ? '<span class="badge-support">Destek</span>' : '<span class="badge-ok">Normal</span>'}</td>
      <td><button class="btn-sm" onclick="openChatByPhone('${esc(c.phone)}')">💬 Chat</button></td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b">Müşteri bulunamadı</td></tr>';
}

async function searchCustomers() {
  const q = document.getElementById('custSearch').value;
  const data = await api(q ? `/api/customers?search=${encodeURIComponent(q)}` : '/api/customers?limit=100');
  if (data) renderCustomerTable(data.customers);
}

async function filterByTag() {
  const tag = document.getElementById('custTagFilter').value;
  const data = await api(tag ? `/api/customers?tag=${tag}` : '/api/customers?limit=100');
  if (data) renderCustomerTable(data.customers);
}

// ===== SUPPORT =====
async function loadSupport() {
  const data = await api('/api/customers/support'); if (!data) return;
  document.getElementById('supportBadge').textContent = data.length;
  document.getElementById('supportList').innerHTML = data.length ? data.map(c => `
    <tr>
      <td class="phone" onclick="openChatByPhone('${esc(c.phone)}')">${esc(c.phone)}</td>
      <td class="msg-text">${esc(c.last_message)}</td>
      <td style="font-size:.8rem;color:#64748b">${fmtDate(c.last_message_at)}</td>
      <td>
        <button class="btn-sm" onclick="openChatByPhone('${esc(c.phone)}')">💬</button>
        <button class="btn-sm green" onclick="resolveSupport(${c.id})">✓ Çözüldü</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748b">Bekleyen destek talebi yok 🎉</td></tr>';
}

async function resolveSupport(id) {
  await api('/api/customers/' + id + '/resolve', { method: 'POST' });
  toast('Destek talebi kapatıldı ✓');
  loadSupport(); loadDashboard();
}

// ===== TAGS =====
async function loadTags() {
  allTags = await api('/api/tags') || [];
  document.getElementById('tagsList').innerHTML = allTags.map(t => `
    <div class="tag-item">
      <span class="tag" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}33">${esc(t.name)}</span>
      <button class="btn-sm red" onclick="deleteTag(${t.id})">Sil</button>
    </div>`).join('') || '<div style="padding:20px;color:#64748b">Henüz etiket oluşturulmadı</div>';
}

async function createTag() {
  const name = document.getElementById('newTagName').value.trim();
  const color = document.getElementById('newTagColor').value;
  if (!name) return;
  await api('/api/tags', { method: 'POST', body: JSON.stringify({ name, color }) });
  document.getElementById('newTagName').value = '';
  toast('Etiket oluşturuldu ✓');
  loadTags();
}

async function deleteTag(id) {
  if (!confirm('Bu etiketi silmek istediğinize emin misiniz?')) return;
  await api('/api/tags/' + id, { method: 'DELETE' });
  toast('Etiket silindi');
  loadTags();
}

// ===== SETTINGS =====
async function loadSettings() {
  const data = await api('/api/settings'); if (!data) return;
  for (const [k, v] of Object.entries(data)) {
    const el = document.getElementById('set-' + k);
    if (el) el.value = v;
  }
}

async function saveSettings() {
  const keys = ['welcome_message', 'menu_1', 'menu_2', 'menu_3', 'menu_4', 'menu_5', 'unknown_message'];
  const body = {};
  keys.forEach(k => { const el = document.getElementById('set-' + k); if (el) body[k] = el.value; });
  await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
  toast('Ayarlar kaydedildi ✓');
}

function logout() { localStorage.removeItem('token'); fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; }

// Init
loadDashboard();
setInterval(() => { loadDashboard(); loadSupport(); }, 30000);
