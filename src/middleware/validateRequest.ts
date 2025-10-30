/**
 * Request Validation Middleware
 * Validates incoming HTTP requests against Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  received?: any;
}

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateRequest(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);

      // Replace request body with validated data
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Handle other types of errors
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  };
}

/**
 * Middleware to validate query parameters against a Zod schema
 */
export function validateQuery(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received
        }));

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: validationErrors
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  };
}

/**
 * Middleware to validate URL parameters against a Zod schema
 */
export function validateParams(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received
        }));

        return res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: validationErrors
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid URL parameters',
        details: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  };
}

/**
 * Combined validation middleware for body, query, and params
 */
export function validateAll(schemas: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    // Validate body if schema provided
    if (schemas.body) {
      try {
        req.body = schemas.body.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.issues.map(issue => ({
            field: `body.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
            received: issue.received
          })));
        }
      }
    }

    // Validate query if schema provided
    if (schemas.query) {
      try {
        req.query = schemas.query.parse(req.query);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.issues.map(issue => ({
            field: `query.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
            received: issue.received
          })));
        }
      }
    }

    // Validate params if schema provided
    if (schemas.params) {
      try {
        req.params = schemas.params.parse(req.params);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.issues.map(issue => ({
            field: `params.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code,
            received: issue.received
          })));
        }
      }
    }

    // Return errors if any validation failed
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

export default validateRequest;