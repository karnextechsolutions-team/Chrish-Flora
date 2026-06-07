// app/admin/customers/page.tsx
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import CustomersClient from '../../../components/admin/CustomersClient'; // import client component

export default async function CustomersPage() {
  const supabase = await createClient();

  // Fetch all customer profiles (role = 'customer')
  const { data: customerProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  // Fetch all orders in the system to calculate counts, spend totals, and inline history
  const { data: orders } = await supabase
    .from('orders')
    .select('id, user_id, total, status, created_at, customer_name, customer_email, customer_phone, fulfillment_method')
    .order('created_at', { ascending: false });

  // Use the admin service role client to fetch emails from auth.users
  let customersWithEmails = (customerProfiles || []).map(p => ({ ...p, email: 'N/A' }));

  try {
    const adminSupabase = createAdminClient();
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    if (!authError && authData?.users) {
      const authUsers = authData.users;
      customersWithEmails = (customerProfiles || []).map(p => {
        const authUser = authUsers.find(u => u.id === p.id);
        return {
          ...p,
          email: authUser?.email || 'N/A'
        };
      });
    }
  } catch (err) {
    console.error('Error fetching customer auth emails:', err);
  }

  return (
    <CustomersClient 
      initialCustomers={customersWithEmails} 
      initialOrders={orders || []} 
    />
  );
}
