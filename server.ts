import "dotenv/config";
import express from "express";
import path from "path";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import { prisma } from "./server/db";
import apiRouter from "./server/routes/api";
import { startFollowUpScheduler } from "./server/services/followUpScheduler";

const PORT = 3000;

async function seedDefaultUsers() {
  try {
    // Seed standard plans if not exists
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
            name: "Growth",
            price: 79.0,
            maxUsers: 5,
            maxLeads: 500,
            maxAiRequests: 250,
            maxWhatsappNumbers: 2,
            features: "Email Alerts,Advanced CRM Tools,3 AI Assistant Workflows,WhatsApp lead integration,Dedicated login dashboard",
          },
          {
            name: "Pro",
            price: 149.0,
            maxUsers: 15,
            maxLeads: 2000,
            maxAiRequests: 1000,
            maxWhatsappNumbers: 5,
            features: "Email & SMS Alerts,Everything in Growth,Unlimited AI assistant workflows,Custom templates generator,Zapier API access",
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
      console.log("Cohesive subscription plans successfully seeded!");
    }

    // Check if an ADMIN user exists
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
      console.log("Successfully seeded default admin: admin@leadsmart.ai / adminpassword");
    }

    // Check if a CLIENT user exists
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
        const clientProfile = await tx.client.create({
          data: {
            userId: clientUser.id,
            companyName: "SME Alpha Ltd",
            phone: "+1 (555) 432-1098",
            website: "https://smealpha.com",
            businessType: "Service Business",
            industry: "Healthcare",
            description: "Providing elite digital clinic tools and patient pipeline automation.",
            country: "United States",
            state: "California",
            city: "San Francisco",
            accountStatus: "Active",
            subscriptionStatus: "Trial",
          },
        });
        
        // 14 days trial expiration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);

        await tx.subscription.create({
          data: {
            clientId: clientProfile.id,
            planName: "Starter",
            status: "Trial",
            startDate: new Date(),
            expiryDate: expiryDate,
            price: 29.0,
          }
        });
      });
      console.log("Successfully seeded default client: client@leadsmart.ai / clientpassword with complimentary Trial subscription");
    }
  } catch (error) {
    console.error("Auto-seeding encountered an issue:", error);
  }
}

async function startServer() {
  const app = express();

  // Parse incoming JSON payloads
  app.use(express.json());
  
  startFollowUpScheduler();

  // Attempt to sync the DB schema
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.NOW_BUILD_TRIGGER ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_EXECUTION_ENV
  );

  if (!isServerless) {
    console.log("Normal environment detected. Attempting to sync database schema...");
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log("Database schema synced successfully.");
      // Auto-seed the accounts on boot
      await seedDefaultUsers();
    } catch (dbError) {
      console.error("Failed to sync database schema:", dbError);
    }
  } else {
    console.log("Serverless environment detected. Using build-time schema and writable SQLite mirror.");
  }

  // API router
  app.use("/api", apiRouter);

  // Serve static assets in development / production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client side fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LeadSmart AI Server booted on http://0.0.0.0:${PORT}`);
  });
}

startServer();
