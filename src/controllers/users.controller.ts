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
        data: await userService.getUserProfile(userId as string),
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message,
      });
    }
  }
  static async updateUserProfile(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id!;
      const updatedClient = await userService.updateUserProfile(
        userId,
        req.body
      );
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

  static async updateUserCompanyProfile(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id!;
      const updatedCompany = await userService.updateUserCompanyProfile(
        userId,
        req.body
      );
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
}

export default UsersController;
