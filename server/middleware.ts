import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// In production, JWT_SECRET must be set. In development, generate a random one.
let JWT_SECRET: string;

if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (process.env.NODE_ENV === 'production') {
  throw new Error("JWT_SECRET environment variable is required in production");
} else {
  // Development mode: generate a random secret (will change on restart)
  JWT_SECRET = `dev-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  console.warn("⚠️  Using generated JWT_SECRET in development. Tokens will be invalid after restart.");
}

export interface AuthRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No token provided" } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    storage.getUserById(decoded.userId).then((user) => {
      if (!user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Invalid token" } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: { 
          code: "FORBIDDEN", 
          message: `Requires one of: ${roles.join(", ")}` 
        } 
      });
    }

    next();
  };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.errors,
      },
    });
  }

  if (err.code === "23505") { // PostgreSQL unique violation
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "Resource already exists",
      },
    });
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
}
