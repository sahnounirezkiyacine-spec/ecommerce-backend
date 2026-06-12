import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/helpers.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as typeof req.body;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        sendError(res, "Données invalides", StatusCodes.UNPROCESSABLE_ENTITY, errors);
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        sendError(res, "Paramètres invalides", StatusCodes.BAD_REQUEST, errors);
        return;
      }
      next(error);
    }
  };
}