// app/admin/settings/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminSettingsClient from '@/components/admin/AdminSettingsClient';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .single();

  return <AdminSettingsClient initialSettings={settings} />;
}
