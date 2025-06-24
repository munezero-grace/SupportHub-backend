import { Request, Response } from "express";
import SettingsService from "../services/settings.service";
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
} from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

class SettingsController {
  static async getSlackSettings(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id as string;

      const settings = await SettingsService.getSlackSettings(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_SETTINGS_RETRIEVED_SUCCESSFULLY,
        data: settings || null,
      });
    } catch (error: any) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: error.message || ERROR_MESSAGES.GENERAL_ERROR });
    }
  }

  static async updateSlackSettings(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id as string;

      const { updatedSettings, message } = await SettingsService.updateSlackSettings(
        userId,
        req.body
      );

      return res.status(HTTP_OK).json({
        message,
        data: updatedSettings,
      });
    } catch (error: any) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: error.message || ERROR_MESSAGES.GENERAL_ERROR });
    }
  }
}

export default SettingsController;
