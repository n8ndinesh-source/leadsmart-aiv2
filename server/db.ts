import { PrismaClient } from "@prisma/client";

let databaseUrl = process.env.DATABASE_URL || "";

if (databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))) {
  if (!databaseUrl.includes("pgbouncer=true")) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});
