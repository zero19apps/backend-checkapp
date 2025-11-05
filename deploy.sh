#!/bin/bash

# Build e Deploy do Backend CheckApp no Docker Swarm

set -e

echo "🚀 [DEPLOY] Iniciando deploy do CheckApp Backend..."

# 1. Build da imagem
echo "📦 [BUILD] Construindo imagem Docker..."
docker build -t checkapp-backend:latest .

# 2. Tag para registry (se usar)
# docker tag checkapp-backend:latest seu-registry.com/checkapp-backend:latest
# docker push seu-registry.com/checkapp-backend:latest

# 3. Deploy no Docker Swarm
echo "🐳 [SWARM] Fazendo deploy no Docker Swarm..."
docker stack deploy -c docker-compose.yml checkapp-backend

# 4. Verificar status
echo "✅ [STATUS] Verificando status do serviço..."
sleep 5
docker service ls | grep checkapp-backend || echo "⚠️  Serviço não encontrado. Verifique se o Docker Swarm está ativo."

echo "🎉 [SUCCESS] Deploy concluído!"
echo "📡 API disponível em: https://apicheckapp.zero19.top"
echo "🔍 Health check: https://apicheckapp.zero19.top/health"

