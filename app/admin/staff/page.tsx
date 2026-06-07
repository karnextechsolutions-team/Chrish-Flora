// app/admin/staff/page.tsx
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import StaffClient from '@/components/admin/StaffClient'; // import client component

export default async function StaffPage() {
  const supabase = await createClient();

  // Get current logged-in user to prevent self-actions
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profiles that belong to staff or admins
  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'staff'])
    .order('created_at', { ascending: true });

  // Use the admin service role client to fetch emails from auth.users
  let staffMembers = (staffProfiles || []).map(p => ({ ...p, email: 'N/A' }));
  
  try {
    const adminSupabase = createAdminClient();
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    if (!authError && authData?.users) {
      const authUsers = authData.users;
      staffMembers = (staffProfiles || []).map(p => {
        const authUser = authUsers.find(u => u.id === p.id);
        return {
          ...p,
          email: authUser?.email || 'N/A'
        };
      });
    }
  } catch (err) {
    console.error('Error fetching auth user emails:', err);
  }

  return (
    <StaffClient 
      initialStaff={staffMembers} 
      currentUserId={user?.id || ''} 
    />
  );
}
