# Backend CheckApp - Standalone API

Backend API standalone para o CheckApp, pronto para desenvolvimento e produção.

## 🚀 Características

- ✅ **Standalone**: Independente do projeto Next.js
- ✅ **TypeScript**: Totalmente tipado
- ✅ **PostgreSQL**: Integração com banco de dados
- ✅ **Google Drive**: Upload e proxy de imagens
- ✅ **Docker Ready**: Dockerfile e docker-compose prontos
- ✅ **Docker Swarm**: Configurado para Traefik
- ✅ **Health Checks**: Monitoramento automático

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou remoto)
- Docker & Docker Swarm (para produção)
- Conta Google Cloud (para Drive API)

## 🛠️ Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Rodar em desenvolvimento
npm run dev
```

## 📝 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Servidor
BACKEND_PORT=3223
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
SHOPPING_SCHEMA=passeio

# Google Drive API
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=1_EeqI9FtCny6fwkxp3K2JEu82WgL_oCR

# Frontend URL (para CORS)
FRONTEND_URL=https://zero19.top
```

## 🚀 Scripts Disponíveis

```bash
npm run dev      # Desenvolvimento com hot-reload
npm run build    # Build para produção
npm start        # Rodar em produção
npm run check    # Verificar health check
```

## 🐳 Docker

### Desenvolvimento Local

```bash
docker build -t checkapp-backend:latest .
docker run -p 3223:3223 --env-file .env checkapp-backend:latest
```

### Produção (Docker Swarm)

```bash
# Deploy automático
./deploy.sh

# Ou manualmente
docker build -t checkapp-backend:latest .
docker stack deploy -c docker-compose.yml checkapp-backend
```

## 📡 Rotas da API

### Health Check
- `GET /health` - Status do servidor

### Roteiros
- `GET /api/roteiro/roteiros-psql` - Listar roteiros
- `GET /api/roteiro/get-auditoria-psql` - Buscar auditoria

### Lojas
- `GET /api/lojas/get-lojas-psql` - Listar lojas
- `GET /api/lojas/get-loja-psql` - Buscar loja

### Mapeamentos
- `GET /api/mapeamentos/get-all-psql` - Listar mapeamentos
- `POST /api/mapeamentos/add-mapeamento-psql` - Criar mapeamento

### Auditorias
- `GET /api/auditoria/get-auditorias-detalhes-psql` - Listar auditorias
- `GET /api/auditoriaDia/get-all-total-psql` - Listar totais

### Utilitários
- `GET /api/image-proxy?path=...` - Proxy de imagens do Drive
- `POST /api/upload-foto` - Upload de fotos
- `POST /api/upload-foto-auditoria` - Upload de fotos de auditoria

## 🔧 Configuração Docker Swarm + Traefik

O projeto está configurado para rodar no Docker Swarm com Traefik:

- **Domínio**: `apicheckapp.zero19.top`
- **Rede**: `network_public`
- **SSL**: Automático via Let's Encrypt
- **Replicas**: 2 (configurável)

## 📦 Estrutura do Projeto

```
backend-checkapp/
├── src/
│   ├── server.ts          # Servidor Express
│   ├── routes/            # Rotas da API
│   ├── services/           # Services (image-proxy, upload)
│   └── utils/              # Utilitários
├── lib/                    # Libs PostgreSQL
├── utils/                  # Utils (tipos)
├── Dockerfile              # Build Docker
├── docker-compose.yml      # Docker Swarm
└── deploy.sh               # Script de deploy
```

## 🐛 Troubleshooting

### Erro de conexão com PostgreSQL
- Verifique se `DATABASE_URL` está correto
- Confirme que o banco está acessível
- Verifique o schema (`SHOPPING_SCHEMA`)

### Erro no Google Drive
- Verifique as credenciais do Google Cloud
- Confirme que a service account tem permissões no Drive
- Verifique o `GOOGLE_DRIVE_FOLDER_ID`

### Erro no Docker Swarm
- Confirme que o Swarm está ativo: `docker info | grep Swarm`
- Verifique a rede: `docker network ls | grep network_public`
- Veja os logs: `docker service logs checkapp-backend_checkapp-backend`

## 📄 Licença

ISC

## 👥 Autor

CheckApp Team

