import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function showConfigs() {
  try {
    const configs = await prisma.aIConfiguration.findMany();
    console.log(`Found ${configs.length} AI configurations in database.`);
    for (const c of configs) {
      console.log("-----------------------------------------");
      console.log("clientId:", c.clientId);
      console.log("businessProfile:", c.businessProfile);
      console.log("productIntelligence:", c.productIntelligence);
      console.log("salesBehavior:", c.salesBehavior);
      console.log("customerRules:", c.customerRules);
      console.log("followUpRules:", c.followUpRules);
      console.log("responseControl:", c.responseControl);
      console.log("businessGoals:", c.businessGoals);
    }
  } catch (err: any) {
    console.error("Failed to query configs:", err);
  } finally {
    await prisma.$disconnect();
  }
}

showConfigs();
