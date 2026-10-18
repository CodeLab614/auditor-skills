import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>R A P I D</Heading>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              We received a request to reset your password. Click the button
              below to choose a new one.
            </Text>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Link style={link} href={resetUrl}>
              {resetUrl}
            </Link>
            <Text style={footer}>
              If you didn&apos;t request a password reset, you can safely ignore
              this email.
            </Text>
            <Text style={footer}>This link will expire in 1 hour.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#0a0a0a",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  color: "#fafafa",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "30px 0",
  letterSpacing: "0.5em",
};

const paragraph = {
  color: "#a1a1aa",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const button = {
  backgroundColor: "#fafafa",
  borderRadius: "0",
  color: "#0a0a0a",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};

const link = {
  color: "#71717a",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const footer = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "16px",
  marginTop: "24px",
};

export default ResetPasswordEmail;
