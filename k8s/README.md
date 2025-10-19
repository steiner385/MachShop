# Kubernetes Deployment Manifests
## Phase 2, Task 2.2: Production Deployment Configuration

This directory contains Kubernetes manifests for deploying the MES microservices architecture to production.

## Directory Structure

```
k8s/
├── infrastructure/      # Core infrastructure components
│   ├── namespace.yaml
│   ├── kong-gateway.yaml
│   ├── kafka.yaml
│   ├── zookeeper.yaml
│   ├── jaeger.yaml
│   ├── elasticsearch.yaml
│   ├── logstash.yaml
│   ├── kibana.yaml
│   ├── prometheus.yaml
│   ├── grafana.yaml
│   └── redis.yaml
│
├── microservices/       # MES microservices
│   ├── auth-service.yaml
│   ├── work-order-service.yaml
│   ├── quality-service.yaml
│   ├── material-service.yaml
│   ├── traceability-service.yaml
│   ├── resource-service.yaml
│   ├── reporting-service.yaml
│   └── integration-service.yaml
│
└── config/             # ConfigMaps and Secrets
    ├── configmaps.yaml
    ├── secrets.yaml
    └── ingress.yaml
```

## Prerequisites

1. **Kubernetes Cluster** (v1.24+)
   - Minikube for local development
   - EKS, GKE, or AKS for production

2. **kubectl** CLI installed and configured

3. **Helm** (optional, for easier package management)

4. **Container Registry**
   - Docker Hub, ECR, GCR, or ACR
   - All microservice images must be built and pushed

## Deployment Steps

### Step 1: Create Namespace

```bash
kubectl apply -f infrastructure/namespace.yaml
```

### Step 2: Create Secrets and ConfigMaps

```bash
# Create secrets for database passwords, JWT keys, etc.
kubectl apply -f config/secrets.yaml

# Create ConfigMaps for application configuration
kubectl apply -f config/configmaps.yaml
```

### Step 3: Deploy Infrastructure Components

```bash
# Deploy in order (respecting dependencies)
kubectl apply -f infrastructure/zookeeper.yaml
kubectl apply -f infrastructure/kafka.yaml
kubectl apply -f infrastructure/redis.yaml
kubectl apply -f infrastructure/elasticsearch.yaml
kubectl apply -f infrastructure/logstash.yaml
kubectl apply -f infrastructure/kibana.yaml
kubectl apply -f infrastructure/prometheus.yaml
kubectl apply -f infrastructure/grafana.yaml
kubectl apply -f infrastructure/jaeger.yaml
kubectl apply -f infrastructure/kong-gateway.yaml
```

### Step 4: Deploy Microservices

```bash
# Deploy all microservices
kubectl apply -f microservices/auth-service.yaml
kubectl apply -f microservices/work-order-service.yaml
kubectl apply -f microservices/quality-service.yaml
kubectl apply -f microservices/material-service.yaml
kubectl apply -f microservices/traceability-service.yaml
kubectl apply -f microservices/resource-service.yaml
kubectl apply -f microservices/reporting-service.yaml
kubectl apply -f microservices/integration-service.yaml
```

### Step 5: Configure Ingress

```bash
kubectl apply -f config/ingress.yaml
```

## Sample Manifests

### Namespace Definition

```yaml
# infrastructure/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mes-production
  labels:
    name: mes-production
    environment: production
```

### Example Microservice Deployment

```yaml
# microservices/work-order-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: work-order-service
  namespace: mes-production
  labels:
    app: work-order-service
    tier: backend
spec:
  type: ClusterIP
  ports:
    - port: 3001
      targetPort: 3001
      protocol: TCP
      name: http
  selector:
    app: work-order-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: work-order-service
  namespace: mes-production
  labels:
    app: work-order-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: work-order-service
  template:
    metadata:
      labels:
        app: work-order-service
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: work-order-service
          image: your-registry/mes-work-order-service:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3001
              name: http
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3001"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: mes-secrets
                  key: work-order-db-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: mes-secrets
                  key: jwt-secret
            - name: KAFKA_BROKERS
              value: "kafka:9092"
            - name: JAEGER_AGENT_HOST
              value: "jaeger"
            - name: JAEGER_AGENT_PORT
              value: "6831"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: work-order-service-hpa
  namespace: mes-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: work-order-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Kong Gateway Deployment

```yaml
# infrastructure/kong-gateway.yaml
apiVersion: v1
kind: Service
metadata:
  name: kong
  namespace: mes-production
spec:
  type: LoadBalancer
  ports:
    - name: proxy
      port: 80
      targetPort: 8000
      protocol: TCP
    - name: proxy-ssl
      port: 443
      targetPort: 8443
      protocol: TCP
    - name: admin
      port: 8001
      targetPort: 8001
      protocol: TCP
  selector:
    app: kong
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong
  namespace: mes-production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kong
  template:
    metadata:
      labels:
        app: kong
    spec:
      containers:
        - name: kong
          image: kong:3.4-alpine
          env:
            - name: KONG_DATABASE
              value: "postgres"
            - name: KONG_PG_HOST
              value: "kong-postgres"
            - name: KONG_PG_DATABASE
              value: "kong"
            - name: KONG_PG_USER
              valueFrom:
                secretKeyRef:
                  name: mes-secrets
                  key: kong-pg-user
            - name: KONG_PG_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mes-secrets
                  key: kong-pg-password
            - name: KONG_PROXY_ACCESS_LOG
              value: "/dev/stdout"
            - name: KONG_ADMIN_ACCESS_LOG
              value: "/dev/stdout"
            - name: KONG_PROXY_ERROR_LOG
              value: "/dev/stderr"
            - name: KONG_ADMIN_ERROR_LOG
              value: "/dev/stderr"
            - name: KONG_ADMIN_LISTEN
              value: "0.0.0.0:8001"
          ports:
            - name: proxy
              containerPort: 8000
              protocol: TCP
            - name: proxy-ssl
              containerPort: 8443
              protocol: TCP
            - name: admin
              containerPort: 8001
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /status
              port: 8001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /status
              port: 8001
            initialDelaySeconds: 10
            periodSeconds: 5
```

### Kafka Deployment (StatefulSet)

```yaml
# infrastructure/kafka.yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: mes-production
spec:
  ports:
    - port: 9092
      name: kafka
  clusterIP: None
  selector:
    app: kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: mes-production
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
          ports:
            - containerPort: 9092
              name: kafka
          env:
            - name: KAFKA_BROKER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: KAFKA_ZOOKEEPER_CONNECT
              value: "zookeeper:2181"
            - name: KAFKA_ADVERTISED_LISTENERS
              value: "PLAINTEXT://$(POD_NAME).kafka:9092"
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "PLAINTEXT:PLAINTEXT"
            - name: KAFKA_INTER_BROKER_LISTENER_NAME
              value: "PLAINTEXT"
            - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
              value: "3"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          volumeMounts:
            - name: kafka-data
              mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
    - metadata:
        name: kafka-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

## Monitoring and Observability

### Access Dashboards

```bash
# Port forward to access services locally
kubectl port-forward -n mes-production svc/grafana 3000:3000
kubectl port-forward -n mes-production svc/kibana 5601:5601
kubectl port-forward -n mes-production svc/jaeger 16686:16686
kubectl port-forward -n mes-production svc/kafka-ui 8080:8080
```

Then access:
- Grafana: http://localhost:3000
- Kibana: http://localhost:5601
- Jaeger: http://localhost:16686
- Kafka UI: http://localhost:8080

## Scaling

### Manual Scaling

```bash
kubectl scale deployment work-order-service --replicas=5 -n mes-production
```

### Auto-scaling

HPA (Horizontal Pod Autoscaler) is configured for all microservices based on CPU and memory utilization.

## Rolling Updates

```bash
# Update image for a service
kubectl set image deployment/work-order-service work-order-service=your-registry/mes-work-order-service:v2.0.0 -n mes-production

# Monitor rollout status
kubectl rollout status deployment/work-order-service -n mes-production

# Rollback if needed
kubectl rollout undo deployment/work-order-service -n mes-production
```

## Troubleshooting

```bash
# View logs
kubectl logs -f deployment/work-order-service -n mes-production

# Describe pod for events
kubectl describe pod <pod-name> -n mes-production

# Execute commands in pod
kubectl exec -it <pod-name> -n mes-production -- /bin/sh

# View all resources
kubectl get all -n mes-production
```

## Cleanup

```bash
# Delete all microservices
kubectl delete -f microservices/ -n mes-production

# Delete infrastructure
kubectl delete -f infrastructure/ -n mes-production

# Delete namespace (this will delete everything)
kubectl delete namespace mes-production
```

## Production Considerations

1. **Secrets Management**
   - Use external secrets managers (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never commit secrets to Git

2. **Resource Limits**
   - Always set resource requests and limits
   - Monitor actual usage and adjust accordingly

3. **High Availability**
   - Deploy at least 3 replicas for critical services
   - Use Pod Disruption Budgets
   - Distribute across multiple availability zones

4. **Persistence**
   - Use StatefulSets for stateful workloads (Kafka, databases)
   - Configure proper PersistentVolumeClaims with appropriate storage classes

5. **Networking**
   - Use Network Policies to restrict traffic between services
   - Configure proper Ingress rules with TLS termination

6. **Monitoring**
   - Set up alerting in Prometheus/Grafana
   - Configure log aggregation in ELK
   - Enable distributed tracing with Jaeger

7. **Backup and Disaster Recovery**
   - Implement regular backups of stateful data
   - Test disaster recovery procedures
   - Document runbooks for common scenarios

## Next Steps

After infrastructure is deployed, proceed with:
1. Task 2.3: Database Per Service Pattern
2. Task 2.4: Service Implementation
3. Task 2.5: Frontend BFF Pattern
