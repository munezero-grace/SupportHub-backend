import { SupportTier, ClientStatus } from "@prisma/client";

export interface CreateClientDto {
  companyName: string;
  contactName: string;
  contactEmail: string;
  supportTier?: SupportTier;
  status?: ClientStatus;
  userId?: string;
}

export interface SocialClientDto {
email: string;
firstName: string;
lastName: string;
provider: string;
providerId: string;
}