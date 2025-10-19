export interface IntegrationConfig {
  id: string;
  systemName: string;
  systemType: 'ORACLE_EBS' | 'ORACLE_FUSION' | 'TEAMCENTER';
  endpoint: string;
  isActive: boolean;
}

export interface SyncJob {
  id: string;
  configId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
}

export interface SyncRequest {
  configId: string;
  dataType: string;
  direction: 'IMPORT' | 'EXPORT';
}
