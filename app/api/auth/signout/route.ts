import { NextResponse } from 'next/server';
import { clearSessionUser } from '../../../../lib/auth/session';

export async function POST(request: Request) {
  await clearSessionUser();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, 303);
}
