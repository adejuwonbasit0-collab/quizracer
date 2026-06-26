import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
export default async function Root() {
  const store = await cookies();
  redirect(store.has('qr_refresh') ? '/dashboard' : '/login');
}
