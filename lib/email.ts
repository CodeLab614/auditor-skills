import { Resend } from 'resend';
import { render } from 'react-email';
import { ResetPasswordEmail, VerificationEmail } from '@/emails';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const emailDelivery = process.env.EMAIL_DELIVERY ?? 'resend';
if (emailDelivery === 'outbox' && process.env.NODE_ENV === 'production') {
  throw new Error('EMAIL_DELIVERY=outbox is only available outside production.');
}

let resend: Resend | undefined;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send email.");
  }

  resend ??= new Resend(apiKey);
  return resend;
}

const FROM_EMAIL =
  process.env.FROM_EMAIL ?? 'RapidAuth <onboarding@resend.dev>';

async function deliverEmail({
  to,
  subject,
  html,
  url,
}: {
  to: string;
  subject: string;
  html: string;
  url: string;
}) {
  if (emailDelivery === 'outbox') {
    const directory = process.env.EMAIL_OUTBOX_DIR ?? '.e2e-outbox';
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.json`;
    await writeFile(
      join(directory, filename),
      JSON.stringify({ to, subject, html, url, sentAt: new Date().toISOString() }, null, 2),
      { encoding: 'utf8', mode: 0o600 },
    );
    return;
  }

  const { error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendVerificationEmail({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) {
  const html = await render(
    VerificationEmail({
      name,
      verificationUrl: url,
    }),
  );

  await deliverEmail({
    to: email,
    subject: 'Verify your email address',
    html,
    url,
  });
}

export async function sendResetPasswordEmail({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) {
  const html = await render(
    ResetPasswordEmail({
      name,
      resetUrl: url,
    }),
  );

  await deliverEmail({
    to: email,
    subject: 'Reset your password',
    html,
    url,
  });
}
