'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface TeamNavProps {
  teamId: string;
  teamName: string;
  isLead: boolean;
}

export function TeamNav({ teamId, teamName, isLead }: TeamNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/teams/${teamId}`, label: 'Overview', exact: true },
    { href: `/teams/${teamId}/sessions`, label: 'Sessions' },
    { href: `/teams/${teamId}/board`, label: 'Board' },
    { href: `/teams/${teamId}/milestones`, label: 'Milestones' },
    { href: `/teams/${teamId}/calendar`, label: 'Calendar' },
    { href: `/teams/${teamId}/contributions`, label: 'Contributions' },
  ];

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-slate)', fontWeight: 600 }}>
            Project Team {isLead ? '— Team Lead' : '— Member'}
          </span>
          <h1 style={{ margin: '2px 0 0 0', fontSize: '1.75rem' }}>{teamName}</h1>
        </div>
      </div>

      <nav
        aria-label="Team sections"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--color-rule)',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
                color: isActive ? 'var(--color-stacks-green-dark)' : 'var(--color-slate)',
                borderBottom: isActive ? '3px solid var(--color-stacks-green)' : '3px solid transparent',
                backgroundColor: isActive ? 'var(--color-green-tint)' : 'transparent',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                whiteSpace: 'nowrap',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
