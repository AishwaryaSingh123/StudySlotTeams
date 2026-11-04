'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BookOpen, User, LogOut } from 'lucide-react';
import { Profile } from '../lib/repo/types';

export interface HeaderProps {
  user: Profile | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStaff = user?.role === 'staff_admin';

  const navLinks = isStaff
    ? [
        { href: '/staff/rooms', label: 'Rooms' },
        { href: '/staff/rules', label: 'Rules' },
        { href: '/staff/usage', label: 'Usage' },
      ]
    : [
        { href: '/rooms', label: 'Find a room' },
        { href: '/bookings', label: 'My bookings' },
        { href: '/teams', label: 'Teams' },
      ];

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link
          href={user ? (isStaff ? '/staff/rooms' : '/rooms') : '/login'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--color-stacks-green-dark)',
            fontWeight: 800,
            fontSize: '1.25rem',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <BookOpen size={24} aria-hidden="true" color="var(--color-stacks-green)" />
          <span>StudySlot Teams</span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      {user && (
        <nav
          aria-label="Main"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'var(--color-green-tint)' : 'transparent',
                  color: isActive ? 'var(--color-stacks-green-dark)' : 'var(--color-ink)',
                  borderBottom: isActive ? '3px solid var(--color-stacks-green)' : '3px solid transparent',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* User Controls & Mobile Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.95rem',
                color: 'var(--color-ink)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <User size={16} aria-hidden="true" />
              <span>{user.full_name}</span>
            </span>

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                aria-label="Sign out"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  minHeight: '44px',
                  border: '1px solid var(--color-control-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-slate)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <LogOut size={16} aria-hidden="true" />
                <span className="sign-out-text">Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              padding: '8px 16px',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-stacks-green)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        )}

        {/* Mobile Disclosure Trigger */}
        {user && (
          <button
            type="button"
            className="mobile-menu-btn"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none', // styled via media queries
              minWidth: '44px',
              minHeight: '44px',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-control-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-surface)',
            borderBottom: '2px solid var(--color-rule)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <nav aria-label="Mobile Navigation">
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      backgroundColor: pathname.startsWith(link.href)
                        ? 'var(--color-green-tint)'
                        : 'var(--color-sand)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
