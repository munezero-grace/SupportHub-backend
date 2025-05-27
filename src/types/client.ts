import { SupportTier, ClientStatus } from "@prisma/client";

export interface CreateClientDto {
  companyName: string;
  contactName: string;
  contactEmail: string;
  supportTier?: SupportTier;
  createBy: string;
  status?: ClientStatus;
  userId?: string;
}
