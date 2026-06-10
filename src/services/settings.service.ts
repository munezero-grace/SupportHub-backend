import prisma from "../lib/prisma";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;

class SettingsService {
  static async getSlackSettings(userId: string) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { userId },
      select: {
        slackWebhookUrl: true,
        newTickets: true,
        ticketAssignments: true,
        statusChanges: true,
      },
    });

    if (!settings) {
      return null;
    }
    
    if (!settings.slackWebhookUrl) {
      return {
        ...settings,
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      };
    }

    return settings;
  }

  static async getAdminSlackSettings() {
    const setting = await prisma.integrationSettings.findFirst({
      where: {
        user: {
          deletedAt: null,
          userRoles: {
            some: {
              role: { name: "super_admin" },
            },
          },
        },
      },
    });

    if (setting) {
      if (!setting.slackWebhookUrl && process.env.SLACK_WEBHOOK_URL) {
        return { ...setting, slackWebhookUrl: process.env.SLACK_WEBHOOK_URL };
      }
      return setting;
    }

    const envUrl = process.env.SLACK_WEBHOOK_URL;
    if (!envUrl) return null;

    const superAdmin = await prisma.users.findFirst({
      where: {
        deletedAt: null,
        userRoles: { some: { role: { name: "super_admin" } } },
      },
      select: { id: true },
    });
    if (!superAdmin) return null;

    return {
      userId: superAdmin.id,
      slackWebhookUrl: envUrl,
      newTickets: true,
      ticketAssignments: true,
      statusChanges: true,
    } as any;
  }

  static async updateSlackSettings(userId: string, data: any) {
    const updatedSettings = await prisma.integrationSettings.upsert({
      where: { userId },
      update: {
        slackWebhookUrl: data.slackWebhookUrl,
        newTickets: data.newTickets,
        ticketAssignments: data.ticketAssignments,
        statusChanges: data.statusChanges,
      },
      create: {
        userId,
        slackWebhookUrl: data.slackWebhookUrl,
        newTickets: data.newTickets,
        ticketAssignments: data.ticketAssignments,
        statusChanges: data.statusChanges,
      },
    });


    let messageKey: SuccessMessageKey = "USER_SETTINGS_UPDATED_SUCCESSFULLY";

    if (
      (data.newTickets !== undefined || data.statusChanges !== undefined) &&
      (data.slackWebhookUrl === undefined || data.slackWebhookUrl === '')
    ) {
      const enabled = (data.newTickets === true) || (data.statusChanges === true);
      messageKey = enabled ? "SLACK_NOTIFICATION_ENABLED" : "SLACK_NOTIFICATION_DISABLED";
    } else if (data.slackWebhookUrl !== undefined && data.slackWebhookUrl !== '') {
      messageKey = "WEBHOOK_SAVED_SUCCESSFULLY";
    }

    const message = SUCCESS_MESSAGES[messageKey] || "User settings updated successfully.";

    return { updatedSettings, message };
  }
}

export default SettingsService;
