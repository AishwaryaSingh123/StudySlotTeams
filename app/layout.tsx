import type { Metadata } from 'next';
import './globals.css';
import './nav.css';
import { getSessionUser } from '../lib/auth/session';
import { getBookingRepo } from '../lib/repo';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ToastProvider } from '../components/Toast';
import { CancellationNoticeModal } from '../components/CancellationNoticeModal';
import { Booking } from '../lib/repo/types';

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

  let unacknowledgedCancellations: Booking[] = [];
  if (user && user.role === 'student') {
    try {
      const bookingRepo = getBookingRepo();
      unacknowledgedCancellations = await bookingRepo.getUnacknowledgedCancellations(user.id);
    } catch (e) {
      console.warn('Failed to fetch unacknowledged cancellations:', e);
    }
  }

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
          {user && user.role === 'student' && unacknowledgedCancellations.length > 0 && (
            <CancellationNoticeModal
              initialCancellations={unacknowledgedCancellations}
              userId={user.id}
            />
          )}
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
