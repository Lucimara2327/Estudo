/* ============================================================
   ESTUDO BÍBLICO — script.js
   Chat via Supabase proxy + bible-api.com para versículos
   ============================================================ */

/* ── CONFIGURAÇÃO DO PROXY ──────────────────────────────────
   Cole aqui a URL da sua Supabase Edge Function depois de criar.
   Exemplo: https://xyzxyz.supabase.co/functions/v1/groq-proxy
   ---------------------------------------------------------- */
const PROXY_URL = 'https://zwryvvhkwundyrwpamdt.supabase.co/functions/v1/groq-proxy';

/* ── Sistema Prompt ── */
const SYSTEM_PROMPT = `Você é um assistente de estudo bíblico dedicado e amigável, baseado nos ensinamentos das Testemunhas de Jeová e nas publicações da Watch Tower Bible and Tract Society (JW.org).

Você está conversando com Lucy, uma pessoa querida que você conhece bem. Seja caloroso, acolhedor e pessoal — como uma conversa entre amigos que compartilham a fé.

Suas responsabilidades:
- Explicar textos bíblicos com base na Tradução do Novo Mundo das Escrituras Sagradas
- Ajudar Lucy na preparação de comentários para reuniões da congregação
- Responder dúvidas sobre doutrinas bíblicas conforme o entendimento das Testemunhas de Jeová
- Auxiliar no estudo pessoal da Bíblia e publicações
- Sugerir textos e publicações relevantes para aprofundamento
- Conversar de forma natural e amigável

Diretrizes:
- Sempre cite referências bíblicas específicas (livro, capítulo e versículo)
- Seja fiel ao entendimento das Testemunhas de Jeová
- Use linguagem clara, calorosa e respeitosa
- Para comentários de reunião, seja prático e conciso (1-2 minutos de fala)
- Mencione publicações da Watch Tower quando relevante
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
  localStorage.setItem('chat_history', JSON.stringify(chatHistory.slice(-50)));
}

/* ── NAVEGAÇÃO ── */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
    fecharDropdown();
  });
});

window.navegarPara = function(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  $('tab-' + tab).classList.add('active');
  fecharDropdown();
};

/* ── DROPDOWN MENU ── */
const menuBtn = $('menu-btn');
const dropdownMenu = $('dropdown-menu');

menuBtn.addEventListener('click', e => {
  e.stopPropagation();
  dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', e => {
  if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) fecharDropdown();
});

function fecharDropdown() {
  dropdownMenu.style.display = 'none';
}

$('clear-chat-menu-btn').addEventListener('click', () => {
  fecharDropdown();
  if (chatHistory.length === 0) { showToast('Conversa já está vazia!'); return; }
  if (confirm('Limpar toda a conversa?')) {
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
            onerror="this.parentElement.innerHTML='<div style=font-size:3rem;margin-bottom:12px>🙏</div>'">
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

/* ── CHAMADA AO PROXY ── */
async function chamarClaude(messages, system) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: system || SYSTEM_PROMPT,
      messages
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Erro na API');
  return data.content?.map(b => b.text || '').join('') || '';
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
    const apiMessages = chatHistory.slice(-20).slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    apiMessages.push({ role: 'user', content: text });

    const reply = await chamarClaude(apiMessages, SYSTEM_PROMPT);
    hideTyping();
    addMessage('assistant', reply);
  } catch(e) {
    hideTyping();
    if (PROXY_URL.includes('SEU-PROJETO')) {
      addMessage('assistant', '⚙️ O proxy ainda não foi configurado, Lucy! Siga as instruções do arquivo COMO-ATIVAR-CHAT.md para ativar o chat. As anotações já funcionam normalmente. 🙏');
    } else {
      addMessage('assistant', 'Ocorreu um erro de conexão, Lucy. Verifique sua internet e tente novamente. 🙏');
    }
  }

  sendBtn.disabled = false;
  input.focus();
}

window.sendSuggestion = text => sendMessage(text);

$('send-btn').addEventListener('click', () => sendMessage($('chat-input').value));

$('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage($('chat-input').value); }
});

$('chat-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

/* ── MAPA DE LIVROS PT → EN para bible-api.com ── */
const LIVROS_MAP = {
  'gênesis':'genesis','genesis':'genesis','êxodo':'exodus','exodo':'exodus',
  'levítico':'leviticus','levitico':'leviticus','números':'numbers','numeros':'numbers',
  'deuteronômio':'deuteronomy','deuteronomio':'deuteronomy','josué':'joshua','josue':'joshua',
  'juízes':'judges','juizes':'judges','rute':'ruth','1 samuel':'1samuel','2 samuel':'2samuel',
  '1 reis':'1kings','2 reis':'2kings','1 crônicas':'1chronicles','1 cronicas':'1chronicles',
  '2 crônicas':'2chronicles','2 cronicas':'2chronicles','esdras':'ezra','neemias':'nehemiah',
  'ester':'esther','jó':'job','jo':'job','salmos':'psalms','provérbios':'proverbs',
  'proverbios':'proverbs','eclesiastes':'ecclesiastes','cânticos':'songofsolomon',
  'canticos':'songofsolomon','isaías':'isaiah','isaias':'isaiah','jeremias':'jeremiah',
  'lamentações':'lamentations','lamentacoes':'lamentations','ezequiel':'ezekiel',
  'daniel':'daniel','oseias':'hosea','oséias':'hosea','joel':'joel','amós':'amos',
  'amos':'amos','obadias':'obadiah','jonas':'jonah','miquéias':'micah','miqueias':'micah',
  'naum':'nahum','habacuque':'habakkuk','sofonias':'zephaniah','ageu':'haggai',
  'zacarias':'zechariah','malaquias':'malachi','mateus':'matthew','marcos':'mark',
  'lucas':'luke','joão':'john','joao':'john','atos':'acts','romanos':'romans',
  '1 coríntios':'1corinthians','1 corintios':'1corinthians',
  '2 coríntios':'2corinthians','2 corintios':'2corinthians',
  'gálatas':'galatians','galatas':'galatians','efésios':'ephesians','efesios':'ephesians',
  'filipenses':'philippians','colossenses':'colossians','1 tessalonicenses':'1thessalonians',
  '2 tessalonicenses':'2thessalonians','1 timóteo':'1timothy','1 timoteo':'1timothy',
  '2 timóteo':'2timothy','2 timoteo':'2timothy','tito':'titus','filemom':'philemon',
  'hebreus':'hebrews','tiago':'james','1 pedro':'1peter','2 pedro':'2peter',
  '1 joão':'1john','1 joao':'1john','2 joão':'2john','2 joao':'2john',
  '3 joão':'3john','3 joao':'3john','judas':'jude','apocalipse':'revelation'
};

function traduzirReferencia(ref) {
  const clean = ref.trim().toLowerCase();
  // Separa "Livro cap:ver" ou "Livro cap"
  const match = clean.match(/^(\d?\s?[a-záàãâéêíóôõúç\s]+)\s+(\d+)(?::(\d+))?/);
  if (!match) return null;
  const livro = match[1].trim();
  const cap   = match[2];
  const ver   = match[3] || null;
  const livroEn = LIVROS_MAP[livro];
  if (!livroEn) return null;
  return ver ? `${livroEn}+${cap}:${ver}` : `${livroEn}+${cap}`;
}

/* ── BUSCA DE TEXTOS via bible-api.com (gratuita, sem chave) ── */
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
    const refEn = traduzirReferencia(ref);

    let texto = '';
    let referenciaMostrada = ref;

    if (refEn) {
      // Tenta bible-api.com (versão KJV em inglês)
      const apiRes = await fetch(`https://bible-api.com/${refEn}?translation=kjv`);
      const apiData = await apiRes.json();

      if (apiData && apiData.verses && apiData.verses.length > 0) {
        // Tem o versículo em inglês — usa o Claude (proxy) pra traduzir pra TNM
        const versiculoEn = apiData.verses.map(v => v.text.trim()).join(' ');
        referenciaMostrada = apiData.reference || ref;

        // Pede ao proxy para dar a versão TNM e contexto
        try {
          const promptTNM = `O versículo ${ref} em inglês (KJV) é: "${versiculoEn}".
Forneça a versão deste versículo conforme a Tradução do Novo Mundo das Escrituras Sagradas (TNM), em português do Brasil, e um breve contexto explicativo (2 frases).
Responda APENAS neste formato JSON sem marcações:
{"referencia":"${ref}","texto":"versículo em TNM aqui","contexto":"explicação em 2 frases"}`;

          const tnmResp = await chamarClaude([{ role: 'user', content: promptTNM }], '');
          const clean = tnmResp.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          texto = parsed.texto;
          const contexto = parsed.contexto || '';
          mostrarResultado(parsed.referencia || ref, texto, contexto);
          return;
        } catch {
          // Proxy não configurado — mostra versão KJV com aviso
          texto = versiculoEn + ' (versão KJV em inglês — configure o proxy para ver a TNM)';
          mostrarResultado(referenciaMostrada, texto, '');
          return;
        }
      }
    }

    // Fallback: tenta pelo proxy direto pedindo o texto
    try {
      const prompt = `Cite o texto bíblico de ${ref} conforme a Tradução do Novo Mundo das Escrituras Sagradas (TNM).
Responda APENAS neste formato JSON sem marcações:
{"referencia":"${ref}","texto":"versículo TNM aqui","contexto":"explicação em 2 frases"}`;

      const resp = await chamarClaude([{ role: 'user', content: prompt }], '');
      const clean = resp.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      mostrarResultado(parsed.referencia || ref, parsed.texto, parsed.contexto || '');
    } catch {
      result.innerHTML = `<p style="color:var(--terracotta);font-size:.85rem;padding:8px 0;">
        ❌ Não foi possível buscar o texto.<br>
        <small>Configure o proxy para habilitar esta função, ou verifique o nome do versículo.</small>
      </p>`;
    }

  } catch(e) {
    result.innerHTML = `<p style="color:var(--terracotta);font-size:.85rem;padding:8px 0;">❌ Erro ao buscar o texto. Verifique sua conexão.</p>`;
  }
}

function mostrarResultado(referencia, texto, contexto) {
  const result = $('busca-result');
  result.innerHTML = `
    <div class="busca-ref">📖 ${referencia.toUpperCase()}</div>
    <div class="busca-texto">"${texto}"</div>
    ${contexto ? `<p class="busca-contexto">${contexto}</p>` : ''}
    <div class="busca-actions">
      <button class="busca-action-btn" onclick="sendSuggestion('Explique melhor o texto de ${referencia} e como aplicá-lo');navegarPara('chat')">💬 Perguntar sobre este texto</button>
      <button class="busca-action-btn" onclick="sendSuggestion('Me ajude a preparar um comentário de reunião sobre ${referencia}');navegarPara('chat')">🎤 Comentário de reunião</button>
    </div>`;
}

window.buscarTexto = buscarTexto;

$('busca-btn').addEventListener('click', () => {
  const val = $('busca-input').value.trim();
  if (val) buscarTexto(val);
});

$('busca-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const val = $('busca-input').value.trim(); if (val) buscarTexto(val); }
});

/* ── NOTAS ── */
function renderNotas(filtro) {
  const list = $('notas-list');
  let lista = [...notas].sort((a, b) => b.ts - a.ts);
  if (filtro && filtro.trim()) {
    const f = filtro.toLowerCase();
    lista = lista.filter(n =>
      (n.titulo || '').toLowerCase().includes(f) || (n.texto || '').toLowerCase().includes(f)
    );
  }
  if (lista.length === 0) {
    list.innerHTML = filtro
      ? `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nenhuma anotação encontrada para "<strong>${filtro}</strong>"</p></div>`
      : `<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhuma anotação ainda.<br>Toque em "+ Nova" para começar!</p></div>`;
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

function escapeHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

$('notas-busca').addEventListener('input', function() { renderNotas(this.value); });

$('nova-nota-btn').addEventListener('click', () => {
  editandoNotaId = null;
  $('modal-nota-titulo').textContent = 'Nova Anotação';
  $('nota-titulo-input').value = '';
  $('nota-texto-input').value = '';
  $('modal-nota').style.display = 'flex';
  setTimeout(() => $('nota-titulo-input').focus(), 100);
});

window.verNota = function(id) {
  const n = notas.find(n => n.id === id); if (!n) return;
  $('ver-nota-titulo').textContent = n.titulo || 'Sem título';
  $('ver-nota-data').textContent = formatDate(n.ts);
  $('ver-nota-texto').textContent = n.texto || '';
  $('ver-nota-edit-btn').onclick = () => { fecharModalVerNota(); editarNota(id); };
  $('modal-ver-nota').style.display = 'flex';
};

window.fecharModalVerNota = () => { $('modal-ver-nota').style.display = 'none'; };

window.editarNota = function(id) {
  const n = notas.find(n => n.id === id); if (!n) return;
  editandoNotaId = id;
  $('modal-nota-titulo').textContent = 'Editar Anotação';
  $('nota-titulo-input').value = n.titulo;
  $('nota-texto-input').value = n.texto;
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
  const texto  = $('nota-texto-input').value.trim();
  if (!titulo && !texto) { showToast('Escreva algo antes de salvar! ✍️'); return; }
  if (editandoNotaId) {
    notas = notas.map(n => n.id === editandoNotaId ? { ...n, titulo, texto, ts: Date.now() } : n);
    showToast('Anotação atualizada! ✅');
  } else {
    notas.push({ id: Date.now().toString(), titulo, texto, ts: Date.now() });
    showToast('Anotação salva! ✅');
  }
  localStorage.setItem('notas', JSON.stringify(notas));
  fecharModalNota();
  renderNotas($('notas-busca').value);
};

window.fecharModalNota = () => { $('modal-nota').style.display = 'none'; };
