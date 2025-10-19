export interface Equipment {
  id: string;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  status: string;
}

export interface Personnel {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface WorkCenter {
  id: string;
  workCenterCode: string;
  workCenterName: string;
  capacity: number;
}
