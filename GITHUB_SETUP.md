# 📦 Preparar Repositório GitHub - Passo a Passo

## Estrutura do repositório

```
microverdes-iot/
├── README.md                              # Overview do projeto
├── package.json                           # Dependências Node.js
├── .env.example                           # Template de variáveis
├── .gitignore                             # O que não commitar
│
├── arduino/
│   └── esp32_mqtt_arduino_cloud.ino      # Código do ESP32
│
├── nodejs/
│   ├── claude_mqtt_render.js             # Main app (Render)
│   └── claude_mqtt_cloud.js              # Alternativa básica
│
└── docs/
    ├── SETUP_RENDER_GRATUITO.md          # Como rodar no Render
    ├── SETUP_EMQX_CLOUD_GRATUITO.md      # Como usar EMQX Cloud
    └── SETUP_ARDUINO_IDE.md              # Como configurar Arduino
```

---

## 🔧 PASSO 1: Criar Repositório no GitHub

### 1.1 Acessar GitHub

```
https://github.com/new
```

### 1.2 Preencher informações

```
Repository name: microverdes-iot
Description: Automação de irrigação para microverdes com MQTT, EMQX Cloud e Render

Visibility: Public (recomendado, senão é privado)

Add .gitignore: Selecionar "Node" (já incluso)
Add a README file: NÃO (vamos colocar o nosso)
Choose a license: MIT (recomendado)
```

### 1.3 Criar repositório

```
Clicar: Create repository
```

**Copiar URL:** `https://github.com/seu_usuario/microverdes-iot.git`

---

## 💻 PASSO 2: Clonar + Preparar Localmente

### No seu computador:

```bash
# Clonar repo vazio
git clone https://github.com/seu_usuario/microverdes-iot.git
cd microverdes-iot

# Copiar todos os arquivos que você tem
# (Os arquivos já estão preparados abaixo)
```

### Copiar arquivos da raiz:

```bash
# Copiar estes arquivos para a pasta microverdes-iot/:
cp /caminho/para/README.md .
cp /caminho/para/package.json .
cp /caminho/para/.env.example .
cp /caminho/para/.gitignore .
```

### Criar pastas e copiar arquivos:

```bash
# Arduino
mkdir -p arduino
cp /caminho/para/esp32_mqtt_arduino_cloud.ino arduino/

# Node.js
mkdir -p nodejs
cp /caminho/para/claude_mqtt_render.js nodejs/
cp /caminho/para/claude_mqtt_cloud.js nodejs/

# Docs
mkdir -p docs
cp /caminho/para/SETUP_RENDER_GRATUITO.md docs/
cp /caminho/para/SETUP_EMQX_CLOUD_GRATUITO.md docs/
cp /caminho/para/SETUP_ARDUINO_IDE.md docs/
```

### Verificar estrutura:

```bash
ls -la
# Resultado:
# README.md
# package.json
# .env.example
# .gitignore
# arduino/
# nodejs/
# docs/
```

---

## 📝 PASSO 3: Configurar Git (primeira vez)

### Se é primeira vez usando Git:

```bash
# Configurar seu nome
git config --global user.name "Seu Nome"

# Configurar seu email (mesmo do GitHub)
git config --global user.email "seu_email@gmail.com"

# Verificar
git config --list
```

---

## ✅ PASSO 4: Fazer o Primeiro Commit

### Adicionar todos os arquivos:

```bash
git add .
```

### Verificar o que será commitado:

```bash
git status
```

**Deve aparecer:**
```
On branch main
Changes to be committed:
  new file: README.md
  new file: package.json
  new file: .env.example
  new file: .gitignore
  new file: arduino/esp32_mqtt_arduino_cloud.ino
  new file: nodejs/claude_mqtt_render.js
  new file: nodejs/claude_mqtt_cloud.js
  new file: docs/SETUP_RENDER_GRATUITO.md
  ...
```

### Fazer o commit:

```bash
git commit -m "Initial commit: Microverdes IoT - MQTT + EMQX Cloud + Render"
```

---

## 🚀 PASSO 5: Fazer Push (enviar para GitHub)

### Definir branch main:

```bash
git branch -M main
```

### Fazer push:

```bash
git push -u origin main
```

**Resultado esperado:**
```
Enumerating objects: 12, done.
Counting objects: 100% (12/12), done.
Delta compression using up to 8 threads
Compressing objects: 100% (10/10), done.
Writing objects: 100% (12/12), 45.32 KiB | 2.26 MiB/s, done.
Total 12 (delta 0), reused 0 (delta 0), reused pack 0 (delta 0)
To https://github.com/seu_usuario/microverdes-iot.git
 * [new branch] main -> main
```

---

## ✨ PASSO 6: Verificar no GitHub

### Abrir no navegador:

```
https://github.com/seu_usuario/microverdes-iot
```

**Deve aparecer:**
- ✅ Pasta `arduino/` com `.ino`
- ✅ Pasta `nodejs/` com `.js`
- ✅ Pasta `docs/` com tutoriais
- ✅ `README.md` renderizado
- ✅ `package.json` visível

---

## 🔄 PASSO 7: Configurar para Render (depois)

### Quando for fazer deploy no Render:

1. **Render → Dashboard**
2. **New → Web Service**
3. **Connect GitHub**
4. **Selecionar:** `seu_usuario/microverdes-iot`
5. **Start Command:** `npm start`
6. **Environment:** adicionar variáveis MQTT

---

## 📝 Arquivo por arquivo

### `README.md`
```markdown
# 🌱 Microverdes IoT

Automação de irrigação com Arduino, MQTT e IA

## Quick Start
1. EMQX Cloud: https://www.emqx.cloud
2. Arduino: Upload do código
3. Render: Deploy automático

## Estrutura
- arduino/: Código ESP32-C3
- nodejs/: Script automação
- docs/: Tutoriais completos
```

### `package.json`
```json
{
  "name": "microverdes-iot",
  "version": "1.0.0",
  "main": "nodejs/claude_mqtt_render.js",
  "scripts": {
    "start": "node nodejs/claude_mqtt_render.js"
  },
  "dependencies": {
    "mqtt": "^5.3.5",
    "dotenv": "^16.3.1"
  }
}
```

### `.env.example`
```
MQTT_BROKER=mqtt://seu-id.emqx.cloud:1883
MQTT_USER=iotbr
MQTT_PASSWORD=sua_senha
NODE_ENV=production
```

### `.gitignore`
```
node_modules/
.env
.DS_Store
*.log
```

---

## ✅ CHECKLIST

```
☐ Criou repositório no GitHub
☐ Clonou repositório localmente
☐ Copiu todos os arquivos
☐ Configurou git (user.name, user.email)
☐ Fez git add .
☐ Fez git commit
☐ Fez git push
☐ Verificou no GitHub.com
☐ Repository aparece público
☐ Todos os arquivos aparecem
☐ README renderizado corretamente
```

---

## 🐛 Troubleshooting Git

### Erro: "fatal: 'origin' does not appear to be a git repository"
```bash
# Certificar que está na pasta correta
pwd
# Deve ser: /seu/caminho/microverdes-iot

# Se não estiver:
cd microverdes-iot
```

### Erro: "Permission denied (publickey)"
```bash
# GitHub CLI (mais fácil)
gh auth login

# Ou SSH key setup
ssh-keygen -t ed25519 -C "seu_email@gmail.com"
# Adicionar em GitHub Settings → SSH Keys
```

### Erro: "Branch 'main' set up to track remote 'origin/main'"
```bash
# Normal, pode ignorar
# Próximo push será automático
git push
```

### Erro: "Merge conflicts"
```bash
# Se tiver conflito (raro):
git pull
# Resolver conflitos manualmente
git add .
git commit -m "Resolve conflicts"
git push
```

---

## 🎯 Próximas Atualizações

Quando fizer mudanças:

```bash
# Editar arquivo
nano nodejs/claude_mqtt_render.js

# Commit + Push
git add .
git commit -m "Update: melhorada lógica de irrigação"
git push

# Render detecta e deploya automaticamente!
```

---

## 📚 Referências

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://github.github.com/training-kit/github-git-cheat-sheet/)
- [GitHub CLI](https://cli.github.com/)

---

## 🎉 Pronto!

Seu repositório está pronto para:
- ✅ Versionamento (Git)
- ✅ Deploy automático (Render)
- ✅ Colaboração (se quiser abrir pro público)
- ✅ Backup (GitHub como backup)

**URL final:**
```
https://github.com/seu_usuario/microverdes-iot
```

**Dúvidas de Git?** Pergunte! 🚀
