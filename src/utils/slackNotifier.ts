import fetch from "node-fetch";
import prisma from "../lib/prisma";

const envSlackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

async function trySendNotification(url: string, payload: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to send Slack notification: " + response.statusText);
  }
}

export async function sendSlackNotification(message: string, userId?: string) {
  if (!userId) {
    return Promise.reject(new Error("User ID is required to fetch Slack webhook URL"));
  }

  let slackWebhookUrl: string | undefined;

  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: { userId },
    });
    if (settings && settings.slackWebhookUrl) {
      slackWebhookUrl = settings.slackWebhookUrl;
    }
  } catch (error) {
    console.error("Failed to fetch Slack webhook URL from DB:", error);
  }

  if (!slackWebhookUrl && !envSlackWebhookUrl) {
    return Promise.reject(new Error("Slack webhook URL is not configured in the database or environment variables"));
  }

  const payload = {
    text: message,
  };

  if (slackWebhookUrl) {
    try {
      await trySendNotification(slackWebhookUrl, payload);
      return;
    } catch (error) {
      console.error("Failed to send Slack notification using DB webhook URL, falling back to env URL:", error);
    }
  }

  if (envSlackWebhookUrl) {
    try {
      await trySendNotification(envSlackWebhookUrl, payload);
      return;
    } catch (error) {
      console.error("Failed to send Slack notification using env webhook URL:", error);
      throw error;
    }
  }
}
