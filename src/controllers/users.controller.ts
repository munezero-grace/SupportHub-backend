import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { HTTP_OK, HTTP_BAD_REQUEST } from '../constants/httpStatusCodes';
import { ERROR_MESSAGES } from '../constants/response/errors';
import { SUCCESS_MESSAGES } from '../constants/response/successMessages';

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

  static async updateUserSettings(req: Request, res: Response): Promise<Response> {
    try {
      const userRole = req.user?.role;
      const { companyName, companyDomain, firstName, lastName } = req.body;
      if (userRole !== 'super_admin' && !companyName) {
        return res.status(HTTP_BAD_REQUEST).json({ error: ERROR_MESSAGES.COMPANY_NAME_REQUIRED });
      }
      if (userRole === 'super_admin') {
        return res.status(HTTP_OK).json({
          message: SUCCESS_MESSAGES.USER_SETTINGS_UPDATED_SUCCESSFULLY,
          data: null,
        });
      }
      const userId = req.user?.id!;
      const updatedClient = await userService.updateUserSettings(userId, companyName, companyDomain, firstName, lastName);
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

  static async getUserSettings(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id!;
      const clientSettings = await userService.getUserSettings(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_SETTINGS_RETRIEVED_SUCCESSFULLY,
        data: clientSettings,
      });
    } catch (error: any) {
      return res.status(HTTP_BAD_REQUEST).json({
        error: error.message || 'Failed to retrieve user settings',
      });
    }
  }
}

export default UsersController;
