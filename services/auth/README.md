# MES Authentication Service

JWT-based authentication and authorization microservice for the MES system.

## Features

- **JWT Authentication**: Access tokens (24h) and refresh tokens (7d)
- **Redis-Backed Token Storage**: Refresh tokens stored in Redis with metadata
- **Password Security**: bcrypt hashing with configurable rounds
- **Password Policy**: Complexity requirements and history tracking
- **Session Management**: Track active sessions per user, multi-device support
- **Role-Based Access Control**: Predefined roles and permissions
- **Permission-Based Authorization**: Fine-grained access control
- **Rate Limiting**: Protect against brute force attacks
- **Event Publishing**: Publish auth events to Kafka (login, logout, password change)
- **Health Checks**: Liveness and readiness endpoints
- **Graceful Shutdown**: Proper cleanup of connections

## Architecture

```
services/auth/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── config/
│   │   └── config.ts         # Environment validation
│   ├── routes/
│   │   └── auth.ts           # Auth API endpoints
│   ├── services/
│   │   ├── AuthService.ts    # Core authentication logic
│   │   └── TokenService.ts   # JWT generation/validation
│   ├── middleware/
│   │   └── auth.ts           # Auth/authz middleware
│   └── types/
│       └── index.ts          # TypeScript types
├── prisma/
│   └── schema.prisma         # Auth database schema
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env                      # Environment variables
```

## API Endpoints

### Authentication

#### POST /api/v1/auth/login
Authenticate user and return JWT tokens.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123",
  "rememberMe": false
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "username": "admin",
    "email": "admin@mes.com",
    "roles": ["System Administrator"],
    "permissions": ["*"],
    "isActive": true
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/v1/auth/logout
Logout user by revoking refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/v1/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": "user_123",
  "username": "admin",
  "email": "admin@mes.com",
  "firstName": "Admin",
  "lastName": "User",
  "roles": ["System Administrator"],
  "permissions": ["*"],
  "isActive": true,
  "lastLoginAt": "2025-10-18T10:30:00Z"
}
```

#### POST /api/v1/auth/change-password
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response:**
```json
{
  "message": "Password changed successfully. Please login again."
}
```

### Health Check

#### GET /health
Service health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T10:30:00Z",
  "service": "auth-service",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file in the `services/auth` directory:

```bash
# Service Configuration
NODE_ENV=development
PORT=3008
SERVICE_NAME=auth-service

# Database Connection
AUTH_DATABASE_URL=postgresql://mes_auth_user:password@localhost:5432/mes_auth

# Redis Connection
REDIS_URL=redis://localhost:6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=auth-service
KAFKA_GROUP_ID=auth-service-group

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-min-32-characters

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL (auth database)
- Redis
- Kafka (optional - for event publishing)

### Setup

1. **Install dependencies**:
```bash
cd services/auth
npm install
```

2. **Generate Prisma client**:
```bash
npm run prisma:generate
```

3. **Run database migrations**:
```bash
npm run prisma:migrate
```

4. **Start development server**:
```bash
npm run dev
```

The service will be available at `http://localhost:3008`.

## Docker

### Build Image

```bash
docker build -t mes-auth-service:latest .
```

### Run Container

```bash
docker run -p 3008:3008 \
  -e AUTH_DATABASE_URL=postgresql://user:pass@host:5432/mes_auth \
  -e REDIS_URL=redis://redis:6379 \
  -e JWT_SECRET=your-secret-key \
  -e SESSION_SECRET=your-session-secret \
  mes-auth-service:latest
```

## Authentication Middleware

The service provides middleware functions for use by other services:

### `authMiddleware`
Verifies JWT token and attaches user to request.

```typescript
import { authMiddleware } from './middleware/auth';

app.use('/api/protected', authMiddleware, (req, res) => {
  // req.user contains decoded JWT payload
  res.json({ message: 'Protected route', user: req.user });
});
```

### `requirePermission(permission: string)`
Requires specific permission.

```typescript
import { requirePermission } from './middleware/auth';

app.post('/api/workorders',
  authMiddleware,
  requirePermission('workorders.write'),
  (req, res) => {
    // User has 'workorders.write' permission
  }
);
```

### `requireRole(role: string)`
Requires specific role.

```typescript
import { requireRole } from './middleware/auth';

app.get('/api/admin',
  authMiddleware,
  requireRole('System Administrator'),
  (req, res) => {
    // User has 'System Administrator' role
  }
);
```

### Predefined Role Groups

- `requireQualityAccess` - Quality Engineer, Quality Manager, Plant Manager, System Administrator
- `requireProductionAccess` - Production roles
- `requireMaintenanceAccess` - Maintenance roles
- `requireManagementAccess` - Management roles

## Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Password history (prevents reuse of last 5 passwords)
- bcrypt hashing with 12 rounds (configurable)

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes (general), 5 login attempts per 15 minutes
- **Helmet.js**: Security headers
- **CORS**: Configurable origins
- **Token Expiration**: Automatic cleanup of expired tokens
- **Session Tracking**: Track active sessions per user
- **Login History**: Audit trail of login attempts

## Events Published

The service publishes authentication events to Kafka:

- `auth.user.login` - User logged in
- `auth.user.logout` - User logged out
- `auth.password.changed` - Password changed
- `auth.token.refreshed` - Access token refreshed
- `auth.session.expired` - Session expired
- `auth.login.failed` - Login attempt failed

## Database Schema

See `prisma/schema.prisma` for the complete Auth Service database schema:

- **User**: User accounts with credentials
- **RefreshToken**: Active refresh tokens
- **UserSession**: Active user sessions
- **LoginHistory**: Audit log of login attempts
- **PasswordHistory**: Previous passwords (prevents reuse)
- **APIToken**: Machine-to-machine authentication (future)
- **MFASettings**: Multi-factor authentication (future)

## Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Start Production

```bash
npm start
```

## Production Checklist

- [ ] Change `JWT_SECRET` to secure random string (min 32 chars)
- [ ] Change `SESSION_SECRET` to secure random string (min 32 chars)
- [ ] Use strong database password
- [ ] Configure Redis with authentication
- [ ] Set `BCRYPT_ROUNDS` to 12 or higher
- [ ] Enable TLS for database connections
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerts
- [ ] Configure log aggregation
- [ ] Set up backup strategy for database
- [ ] Review and adjust rate limits
- [ ] Configure Kafka with authentication

## Troubleshooting

### Token Verification Fails

- Ensure `JWT_SECRET` matches across all services
- Check token expiration time
- Verify Redis is accessible

### Database Connection Errors

- Verify `AUTH_DATABASE_URL` is correct
- Ensure database is running and accessible
- Check database migrations are applied

### Redis Connection Errors

- Verify `REDIS_URL` is correct
- Ensure Redis is running and accessible
- Check network connectivity

## License

MIT
