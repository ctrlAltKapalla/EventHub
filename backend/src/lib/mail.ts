/**
 * Mail abstraction — MVP implementation: logs to console.
 * Phase 3: swap body of `sendMail` for Resend (EU) or Nodemailer SMTP.
 */

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (process.env.NODE_ENV === "test") return; // silent in tests

  // TODO Phase 3: replace with Resend or Nodemailer
  console.log(
    `[mail] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}`
  );
}

export function registrationConfirmationMail(params: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  ticketToken: string;
  baseUrl: string;
}): MailOptions {
  const ticketUrl = `${params.baseUrl}/api/tickets/${params.ticketToken}`;
  return {
    to: params.to,
    subject: `Deine Registrierung: ${params.eventTitle}`,
    text: [
      `Hallo ${params.name},`,
      ``,
      `du bist erfolgreich registriert für: ${params.eventTitle}`,
      `Datum: ${params.eventDate}`,
      `Ort: ${params.location}`,
      ``,
      `Dein Ticket: ${ticketUrl}`,
      ``,
      `Viel Spaß!`,
    ].join("\n"),
    html: `<p>Hallo ${params.name},</p>
<p>du bist erfolgreich registriert für: <strong>${params.eventTitle}</strong></p>
<p>Datum: ${params.eventDate}<br>Ort: ${params.location}</p>
<p><a href="${ticketUrl}">Ticket ansehen / herunterladen</a></p>`,
  };
}
