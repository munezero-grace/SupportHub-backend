import prisma from "../lib/prisma";

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
    return updatedSettings;
  }
}

export default SettingsService;
