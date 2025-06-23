import fetch from "node-fetch";

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message: string) {
  if (!slackWebhookUrl) {
    return Promise.reject(new Error("Slack webhook URL is not configured"));
  }

  try {
    const payload = {
      text: message,
    };

    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        "Failed to send Slack notification: " + response.statusText
      );
    }
  } catch (error) {
    throw error;
  }
}
