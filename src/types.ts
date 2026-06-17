export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
  companyName?: string | null;
  subscriptionStatus?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  maxUsers: number;
  maxLeads: number;
  maxAiRequests: number;
  maxWhatsappNumbers: number;
  features: string;
  createdAt?: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  planName: string;
  status: string; // Trial, Active, Expired, Suspended, Cancelled
  startDate: string;
  expiryDate: string;
  price: number;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  companyName: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  businessType: string | null;
  description: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  accountStatus: string; // Active, Suspended, Pending
  subscriptionStatus: string; // Trial, Active, Expired, Suspended, Cancelled
  whatsappToken?: string | null;
  whatsappPhoneId?: string | null;
  whatsappWebhookVerifyToken?: string | null;
  whatsappWebhookUrl?: string | null;
  whatsappStatus?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiApiKey?: string | null;
  aiAssistantName?: string | null;
  aiPermissions?: { permissionName: string; enabled: boolean; }[];
  createdAt: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  subscription?: Subscription | null;
}

export interface ClientStats {
  companyName: string;
  businessType: string;
  industry: string;
  planName: string;
  subscriptionStatus: string;
  renewalDate: string;
  daysRemaining: number;
  totalLeads: number;
  unassignedLeads: number;
  automationRate: string;
  aiCreditsUsed: string;
  maxLeads: number;
  maxUsers: number;
  maxWhatsappNumbers: number;
}

export interface AdminStats {
  totalClients: number;
  trialClients: number;
  activeClients: number;
  expiredClients: number;
  monthlyRevenue: number;
  stageCounts?: Record<string, number>;
}

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

export interface LeadTag {
  id: string;
  leadId: string;
  tag: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: string; // CREATED, STATUS_CHANGE, NOTE_ADDED, TAG_ADDED, FOLLOWUP, etc.
  description: string;
  createdAt: string;
}

export interface LeadIntent {
  id: string;
  leadId: string;
  message: string;
  intent: string;
  confidence: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  clientId: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  source: string; // WhatsApp / Manual / Import
  status: string; // New, Contacted, Interested, Qualified, Quotation Sent, Negotiation, Won, Lost
  priority: string; // Hot, Warm, Cold
  intentScore: number | null;
  leadScore: number | null;
  aiRecommendation: string | null;
  lastMessageAt?: string | null;
  whatsappNumber?: string | null;
  conversationStatus?: string | null;
  urgencyLevel?: string | null;
  latestIntent?: string | null;
  intentHistory?: string | null;
  currentStage?: string;
  previousStage?: string | null;
  stageHistory?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: LeadNote[];
  tags?: LeadTag[];
  activities?: LeadActivity[];
  leadIntents?: LeadIntent[];
  leadStageHistories?: any[];
}

export interface Message {
  id: string;
  leadId: string;
  direction: "IN" | "OUT";
  content: string;
  timestamp: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: string; // Pending, Sent, Failed, Missed
  message: string;
  followUpType: string; // Soft, Medium, Hard, Final
  createdAt: string;
  lead?: Lead;
}

