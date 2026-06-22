# 🌱 Microverdes MCP Server

Servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) que expõe todos os endpoints da API HTTP como ferramentas para agentes de IA.

## Arquitetura

```
┌─────────────────────┐     stdio      ┌──────────────────┐     HTTP      ┌──────────────────┐
│  Cliente MCP        │ ◄────────────► │  MCP Server       │ ◄──────────► │  HTTP Aggregator │
│  (Claude, Cursor..) │                │  (esta pasta)     │              │  (porta 3000)    │
└─────────────────────┘                └──────────────────┘              └──────────────────┘
```

## Ferramentas Disponíveis

| Ferramenta | Método | Endpoint | Descrição |
|---|---|---|---|
| `health_check` | `GET` | `/health` | Verifica se o servidor está online |
| `status_completo` | `GET` | `/status` | Status completo: app, MQTT, dispositivos, sensores, bandejas |
| `listar_dispositivos` | `GET` | `/devices` | Lista todos os ESP32 com IP, MAC, RSSI, online/offline |
| `listar_sensores` | `GET` | `/sensors` | Todos os sensores agregados por tipo (temp, umidade, luz…) |
| `listar_bandejas` | `GET` | `/bandejas` | Todas as bandejas com umidade atual |
| `dashboard_data` | `GET` | `/dashboard-data` | Dados consolidados para dashboard (dispositivo principal ativo) |
| `enviar_comando` | `POST` | `/cmd` | Envia comando MQTT (irrigacao, neblina, etc.) |

## Uso Local (sem Docker)

### Instalar dependências
```bash
cd mcp-server
npm install
```

### Executar
```bash
npm start
# ou
node index.js
```

## Uso com Docker

```bash
# Build + subir tudo (server + MCP + dashboard)
docker compose up -d --build

# Subir apenas o MCP server
docker compose up -d mcp

# Ver logs
docker compose logs -f mcp
```

## Configuração em Clientes MCP

### Claude Desktop

Adicione ao `~/Library/Application\ Support/Claude/claude_desktop_config.json` (macOS) ou equivalente:

```json
{
  "mcpServers": {
    "microverdes": {
      "command": "node",
      "args": ["/caminho/absoluto/para/sauderealmicroverdes-iot/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Cursor IDE

Adicione ao `.cursor/mcp.json` no raiz do projeto:

```json
{
  "mcpServers": {
    "microverdes": {
      "command": "node",
      "args": ["./mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Ambiente Docker (cliente externo apontando para container)

```json
{
  "mcpServers": {
    "microverdes": {
      "command": "docker",
      "args": ["compose", "run", "--rm", "mcp"]
    }
  }
}
```

## Variáveis de Ambiente

| Variável | Default | Descrição |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | URL base do HTTP Aggregator |

## Exemplo de Interação

**Agente de IA usando as ferramentas:**

```
Usuário: "Qual a temperatura atual da estufa?"

Agente → chama ferramenta: dashboard_data()
Resposta: {
  "online": true,
  "dispositivo": { "id": "SR-2026-A3F1", "ip": "192.168.1.100", ... },
  "sensores": {
    "temperatura": { "valor": 27.3, "unidade": "°C", "timestamp": "..." },
    "umidade_ar":  { "valor": 75,   "unidade": "%",   "timestamp": "..." },
    "luz":         { "valor": 8500, "unidade": "lux", "timestamp": "..." },
    ...
  }
}

Agente → "A temperatura atual da estufa é 27.3°C."
```

```
Usuário: "Liga a irrigação"

Agente → chama ferramenta: enviar_comando(
  topico: "microverdes/cmd/irrigacao",
  valor: "ON"
)
Resposta: { "ok": true, "topico": "microverdes/cmd/irrigacao", "valor": "ON" }

Agente → "Irrigação ligada com sucesso!"
```
