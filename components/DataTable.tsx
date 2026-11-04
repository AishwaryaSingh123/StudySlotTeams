'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortColumn?: string;
  sortDirection?: 'ascending' | 'descending';
  onSort?: (columnKey: string) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  caption,
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', marginBottom: '24px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <caption style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: '1.1rem', backgroundColor: 'var(--color-sand)' }}>
          {caption}
        </caption>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-rule)', backgroundColor: 'var(--color-sand)' }}>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              const ariaSort = isSorted ? sortDirection : undefined;

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'inherit',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDirection === 'ascending' ? (
                          <ArrowUp size={16} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={16} aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={16} aria-hidden="true" color="var(--color-slate)" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--color-slate)',
                  fontStyle: 'italic',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                style={{
                  borderBottom: '1px solid var(--color-rule)',
                  transition: 'background-color var(--motion-fast) var(--ease-standard)',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '12px 16px',
                      textAlign: col.align || 'left',
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
