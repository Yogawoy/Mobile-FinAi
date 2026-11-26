import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { sendError } from '../utils/response';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: Array<{ field: string; message: string }> = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          validationErrors.push({
            field: `params.${issue.path.join('.')}`,
            message: issue.message,
          });
        }
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          validationErrors.push({
            field: `query.${issue.path.join('.')}`,
            message: issue.message,
          });
        }
      } else {
        res.locals.validatedQuery = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          validationErrors.push({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          });
        }
      } else {
        req.body = result.data;
      }
    }

    if (validationErrors.length > 0) {
      return sendError(res, 'Data permintaan tidak valid', 422, validationErrors);
    }

    return next();
  };
}
