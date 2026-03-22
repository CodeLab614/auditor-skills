import type { Metadata } from 'next';
import { Geist, Geist_Mono, Nunito_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

const nunitoSans = Nunito_Sans({ variable: '--font-sans', subsets: ['latin'] });

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RapidAuth',
  description: 'Authentication Boilerplate',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang='en'
      className={cn('font-sans', nunitoSans.variable, instrumentSerif.variable)}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'rounded-none',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
