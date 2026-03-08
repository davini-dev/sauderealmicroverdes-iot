#!/bin/bash

# 🚀 Script para preparar repositório GitHub
# Execute: bash github_setup.sh

echo "╔════════════════════════════════════════════════╗"
echo "║  🌱 Microverdes IoT - GitHub Setup Helper     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar Git
echo -e "${BLUE}1️⃣  Verificando Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git não está instalado!${NC}"
    echo "   Instale: https://git-scm.com/download"
    exit 1
fi
echo -e "${GREEN}✅ Git encontrado${NC}\n"

# 2. Configurar Git
echo -e "${BLUE}2️⃣  Configurar Git${NC}"
read -p "📝 Nome (seu nome completo): " USER_NAME
read -p "📧 Email (seu email GitHub): " USER_EMAIL

git config --global user.name "$USER_NAME"
git config --global user.email "$USER_EMAIL"

echo -e "${GREEN}✅ Git configurado${NC}"
echo "   Nome: $USER_NAME"
echo "   Email: $USER_EMAIL\n"

# 3. Verificar estrutura
echo -e "${BLUE}3️⃣  Verificando estrutura de arquivos...${NC}"

REQUIRED_FILES=(
    "README.md"
    "package.json"
    ".env.example"
    ".gitignore"
    "arduino/esp32_mqtt_arduino_cloud.ino"
    "nodejs/claude_mqtt_render.js"
    "nodejs/claude_mqtt_cloud.js"
    "docs/SETUP_RENDER_GRATUITO.md"
    "docs/SETUP_EMQX_CLOUD_GRATUITO.md"
    "docs/SETUP_ARDUINO_IDE.md"
)

MISSING=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING+=("$file")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Arquivos faltando:${NC}"
    for file in "${MISSING[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo -e "${GREEN}✅ Todos os arquivos presentes${NC}\n"

# 4. Inicializar Git (se não iniciado)
echo -e "${BLUE}4️⃣  Verificando repositório Git...${NC}"

if [ ! -d ".git" ]; then
    echo "🔄 Inicializando repositório local..."
    git init
    git branch -M main
    echo -e "${GREEN}✅ Repositório inicializado${NC}\n"
else
    echo -e "${GREEN}✅ Repositório já existe${NC}\n"
fi

# 5. Adicionar arquivos
echo -e "${BLUE}5️⃣  Adicionando arquivos...${NC}"
git add .

COUNT=$(git diff --cached --numstat | wc -l)
echo -e "${GREEN}✅ $COUNT arquivos adicionados${NC}\n"

# 6. Fazer commit
echo -e "${BLUE}6️⃣  Fazendo primeiro commit...${NC}"
git commit -m "Initial commit: Microverdes IoT - MQTT + EMQX Cloud + Render"
echo -e "${GREEN}✅ Commit realizado${NC}\n"

# 7. Mostrar próximos passos
echo -e "${BLUE}7️⃣  Próximos passos...${NC}\n"

echo "📋 Execute no terminal:"
echo ""
echo "   1️⃣  Criar repositório no GitHub:"
echo "       https://github.com/new"
echo ""
echo "   2️⃣  Nome do repositório: microverdes-iot"
echo "       Descrição: Automação de irrigação com MQTT, EMQX Cloud e Render"
echo "       Visibilidade: Public"
echo ""
echo "   3️⃣  Copie o comando de push abaixo:"
echo ""

REPO_URL=""
read -p "🔗 URL do repositório GitHub (ex: https://github.com/seu_usuario/microverdes-iot.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${YELLOW}⚠️  URL não fornecida${NC}"
    echo "Execute depois manualmente:"
    echo "   git remote add origin https://github.com/seu_usuario/microverdes-iot.git"
    echo "   git push -u origin main"
else
    git remote add origin "$REPO_URL"
    
    echo ""
    echo -e "${YELLOW}📤 Fazendo push para GitHub...${NC}"
    if git push -u origin main; then
        echo -e "${GREEN}✅ Push realizado com sucesso!${NC}\n"
        echo "📍 Acesse seu repositório:"
        echo "   $REPO_URL"
    else
        echo -e "${YELLOW}⚠️  Erro ao fazer push${NC}"
        echo "Tente manualmente:"
        echo "   git push -u origin main"
    fi
fi

# 8. Status final
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅ Setup completo!                           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📊 Status:"
git status
echo ""
echo "📝 Log de commits:"
git log --oneline
echo ""
echo "🎯 Próxima etapa: Deploy no Render"
echo "   https://render.com"
echo ""
