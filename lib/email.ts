import { Resend } from 'resend';
import { render } from '@react-email/components';
import { ResetPasswordEmail, VerificationEmail } from '@/emails';

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

  const { error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your email address',
    html,
  });

  if (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
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

  const { error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your password',
    html,
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
