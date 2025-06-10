import "express";

declare module "express" {
  export interface Request {
    file?: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    };
  }


}
 export enum UserRole {
    SUPER_ADMIN = "super_admin",
    TICKET_MANAGER = "ticket_manager",
    CLIENT = "client",
    DEVELOPER = "developer",
  }

  export interface AuthRequest extends Request {
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}
