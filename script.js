/* ============================================================
   ESTUDO BÍBLICO — script.js
   Chat com Claude API (via proxy Artifacts) + localStorage
   ============================================================ */

/* ── IMPORTANTE: Usa proxy do Claude Artifacts para evitar CORS ── */
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

/* ── Sistema Prompt ── */
const SYSTEM_PROMPT = `Você é um assistente de estudo bíblico dedicado e amigável, baseado nos ensinamentos das Testemunhas de Jeová e nas publicações da Watch Tower Bible and Tract Society (JW.org).

Você está conversando com Lucy, uma pessoa querida que você conhece bem. Seja caloroso, acolhedor e pessoal — como uma conversa entre amigos que compartilham a fé.

Suas responsabilidades:
- Explicar textos bíblicos com base na Tradução do Novo Mundo das Escrituras Sagradas
- Ajudar Lucy na preparação de comentários para reuniões da congregação
- Responder dúvidas sobre doutrinas bíblicas conforme o entendimento das Testemunhas de Jeová
- Auxiliar no estudo pessoal da Bíblia e publicações
- Sugerir textos e publicações relevantes para aprofundamento
- Conversar de forma natural e amigável, não apenas responder perguntas técnicas

Diretrizes:
- Sempre cite referências bíblicas específicas (livro, capítulo e versículo)
- Seja fiel ao entendimento das Testemunhas de Jeová
- Use linguagem clara, calorosa e respeitosa
- Para comentários de reunião, seja prático e conciso (1-2 minutos de fala)
- Mencione publicações da Watch Tower quando relevante (Sentinela, Despertai!, jw.org)
- Responda em português do Brasil
- Às vezes chame Lucy pelo nome para tornar a conversa mais pessoal

Formato das respostas:
- Use parágrafos curtos para facilitar a leitura no celular
- Cite versículos entre aspas quando relevante
- Para comentários de reunião, indique claramente o texto base e o ponto principal`;

/* ── Estado ── */
let chatHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');
let notas = JSON.parse(localStorage.getItem('notas') || '[]');
let editandoNotaId = null;
let notasFiltradas = null;

/* ── Utils ── */
const $ = id => document.getElementById(id);

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function salvarHistorico() {
  const recentes = chatHistory.slice(-50);
  localStorage.setItem('chat_history', JSON.stringify(recentes));
}

/* ── NAVEGAÇÃO ── */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    // O tab "textos" no HTML tem id tab-textos
    $('tab-' + tab.dataset.tab).classList.add('active');
    fecharDropdown();
  });
});

function navegarPara(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  $('tab-' + tab).classList.add('active');
  fecharDropdown();
}

/* ── DROPDOWN MENU ── */
const menuBtn = $('menu-btn');
const dropdownMenu = $('dropdown-menu');

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = dropdownMenu.style.display !== 'none';
  dropdownMenu.style.display = isVisible ? 'none' : 'block';
});

document.addEventListener('click', (e) => {
  if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
    fecharDropdown();
  }
});

function fecharDropdown() {
  dropdownMenu.style.display = 'none';
}

$('clear-chat-menu-btn').addEventListener('click', () => {
  fecharDropdown();
  if (chatHistory.length === 0) { showToast('Conversa já está vazia!'); return; }
  if (confirm('Limpar toda a conversa com o assistente?')) {
    chatHistory = [];
    salvarHistorico();
    renderChat();
  }
});

/* ── SPLASH ── */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    $('app').style.display = 'flex';
    renderChat();
    renderNotas();
  }, 2200);
});

/* ── CHAT ── */
function renderChat() {
  const container = $('chat-messages');

  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-img-wrap">
          <img src="icon-512.png" alt="" class="welcome-img"
            onerror="this.parentElement.innerHTML='<div class=welcome-emoji-fallback>🙏</div>'">
        </div>
        <h2 class="welcome-greeting">Olá, Lucy! Como você está? 😊</h2>
        <p class="welcome-subtitle">Em que posso te ajudar hoje?</p>
        <p class="welcome-text">Pode me perguntar sobre textos bíblicos, pedir ajuda com comentários para a reunião, ou simplesmente conversar sobre a Palavra de Deus.</p>
        <div class="suggestions">
          <button class="suggestion-chip" onclick="sendSuggestion('Me ajude a preparar um comentário para a reunião sobre João 3:16')">💬 Comentário para reunião</button>
          <button class="suggestion-chip" onclick="sendSuggestion('Explique o significado de Provérbios 3:5,6')">📖 Explicar um texto</button>
          <button class="suggestion-chip" onclick="sendSuggestion('Qual é o ensinamento bíblico sobre a ressurreição?')">❓ Dúvida doutrinária</button>
          <button class="suggestion-chip" onclick="sendSuggestion('Me ajude a preparar o estudo pessoal da semana')">📚 Estudo pessoal</button>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = chatHistory.map(msg => `
    <div class="msg ${msg.role}">
      <div class="msg-bubble">${formatMsgText(msg.content)}</div>
      <span class="msg-time">${formatTime(msg.ts)}</span>
    </div>`).join('');
  scrollToBottom();
}

function formatMsgText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const c = $('chat-messages');
  setTimeout(() => { c.scrollTop = c.scrollHeight; }, 50);
}

function addMessage(role, content) {
  chatHistory.push({ role, content, ts: Date.now() });
  salvarHistorico();
  renderChat();
}

function showTyping() {
  const c = $('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  c.appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const t = $('typing-indicator');
  if (t) t.remove();
}

async function sendMessage(text) {
  if (!text.trim()) return;

  const sendBtn = $('send-btn');
  const input = $('chat-input');
  sendBtn.disabled = true;
  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);
  showTyping();

  try {
    const messages = chatHistory.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    // Remove duplicata da última mensagem do user
    const apiMessages = messages.slice(0, -1);
    apiMessages.push({ role: 'user', content: text });

    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: apiMessages
      })
    });

    const data = await res.json();
    hideTyping();

    if (data.error) {
      addMessage('assistant', `Desculpe, Lucy! Ocorreu um erro: ${data.error.message || 'Tente novamente em instantes.'} 🙏`);
    } else {
      const reply = data.content?.map(b => b.text || '').join('') || 'Desculpe, não consegui responder agora. Tente novamente, Lucy. 🙏';
      addMessage('assistant', reply);
    }

  } catch(e) {
    hideTyping();
    addMessage('assistant', 'Ocorreu um erro de conexão, Lucy. Verifique sua internet e tente novamente. 🙏');
  }

  sendBtn.disabled = false;
  input.focus();
}

window.sendSuggestion = function(text) { sendMessage(text); };

$('send-btn').addEventListener('click', () => {
  sendMessage($('chat-input').value);
});

$('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage($('chat-input').value);
  }
});

$('chat-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

/* ── BUSCA DE TEXTOS ── */
async function buscarTexto(ref) {
  $('busca-input').value = ref;
  const result = $('busca-result');
  result.style.display = 'block';
  result.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-light)">
    <div style="display:inline-flex" class="typing-bubble">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>
    <p style="margin-top:10px;font-size:.82rem">Buscando ${ref}...</p>
  </div>`;

  try {
    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Cite o texto bíblico de ${ref} conforme a Tradução do Novo Mundo das Escrituras Sagradas.
Responda APENAS no seguinte formato JSON sem marcações extras:
{
  "referencia": "Livro X:Y",
  "texto": "texto do versículo aqui",
  "contexto": "breve contexto ou explicação em 2 frases"
}`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content?.map(b => b.text || '').join('') || '';

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { referencia: ref, texto: raw, contexto: '' };
    }

    result.innerHTML = `
      <div class="busca-ref">📖 ${parsed.referencia}</div>
      <div class="busca-texto">"${parsed.texto}"</div>
      ${parsed.contexto ? `<p class="busca-contexto">${parsed.contexto}</p>` : ''}
      <div class="busca-actions">
        <button class="busca-action-btn" onclick="sendSuggestion('Explique melhor o texto de ${parsed.referencia} e como aplicá-lo');navegarPara('chat')">💬 Perguntar sobre este texto</button>
        <button class="busca-action-btn" onclick="sendSuggestion('Me ajude a preparar um comentário de reunião sobre ${parsed.referencia}');navegarPara('chat')">🎤 Comentário de reunião</button>
      </div>`;

  } catch(e) {
    result.innerHTML = `<p style="color:#d05050;font-size:.85rem;padding:8px 0;">❌ Erro ao buscar o texto. Verifique sua conexão.</p>`;
  }
}

window.buscarTexto = buscarTexto;
window.navegarPara = navegarPara;

$('busca-btn').addEventListener('click', () => {
  const val = $('busca-input').value.trim();
  if (val) buscarTexto(val);
});

$('busca-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = $('busca-input').value.trim();
    if (val) buscarTexto(val);
  }
});

/* ── NOTAS ── */
function renderNotas(filtro) {
  const list = $('notas-list');
  let lista = [...notas].sort((a, b) => b.ts - a.ts);

  if (filtro && filtro.trim()) {
    const f = filtro.toLowerCase();
    lista = lista.filter(n =>
      (n.titulo || '').toLowerCase().includes(f) ||
      (n.texto  || '').toLowerCase().includes(f)
    );
  }

  if (lista.length === 0) {
    if (filtro) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nenhuma anotação encontrada<br>para "<strong>${filtro}</strong>"</p></div>`;
    } else {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhuma anotação ainda.<br>Toque em "+ Nova" para começar!</p></div>`;
    }
    return;
  }

  list.innerHTML = lista.map(n => `
    <div class="nota-card">
      <div class="nota-card-top">
        <span class="nota-card-title">${escapeHtml(n.titulo || 'Sem título')}</span>
        <span class="nota-card-badge">${formatDate(n.ts)}</span>
      </div>
      <div class="nota-card-preview">${escapeHtml(n.texto || '')}</div>
      <div class="nota-card-footer">
        <button class="nota-btn nota-btn-view" onclick="verNota('${n.id}')">👁️ Ver</button>
        <button class="nota-btn nota-btn-edit" onclick="editarNota('${n.id}')">✏️ Editar</button>
        <button class="nota-btn nota-btn-del" onclick="deletarNota('${n.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Busca de notas em tempo real */
$('notas-busca').addEventListener('input', function() {
  renderNotas(this.value);
});

$('nova-nota-btn').addEventListener('click', () => {
  editandoNotaId = null;
  $('modal-nota-titulo').textContent = 'Nova Anotação';
  $('nota-titulo-input').value = '';
  $('nota-texto-input').value = '';
  $('modal-nota').style.display = 'flex';
  setTimeout(() => $('nota-titulo-input').focus(), 100);
});

window.verNota = function(id) {
  const nota = notas.find(n => n.id === id);
  if (!nota) return;
  $('ver-nota-titulo').textContent = nota.titulo || 'Sem título';
  $('ver-nota-data').textContent = formatDate(nota.ts);
  $('ver-nota-texto').textContent = nota.texto || '';
  $('ver-nota-edit-btn').onclick = () => { fecharModalVerNota(); editarNota(id); };
  $('modal-ver-nota').style.display = 'flex';
};

window.fecharModalVerNota = function() {
  $('modal-ver-nota').style.display = 'none';
};

window.editarNota = function(id) {
  const nota = notas.find(n => n.id === id);
  if (!nota) return;
  editandoNotaId = id;
  $('modal-nota-titulo').textContent = 'Editar Anotação';
  $('nota-titulo-input').value = nota.titulo;
  $('nota-texto-input').value = nota.texto;
  $('modal-nota').style.display = 'flex';
  setTimeout(() => $('nota-titulo-input').focus(), 100);
};

window.deletarNota = function(id) {
  if (confirm('Excluir esta anotação?')) {
    notas = notas.filter(n => n.id !== id);
    localStorage.setItem('notas', JSON.stringify(notas));
    renderNotas($('notas-busca').value);
    showToast('Anotação excluída!');
  }
};

window.salvarNota = function() {
  const titulo = $('nota-titulo-input').value.trim();
  const texto = $('nota-texto-input').value.trim();
  if (!titulo && !texto) { showToast('Escreva algo antes de salvar! ✍️'); return; }

  if (editandoNotaId) {
    notas = notas.map(n => n.id === editandoNotaId
      ? { ...n, titulo, texto, ts: Date.now() }
      : n);
    showToast('Anotação atualizada! ✅');
  } else {
    notas.push({ id: Date.now().toString(), titulo, texto, ts: Date.now() });
    showToast('Anotação salva! ✅');
  }

  localStorage.setItem('notas', JSON.stringify(notas));
  fecharModalNota();
  renderNotas($('notas-busca').value);
};

window.fecharModalNota = function() {
  $('modal-nota').style.display = 'none';
};
