import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { HTTP_OK, HTTP_BAD_REQUEST } from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

const userService = new UserService();

class UsersController {
  static async getAllUsers(_req: Request, res: Response): Promise<Response> {
    try {
      const users = await userService.getAllUsersWithRoles();
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USERS_RETRIEVED_SUCCESSFULLY,
        data: users,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.FAILED_TO_RETRIEVE_TICKETS,
      });
    }
  }
  static async getUserProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      return res.status(HTTP_OK).json({
        message: "User profile retrieved successfully",
        data: await userService.getUserProfile(userId as string)
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }

  static async updateUserProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id!;
      const updatedClient = await userService.updateUserProfile(userId, req.body);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_SETTINGS_UPDATED_SUCCESSFULLY,
        data: updatedClient,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.USER_DELETE_FAILED,
      });
    }
  }

  static async updateUserCompanyProfile(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id!;
      const updatedCompany = await userService.updateUserCompanyProfile(userId, req.body);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_COMPANY_UPDATED_SUCCESSFULLY,
        data: updatedCompany,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || ERROR_MESSAGES.USER_DELETE_FAILED,
      });
    }
  }

  static async getTeamMembers(_req: Request, res: Response): Promise<Response> {
    try {
      const members = await userService.getTeamMembers();
      return res.status(HTTP_OK).json({ data: members });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({ error: error.message });
    }
  }

  static async reactivateUser(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.id;
      const result = await userService.reactivateUser(userId);
      if ('error' in result) {
        return res.status(404).json({ status: 'error', message: result.error });
      }
      return res.status(HTTP_OK).json({
        status: 'success',
        message: 'User reactivated successfully',
        data: result,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        status: 'error',
        message: error.message || 'Failed to reactivate user',
      });
    }
  }

  static async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const { firstName, lastName, email, password, role, clientId } = req.body;

      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(HTTP_BAD_REQUEST).json({
          error: "firstName, lastName, email, password, and role are required",
        });
      }

      const validRoles = ["super_admin", "ticket_manager", "developer", "client"];
      if (!validRoles.includes(role)) {
        return res.status(HTTP_BAD_REQUEST).json({ error: "Invalid role" });
      }

      if (role === "client" && !clientId) {
        return res.status(HTTP_BAD_REQUEST).json({
          error: "clientId is required when role is client",
        });
      }

      const user = await userService.createUser({ firstName, lastName, email, password, role, clientId });
      return res.status(201).json({
        message: SUCCESS_MESSAGES.USER_REGISTERED,
        data: user,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || "Failed to create user",
      });
    }
  }

  static async softDeleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.id;
      const result = await userService.softDeleteUser(userId);
      if ('error' in result) {
        return res.status(404).json({
          status: 'error',
          message: result.error,
        });
      }
      return res.status(HTTP_OK).json({
        status: 'success',
        data: result,
        message: SUCCESS_MESSAGES.CLIENT_DELETED,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        status: 'error',
        message: error.message || 'Failed to soft delete user',
      });
    }
  }
}

export default UsersController;
