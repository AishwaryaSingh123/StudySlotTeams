import { redirect } from 'next/navigation';
import { getSessionUser } from '../lib/auth/session';

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    if (user.role === 'staff_admin') {
      redirect('/staff/rooms');
    }
    redirect('/rooms');
  }
  redirect('/login');
}
