# MachShop API - cURL Examples

# Set your authentication token
export AUTH_TOKEN="your-jwt-token-here"
export BASE_URL="https://api.machshop.com/api/v1"

## Collaboration

### POST /api/v1/activities

# Log a document activity
curl -X POST \
  "$BASE_URL/activities" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### GET /api/v1/activities/document/:documentType/:documentId

# Log a document activity
curl -X GET \
  "$BASE_URL/activities/document/:documentType/:documentId" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/activities/user/:userId

# Log a document activity
curl -X GET \
  "$BASE_URL/activities/user/:userId" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### POST /api/v1/reviews/assign

# Assign a review to a user
curl -X POST \
  "$BASE_URL/reviews/assign" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### POST /api/v1/reviews/bulk-assign

# Assign a review to a user
curl -X POST \
  "$BASE_URL/reviews/bulk-assign" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### GET /api/v1/reviews

# Assign a review to a user
curl -X GET \
  "$BASE_URL/reviews" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

## Administration

### GET /api/v1/role-templates

# List role templates with filtering and pagination
curl -X GET \
  "$BASE_URL/role-templates" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/role-templates/:id

# List role templates with filtering and pagination
curl -X GET \
  "$BASE_URL/role-templates/:id" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/role-templates/code/:templateCode

# List role templates with filtering and pagination
curl -X GET \
  "$BASE_URL/role-templates/code/:templateCode" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### POST /api/v1/user-roles/assign/global

curl -X POST \
  "$BASE_URL/user-roles/assign/global" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### POST /api/v1/user-roles/assign/site

curl -X POST \
  "$BASE_URL/user-roles/assign/site" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### DELETE /api/v1/user-roles/revoke/global

curl -X DELETE \
  "$BASE_URL/user-roles/revoke/global" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

## Authentication & Security

### GET /api/v1/sso-admin/providers

curl -X GET \
  "$BASE_URL/sso-admin/providers" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/sso-admin/providers/:id

curl -X GET \
  "$BASE_URL/sso-admin/providers/:id" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### POST /api/v1/sso-admin/providers

curl -X POST \
  "$BASE_URL/sso-admin/providers" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### GET /api/v1/audit/permission-usage

curl -X GET \
  "$BASE_URL/audit/permission-usage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/audit/permission-usage/stats

curl -X GET \
  "$BASE_URL/audit/permission-usage/stats" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/audit/security-events

curl -X GET \
  "$BASE_URL/audit/security-events" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

## Other

### POST /api/v1/l2-equipment/equipment/data/collect

curl -X POST \
  "$BASE_URL/l2-equipment/equipment/data/collect" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### POST /api/v1/l2-equipment/equipment/data/collect-batch

curl -X POST \
  "$BASE_URL/l2-equipment/equipment/data/collect-batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### GET /api/v1/l2-equipment/equipment/data/query

curl -X GET \
  "$BASE_URL/l2-equipment/equipment/data/query" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/eco

curl -X GET \
  "$BASE_URL/eco" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### POST /api/v1/eco

curl -X POST \
  "$BASE_URL/eco" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Example Resource"
}'

### GET /api/v1/eco/:id

curl -X GET \
  "$BASE_URL/eco/:id" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

## Analytics & Reporting

### GET /api/v1/dashboard/kpis

# Get dashboard KPI metrics
curl -X GET \
  "$BASE_URL/dashboard/kpis" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/dashboard/recent-work-orders

# Get dashboard KPI metrics
curl -X GET \
  "$BASE_URL/dashboard/recent-work-orders" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/dashboard/alerts

# Get dashboard KPI metrics
curl -X GET \
  "$BASE_URL/dashboard/alerts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/search/scopes

# Perform global search across all entities
curl -X GET \
  "$BASE_URL/search/scopes" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

### GET /api/v1/search/entity-types

# Perform global search across all entities
curl -X GET \
  "$BASE_URL/search/entity-types" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

