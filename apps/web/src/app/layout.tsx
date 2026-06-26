import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: { default: 'QuizRacer — Multiplayer Typing & Quiz Racing', template: '%s | QuizRacer' },
  description: 'Race friends with your keyboard. Real-time typing races and quiz battles.',
  keywords: ['typing game','quiz game','multiplayer','typing race','wpm'],
};
export const viewport: Viewport = { themeColor: '#0a0d1a', colorScheme: 'dark', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
