# 📖 Estudo Bíblico — PWA

Assistente pessoal de estudo bíblico baseado nas publicações das Testemunhas de Jeová.

## Funcionalidades

- 💬 **Chat** com assistente IA especializado em estudo bíblico
- 📝 **Anotações** salvas localmente no celular
- 🔍 **Busca de textos** bíblicos com explicação
- 📱 **PWA** — instala como app na tela inicial
- 💾 **Conversa salva** — não some ao sair do app

## Como fazer o deploy no GitHub Pages

1. Crie um repositório **privado** no GitHub
2. Suba todos os arquivos deste projeto
3. Vá em **Settings → Pages**
4. Em "Source", selecione **Deploy from a branch**
5. Escolha a branch **main** e clique em **Save**
6. O site ficará disponível em `https://seu-usuario.github.io/nome-do-repo`

## Arquivos do projeto

```
├── index.html      ← Estrutura do app
├── style.css       ← Estilos
├── script.js       ← Lógica e API
├── manifest.json   ← Configuração do PWA
├── sw.js           ← Service Worker (cache offline)
├── icon-192.png    ← Ícone do app (192x192)
└── icon-512.png    ← Ícone do app (512x512)
```

## Ícones

Você precisará adicionar os arquivos `icon-192.png` e `icon-512.png` 
com o ícone do app (pode usar qualquer imagem quadrada).

## Tecnologias

- HTML/CSS/JS puro (sem frameworks)
- Claude API para o assistente
- localStorage para persistência
- Service Worker para PWA
