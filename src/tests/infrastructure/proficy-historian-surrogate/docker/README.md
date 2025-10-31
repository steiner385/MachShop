# GE Proficy Historian Surrogate - Docker Setup

This directory contains Docker configuration and management tools for the GE Proficy Historian Surrogate testing infrastructure.

## Quick Start

1. **Setup environment**:
   ```bash
   cd src/tests/infrastructure/proficy-historian-surrogate/docker
   cp .env.example .env
   # Edit .env file as needed
   ```

2. **Build and start the surrogate**:
   ```bash
   ./manage.sh build
   ./manage.sh start
   ```

3. **Verify the service is running**:
   ```bash
   ./manage.sh health
   ```

4. **Access the surrogate**:
   - API Base URL: `http://localhost:8080/historian`
   - Health Check: `http://localhost:8080/historian/health`
   - Default credentials: `historian:password`

## Files Overview

### Core Docker Files

- **`Dockerfile`** - Multi-stage Docker image for the surrogate server
- **`docker-compose.yml`** - Orchestration with optional monitoring and logging services
- **`.env.example`** - Environment configuration template
- **`entrypoint.sh`** - Container startup script with configuration validation
- **`healthcheck.sh`** - Health monitoring script for Docker health checks
- **`manage.sh`** - Convenient management script for Docker operations

### Management Script Usage

The `manage.sh` script provides convenient commands for managing the Docker containers:

```bash
# Build the Docker image
./manage.sh build
./manage.sh build --force  # Force rebuild without cache

# Start services
./manage.sh start                    # Basic surrogate only
./manage.sh start --monitoring       # Include Prometheus + Grafana
./manage.sh start --all             # All optional services
./manage.sh start --foreground      # Run in foreground (not detached)

# Monitor and debug
./manage.sh status                  # Show service status
./manage.sh logs                    # Show logs
./manage.sh logs --follow           # Follow logs in real-time
./manage.sh logs prometheus         # Show logs for specific service
./manage.sh health                  # Run health check
./manage.sh shell                   # Open shell in container
./manage.sh exec "ls -la /app"      # Execute command in container

# Control services
./manage.sh stop                    # Stop all services
./manage.sh restart                 # Restart basic services
./manage.sh restart --monitoring    # Restart with monitoring

# Testing and cleanup
./manage.sh test                    # Run load tests
./manage.sh cleanup                 # Stop and remove containers
./manage.sh cleanup --force         # Complete cleanup (images + volumes)
```

## Configuration

### Environment Variables

The surrogate can be configured via environment variables. See `.env.example` for all available options:

#### Server Configuration
- `SURROGATE_PORT` - Server port (default: 8080)
- `SURROGATE_HOST` - Server host (default: 0.0.0.0)
- `SURROGATE_LOG_LEVEL` - Log level: debug, info, warn, error (default: info)

#### Authentication
- `SURROGATE_AUTH_ENABLED` - Enable/disable authentication (default: true)
- `SURROGATE_AUTH_USERNAME` - Username (default: historian)
- `SURROGATE_AUTH_PASSWORD` - Password (default: password)

#### Storage
- `SURROGATE_MAX_DATA_POINTS` - Maximum data points to store (default: 1000000)
- `SURROGATE_RETENTION_HOURS` - Data retention period (default: 24)
- `SURROGATE_COMPRESSION_ENABLED` - Enable data compression (default: true)

#### Features
- `SURROGATE_ERROR_SIMULATION` - Enable error simulation (default: false)
- `SURROGATE_RATE_LIMIT_ENABLED` - Enable rate limiting (default: false)
- `SURROGATE_CORS_ENABLED` - Enable CORS (default: true)

#### Data Loading
- `SURROGATE_SCENARIO` - Initial scenario to load (optional)
- `SURROGATE_LOAD_MINIMAL_DATA` - Load minimal test data on startup (default: true)

### Docker Compose Profiles

The `docker-compose.yml` includes several profiles for different deployment scenarios:

- **Default** - Just the surrogate server
- **monitoring** - Adds Prometheus and Grafana for monitoring
- **testing** - Adds load testing tools
- **logging** - Adds ELK stack for log aggregation

#### Examples

```bash
# Basic surrogate only
docker-compose up

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up

# With multiple profiles
docker-compose --profile monitoring --profile testing up

# All services
docker-compose --profile monitoring --profile testing --profile logging up
```

## Service Endpoints

### Surrogate Server (Port 8080)

#### Health and Status
- `GET /historian/health` - Health check endpoint
- `GET /historian/server/info` - Server information
- `GET /historian/server/status` - Detailed server status

#### Data Operations
- `POST /historian/data/write` - Write time-series data
- `GET /historian/data/query` - Query time-series data
- `GET /historian/data/recent` - Get recent data points

#### Tag Management
- `GET /historian/tags` - List all tags
- `POST /historian/tags` - Create new tag
- `GET /historian/tags/:tagName` - Get specific tag
- `PUT /historian/tags/:tagName` - Update tag
- `DELETE /historian/tags/:tagName` - Delete tag

#### Test Scenarios
- `GET /historian/scenarios` - List available test scenarios
- `POST /historian/scenarios/:name/load` - Load test scenario
- `POST /historian/scenarios/reset` - Reset all data

### Optional Services

#### Prometheus (Port 9090) - When monitoring profile is active
- `http://localhost:9090` - Prometheus web interface
- Monitors surrogate server metrics

#### Grafana (Port 3000) - When monitoring profile is active
- `http://localhost:3000` - Grafana dashboards
- Default login: admin/admin
- Pre-configured dashboards for historian metrics

#### Kibana (Port 5601) - When logging profile is active
- `http://localhost:5601` - Kibana log analysis
- Aggregates logs from all services

## Development and Testing

### Building for Development

```bash
# Build with verbose output
docker build -f Dockerfile -t proficy-historian-surrogate:dev ../../../../

# Build with custom build args
docker build --build-arg NODE_ENV=development -f Dockerfile ../../../../
```

### Running Tests

```bash
# Run load tests against the surrogate
./manage.sh test

# Run with custom load test configuration
LOAD_TEST_DURATION=300s LOAD_TEST_RATE=50 ./manage.sh test
```

### Custom Scenarios

You can mount custom test scenarios by setting the `CUSTOM_SCENARIOS_PATH` environment variable:

```bash
# Create custom scenarios directory
mkdir -p ./custom-scenarios

# Set path in .env file
echo "CUSTOM_SCENARIOS_PATH=./custom-scenarios" >> .env

# Start with custom scenarios mounted
./manage.sh start
```

### Development with Hot Reload

For development with hot reload, you can mount the source code:

```bash
# Add volume mount for source code (modify docker-compose.yml)
volumes:
  - ../../../../src:/app/src:ro

# Run in development mode
NODE_ENV=development ./manage.sh start --foreground
```

## Production Deployment

### Security Considerations

1. **Change default credentials**:
   ```bash
   # In .env file
   SURROGATE_AUTH_PASSWORD=your_secure_password
   ```

2. **Use specific image tags**:
   ```bash
   # Tag and push to registry
   docker tag machshop/proficy-historian-surrogate:latest your-registry/proficy-historian-surrogate:v1.0.0
   docker push your-registry/proficy-historian-surrogate:v1.0.0
   ```

3. **Configure resource limits**:
   ```yaml
   # In docker-compose.yml
   services:
     proficy-historian-surrogate:
       deploy:
         resources:
           limits:
             memory: 1G
             cpus: '0.5'
   ```

### Performance Tuning

```bash
# Production settings in .env
SURROGATE_MAX_DATA_POINTS=10000000
SURROGATE_RETENTION_HOURS=168  # 7 days
SURROGATE_LOG_LEVEL=warn
NODE_ENV=production
```

### Monitoring in Production

Enable the monitoring profile for production deployments:

```bash
./manage.sh start --monitoring
```

This provides:
- Prometheus metrics collection
- Grafana dashboards
- Automated alerting capabilities
- Performance monitoring

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Change port in .env file
   SURROGATE_PORT=8081
   ./manage.sh restart
   ```

2. **Container fails to start**:
   ```bash
   # Check logs
   ./manage.sh logs

   # Check container status
   docker ps -a
   ```

3. **Health check failures**:
   ```bash
   # Run detailed health check
   ./manage.sh health

   # Check service endpoints manually
   curl http://localhost:8080/historian/health
   ```

4. **Memory issues**:
   ```bash
   # Check resource usage
   docker stats

   # Reduce data limits
   SURROGATE_MAX_DATA_POINTS=100000 ./manage.sh restart
   ```

### Debugging

```bash
# Enter container for debugging
./manage.sh shell

# Execute commands in container
./manage.sh exec "ps aux"
./manage.sh exec "netstat -tlnp"

# Check container logs
docker logs proficy-historian-surrogate

# Monitor resource usage
docker stats --no-stream proficy-historian-surrogate
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Historian Surrogate
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start Historian Surrogate
        run: |
          cd src/tests/infrastructure/proficy-historian-surrogate/docker
          ./manage.sh build
          ./manage.sh start
      - name: Wait for service
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8080/historian/health; do sleep 2; done'
      - name: Run tests
        run: |
          # Your integration tests here
          curl -u historian:password http://localhost:8080/historian/server/info
```

## Support

For issues and questions:
- Check the logs: `./manage.sh logs`
- Run health check: `./manage.sh health`
- Review configuration: `cat .env`
- Check service status: `./manage.sh status`