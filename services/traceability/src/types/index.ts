export interface SerializedPart {
  id: string;
  serialNumber: string;
  partId: string;
  lotNumber?: string;
  workOrderId?: string;
  createdAt: Date;
}

export interface GenealogyRecord {
  id: string;
  childSerialNumber: string;
  parentSerialNumber: string;
  assemblyDate: Date;
  workOrderId?: string;
}

export interface CreateSerialRequest {
  partId: string;
  lotNumber?: string;
  workOrderId?: string;
  quantity: number;
}

export interface TraceabilityQuery {
  serialNumber: string;
  direction: 'forward' | 'backward' | 'both';
}
