import "dotenv/config";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const darkEmailHtml = (
  heading: string,
  bodyHtml: string,
  ctaLabel: string,
  ctaUrl: string,
  footerNote: string,
  footerReason: string
) => `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#0a0c0f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0c0f; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#12151a; border:1px solid #21262d; border-radius:14px;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <span style="font-family:${FONT}; font-size:15px; font-weight:600; letter-spacing:0.02em; color:#eef1f4;">
                  Flowline
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px; font-family:${FONT}; font-size:20px; font-weight:600; color:#eef1f4; line-height:1.4;">
                ${heading}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px; font-family:${FONT}; font-size:14px; color:#9aa1ac; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#eef1f4; border-radius:8px;">
                      <a href="${ctaUrl}"
                         target="_blank"
                         style="display:inline-block; padding:11px 22px; font-family:${FONT}; font-size:14px; font-weight:600; color:#0a0c0f; text-decoration:none;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px; font-family:${FONT}; font-size:13px; color:#6b7280; line-height:1.6;">
                Or paste this link into your browser:<br />
                <a href="${ctaUrl}" target="_blank" style="color:#9aa1ac; text-decoration:underline; word-break:break-all;">${ctaUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px; font-family:${FONT}; font-size:12px; color:#6b7280; line-height:1.6; border-top:1px solid #1c2127;">
                ${footerNote}<br />
                ${footerReason} &middot; &copy; Flowline
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
    `<span style="color:#eef1f4; font-weight:600;">${escapeHtml(from)}</span> invited you to collaborate on <span style="color:#eef1f4; font-weight:600;">${escapeHtml(boardName)}</span>.`,
    "View invitation",
    inviteUrl,
    "This invitation expires in 7 days.",
    "You received this email because someone invited you to a Flowline board"
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
    "This link expires in 2 hours.",
    "You received this email because a password reset was requested for a Flowline account"
  );

  const textContent = `Reset your Flowline password.\n\nReset link: ${resetUrl}\n\nThis link expires in 2 hours. If you didn't request this, you can safely ignore this email.`;

  return brevoSend({
    to: email,
    subject: "Reset your password",
    htmlContent,
    textContent,
  });
};
