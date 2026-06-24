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
    console.log("Connected successfully. Adding catalogPdfData column to Client table if not exists...");
    await client.query(`
      ALTER TABLE "Client" 
      ADD COLUMN IF NOT EXISTS "catalogPdfData" TEXT;
    `);
    console.log("Column verification or addition complete!");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

main();
