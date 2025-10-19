{{/*
Expand the name of the chart.
*/}}
{{- define "mes.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "mes.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "mes.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mes.labels" -}}
helm.sh/chart: {{ include "mes.chart" . }}
{{ include "mes.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mes.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mes.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "mes.serviceAccountName" -}}
{{- if .Values.rbac.serviceAccount.create }}
{{- default (include "mes.fullname" .) .Values.rbac.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.rbac.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create a service-specific name
*/}}
{{- define "mes.serviceName" -}}
{{- $serviceName := . -}}
{{- printf "%s-service" $serviceName | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a database-specific name
*/}}
{{- define "mes.databaseName" -}}
{{- $dbName := . -}}
{{- printf "postgres-%s" $dbName | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create registry URL with image name
*/}}
{{- define "mes.image" -}}
{{- $registry := .Values.global.registry -}}
{{- $image := .image -}}
{{- $tag := .tag | default "latest" -}}
{{- printf "%s/%s:%s" $registry $image $tag }}
{{- end }}

{{/*
Get the namespace
*/}}
{{- define "mes.namespace" -}}
{{- .Values.global.namespace | default "mes-production" }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "mes.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Common environment variables for all services
*/}}
{{- define "mes.commonEnv" -}}
- name: NODE_ENV
  valueFrom:
    configMapKeyRef:
      name: mes-config
      key: NODE_ENV
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: mes-config
      key: LOG_LEVEL
- name: KAFKA_BROKERS
  value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
- name: KAFKA_TOPIC
  valueFrom:
    configMapKeyRef:
      name: mes-config
      key: KAFKA_TOPIC
- name: REDIS_HOST
  value: "redis"
- name: REDIS_PORT
  value: "6379"
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.jwt.secretName }}
      key: {{ .Values.secrets.jwt.key }}
{{- end }}

{{/*
Resource limits and requests
*/}}
{{- define "mes.resources" -}}
resources:
  requests:
    memory: {{ .requests.memory | quote }}
    cpu: {{ .requests.cpu | quote }}
  limits:
    memory: {{ .limits.memory | quote }}
    cpu: {{ .limits.cpu | quote }}
{{- end }}

{{/*
Liveness probe configuration
*/}}
{{- define "mes.livenessProbe" -}}
livenessProbe:
  httpGet:
    path: {{ .path | default "/health" }}
    port: {{ .port | default 3000 }}
  initialDelaySeconds: {{ .initialDelaySeconds | default 30 }}
  periodSeconds: {{ .periodSeconds | default 10 }}
  timeoutSeconds: {{ .timeoutSeconds | default 5 }}
  failureThreshold: {{ .failureThreshold | default 3 }}
{{- end }}

{{/*
Readiness probe configuration
*/}}
{{- define "mes.readinessProbe" -}}
readinessProbe:
  httpGet:
    path: {{ .path | default "/health" }}
    port: {{ .port | default 3000 }}
  initialDelaySeconds: {{ .initialDelaySeconds | default 10 }}
  periodSeconds: {{ .periodSeconds | default 5 }}
  timeoutSeconds: {{ .timeoutSeconds | default 3 }}
  failureThreshold: {{ .failureThreshold | default 3 }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "mes.podSecurityContext" -}}
securityContext:
  runAsNonRoot: {{ .Values.podSecurityContext.runAsNonRoot }}
  runAsUser: {{ .Values.podSecurityContext.runAsUser }}
  fsGroup: {{ .Values.podSecurityContext.fsGroup }}
{{- end }}

{{/*
Container security context
*/}}
{{- define "mes.securityContext" -}}
securityContext:
  allowPrivilegeEscalation: {{ .Values.securityContext.allowPrivilegeEscalation }}
  capabilities:
    drop:
    {{- range .Values.securityContext.capabilities.drop }}
    - {{ . }}
    {{- end }}
  readOnlyRootFilesystem: {{ .Values.securityContext.readOnlyRootFilesystem }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "mes.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Affinity configuration
*/}}
{{- define "mes.affinity" -}}
{{- if .Values.affinity }}
affinity:
{{ toYaml .Values.affinity | indent 2 }}
{{- end }}
{{- end }}

{{/*
Node selector
*/}}
{{- define "mes.nodeSelector" -}}
{{- if .Values.nodeSelector }}
nodeSelector:
{{ toYaml .Values.nodeSelector | indent 2 }}
{{- end }}
{{- end }}

{{/*
Tolerations
*/}}
{{- define "mes.tolerations" -}}
{{- if .Values.tolerations }}
tolerations:
{{ toYaml .Values.tolerations | indent 2 }}
{{- end }}
{{- end }}

{{/*
Generate certificates for TLS
*/}}
{{- define "mes.gen-certs" -}}
{{- $ca := genCA "mes-ca" 365 -}}
{{- $cert := genSignedCert .Values.ingress.hosts (list) (list) 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
{{- end }}
