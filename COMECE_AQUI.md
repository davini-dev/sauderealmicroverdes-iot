# 📦 Seu Repositório GitHub - Passo a Passo Agora

Seus arquivos estão **prontos** em `/home/claude/github_repo/`

Segue exatamente nesta ordem:

---

## 🔧 PASSO 1: Criar Repositório no GitHub (2 min)

### Abra no navegador:
```
https://github.com/new
```

### Preencha:
```
Repository name: microverdes-iot

Description: Automação de irrigação para microverdes 
             com MQTT, EMQX Cloud e Render

Visibility: Public ✅ (deixe público)

License: MIT

Add .gitignore: Node

Add a README: NÃO (já temos um bom)
```

### Clique: "Create repository"

### Copie a URL que aparecer:
```
Exemplo: https://github.com/seu_usuario/microverdes-iot.git
(seu_usuario muda pra seu usuário real)
```

---

## 💻 PASSO 2: No seu computador

### Abra terminal/CMD no local que quer o projeto

**Windows (PowerShell ou CMD):**
```
cd C:\Users\seu_usuario\Projetos
```

**Mac/Linux:**
```
cd ~/Documentos
```

### Clone o repositório vazio:

```bash
git clone https://github.com/seu_usuario/microverdes-iot.git
cd microverdes-iot
```

---

## 📂 PASSO 3: Copiar seus arquivos

Você recebeu uma **pasta com todos os arquivos prontos**.

**Copie TUDO de `/home/claude/github_repo/` para `seu_usuario/microverdes-iot/`:**

Pode ser:
- Arrastar e soltar (Windows Explorer / Finder)
- `cp -r` no terminal
- Qualquer método que funcione pro você

**Que quer ficar assim:**

```
seu_usuario/microverdes-iot/
├── README.md                          ✅
├── package.json                       ✅
├── .env.example                       ✅
├── .gitignore                         ✅
├── GITHUB_SETUP.md                    ✅
├── QUICKSTART.md                      ✅
│
├── arduino/
│   └── esp32_mqtt_arduino_cloud.ino   ✅
│
├── nodejs/
│   ├── claude_mqtt_render.js          ✅
│   └── claude_mqtt_cloud.js           ✅
│
└── docs/
    ├── SETUP_RENDER_GRATUITO.md       ✅
    ├── SETUP_EMQX_CLOUD_GRATUITO.md   ✅
    └── SETUP_ARDUINO_IDE.md           ✅
```

### Verificar:
```bash
ls -la
# Ou no Windows:
dir
```

---

## ⚙️ PASSO 4: Configurar Git (primeira vez)

**Execute no terminal:**

```bash
git config --global user.name "Seu Nome Completo"
git config --global user.email "seu_email@gmail.com"
```

Exemplo:
```bash
git config --global user.name "João Silva"
git config --global user.email "joao@gmail.com"
```

---

## ✅ PASSO 5: Enviar tudo pro GitHub (3 comandos)

**Execute em sequência:**

### Comando 1: Adicionar tudo
```bash
git add .
```

### Comando 2: Fazer commit
```bash
git commit -m "Initial commit: Microverdes IoT - MQTT + EMQX Cloud + Render"
```

### Comando 3: Enviar (push)
```bash
git push -u origin main
```

**Se aparecer algo como:**
```
Enumerating objects: 12, done.
...
* [new branch] main -> main
```

✅ **SUCESSO!** 🎉

---

## 🌐 PASSO 6: Verificar no GitHub (1 min)

Abra no navegador:
```
https://github.com/seu_usuario/microverdes-iot
```

Deve aparecer:
- ✅ Pasta `arduino/`
- ✅ Pasta `nodejs/`
- ✅ Pasta `docs/`
- ✅ `README.md` formatado bonitão
- ✅ `package.json` listado

---

## 🚨 ERROS COMUNS

### Erro: "Permission denied (publickey)"
**Solução:** Instalar GitHub CLI
```bash
# Windows: choco install gh
# Mac: brew install gh
# Linux: apt install gh

gh auth login
# Escolher: GitHub.com → HTTPS → Y → Autorizar
```

### Erro: "fatal: could not read Username"
**Solução:** Usar token
```bash
# Ir em GitHub → Settings → Developer settings → Personal access tokens
# Gerar novo token (repo)
# Copiar
# Quando pedir senha, colar o token
```

### Erro: ".gitignore não está funcionando"
**Solução:**
```bash
git rm -r --cached .
git add .
git commit -m "Update: gitignore"
git push
```

---

## ✨ PRONTO!

Seu repositório está no GitHub! 🎉

**URL do seu projeto:**
```
https://github.com/seu_usuario/microverdes-iot
```

---

## 🎯 PRÓXIMO: Deploy no Render

Quando estiver pronto (próximo passo):

1. Ir em https://render.com
2. Sign up com GitHub
3. New Web Service
4. Conectar repositório `microverdes-iot`
5. Start Command: `npm start`
6. Adicionar Environment Variables:
   ```
   MQTT_BROKER = mqtt://seu-id.emqx.cloud:1883
   MQTT_USER = iotbr
   MQTT_PASSWORD = sua_senha_forte
   ```
7. Deploy!

---

## 📝 Cheat Sheet Git

```bash
# Ver status
git status

# Ver histórico
git log --oneline

# Ver remote
git remote -v

# Desfazer último commit
git reset --soft HEAD~1

# Deletar arquivo do Git (mas não do disco)
git rm --cached arquivo.txt

# Syncronizar com remote
git pull
```

---

## 🎉 É ISSO!

Você tem:
- ✅ Repositório no GitHub
- ✅ Código versionado
- ✅ Pronto pra Render

Próximo: Deploy no Render (super fácil, 2 min).

**Alguma dúvida?** Posso ajudar! 🚀
