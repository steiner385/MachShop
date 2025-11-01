/**
 * PLM System Integration
 * Issue #220 Phase 3: PLM connector exports and utilities
 */

export { PLMConnectorBase, type PLMCredentials, type PLMItem, type PLMFile, type PLMRelationship, type PLMSyncResult } from './PLMConnectorBase';
export { TeamcenterConnector } from './TeamcenterConnector';
export { WindchillConnector } from './WindchillConnector';
export { ENOVIAConnector } from './ENOVIAConnector';
export { ArasConnector } from './ArasConnector';
export { PLMConnectorManager, plmConnectorManager, type PLMConnectionConfig } from './PLMConnectorManager';

// Convenience export for batch operations
export const PLM_SYSTEMS = ['Teamcenter', 'Windchill', 'ENOVIA', 'Aras'] as const;
export type PLMSystemName = typeof PLM_SYSTEMS[number];
