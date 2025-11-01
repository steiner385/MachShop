/**
 * Test Data Generation
 * Creates realistic personnel, training, and certification data
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '@/services/database.service';
import {
  PersonnelRecord,
  Skill,
  SkillMatrix,
  TrainingProgram,
  Certification,
  CertificationType,
  EmploymentStatus,
  SkillLevel,
  CertificationStatus,
  CourseDeliveryMethod,
  SkillRequirement
} from '@/models/types';

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'William', 'Linda',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson'
];

const DEPARTMENTS = ['Manufacturing', 'Quality', 'Engineering', 'Maintenance', 'Supervisory'];
const SHIFTS = ['Day', 'Evening', 'Night', 'Rotating'];
const JOB_TITLES = ['Operator', 'Technician', 'Inspector', 'Supervisor', 'Engineer'];

export function initializeTestData() {
  // Create skills
  const skills = createSkills();
  skills.forEach(skill => databaseService.addSkill(skill));

  // Create certification types
  const certTypes = createCertificationTypes();
  certTypes.forEach(ct => databaseService.addCertificationType(ct));

  // Create training programs
  const programs = createTrainingPrograms();
  programs.forEach(p => databaseService.addTrainingProgram(p));

  // Create personnel (100+ employees)
  const personnel = createPersonnel(120);
  personnel.forEach(p => databaseService.addPersonnel(p));

  // Create certifications for personnel
  const certifications = createCertifications(personnel, certTypes);
  certifications.forEach(c => databaseService.addCertification(c));

  // Create skill matrices
  const matrices = createSkillMatrices(skills);
  matrices.forEach(m => databaseService.addSkillMatrix(m));
}

function createSkills(): Skill[] {
  const skillsData = [
    { name: 'Blueprint Reading', category: 'Technical' },
    { name: 'Torque Application', category: 'Technical' },
    { name: 'CNC Programming', category: 'Technical' },
    { name: 'Welding', category: 'Technical' },
    { name: 'Inspection', category: 'Quality' },
    { name: 'SPC Measurement', category: 'Quality' },
    { name: 'Safety Procedures', category: 'Safety' },
    { name: 'Equipment Maintenance', category: 'Maintenance' },
    { name: 'Troubleshooting', category: 'Technical' },
    { name: 'Process Documentation', category: 'Administrative' }
  ];

  return skillsData.map(skill => ({
    id: uuidv4(),
    name: skill.name,
    category: skill.category,
    description: `Competency in ${skill.name}`,
    requiredLevel: SkillLevel.INTERMEDIATE,
    certificationRequired: skill.category === 'Technical',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function createCertificationTypes(): CertificationType[] {
  return [
    {
      id: uuidv4(),
      name: 'Basic Welding Certification (AWS D17.1)',
      standard: 'AWS D17.1',
      description: 'Certification for basic welding operations',
      validityPeriodMonths: 36,
      requiredTrainingCourses: [],
      assessmentRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'AS9100 Quality System',
      standard: 'AS9100',
      description: 'Aerospace quality management certification',
      validityPeriodMonths: 24,
      requiredTrainingCourses: [],
      assessmentRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'CNC Programming Certification',
      standard: 'ISO 14649',
      description: 'Certification for CNC programming competency',
      validityPeriodMonths: 48,
      requiredTrainingCourses: [],
      assessmentRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Safety Training Certification',
      standard: 'OSHA 1910',
      description: 'General safety and OSHA compliance',
      validityPeriodMonths: 12,
      requiredTrainingCourses: [],
      assessmentRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function createTrainingPrograms(): TrainingProgram[] {
  return [
    {
      id: uuidv4(),
      courseCode: 'WLD-101',
      courseName: 'Basic Welding Techniques',
      description: 'Introduction to welding safety and techniques',
      category: 'Technical',
      deliveryMethod: CourseDeliveryMethod.IN_PERSON,
      duration: 40,
      instructorId: uuidv4(),
      instructorName: 'John Smith',
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      courseCode: 'CNC-201',
      courseName: 'Advanced CNC Programming',
      description: 'Advanced CNC programming and setup',
      category: 'Technical',
      deliveryMethod: CourseDeliveryMethod.HYBRID,
      duration: 60,
      instructorId: uuidv4(),
      instructorName: 'Jane Doe',
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      courseCode: 'AS9-100',
      courseName: 'AS9100 Quality Standards',
      description: 'Aerospace quality management systems',
      category: 'Quality',
      deliveryMethod: CourseDeliveryMethod.ONLINE,
      duration: 20,
      instructorId: uuidv4(),
      instructorName: 'Mike Johnson',
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function createPersonnel(count: number): PersonnelRecord[] {
  const personnel: PersonnelRecord[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

    personnel.push({
      id: uuidv4(),
      employeeId: `EMP-${String(1000 + i).padStart(4, '0')}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@machshop.com`,
      jobTitle: JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)],
      department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
      shift: SHIFTS[Math.floor(Math.random() * SHIFTS.length)],
      reportingManager: 'Manager Name',
      employmentStatus: i % 10 === 0 ? EmploymentStatus.INACTIVE : EmploymentStatus.ACTIVE,
      hireDate: new Date(Date.now() - Math.random() * 315360000000).toISOString(), // Random date in past 10 years
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return personnel;
}

function createCertifications(personnel: PersonnelRecord[], certTypes: CertificationType[]): Certification[] {
  const certifications: Certification[] = [];
  const statusDistribution = [
    { status: CertificationStatus.CURRENT, probability: 0.6 },
    { status: CertificationStatus.EXPIRING_SOON, probability: 0.2 },
    { status: CertificationStatus.EXPIRED, probability: 0.15 },
    { status: CertificationStatus.SUSPENDED, probability: 0.05 }
  ];

  // Create 2-3 certifications per active employee
  personnel.forEach(person => {
    if (person.employmentStatus === EmploymentStatus.ACTIVE) {
      const numCerts = Math.floor(Math.random() * 2) + 2; // 2-3 certs

      for (let i = 0; i < numCerts; i++) {
        const certType = certTypes[Math.floor(Math.random() * certTypes.length)];
        const rand = Math.random();
        let status = CertificationStatus.CURRENT;

        // Determine status based on distribution
        let cumulative = 0;
        for (const dist of statusDistribution) {
          cumulative += dist.probability;
          if (rand < cumulative) {
            status = dist.status;
            break;
          }
        }

        const now = new Date();
        let expirationDate = new Date();

        if (status === CertificationStatus.CURRENT) {
          expirationDate.setFullYear(expirationDate.getFullYear() + 2); // 2 years out
        } else if (status === CertificationStatus.EXPIRING_SOON) {
          expirationDate.setDate(expirationDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days
        } else if (status === CertificationStatus.EXPIRED) {
          expirationDate.setDate(expirationDate.getDate() - Math.floor(Math.random() * 365) - 1); // 1+ days ago
        }

        certifications.push({
          id: uuidv4(),
          personnelId: person.id,
          certificationTypeId: certType.id,
          certificationName: certType.name,
          certificateNumber: `${certType.standard || 'CERT'}-${Date.now()}-${i}`,
          issuanceDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
          expirationDate: expirationDate.toISOString(),
          status,
          issuer: 'Covalent Training Center',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  });

  return certifications;
}

function createSkillMatrices(skills: Skill[]): SkillMatrix[] {
  const operations = [
    { id: 'OP-WELD-001', name: 'Turbine Assembly' },
    { id: 'OP-CNC-001', name: 'CNC Machining' },
    { id: 'OP-INSP-001', name: 'Final Inspection' }
  ];

  return operations.map(op => ({
    id: uuidv4(),
    operationId: op.id,
    operationName: op.name,
    requiredSkills: skills.slice(0, 3).map(s => ({
      skillId: s.id,
      skillName: s.name,
      requiredLevel: SkillLevel.INTERMEDIATE,
      isCritical: true
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}
