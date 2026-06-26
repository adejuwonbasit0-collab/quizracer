import { PrismaService } from '../../prisma/prisma.service';

export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 20)
    .replace(/^[-_]+|[-_]+$/g, '') || 'player';
}

/** Generate a unique username from a base string, appending a number if taken. */
export async function generateUsername(base: string, prisma: PrismaService): Promise<string> {
  const sanitized = sanitizeUsername(base) || 'player';

  const existing = await prisma.user.findUnique({
    where: { username: sanitized },
    select: { id: true },
  });
  if (!existing) return sanitized;

  // Try up to 999 suffixed variants
  for (let i = 2; i < 1000; i++) {
    const candidate = `${sanitized.slice(0, 28)}${i}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  // Last resort: timestamp suffix
  return `${sanitized.slice(0, 20)}${Date.now().toString(36)}`;
}


