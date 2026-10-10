import "dotenv/config";

export const sendInviteEmail = async (
  email: string,
  token: string,
  boardName: string,
  senderName?: string
) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/invite/${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You've been invited to a board</h2>
      <p><strong>${senderName}</strong> invited you to collaborate on
         <strong>${boardName}</strong>.</p>
      <p>
        <a href="${inviteUrl}"
           style="display: inline-block; padding: 12px 20px; background: #2563eb;
                  color: #ffffff; text-decoration: none; border-radius: 6px;">
          View invitation
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Or copy this link into your browser:<br />${inviteUrl}
      </p>
      <p style="color: #666; font-size: 13px;">This invitation expires in 7 days.</p>
    </div>
  `;

  const textContent = `${
    senderName ?? "Someone"
  } invited you to collaborate on "${boardName}".\n\nView invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME,
        email: process.env.EMAIL_FROM_ADDRESS,
      },
      to: [{ email }],
      subject: `You've been invited to "${boardName}"`,
      htmlContent,
      textContent,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
  }
  return response.json();
};

export const sendForgotPasswordEmail = async (
  email: string,
  token: string,
) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/forgot-password/${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="color: #666; font-size: 13px;">
        Go to this link to update your password:<br />${inviteUrl}
      </p>
    </div>
  `;

  const textContent = `Reset your password`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME,
        email: process.env.EMAIL_FROM_ADDRESS,
      },
      to: [{ email }],
      subject: `Reset your password`,
      htmlContent,
      textContent,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
  }
  return response.json();
};
