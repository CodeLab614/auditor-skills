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
          R A P I D
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
          &copy; {new Date().getFullYear()} Rapid. All rights reserved.
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
              R A P I D
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
