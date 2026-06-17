# 📦 Preparar Repositório GitHub — Passo a Passo

## Estrutura do repositório

```
sauderealmicroverdes-iot/
├── README.md
├── COMECE_AQUI.md
├── QUICKSTART.md
├── docker-compose.yml
├── package.json
│
├── arduino/
│   └── microverdes.ino              # Firmware ESP32-S3 (LilyGo T-Display)
│
├── server/
│   ├── claude_mqtt_render_aggregator.js  # Aggregator + HTTP API
│   ├── Dockerfile
│   └── package.json
│
├── greenhouse/
│   ├── src/                         # React + TypeScript + Tailwind
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── data/
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
└── docs/
    └── SETUP_ARDUINO_IDE.md
```

---

## 🔧 PASSO 1: Criar Repositório no GitHub

```
https://github.com/new
```

Preencher:
```
Repository name: sauderealmicroverdes-iot
Description: Monitoramento de microverdes com ESP32, MQTT e React
Visibility: Public
Add .gitignore: Node
License: MIT
```

Copiar URL: `https://github.com/seu_usuario/sauderealmicroverdes-iot.git`

---

## 💻 PASSO 2: Clonar + Preparar Localmente

```bash
git clone https://github.com/seu_usuario/sauderealmicroverdes-iot.git
cd sauderealmicroverdes-iot
```

Copiar todos os arquivos do projeto para esta pasta.

---

## 📝 PASSO 3: Configurar Git (primeira vez)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu_email@gmail.com"
```

---

## ✅ PASSO 4: Commit + Push

```bash
git add .
git commit -m "Initial commit: Saúde Real Microverdes IoT"
git branch -M main
git push -u origin main
```

---

## ✨ PASSO 5: Verificar

```
https://github.com/seu_usuario/sauderealmicroverdes-iot
```

---

## 🔄 Atualizações Futuras

```bash
git add .
git commit -m "Update: descrição da mudança"
git push
```

---

## 🐛 Troubleshooting

### Permission denied (publickey)
```bash
gh auth login
# Ou configurar SSH key
```

### Merge conflicts
```bash
git pull
# Resolver conflitos
git add . && git commit -m "Resolve conflicts" && git push
```

---

## 📚 Referências

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://github.github.com/training-kit/github-git-cheat-sheet/)
