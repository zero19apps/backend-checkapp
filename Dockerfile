# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json e tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY src/ ./src/
COPY lib/ ./lib/
COPY utils/ ./utils/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Criar diretório para uploads temporários
RUN mkdir -p /tmp/uploads && chown nodejs:nodejs /tmp/uploads

# Copiar apenas arquivos necessários
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/lib ./lib
COPY --from=builder --chown=nodejs:nodejs /app/utils ./utils

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV BACKEND_PORT=3223

USER nodejs

EXPOSE 3223

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3223/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]

