import "dotenv/config";

const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

const darkEmailHtml = (heading: string, bodyHtml: string, ctaLabel: string, ctaUrl: string, footerNote: string) => `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#08090a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090a; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#0f1011; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; padding-right:8px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:rgba(94,106,210,0.15); border-radius:6px;">
                        <tr><td style="padding:6px;">&#128190;</td></tr>
                      </table>
                    </td>
                    <td style="vertical-align:middle; font-family:${FONT}; font-size:17px; font-weight:600; color:#f7f8f8;">
                      Flowline
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px; font-family:${FONT}; font-size:20px; font-weight:600; color:#f7f8f8; line-height:1.4;">
                ${heading}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px; font-family:${FONT}; font-size:14px; color:#8a8f98; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#5e6ad2; border-radius:8px;">
                      <a href="${ctaUrl}"
                         target="_blank"
                         style="display:inline-block; padding:12px 24px; font-family:${FONT}; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px; font-family:${FONT}; font-size:13px; color:#62666d; line-height:1.6;">
                Or paste this link into your browser:<br />
                <a href="${ctaUrl}" target="_blank" style="color:#5e6ad2; text-decoration:none; word-break:break-all;">${ctaUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px; font-family:${FONT}; font-size:12px; color:#62666d; line-height:1.6; border-top:1px solid rgba(255,255,255,0.06);">
                ${footerNote}<br />
                You received this email because of a Flowline board action. &middot; Flowline
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const brevoSend = async (payload: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}) => {
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
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      textContent: payload.textContent,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
  }
  return response.json();
};

export const sendInviteEmail = async (
  email: string,
  token: string,
  boardName: string,
  senderName?: string
) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/invite/${token}`;
  const from = senderName ?? "Someone";

  const htmlContent = darkEmailHtml(
    "You've been invited to a board",
    `<span style="color:#f7f8f8; font-weight:600;">${from}</span> invited you to collaborate on <span style="color:#f7f8f8; font-weight:600;">${boardName}</span>.`,
    "View invitation",
    inviteUrl,
    "This invitation expires in 7 days."
  );

  const textContent = `${from} invited you to collaborate on "${boardName}".\n\nView invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`;

  return brevoSend({
    to: email,
    subject: `You've been invited to "${boardName}"`,
    htmlContent,
    textContent,
  });
};

export const sendForgotPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const htmlContent = darkEmailHtml(
    "Reset your password",
    `We received a request to reset the password for your Flowline account. If this wasn't you, you can safely ignore this email.`,
    "Reset password",
    resetUrl,
    "This link expires in 2 hours."
  );

  const textContent = `Reset your Flowline password.\n\nReset link: ${resetUrl}\n\nThis link expires in 2 hours. If you didn't request this, you can safely ignore this email.`;

  return brevoSend({
    to: email,
    subject: "Reset your password",
    htmlContent,
    textContent,
  });
};
