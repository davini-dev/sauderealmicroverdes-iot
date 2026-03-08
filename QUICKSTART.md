# ⚡ GitHub Setup - Versão Rápida (2 min)

## 1️⃣ Criar repositório no GitHub

Ir pra: https://github.com/new

```
Repository name: microverdes-iot
Description: Automação de irrigação com MQTT, EMQX Cloud e Render
Visibility: Public
License: MIT
```

Copiar a URL: `https://github.com/seu_usuario/microverdes-iot.git`

---

## 2️⃣ No seu computador

### Clone:
```bash
git clone https://github.com/seu_usuario/microverdes-iot.git
cd microverdes-iot
```

### Copie os arquivos:
```bash
# Você recebeu estes arquivos:
# - README.md
# - package.json
# - .env.example
# - .gitignore
# - arduino/esp32_mqtt_arduino_cloud.ino
# - nodejs/claude_mqtt_render.js
# - nodejs/claude_mqtt_cloud.js
# - docs/*.md

# Colocar tudo no diretório microverdes-iot/
```

---

## 3️⃣ Fazer push

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu_email@gmail.com"

git add .
git commit -m "Initial commit: Microverdes IoT"
git branch -M main
git push -u origin main
```

---

## ✅ Pronto!

```
https://github.com/seu_usuario/microverdes-iot
```

Seu repositório está no GitHub! 🎉

---

## 🎯 Próximo passo: Deploy no Render

1. https://render.com
2. Sign up → GitHub
3. New Web Service
4. Selecionar repositório
5. Start Command: `npm start`
6. Adicionar variáveis de ambiente (MQTT_*)
7. Deploy!

---

## 📝 Estrutura final

```
microverdes-iot/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── arduino/
│   └── esp32_mqtt_arduino_cloud.ino
├── nodejs/
│   ├── claude_mqtt_render.js (MAIN)
│   └── claude_mqtt_cloud.js
└── docs/
    └── SETUP_*.md
```

---

## 🚨 Problemas?

**Verificar arquivo por arquivo:**
```bash
# Estrutura
tree

# Status
git status

# Log
git log --oneline

# Remote
git remote -v
```

**Se algo deu errado, deletar e começar:**
```bash
rm -rf .git
git init
git remote add origin SEU_URL
git add .
git commit -m "Initial commit"
git push -u origin main
```

---

**Dúvidas?** Veja `GITHUB_SETUP.md` para versão completa.
