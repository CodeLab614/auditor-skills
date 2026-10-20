import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';

interface SecurityNoticeEmailProps {
  name: string;
  eventDescription: string;
  occurredAt: string;
  supportEmail: string;
  appName: string;
}

export function SecurityNoticeEmail({
  name,
  eventDescription,
  occurredAt,
  supportEmail,
  appName,
}: SecurityNoticeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{eventDescription}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>R A P I D</Heading>
            <Text style={paragraph}>{`Hi ${name},`}</Text>
            <Text style={paragraph}>{`${eventDescription} on ${occurredAt}.`}</Text>
            <Text style={paragraph}>
              {`If you did not do this, reset your ${appName} password and contact us at ${supportEmail}.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};
const container = {
  backgroundColor: '#0a0a0a',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};
const box = { padding: '0 48px' };
const heading = {
  color: '#fafafa',
  fontSize: '24px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '30px 0',
  letterSpacing: '0.5em',
};
const paragraph = {
  color: '#a1a1aa',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};
