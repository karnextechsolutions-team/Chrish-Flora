// app/admin/banners/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminBannersClient from '@/components/admin/AdminBannersClient';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from('promotional_banners')
    .select('*')
    .order('sort_order', { ascending: true });

  return <AdminBannersClient initialBanners={banners || []} />;
}
