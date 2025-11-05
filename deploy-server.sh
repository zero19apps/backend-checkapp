#!/bin/bash

# Script de deploy no servidor
# Execute no servidor: bash deploy-server.sh

echo "🚀 [DEPLOY] Iniciando deploy do backend-checkapp..."

# 1. Clonar/Atualizar repositório
if [ -d "backend-checkapp" ]; then
    echo "📦 [DEPLOY] Atualizando repositório..."
    cd backend-checkapp
    git pull origin main
else
    echo "📦 [DEPLOY] Clonando repositório..."
    git clone https://github.com/zero19apps/backend-checkapp.git
    cd backend-checkapp
fi

# 2. Build da imagem Docker
echo "🔨 [DEPLOY] Fazendo build da imagem..."
docker build -t checkapp-backend:latest .

if [ $? -ne 0 ]; then
    echo "❌ [DEPLOY] Erro no build! Abortando..."
    exit 1
fi

echo "✅ [DEPLOY] Build concluído com sucesso!"

# 3. Deploy no Docker Swarm
echo "🚢 [DEPLOY] Fazendo deploy no Docker Swarm..."
docker stack deploy -c docker-compose.yml checkapp-backend

if [ $? -ne 0 ]; then
    echo "❌ [DEPLOY] Erro no deploy! Verifique os logs."
    exit 1
fi

echo "✅ [DEPLOY] Deploy concluído!"
echo ""
echo "📊 Verifique o status com:"
echo "   docker service ls | grep checkapp-backend"
echo ""
echo "📋 Veja os logs com:"
echo "   docker service logs -f checkapp-backend_checkapp-backend"

