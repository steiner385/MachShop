# MachShop API Route Examples and Patterns

## Authentication Examples

### Public Auth Routes (No Token Required)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
GET    /api/v1/auth/logout

POST   /api/v1/sso/discover
POST   /api/v1/sso/login
POST   /api/v1/sso/callback
POST   /api/v1/sso/logout
```

## Work Order Routes

```
GET    /api/v1/workorders                          # List all work orders
POST   /api/v1/workorders                          # Create new work order
GET    /api/v1/workorders/:id                      # Get work order by ID
PUT    /api/v1/workorders/:id                      # Update work order
DELETE /api/v1/workorders/:id                      # Delete work order

# Query Parameters for Filtering:
?status=RELEASED&partNumber=PART-123&page=1&limit=20
?siteId=SITE-001&priority=HIGH&dueDateFrom=2024-01-01
```

## Equipment Management Routes

```
GET    /api/v1/equipment                           # List equipment
POST   /api/v1/equipment                           # Create equipment
GET    /api/v1/equipment/:id                       # Get equipment by ID
PUT    /api/v1/equipment/:id                       # Update equipment
DELETE /api/v1/equipment/:id                       # Delete equipment

GET    /api/v1/equipment/:id/status                # Get equipment status
PUT    /api/v1/equipment/:id/status                # Update status
POST   /api/v1/equipment/:id/maintenance-schedule  # Schedule maintenance
GET    /api/v1/equipment/:id/children              # Get child equipment

# Query Parameters:
?equipmentClass=PRODUCTION&status=OPERATIONAL&page=1&limit=20
?areaId=AREA-001&workCenterId=WC-001&includeRelations=true
```

## Product/Parts Routes

```
GET    /api/v1/products                            # List all products
POST   /api/v1/products                            # Create product
GET    /api/v1/products/:id                        # Get product by ID
PUT    /api/v1/products/:id                        # Update product
DELETE /api/v1/products/:id                        # Delete product

GET    /api/v1/products/part-number/:partNumber    # Get by part number
GET    /api/v1/products/:id/bom                    # Get bill of materials
GET    /api/v1/products/:id/specifications         # Get specifications

# Query Parameters:
?partType=MANUFACTURED&lifecycleState=ACTIVE
?productType=SUBASSEMBLY&makeOrBuy=MAKE&page=1&limit=50
```

## Materials Management Routes

```
GET    /api/v1/materials/classes                   # List material classes
POST   /api/v1/materials/classes                   # Create material class
GET    /api/v1/materials/classes/:id               # Get class by ID
PUT    /api/v1/materials/classes/:id               # Update class
DELETE /api/v1/materials/classes/:id               # Delete class

GET    /api/v1/materials/classes/:id/hierarchy     # Get class hierarchy
GET    /api/v1/materials/:id/inventory             # Get inventory info
PUT    /api/v1/materials/:id/inventory             # Update inventory
POST   /api/v1/materials/:id/transaction           # Record transaction
```

## Dashboard Routes

```
GET    /api/v1/dashboard/kpis                      # Get KPI metrics
GET    /api/v1/dashboard/work-orders               # Work order summary
GET    /api/v1/dashboard/equipment-utilization     # Equipment metrics
GET    /api/v1/dashboard/quality-metrics           # Quality summary
GET    /api/v1/dashboard/personnel-productivity    # Personnel metrics

# Query Parameters:
?siteId=SITE-001&limit=100
```

## Document Management Routes

### Comments (with existing tests)
```
POST   /api/v1/comments                            # Create comment
GET    /api/v1/comments                            # Get comments for document
GET    /api/v1/comments/:id                        # Get comment by ID
PUT    /api/v1/comments/:id                        # Update comment
DELETE /api/v1/comments/:id                        # Delete comment
PUT    /api/v1/comments/:id/reaction               # Toggle reaction
GET    /api/v1/comments/statistics                 # Get comment statistics

# Query Parameters:
?documentId=DOC-123&documentType=work-instruction&page=1&limit=20
```

### Annotations
```
POST   /api/v1/annotations                         # Create annotation
GET    /api/v1/annotations                         # Get annotations
GET    /api/v1/annotations/:id                     # Get by ID
PUT    /api/v1/annotations/:id                     # Update
DELETE /api/v1/annotations/:id                     # Delete
```

### Reviews
```
POST   /api/v1/reviews                             # Create review
GET    /api/v1/reviews                             # Get reviews
GET    /api/v1/reviews/:id                         # Get by ID
PUT    /api/v1/reviews/:id                         # Update
POST   /api/v1/reviews/:id/approve                 # Approve review
POST   /api/v1/reviews/:id/reject                  # Reject review
```

### Work Instructions
```
GET    /api/v1/work-instructions                   # List instructions
POST   /api/v1/work-instructions                   # Create instruction
GET    /api/v1/work-instructions/:id               # Get by ID
PUT    /api/v1/work-instructions/:id               # Update
DELETE /api/v1/work-instructions/:id               # Delete
```

## Administrative Routes

### Role Management
```
GET    /api/v1/admin/roles                         # List all roles
POST   /api/v1/admin/roles                         # Create role
GET    /api/v1/admin/roles/:id                     # Get role by ID
PUT    /api/v1/admin/roles/:id                     # Update role
DELETE /api/v1/admin/roles/:id                     # Delete role

# Query Parameters:
?active=true&global=true&search=Administrator&page=1&limit=20
```

### Permission Management
```
GET    /api/v1/admin/permissions                   # List permissions
POST   /api/v1/admin/permissions                   # Create permission
GET    /api/v1/admin/permissions/:id               # Get by ID
PUT    /api/v1/admin/permissions/:id               # Update
DELETE /api/v1/admin/permissions/:id               # Delete
```

### Role-Permission Assignment
```
POST   /api/v1/admin/role-permissions              # Assign permission to role
GET    /api/v1/admin/role-permissions              # List assignments
DELETE /api/v1/admin/role-permissions/:roleId/:permId  # Remove permission
```

### User-Role Assignment
```
POST   /api/v1/admin/user-roles                    # Assign role to user
GET    /api/v1/admin/user-roles/:userId            # Get user's roles
DELETE /api/v1/admin/user-roles/:userId/:roleId    # Remove role from user
```

### SSO Administration
```
GET    /api/v1/admin/sso/providers                 # List SSO providers
POST   /api/v1/admin/sso/providers                 # Create provider
GET    /api/v1/admin/sso/providers/:id             # Get provider
PUT    /api/v1/admin/sso/providers/:id             # Update provider
DELETE /api/v1/admin/sso/providers/:id             # Delete provider

GET    /api/v1/admin/sso/sessions                  # List active sessions
POST   /api/v1/admin/sso/sessions/:id/terminate    # Terminate session

GET    /api/v1/admin/sso/discovery-rules           # List discovery rules
POST   /api/v1/admin/sso/discovery-rules           # Create rule
PUT    /api/v1/admin/sso/discovery-rules/:id       # Update rule
DELETE /api/v1/admin/sso/discovery-rules/:id       # Delete rule

GET    /api/v1/admin/sso/analytics                 # Get SSO analytics
GET    /api/v1/admin/sso/health                    # Health check
```

## Workflow Routes

```
GET    /api/v1/workflows                           # List workflows
POST   /api/v1/workflows                           # Create workflow
GET    /api/v1/workflows/:id                       # Get by ID
PUT    /api/v1/workflows/:id                       # Update
DELETE /api/v1/workflows/:id                       # Delete

POST   /api/v1/workflows/:id/execute               # Execute workflow
GET    /api/v1/workflows/:id/status                # Get execution status
POST   /api/v1/workflows/:id/cancel                # Cancel execution
```

## Routing Routes

```
GET    /api/v1/routings                            # List routings
POST   /api/v1/routings                            # Create routing
GET    /api/v1/routings/:id                        # Get by ID
PUT    /api/v1/routings/:id                        # Update
DELETE /api/v1/routings/:id                        # Delete

GET    /api/v1/routings/:id/steps                  # Get routing steps
POST   /api/v1/routings/:id/steps                  # Add step
PUT    /api/v1/routings/:id/steps/:stepId          # Update step
DELETE /api/v1/routings/:id/steps/:stepId          # Remove step

GET    /api/v1/routings/:id/approvals              # Get approvals
POST   /api/v1/routings/:id/approve                # Approve routing
POST   /api/v1/routings/:id/reject                 # Reject routing
POST   /api/v1/routings/:id/activate               # Activate routing
```

## Upload Routes (with existing tests)

```
POST   /api/v1/upload                              # Upload file
POST   /api/v1/upload/batch                        # Batch upload
GET    /api/v1/upload/:id                          # Get upload status
DELETE /api/v1/upload/:id                          # Delete uploaded file
```

## Integration Routes

### Material Planning (B2M)
```
GET    /api/v1/b2m/materials                       # Get materials
POST   /api/v1/b2m/forecast                        # Submit forecast
GET    /api/v1/b2m/forecast/:id                    # Get forecast
```

### Engineering Change Orders (ECO)
```
GET    /api/v1/eco/changes                         # List ECOs
POST   /api/v1/eco/changes                         # Create ECO
GET    /api/v1/eco/changes/:id                     # Get ECO
PUT    /api/v1/eco/changes/:id                     # Update ECO
POST   /api/v1/eco/changes/:id/approve             # Approve ECO
POST   /api/v1/eco/changes/:id/release             # Release ECO
```

### Manufacturing Integrations
```
GET    /api/v1/maximo/work-orders                  # Sync from Maximo
POST   /api/v1/maximo/sync                         # Trigger sync

GET    /api/v1/indysoft/parts                      # Sync from Indysoft
GET    /api/v1/covalent/coordinates                # Get from Covalent
GET    /api/v1/cmm/measurements                    # Get CMM data
```

## Additional Routes

### Personnel
```
GET    /api/v1/personnel                           # List personnel
POST   /api/v1/personnel                           # Add personnel
GET    /api/v1/personnel/:id                       # Get by ID
PUT    /api/v1/personnel/:id                       # Update
```

### Time Tracking
```
POST   /api/v1/time-tracking/clock-in              # Clock in
POST   /api/v1/time-tracking/clock-out             # Clock out
GET    /api/v1/time-tracking/:id                   # Get time entries
```

### Production Schedules
```
GET    /api/v1/production-schedules                # List schedules
POST   /api/v1/production-schedules                # Create schedule
GET    /api/v1/production-schedules/:id            # Get schedule
PUT    /api/v1/production-schedules/:id            # Update schedule
```

### Search
```
GET    /api/v1/search                              # Global search
# Query Parameters:
?q=search_term&type=work-order,equipment&limit=50
```

### Notifications
```
GET    /api/v1/notifications                       # Get notifications
POST   /api/v1/notifications/:id/read              # Mark as read
DELETE /api/v1/notifications/:id                   # Delete notification
```

### Sites
```
GET    /api/v1/sites                               # List all sites
POST   /api/v1/sites                               # Create site
GET    /api/v1/sites/:id                           # Get site
PUT    /api/v1/sites/:id                           # Update site
```

## Request/Response Examples

### Successful Request
```bash
curl -X GET http://localhost:3000/api/v1/workorders?page=1&limit=20 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

### Success Response (200)
```json
{
  "data": [
    {
      "id": "wo-123",
      "partNumber": "PART-456",
      "quantityOrdered": 100,
      "status": "RELEASED",
      "priority": "HIGH",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Response (400)
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid query parameters",
  "details": [
    {
      "field": "page",
      "message": "Page must be a positive number"
    }
  ]
}
```

### Error Response (401)
```json
{
  "error": "AUTHENTICATION_ERROR",
  "message": "Access token is required"
}
```

### Error Response (403)
```json
{
  "error": "AUTHORIZATION_ERROR",
  "message": "Insufficient permissions for this operation",
  "requiredPermission": "production.write"
}
```

## Common Query Parameters

### Pagination
```
?page=1&limit=20      # Default pagination
```

### Filtering
```
?status=ACTIVE        # Filter by status
?siteId=SITE-001      # Filter by site
?search=term          # Free text search
```

### Sorting
```
?sortBy=createdAt&sortOrder=DESC
?sortBy=partNumber&sortOrder=ASC
```

### Selection
```
?includeRelations=true    # Include related objects
?fields=id,name,status    # Return only specific fields
```

## Response Status Codes

- **200** - OK (Success)
- **201** - Created (Resource created successfully)
- **204** - No Content (Success with no body)
- **400** - Bad Request (Validation error)
- **401** - Unauthorized (Missing/invalid authentication)
- **403** - Forbidden (Insufficient permissions)
- **404** - Not Found (Resource not found)
- **409** - Conflict (Business rule violation)
- **422** - Unprocessable Entity (Semantic error)
- **429** - Too Many Requests (Rate limit exceeded)
- **500** - Internal Server Error

## Authentication Header Format

```
Authorization: Bearer <JWT_TOKEN>
```

Where JWT_TOKEN is a valid JWT containing:
- `userId`: User ID
- `username`: Username
- `email`: Email address
- `roles`: Array of role names
- `permissions`: Array of permission codes
- `siteId`: (Optional) Site ID for multi-tenant access

## Multi-Tenancy

Many routes support site-scoped filtering:
```
?siteId=SITE-001      # Filter by specific site
```

Site access is enforced at the middleware level via `requireSiteAccess`.
