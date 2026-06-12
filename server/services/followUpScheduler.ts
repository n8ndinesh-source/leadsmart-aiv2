import cron from 'node-cron';
import { prisma } from '../db';
import { analyzeLead } from './decisionEngine';

export const startFollowUpScheduler = () => {
  // Run every 10 minutes to check if any leads need followups
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('Running automated follow-up check...');
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // We look for leads where the last message was outbound OR inbound, but mostly inbound without recent activity
      // Actually we just check leads that have auto_followup enabled for their client.
      
      // Let's find all clients with auto followup enabled
      const autoFollowUpClients = await prisma.aIPermission.findMany({
        where: {
          permissionName: 'auto_followup',
          enabled: true
        },
        select: { clientId: true }
      });

      const clientIds = autoFollowUpClients.map(c => c.clientId);
      if (clientIds.length === 0) return;

      // Find inactive leads for these clients
      const activeLeads = await prisma.lead.findMany({
        where: {
          clientId: { in: clientIds },
          status: { notIn: ['Lost', 'Won', 'Not Interested'] },
          lastResponseFromClient: true,
          // We don't want to spam them forever
          followUpCount: { lt: 3 }
        },
        include: {
          client: true
        }
      });

      for (const lead of activeLeads) {
        if (!lead.whatsappNumber || !lead.client.whatsappToken || !lead.client.whatsappPhoneId) continue;
        
        let shouldFollowUp = false;
        
        const timeSinceLastMsg = Date.now() - new Date(lead.lastMessageAt).getTime();
        
        // Interval checks based on followUpCount
        if (lead.followUpCount === 0 && timeSinceLastMsg > 2 * 60 * 60 * 1000) { // > 2 hours
          shouldFollowUp = true;
        } else if (lead.followUpCount === 1 && timeSinceLastMsg > 24 * 60 * 60 * 1000) { // > 24 hours
          shouldFollowUp = true;
        } else if (lead.followUpCount === 2 && timeSinceLastMsg > 3 * 24 * 60 * 60 * 1000) { // > 3 days
          shouldFollowUp = true;
        }

        if (shouldFollowUp) {
          // Check if send_messages is allowed
          const sendMessagesPerm = await prisma.aIPermission.findUnique({
            where: {
              clientId_permissionName: {
                clientId: lead.clientId,
                permissionName: 'send_messages'
              }
            }
          });

          if (!sendMessagesPerm?.enabled) continue;

          console.log(`Triggering automated follow up for lead ${lead.name} (Count: ${lead.followUpCount})`);

          const insight = await analyzeLead(lead.id);

          try {
            await fetch(`https://graph.facebook.com/v19.0/${lead.client.whatsappPhoneId}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${lead.client.whatsappToken}`
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: lead.whatsappNumber.replace(/\D/g, ''),
                type: "text",
                text: { body: insight.suggestedReply }
              })
            });

            await prisma.message.create({
              data: {
                leadId: lead.id,
                direction: "OUT",
                content: insight.suggestedReply,
                timestamp: new Date()
              }
            });

            await prisma.leadActivity.create({
              data: {
                leadId: lead.id,
                activityType: "FOLLOW_UP",
                description: `Automated Follow-up (Interval ${lead.followUpCount + 1}) sent via AI.`
              }
            });

            // Update lead follow up count
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                followUpCount: lead.followUpCount + 1,
                lastMessageAt: new Date()
              }
            });

          } catch (e) {
            console.error("Failed to send auto followup", e);
          }
        }
      }

    } catch (error) {
      console.error('Error in follow-up scheduler:', error);
    }
  });

  console.log('Follow-up scheduler started.');
};
