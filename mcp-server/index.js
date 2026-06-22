#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 *  🌱 Saúde Real Microverdes — MCP Server
 *
 *  Expose todos os endpoints da HTTP API como ferramentas MCP
 *  para agentes de IA (Claude, Cursor, etc).
 *
 *  Transporte: stdio (padrão MCP)
 *
 *  Uso:
 *    node index.js
 *    npx @anthropic-ai/mcp-client-cli node /path/to/index.js
 *
 *  Configuração Claude Desktop / Cursor:
 *    {
 *      "mcpServers": {
 *        "microverdes": {
 *          "command": "node",
 *          "args": ["/path/to/mcp-server/index.js"],
 *          "env": { "API_BASE_URL": "http://localhost:3000" }
 *        }
 *      }
 *    }
 *
 *  Variáveis de ambiente:
 *    API_BASE_URL — URL do aggregator HTTP (default: http://localhost:3000)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Configuração ──────────────────────────────────────────────────
const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

// ── Cliente HTTP simples (sem dependência externa) ───────────────
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Definição das ferramentas ────────────────────────────────────
const TOOLS = [
  {
    name: "health_check",
    description:
      "Verifica se o servidor aggregator está online e responsivo. " +
      "Use como primeira chamada antes de qualquer outra ferramenta.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "status_completo",
    description:
      "Retorna o status completo do sistema: info da aplicação, conexão MQTT, " +
      "resumo de dispositivos/sensores/bandejas, e lista completa de dispositivos " +
      "com sensores e bandejas de cada um. Equivale a GET /status",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_dispositivos",
    description:
      "Lista todos os dispositivos ESP32 conhecidos com status online/offline, " +
      "IP, MAC, RSSI, uptime, quantidade de sensores e bandejas. " +
      "Equivale a GET /devices",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_sensores",
    description:
      "Retorna todos os sensores agregados de todos os dispositivos, " +
      "agrupados por tipo (temperatura, umidade_ar, umidade_solo, luz, neblina, irrigacao), " +
      "com valor, unidade, timestamp e dispositivo de origem. " +
      "Equivale a GET /sensors",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_bandejas",
    description:
      "Lista todas as bandejas de microverdes com umidade atual, " +
      "nome, dispositivo de origem e timestamp. " +
      "Equivale a GET /bandejas",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "dashboard_data",
    description:
      "Retorna os dados consolidados para o dashboard: dispositivo principal ativo, " +
      "todos os sensores mesclados, todas as bandejas, e lista de dispositivos online. " +
      "Se nenhum dispositivo estiver conectado, retorna online=false. " +
      "Equivale a GET /dashboard-data",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "enviar_comando",
    description:
      "Envia um comando MQTT para o ESP32 via aggregator. " +
      "Use para controlar irrigação, neblina, ou qualquer atuador. " +
      "Tópicos válidos: microverdes/cmd/irrigacao (ON/OFF), " +
      "microverdes/status/neblina (ON/OFF). " +
      "Equivale a POST /cmd",
    inputSchema: {
      type: "object",
      properties: {
        topico: {
          type: "string",
          description:
            "Tópico MQTT de destino. " +
            "Ex: 'microverdes/cmd/irrigacao', 'microverdes/status/neblina'",
        },
        valor: {
          type: "string",
          description:
            "Valor a publicar. Ex: 'ON', 'OFF', '1', '0'",
        },
      },
      required: ["topico", "valor"],
      additionalProperties: false,
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────

async function handleListTools() {
  return { tools: TOOLS };
}

async function handleCallTool(name, args) {
  switch (name) {
    case "health_check":
      return await apiGet("/health");

    case "status_completo":
      return await apiGet("/status");

    case "listar_dispositivos":
      return await apiGet("/devices");

    case "listar_sensores":
      return await apiGet("/sensors");

    case "listar_bandejas":
      return await apiGet("/bandejas");

    case "dashboard_data":
      return await apiGet("/dashboard-data");

    case "enviar_comando":
      return await apiPost("/cmd", {
        topico: args.topico,
        valor: args.valor,
      });

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

// ── Servidor MCP ─────────────────────────────────────────────────

const server = new Server(
  {
    name: "microverdes-iot",
    version: "1.0.0",
    description:
      "Saúde Real Microverdes IoT — controle e monitoramento de estufa de microverdes via MQTT",
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, handleListTools);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleCallTool(name, args ?? {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Erro ao executar "${name}": ${err.message}`,
        },
      ],
    };
  }
});

// ── Conexão stdio ────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

// Log para stderr (não polui o canal stdio do MCP)
console.error(`🌱 Microverdes MCP Server conectado`);
console.error(`   API: ${API_BASE}`);
console.error(`   Ferramentas: ${TOOLS.map((t) => t.name).join(", ")}`);
