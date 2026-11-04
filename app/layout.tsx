import type { Metadata } from 'next';
import './globals.css';
import './nav.css';
import { getSessionUser } from '../lib/auth/session';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ToastProvider } from '../components/Toast';

export const metadata: Metadata = {
  title: 'StudySlot Teams — Reading-Room Ledger',
  description: 'Academic study room reservation and team milestone collaboration platform.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <ToastProvider>
          <Header user={user} />
          <div className="app-container">
            <main id="main" className="app-main">
              {children}
            </main>
          </div>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
