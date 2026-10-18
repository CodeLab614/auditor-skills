import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen flex bg-background'>
      {/* Left side - Branding */}
      <div className='hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-10'>
        <Link
          href='/'
          className='text-lg tracking-[0.15em] font-medium uppercase'
        >
          RapidAuth
        </Link>

        <div className='space-y-6'>
          <blockquote className='text-2xl font-light leading-relaxed'>
            Build faster. Ship sooner. Scale effortlessly.
          </blockquote>
          <p className='text-muted-foreground text-sm'>
            The complete authentication boilerplate for modern applications.
          </p>
        </div>

        <p className='text-xs text-muted-foreground'>
          &copy; {new Date().getFullYear()} RapidAuth. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className='flex-1 flex items-center justify-center p-6 lg:p-10'>
        <div className='w-full max-w-md'>
          {/* Mobile logo */}
          <div className='lg:hidden mb-8 text-center'>
            <Link
              href='/'
              className='text-lg tracking-[0.15em] font-medium uppercase'
            >
              RapidAuth
            </Link>
          </div>

          {children}
          <footer className='mt-8 flex justify-center gap-5 text-xs text-muted-foreground'>
            <Link href='/terms' className='transition-colors hover:text-foreground'>Terms</Link>
            <Link href='/privacy' className='transition-colors hover:text-foreground'>Privacy</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
