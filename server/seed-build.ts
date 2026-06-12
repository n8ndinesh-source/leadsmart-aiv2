import { prisma } from "./db.js";
import bcrypt from "bcryptjs";

async function seedDefaultUsers() {
  try {
    const plansCount = await prisma.plan.count();
    if (plansCount === 0) {
      await prisma.plan.createMany({
        data: [
          {
            name: "Starter",
            price: 29.0,
            maxUsers: 2,
            maxLeads: 100,
            maxAiRequests: 50,
            maxWhatsappNumbers: 1,
            features: "Email Alerts,Basic CRM Integration,1 AI Assistant Workflow,Standard Analytics",
          },
          {
            name: "Enterprise",
            price: 399.0,
            maxUsers: 100,
            maxLeads: 10000,
            maxAiRequests: 5000,
            maxWhatsappNumbers: 10,
            features: "Prestige SLA priority,Everything in Pro,Unlimited customizations,White-labeled interface,24/7 Phone & Email support",
          },
        ]
      });
      console.log("Plans seeded");
    }

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      const adminPasswordHash = await bcrypt.hash("adminpassword", 10);
      await prisma.user.create({
        data: {
          name: "Global Admin",
          email: "admin@leadsmart.ai",
          password: adminPasswordHash,
          role: "ADMIN",
        },
      });
      console.log("Admin seeded");
    }

    const clientCount = await prisma.user.count({ where: { role: "CLIENT" } });
    if (clientCount === 0) {
      const clientPasswordHash = await bcrypt.hash("clientpassword", 10);
      await prisma.$transaction(async (tx) => {
        const clientUser = await tx.user.create({
          data: {
            name: "John Client",
            email: "client@leadsmart.ai",
            password: clientPasswordHash,
            role: "CLIENT",
          },
        });
        await tx.client.create({
          data: {
            userId: clientUser.id,
            companyName: "SME Alpha Ltd",
            phone: "+1 (555) 432-1098",
            industry: "B2B Software",
            subscriptionStatus: "Active",
          },
        });
      });
      console.log("Client seeded");
    }
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDefaultUsers();
