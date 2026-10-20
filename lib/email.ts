import { Resend } from 'resend';
import { render } from 'react-email';
import {
  AccountDeletedEmail,
  InvitationEmail,
  ResetPasswordEmail,
  SecurityNoticeEmail,
  VerificationEmail,
} from '@/emails';
import { siteConfig } from '@/config/site';
import { getPublicSupportEmail, SUPPORT_EMAIL_NOT_CONFIGURED } from '@/lib/support-email';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { reportError } from '@/lib/report-error';

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
    const deliveryError = new Error('Failed to send email', { cause: error });
    reportError(deliveryError, { area: 'email.delivery' });
    throw deliveryError;
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

export async function sendInvitationEmail({
  email,
  name,
  invitedByName,
  url,
}: {
  email: string;
  name: string;
  invitedByName: string;
  url: string;
}) {
  const html = await render(
    InvitationEmail({
      name,
      invitedByName,
      appName: siteConfig.appName,
      invitationUrl: url,
    }),
  );

  await deliverEmail({
    to: email,
    subject: `You're invited to ${siteConfig.appName}`,
    html,
    url,
  });
}

export async function sendAccountDeletedEmail({ email, name, deletedAt }: {
  email: string;
  name: string;
  deletedAt: string;
}) {
  const supportEmail = getPublicSupportEmail() ?? SUPPORT_EMAIL_NOT_CONFIGURED;
  const html = await render(AccountDeletedEmail({
    name,
    deletedAt,
    supportEmail,
    appName: siteConfig.appName,
  }));

  await deliverEmail({
    to: email,
    subject: 'Your account has been deleted',
    html,
    url: '',
  });
}

export type SecurityNoticeEvent =
  | 'password-changed'
  | 'password-reset'
  | 'temporary-password-created'
  | 'two-factor-enabled'
  | 'two-factor-disabled';

const securityNotices: Record<
  SecurityNoticeEvent,
  { subject: string; description: string }
> = {
  'password-changed': {
    subject: 'Your password was changed',
    description: `Your ${siteConfig.appName} password was changed`,
  },
  'password-reset': {
    subject: 'Your password was reset',
    description: `Your ${siteConfig.appName} password was reset`,
  },
  'temporary-password-created': {
    subject: 'A temporary password was created for your account',
    description: `A temporary password was created for your ${siteConfig.appName} account`,
  },
  'two-factor-enabled': {
    subject: 'Two-factor authentication was enabled',
    description: `Two-factor authentication was enabled for your ${siteConfig.appName} account`,
  },
  'two-factor-disabled': {
    subject: 'Two-factor authentication was disabled',
    description: `Two-factor authentication was disabled for your ${siteConfig.appName} account`,
  },
};

export async function sendSecurityNoticeEmail({
  to,
  userName,
  event,
  occurredAt,
}: {
  to: string;
  userName: string;
  event: SecurityNoticeEvent;
  occurredAt: Date;
}) {
  const notice = securityNotices[event];
  const occurredAtUtc = `${occurredAt.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`;
  const supportEmail = getPublicSupportEmail() ?? SUPPORT_EMAIL_NOT_CONFIGURED;
  const html = await render(
    SecurityNoticeEmail({
      name: userName,
      eventDescription: notice.description,
      occurredAt: occurredAtUtc,
      supportEmail,
      appName: siteConfig.appName,
    })
  );

  await deliverEmail({
    to,
    subject: notice.subject,
    html,
    url: '',
  });
}
