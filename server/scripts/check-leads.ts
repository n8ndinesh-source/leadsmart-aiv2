import { prisma } from "../db";

async function run() {
  try {
    console.log("=== DIAGNOSING LEAD AND WORKFLOWS ===");
    
    // Find lead named Dinesh or related to Dinesh
    const leads = await prisma.lead.findMany({
      where: {
        name: { contains: "Dinesh" }
      },
      include: {
        client: true,
        messages: {
          orderBy: { timestamp: "desc" },
          take: 5
        },
        quotations: true
      }
    });

    console.log(`Found ${leads.length} leads matching 'Dinesh':`);
    for (const lead of leads) {
      console.log(`\nLead ID: ${lead.id}`);
      console.log(`Name: ${lead.name}`);
      console.log(`Phone: ${lead.phoneNumber}`);
      console.log(`Status: ${lead.status}`);
      console.log(`Stage: ${lead.currentStage}`);
      console.log(`Custom Order Required: ${lead.customOrderRequired}`);
      console.log(`Custom Order Specs: ${lead.customOrderSpecs}`);
      console.log("Last 5 messages:");
      for (const msg of lead.messages) {
        console.log(`  [${msg.direction}] [${msg.timestamp.toISOString()}] ${msg.content}`);
      }
      console.log(`Quotations (${lead.quotations.length}):`);
      for (const q of lead.quotations) {
        console.log(`  - ID: ${q.id}, Num: ${q.quotationNumber}, Status: ${q.status}, Total: ${q.grandTotal}`);
      }
      
      const alerts = await prisma.ownerAlert.findMany({
        where: { leadId: lead.id }
      });
      console.log(`Owner Alerts (${alerts.length}):`);
      for (const a of alerts) {
        console.log(`  - ID: ${a.id}, Title: ${a.title}, Type: ${a.type}, Status: ${a.status}`);
      }
    }

    console.log("\n=== ALL REGISTERED PRODUCTS ===");
    const products = await prisma.productRecord.findMany({
      include: {
        values: {
          include: {
            productField: true
          }
        }
      }
    });
    console.log(`Found ${products.length} product records in database:`);
    for (const p of products) {
      console.log(`  - Product ID: ${p.id}, Code: ${p.code}, Name: ${p.name}, CompanyId: ${p.clientId}`);
      for (const val of p.values) {
        console.log(`    * ${val.productField.fieldName}: ${val.value}`);
      }
    }

    console.log("\n=== ALL OWNER ALERTS ===");
    const allAlerts = await prisma.ownerAlert.findMany();
    console.log(`Found ${allAlerts.length} total owner alerts:`);
    for (const a of allAlerts) {
      console.log(`  - ID: ${a.id}, Title: ${a.title}, Type: ${a.type}, Status: ${a.status}, CreatedAt: ${a.createdAt.toISOString()}`);
    }

  } catch (err) {
    console.error("Diagnostic error:", err);
  }
}

run();
