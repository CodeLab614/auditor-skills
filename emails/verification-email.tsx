import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from "react-email";

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export function VerificationEmail({
  name,
  verificationUrl,
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>R A P I D</Heading>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              Thanks for signing up! Please verify your email address by
              clicking the button below.
            </Text>
            <Button style={button} href={verificationUrl}>
              Verify Email
            </Button>
            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Link style={link} href={verificationUrl}>
              {verificationUrl}
            </Link>
            <Text style={footer}>
              If you didn&apos;t create an account, you can safely ignore this
              email.
            </Text>
            <Text style={footer}>
              This link will expire in 24 hours.
            </Text>
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

export default VerificationEmail;
