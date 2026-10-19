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

interface InvitationEmailProps {
  name: string;
  invitedByName: string;
  appName: string;
  invitationUrl: string;
}

export function InvitationEmail({
  name,
  invitedByName,
  appName,
  invitationUrl,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You have been invited to ${appName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>{`${appName}`}</Heading>
            <Text style={paragraph}>{`Hi ${name},`}</Text>
            <Text style={paragraph}>
              {`${invitedByName} invited you to join ${appName}. Set your password and accept the Terms of Service and Privacy Policy to activate your account.`}
            </Text>
            <Button style={button} href={invitationUrl}>
              Accept Invitation
            </Button>
            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Link style={link} href={invitationUrl}>
              {invitationUrl}
            </Link>
            <Text style={footer}>This invitation expires in 7 days.</Text>
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

const box = { padding: "0 48px" };

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

export default InvitationEmail;
