---
sidebar_position: 5
title: Inventory API
description: Material and inventory management
---

# Inventory API

The Inventory API manages materials, stock levels, locations, and material movements.

## Endpoints

- `GET /inventory/materials` - List materials
- `GET /inventory/materials/{id}` - Get material
- `GET /inventory/stock-levels` - Get current stock
- `POST /inventory/movements` - Record material movement
- `GET /inventory/locations` - List storage locations

## Materials

A material is a component or raw material used in manufacturing.

### List Materials

```bash
curl "https://api.mes.company.com/api/v2/inventory/materials" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get Material

```bash
curl "https://api.mes.company.com/api/v2/inventory/materials/mat-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:
- `id` - Material ID
- `sku` - Stock keeping unit
- `name` - Material name
- `description` - Details
- `supplier` - Vendor
- `unitOfMeasure` - Unit (pcs, kg, L, etc.)
- `reorderPoint` - Minimum stock level
- `reorderQuantity` - Quantity to order
- `cost` - Unit cost

## Stock Levels

Check current inventory.

```bash
curl "https://api.mes.company.com/api/v2/inventory/stock-levels?materialId=mat-123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response includes:
- `onHand` - Physical quantity
- `reserved` - Allocated to work orders
- `available` - Free to allocate
- `inTransit` - Incoming shipments

## Material Movements

Track allocation and consumption.

### Record Movement

```bash
curl -X POST "https://api.mes.company.com/api/v2/inventory/movements" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "materialId": "mat-123",
    "workOrderId": "wo-456",
    "type": "ALLOCATION",
    "quantity": 50,
    "fromLocation": "WAREHOUSE-A",
    "toLocation": "PRODUCTION-FLOOR"
  }'
```

Movement Types:
- `ALLOCATION` - Reserve for work order
- `CONSUMPTION` - Use in production
- `RETURN` - Return to stock
- `ADJUSTMENT` - Inventory correction
- `TRANSFER` - Move between locations

## Locations

Storage locations in the facility.

```bash
curl "https://api.mes.company.com/api/v2/inventory/locations" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Locations include:
- Warehouses
- Production floor areas  
- Quarantine areas
- Scrap bins

## Related Documentation

- [Work Orders API](./work-orders.md) - Material requirements
- [Webhooks - Inventory Events](../webhooks/events.md)

---

**Need help?** [Email support](mailto:developers@mes.company.com)
