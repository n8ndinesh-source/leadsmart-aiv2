import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL env variable not found!");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL...");
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected successfully. Adding product tables if they do not exist...");

    // Create product_fields table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "product_fields" (
        "id" TEXT PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "fieldName" TEXT NOT NULL,
        "fieldType" TEXT NOT NULL,
        "required" BOOLEAN NOT NULL DEFAULT FALSE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
      );
    `);

    // Create product_records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "product_records" (
        "id" TEXT PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "businessType" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
      );
    `);

    // Create product_record_values table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "product_record_values" (
        "id" TEXT PRIMARY KEY,
        "productRecordId" TEXT NOT NULL,
        "productFieldId" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("productRecordId") REFERENCES "product_records"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productFieldId") REFERENCES "product_fields"("id") ON DELETE CASCADE,
        CONSTRAINT "product_record_values_unique" UNIQUE ("productRecordId", "productFieldId")
      );
    `);

    console.log("Product tables verification and creation complete!");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();
