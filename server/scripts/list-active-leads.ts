import { prisma } from "../db";

async function run() {
  try {
    console.log("=== ALL LEADS IN DATABASE ===");
    const leads = await prisma.lead.findMany({
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 3
        },
        quotations: true
      }
    });

    for (const lead of leads) {
      console.log(`\nLead ID: ${lead.id}`);
      console.log(`Name: ${lead.name}`);
      console.log(`Phone: ${lead.phoneNumber}`);
      console.log(`Status: ${lead.status}`);
      console.log(`Stage: ${lead.currentStage}`);
      console.log(`lastResponseFromClient: ${lead.lastResponseFromClient}`);
      console.log(`lastMessageAt: ${lead.lastMessageAt?.toISOString()}`);
      console.log(`Custom Order Specs: ${lead.customOrderSpecs}`);
      console.log("Messages:");
      for (const m of lead.messages) {
        console.log(`  [${m.direction}] [${m.timestamp.toISOString()}] ${m.content}`);
      }
      console.log(`Quotations (${lead.quotations.length}):`);
      for (const q of lead.quotations) {
        console.log(`  - ID: ${q.id}, Number: ${q.quotationNumber}, Status: ${q.status}, GrandTotal: ${q.grandTotal}`);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
