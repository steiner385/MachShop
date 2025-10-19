import express, { Request, Response, NextFunction } from 'express';
import PersonnelService from '../services/PersonnelService';
import { CompetencyLevel, CertificationStatus, AvailabilityType } from '@prisma/client';

const router = express.Router();

/**
 * @route GET /api/v1/personnel
 * @desc Get all personnel with optional filtering
 * @access Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      personnelClassId,
      supervisorId,
      department,
      isActive,
      includeRelations,
    } = req.query;

    const personnel = await PersonnelService.getAllPersonnel({
      personnelClassId: personnelClassId as string,
      supervisorId: supervisorId as string,
      department: department as string,
      isActive: isActive === 'true',
      includeRelations: includeRelations === 'true',
    });

    res.json({
      success: true,
      count: personnel.length,
      data: personnel,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/personnel/:id
 * @desc Get personnel by ID with full relations
 * @access Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const personnel = await PersonnelService.getPersonnelById(id);

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: `Personnel with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: personnel,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/personnel/employee-number/:employeeNumber
 * @desc Get personnel by employee number
 * @access Private
 */
router.get(
  '/employee-number/:employeeNumber',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeNumber } = req.params;

      const personnel = await PersonnelService.getPersonnelByEmployeeNumber(employeeNumber);

      if (!personnel) {
        return res.status(404).json({
          success: false,
          message: `Personnel with employee number ${employeeNumber} not found`,
        });
      }

      res.json({
        success: true,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/v1/personnel/:id
 * @desc Update personnel information
 * @access Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const personnel = await PersonnelService.updatePersonnel(id, updateData);

    res.json({
      success: true,
      message: 'Personnel updated successfully',
      data: personnel,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/personnel/:id/supervisor-chain
 * @desc Get supervisor chain for personnel
 * @access Private
 */
router.get(
  '/:id/supervisor-chain',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const supervisors = await PersonnelService.getSupervisorChain(id);

      res.json({
        success: true,
        count: supervisors.length,
        data: supervisors,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/personnel/:id/subordinates
 * @desc Get all subordinates (recursive)
 * @access Private
 */
router.get('/:id/subordinates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subordinates = await PersonnelService.getAllSubordinates(id);

    res.json({
      success: true,
      count: subordinates.length,
      data: subordinates,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== CERTIFICATIONS ====================

/**
 * @route GET /api/v1/personnel/certifications/expiring
 * @desc Get certifications expiring within specified days
 * @access Private
 */
router.get(
  '/certifications/expiring',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days = '30' } = req.query;
      const daysAhead = parseInt(days as string, 10);

      const certifications = await PersonnelService.getExpiringCertifications(daysAhead);

      res.json({
        success: true,
        count: certifications.length,
        data: certifications,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/personnel/certifications/expired
 * @desc Get expired certifications
 * @access Private
 */
router.get(
  '/certifications/expired',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certifications = await PersonnelService.getExpiredCertifications();

      res.json({
        success: true,
        count: certifications.length,
        data: certifications,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/personnel/:id/certifications
 * @desc Create certification for personnel
 * @access Private
 */
router.post(
  '/:id/certifications',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const certificationData = {
        ...req.body,
        personnelId: id,
        issuedDate: new Date(req.body.issuedDate),
        expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : undefined,
      };

      const certification = await PersonnelService.createCertification(certificationData);

      res.status(201).json({
        success: true,
        message: 'Certification created successfully',
        data: certification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/v1/personnel/certifications/:certificationId/status
 * @desc Update certification status (expire, suspend, revoke)
 * @access Private
 */
router.put(
  '/certifications/:certificationId/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { certificationId } = req.params;
      const { status } = req.body;

      if (!Object.values(CertificationStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${Object.values(CertificationStatus).join(', ')}`,
        });
      }

      const certification = await PersonnelService.updateCertificationStatus(
        certificationId,
        status
      );

      res.json({
        success: true,
        message: 'Certification status updated successfully',
        data: certification,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SKILLS ====================

/**
 * @route GET /api/v1/personnel/:id/skills
 * @desc Get skill matrix for personnel
 * @access Private
 */
router.get('/:id/skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const skills = await PersonnelService.getSkillMatrix(id);

    res.json({
      success: true,
      count: skills.length,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/personnel/:id/skills
 * @desc Assign skill to personnel with competency level
 * @access Private
 */
router.post('/:id/skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const skillData = {
      ...req.body,
      personnelId: id,
      assessedAt: req.body.assessedAt ? new Date(req.body.assessedAt) : undefined,
      lastUsedDate: req.body.lastUsedDate ? new Date(req.body.lastUsedDate) : undefined,
      certifiedDate: req.body.certifiedDate ? new Date(req.body.certifiedDate) : undefined,
    };

    if (!Object.values(CompetencyLevel).includes(skillData.competencyLevel)) {
      return res.status(400).json({
        success: false,
        message: `Invalid competency level. Must be one of: ${Object.values(CompetencyLevel).join(', ')}`,
      });
    }

    const skill = await PersonnelService.assignSkill(skillData);

    res.status(201).json({
      success: true,
      message: 'Skill assigned successfully',
      data: skill,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/personnel/by-skill/:skillId
 * @desc Get personnel by skill and minimum competency level
 * @access Private
 */
router.get(
  '/by-skill/:skillId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skillId } = req.params;
      const { minCompetencyLevel } = req.query;

      const personnel = await PersonnelService.getPersonnelBySkill(
        skillId,
        minCompetencyLevel as CompetencyLevel
      );

      res.json({
        success: true,
        count: personnel.length,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== WORK CENTER ASSIGNMENTS ====================

/**
 * @route POST /api/v1/personnel/:id/work-centers
 * @desc Assign personnel to work center
 * @access Private
 */
router.post(
  '/:id/work-centers',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const assignmentData = {
        ...req.body,
        personnelId: id,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        certifiedDate: req.body.certifiedDate ? new Date(req.body.certifiedDate) : undefined,
      };

      const assignment = await PersonnelService.assignToWorkCenter(assignmentData);

      res.status(201).json({
        success: true,
        message: 'Personnel assigned to work center successfully',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/personnel/work-center/:workCenterId
 * @desc Get personnel assigned to work center
 * @access Private
 */
router.get(
  '/work-center/:workCenterId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workCenterId } = req.params;

      const personnel = await PersonnelService.getPersonnelByWorkCenter(workCenterId);

      res.json({
        success: true,
        count: personnel.length,
        data: personnel,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== AVAILABILITY ====================

/**
 * @route POST /api/v1/personnel/:id/availability
 * @desc Create availability record for personnel
 * @access Private
 */
router.post(
  '/:id/availability',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const availabilityData = {
        ...req.body,
        personnelId: id,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
      };

      if (!Object.values(AvailabilityType).includes(availabilityData.availabilityType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid availability type. Must be one of: ${Object.values(AvailabilityType).join(', ')}`,
        });
      }

      const availability = await PersonnelService.createAvailability(availabilityData);

      res.status(201).json({
        success: true,
        message: 'Availability record created successfully',
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/personnel/:id/availability
 * @desc Get availability for personnel within date range
 * @access Private
 */
router.get(
  '/:id/availability',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate query parameters are required',
        });
      }

      const availability = await PersonnelService.getAvailability(
        id,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        count: availability.length,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
