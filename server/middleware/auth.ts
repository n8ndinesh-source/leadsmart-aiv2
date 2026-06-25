import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "leadsmart-super-secret-key";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    if (!dbUser) {
      return res.status(401).json({ error: "User session expired or database reset" });
    }
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    };
    next();
  } catch (err: any) {
    console.error("Database error during token authentication inspection:", err);
    return res.status(500).json({ error: "Internal Server Error: Database inquiry failed" });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}
