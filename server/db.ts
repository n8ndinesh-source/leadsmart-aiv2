import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

let dbUrl = "file:./dev.db";

if (process.env.VERCEL || process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
  try {
    const tmpDbPath = '/tmp/dev.db';
    // When Vercel bundles, it puts everything in the function root.
    // includeFiles puts prisma/dev.db inside the function directory at /prisma/dev.db
    const prismaDb = path.join(process.cwd(), "prisma", "dev.db");
    const rootDb = path.join(process.cwd(), "dev.db");
    
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(prismaDb)) {
        fs.copyFileSync(prismaDb, tmpDbPath);
        console.log("Database successfully provisioned from prisma/dev.db to /tmp/dev.db");
      } else if (fs.existsSync(rootDb)) {
        fs.copyFileSync(rootDb, tmpDbPath);
        console.log("Database successfully provisioned from root to /tmp/dev.db");
      } else {
        console.warn("CRITICAL: dev.db not found in deployment paths! Looked at:", prismaDb, rootDb);
      }
    }
  } catch (error) {
    console.error("Failed to initialize production sqlite database in /tmp/", error);
  }
  
  dbUrl = "file:/tmp/dev.db";
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});


