# ══════════════════════════════════════════════════════════
#  Server — MQTT Aggregator + HTTP API
#  Node 20 Alpine (~180MB final)
# ══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini

FROM base AS deps
COPY package.json ./
RUN npm install --production

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY claude_mqtt_render_aggregator.js ./
COPY GUIA_JSON_AGREGADOR.md ./

# Tini como init (SIGTERM correto no Docker)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "claude_mqtt_render_aggregator.js"]

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
