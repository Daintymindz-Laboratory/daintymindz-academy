'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import RunnableCodeCell from './RunnableCodeCell';

interface Props {
  content: string;
  trackColor: string;
  workerRef: React.MutableRefObject<Worker | null>;
  pyodideReady: boolean;
}

export default function LessonContent({ content, trackColor, workerRef, pyodideReady }: Props) {
  return (
    <div style={{ fontSize: 15, lineHeight: 1.8, color: '#9CA3AF' }}>
      <ReactMarkdown
        components={{
          /*
           * Handle fenced code blocks at the `pre` level.
           * In react-markdown v10 (hast-util-to-jsx-runtime), the `pre` component
           * receives the child `code` element as a React element before it is rendered.
           * We inspect the child className here to detect python-run blocks and render
           * RunnableCodeCell directly, with no wrapping pre element.
           */
          pre: ({ children }) => {
            const childArray = React.Children.toArray(children);
            const first = childArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;
            const childClassName: string = first?.props?.className || '';
            const match = /language-([\w-]+)/.exec(childClassName);
            const lang = match ? match[1] : '';

            if (lang === 'python-run') {
              const code = String(first?.props?.children ?? '').replace(/\n$/, '');
              return (
                <RunnableCodeCell
                  initialCode={code}
                  workerRef={workerRef}
                  pyodideReady={pyodideReady}
                />
              );
            }

            return (
              <pre style={{
                background: '#0D1117', borderRadius: 10, padding: '1rem 1.25rem',
                overflow: 'auto', margin: '1rem 0', border: '1px solid #2A2F35',
              }}>
                {children}
              </pre>
            );
          },

          /* inline code only (no className means inline) */
          code: ({ children, className }: any) => {
            if (className) {
              return (
                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#E5E7EB', lineHeight: 1.7 }}>
                  {children}
                </code>
              );
            }
            return (
              <code style={{
                background: '#22262B', border: '1px solid #3A3F46',
                borderRadius: 4, padding: '2px 6px',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: trackColor,
              }}>
                {children}
              </code>
            );
          },

          h1: ({ children }) => (
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', margin: '1.75rem 0 0.75rem', letterSpacing: '-0.02em' }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', margin: '1.5rem 0 0.75rem' }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', margin: '1.25rem 0 0.5rem' }}>{children}</h3>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: '1rem', color: '#9CA3AF', lineHeight: 1.8 }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#F5F5F5', fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: trackColor }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: '0.4rem', color: '#9CA3AF' }}>{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: `3px solid ${trackColor}`, margin: '1rem 0',
              background: `${trackColor}08`, borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
            }}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
