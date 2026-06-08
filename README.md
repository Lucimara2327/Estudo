# 📖 Estudo Bíblico — PWA

Assistente pessoal de estudo bíblico para Lucy, baseado nas publicações das Testemunhas de Jeová.

## Funcionalidades

- 💬 **Chat personalizado** — O assistente conhece Lucy pelo nome e conversa de forma calorosa
- 📝 **Anotações com busca** — Cards premium com busca em tempo real
- 🔍 **Busca de textos bíblicos** — com explicação e contexto
- 📱 **PWA** — instala como app na tela inicial
- 💾 **Conversa salva** — histórico persistente no dispositivo

## Arquivos do projeto

```
├── index.html      ← Estrutura do app
├── style.css       ← Estilos (tema quente/aconchegante)
├── script.js       ← Lógica e API
├── manifest.json   ← Configuração do PWA
├── sw.js           ← Service Worker (cache offline)
├── icon-192.png    ← Ícone do app (192x192)
└── icon-512.png    ← Ícone do app (512x512)
```

## Ícones

Coloque a imagem (a ilustração de livros e caderno) salva como:
- `icon-192.png` — 192×192 pixels
- `icon-512.png` — 512×512 pixels

Use um redimensionador online como squoosh.app ou canva.com

## Deploy no GitHub Pages

1. Crie um repositório no GitHub
2. Suba todos os arquivos
3. Vá em **Settings → Pages**
4. Em "Source", selecione **Deploy from a branch → main**
5. Clique em **Save**
6. Site disponível em `https://seu-usuario.github.io/nome-do-repo`

## Nota sobre a API

O site usa a Claude API diretamente no navegador com o header
`anthropic-dangerous-direct-browser-access: true`.
Isso funciona quando hospedado no GitHub Pages.
A chave de API é gerenciada pelo próprio Claude.ai ao usar Artifacts.
