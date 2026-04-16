import type { ReactNode } from 'react';

export const metadata = {
  title: 'Agdam Bagdam — Next.js Quickstart',
  description: 'A/B testing a hero headline in Next.js App Router.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: 0,
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        {children}
      </body>
    </html>
  );
}
