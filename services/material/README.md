# Material Service

MES Material Management Microservice - Handles inventory, material lots, and material transactions.

**Port**: 3011
**Database**: postgres-material (port 5435)
**Status**: ✅ Production Ready

---

## Features

- ✅ Material master data management
- ✅ Material lot tracking
- ✅ Material transactions (receipts, issues, transfers)
- ✅ Inventory management
- ✅ Expiration date tracking
- ✅ Event-driven architecture (Kafka)
- ✅ Distributed caching (Redis)
- ✅ Docker support

---

## API Endpoints

### Materials

**GET `/api/v1/material/materials`**
- Get paginated list of materials
- Query params: `page`, `limit`

**POST `/api/v1/material/materials`**
- Create new material
- Body: `{ materialNumber, materialName, description?, materialType, unitOfMeasure, standardCost? }`

### Material Lots

**GET `/api/v1/material/lots`**
- Get paginated list of material lots
- Query params: `page`, `limit`

**POST `/api/v1/material/lots`**
- Create new material lot
- Body: `{ lotNumber, materialId, quantity, expirationDate? }`

### Material Transactions

**GET `/api/v1/material/transactions`**
- Get paginated list of material transactions
- Query params: `page`, `limit`

**POST `/api/v1/material/transactions`**
- Create new material transaction
- Body: `{ transactionType, materialId, lotNumber?, quantity, fromLocation?, toLocation?, workOrderId? }`

---

## Configuration

### Environment Variables

```bash
NODE_ENV=development
PORT=3011
SERVICE_NAME=material-service
MATERIAL_DATABASE_URL=postgresql://mes_material_user:mes_material_password_dev@localhost:5435/mes_material
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
AUTH_SERVICE_URL=http://localhost:3008
```

---

## Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

---

## Docker

```bash
docker build -t mes-material-service:latest .
docker compose -f docker-compose.services.yml up -d
```

---

**Last Updated**: 2025-10-18
**Status**: Production Ready ✅
