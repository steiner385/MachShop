# Material Movement & Logistics Management System - User Guide
**Issue #64 Implementation**

## Overview

The Material Movement & Logistics Management System is a comprehensive manufacturing execution system (MES) component designed to manage material movements, container tracking, and shipment coordination within a manufacturing facility.

## Features

### 1. Material Movement Management
- **Create Movements**: Request material transfers between locations
- **Status Tracking**: Track movement progress through approval, transit, and delivery stages
- **Location Tracking**: Real-time visibility of material locations
- **Movement History**: Complete audit trail of all material movements
- **Approval Workflows**: Multi-level approval for movement requests

### 2. Forklift Management
- **Fleet Management**: Manage forklift inventory and status
- **Operator Assignment**: Assign operators to specific forklifts
- **Location Tracking**: Track forklift location and availability
- **Maintenance Scheduling**: Flag forklifts for maintenance
- **Site-Based Organization**: Organize forklifts by facility site

### 3. Container & Pallet Tracking
- **Container Lifecycle**: Track containers from empty to loaded to delivered
- **Load/Unload Operations**: Record materials loaded and unloaded from containers
- **Container Transfers**: Move containers between locations
- **Capacity Management**: Monitor container utilization
- **Pallet Consolidation**: Consolidate multiple containers onto pallets for shipment

### 4. ERP Integration
- **Shipment Status Updates**: Receive shipment status from ERP systems
- **Tracking Updates**: Track carrier shipments in real-time
- **Delivery Confirmation**: Confirm shipment delivery at destination
- **Exception Handling**: Manage delays and shipping exceptions
- **Webhook Integration**: Real-time status updates via webhooks

### 5. Mobile Scanning
- **Barcode Scanning**: Scan containers and materials with camera
- **QR Code Support**: Support for QR-based tracking
- **Offline Capability**: PWA for offline-first scanning
- **Manual Input**: Fallback for manual barcode entry
- **Real-Time Sync**: Synchronize data with backend when online

### 6. Dashboards & Reporting
- **Real-Time Dashboard**: Live view of active movements and containers
- **Analytics**: Container utilization, throughput metrics
- **Dispatcher Dashboard**: Forklift request management and assignment
- **Statistics**: Historical trends and performance metrics

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Operator** | Create movements, scan containers, update location tracking |
| **Supervisor** | Approve movements, manage forklift assignments, view dashboards |
| **Manager** | Full system access, configure workflows, manage users |
| **Administrator** | System configuration, webhook management, audit logs |

## Getting Started

### For Operators

#### Creating a Material Movement
1. Navigate to **Operations > Material Movements**
2. Click **New Movement**
3. Enter source location and destination
4. Specify material ID and quantity
5. Select movement type (TRANSFER, CROSS_DOCK, INTER_SITE)
6. Submit for approval

#### Scanning Containers
1. Navigate to **Operations > Container Management > Scanner Tab**
2. Point camera at barcode/QR code
3. System automatically loads container details
4. Select action (Load, Unload, Transfer)
5. Confirm operation

#### Transferring Containers
1. In Container Management, locate container
2. Click menu → **Transfer**
3. Select target location
4. Confirm transfer
5. Container status updates to reflect new location

### For Supervisors

#### Approving Movements
1. Navigate to **Operations > Material Movements**
2. Filter by status = **REQUESTING**
3. Review movement details
4. Click **Approve** to authorize
5. Optionally add approval notes

#### Managing Forklift Assignments
1. Navigate to **Operations > Forklift Management**
2. Select forklift to assign
3. Click **Assign Operator**
4. Choose operator from list
5. Confirm assignment

#### Viewing Analytics
1. Navigate to **Operations > Container Management > Analytics Tab**
2. View real-time statistics
3. Monitor utilization rates
4. Identify bottlenecks and inefficiencies

### For Administrators

#### Configuring Webhook Handlers
1. Navigate to **Admin > Webhooks**
2. Configure ERP system endpoints
3. Set allowed source systems
4. Enable signature verification
5. Test webhook connectivity

#### Managing API Keys
1. Navigate to **Admin > API Keys**
2. Generate new keys for integrations
3. Set expiration dates
4. Configure rate limits
5. Monitor key usage

## API Documentation

### Base URL
```
https://api.yourcompany.com/api/v1
```

### Authentication
All API requests require Bearer token authentication:
```
Authorization: Bearer YOUR_API_TOKEN
```

### Key Endpoints

#### Material Movements
- `POST /movements/create` - Create new movement
- `GET /movements/:id` - Get movement details
- `GET /movements` - List movements with filtering
- `PUT /movements/:id` - Update movement
- `POST /movements/:id/approve` - Approve movement
- `POST /movements/:id/transition` - Change status
- `POST /movements/:id/cancel` - Cancel movement

#### Containers
- `POST /movements/containers/create` - Create container
- `GET /movements/containers/:id` - Get container details
- `POST /movements/containers/:id/load` - Load materials
- `POST /movements/containers/:id/unload` - Unload materials
- `POST /movements/containers/:id/transfer` - Transfer location
- `GET /movements/containers/:id/history` - Get movement history
- `GET /movements/containers/:id/utilization` - Get metrics

#### Webhooks
- `POST /webhooks/shipments/status` - Shipment status update
- `POST /webhooks/shipments/tracking` - Tracking update
- `POST /webhooks/shipments/delivered` - Delivery confirmation
- `POST /webhooks/shipments/exception` - Exception notification
- `GET /webhooks/history` - Webhook event history
- `GET /webhooks/stats` - Webhook statistics

### Example Requests

#### Create Material Movement
```bash
curl -X POST https://api.yourcompany.com/api/v1/movements/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromLocation": "Warehouse A",
    "toLocation": "Warehouse B",
    "materialId": "MAT-001",
    "quantity": 50,
    "movedBy": "operator-1",
    "movementType": "TRANSFER"
  }'
```

#### Load Container
```bash
curl -X POST https://api.yourcompany.com/api/v1/movements/containers/CONT-001/load \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partNumbers": ["PART-123", "PART-456"],
    "quantity": 50,
    "loadedBy": "operator-1"
  }'
```

#### Webhook - Shipment Status Update
```bash
curl -X POST https://api.yourcompany.com/api/v1/webhooks/shipments/status \
  -H "X-Webhook-Signature: sha256=..." \
  -H "Content-Type: application/json" \
  -d '{
    "erpShipmentNumber": "SHP-2024-001",
    "status": "SHIPPED",
    "trackingNumber": "1Z999AA10123456784",
    "carrier": "FedEx",
    "estimatedDeliveryDate": "2024-11-05T18:00:00Z",
    "lastUpdateTime": "2024-11-01T10:30:00Z",
    "updateSource": "ERP"
  }'
```

## Status Workflows

### Material Movement Statuses
```
REQUESTED → APPROVED → ASSIGNED → IN_TRANSIT → AT_LOCATION → COMPLETED
                ↓
           CANCELLED (at any step)
                ↓
           FAILED (if exception)
```

### Container Statuses
```
EMPTY → LOADED → IN_TRANSIT → AT_LOCATION → [LOADED or EMPTY]
            ↓
        DAMAGED (at any step)
```

### Pallet Statuses
```
EMPTY → CONSOLIDATING → CONSOLIDATED → IN_TRANSIT → DELIVERED
```

## Troubleshooting

### Container Not Found
- Verify barcode format and spelling
- Check container exists in system
- Ensure container not deleted

### Movement Approval Fails
- Verify user has supervisor role
- Check movement is in REQUESTING status
- Confirm locations are valid

### Webhook Not Receiving Updates
- Verify endpoint URL is accessible
- Check webhook signature configuration
- Review webhook history for failed deliveries
- Confirm source system is in whitelist

### Container Capacity Exceeded
- Verify quantity doesn't exceed capacity
- Check container isn't already at max
- Consider splitting into multiple containers

## Performance Tips

1. **Batch Operations**: Group container loads to reduce API calls
2. **Caching**: Use local caching for frequently accessed container data
3. **Pagination**: Use limits and offsets when retrieving large lists
4. **Indexing**: Ensure locations and material IDs are indexed
5. **Cleanup**: Archive old movements regularly

## Security Best Practices

1. **API Keys**: Rotate keys every 90 days
2. **HTTPS Only**: All API traffic must use HTTPS
3. **Rate Limiting**: Implement rate limiting for integrations
4. **Signature Verification**: Always verify webhook signatures
5. **Audit Logging**: Log all user actions
6. **Access Control**: Implement role-based access control

## Support & Maintenance

### Database Maintenance
- Run optimization nightly: `npm run db:optimize`
- Archive old movements monthly: `npm run db:archive-movements`
- Back up daily to secure location

### Monitoring
- Monitor API response times
- Track webhook delivery success rate
- Alert on failed movements
- Monitor container utilization trends

### Updates
- Review changelog before updates
- Test in staging environment
- Schedule updates during low-traffic periods
- Maintain database backups

## FAQ

**Q: How do I cancel a movement?**
A: Use the `POST /movements/:id/cancel` endpoint. Movements can only be cancelled if not yet in COMPLETED status.

**Q: What's the maximum container capacity?**
A: Container capacity is configurable per container type. Check the container details in the system.

**Q: Can I modify a completed movement?**
A: No, completed movements are immutable. Create a new movement if corrections needed.

**Q: How long are webhook events retained?**
A: By default, webhook events are retained for 90 days. Configure via admin settings.

**Q: What formats do barcodes support?**
A: Supports Code128, Code39, EAN-13, UPC-A, and QR codes.

## Additional Resources

- API Reference: See `API_DOCUMENTATION.md`
- Architecture Guide: See `ARCHITECTURE.md`
- Webhook Integration: See `WEBHOOK_INTEGRATION.md`
- Deployment Guide: See `DEPLOYMENT.md`
