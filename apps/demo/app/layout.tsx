import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Datalogue Demo — Natural Language Database Queries',
  description:
    'Ask questions about your data in plain English. Powered by Datalogue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
