// app/api/admin/invite-staff/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify caller session is admin
    const userSupabase = await createClient();
    const { data: { user: currentUser } } = await userSupabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse request body
    const { email, full_name, role } = await request.json();

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'staff' && role !== 'admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 3. Invite user using admin client
    const adminSupabase = createAdminClient();
    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name
      }
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 4. Update/upsert the profile record
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        role: role,
        full_name: full_name
      });

    if (profileError) {
      return NextResponse.json({ error: `User invited, but profile update failed: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
