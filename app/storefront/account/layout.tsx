import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AccountNavigation from './AccountNavigation';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?returnTo=/storefront/account');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const fullName = profile?.full_name || '';
  const email = user.email || '';

  return (
    <div className="bg-[#FBF7EE]/40 min-h-screen py-0 md:py-8 md:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row bg-white border border-gray-100 shadow-sm rounded-none md:rounded-2xl overflow-hidden">
        <AccountNavigation fullName={fullName} email={email} />
        <main className="flex-1 p-6 md:p-10 min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
