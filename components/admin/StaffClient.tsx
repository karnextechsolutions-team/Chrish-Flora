'use client';
// components/admin/StaffClient.tsx
import { useState } from 'react';
import { Plus, Trash2, Shield, UserMinus, UserCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StaffMember {
  id: string;
  role: 'customer' | 'admin' | 'staff';
  full_name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  initialStaff: StaffMember[];
  currentUserId: string;
}

export default function StaffClient({ initialStaff, currentUserId }: Props) {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // General Loading/Errors
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const supabase = createClient();

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');

    try {
      const res = await fetch('/api/admin/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite staff member');
      }

      // Add to local state
      const newStaff: StaffMember = {
        id: data.user.id,
        role: inviteRole,
        full_name: inviteName,
        email: inviteEmail,
        phone: null,
        is_active: true,
        created_at: new Date().toISOString()
      };

      setStaffList(prev => [...prev, newStaff]);
      setShowInviteModal(false);
      
      // Reset Form
      setInviteName('');
      setInviteEmail('');
      setInviteRole('staff');
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'staff' | 'admin') => {
    if (userId === currentUserId) {
      alert("You cannot change your own role for safety reasons.");
      return;
    }

    setActionLoadingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setStaffList(prev => 
        prev.map(member => 
          member.id === userId ? { ...member, role: newRole } : member
        )
      );
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    if (member.id === currentUserId) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const newActiveState = !member.is_active;
    setActionLoadingId(member.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newActiveState })
        .eq('id', member.id);

      if (error) throw error;

      setStaffList(prev => 
        prev.map(m => 
          m.id === member.id ? { ...m, is_active: newActiveState } : m
        )
      );
    } catch (err: any) {
      alert(`Failed to toggle account status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    if (userId === currentUserId) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!confirm("Are you sure you want to permanently delete this staff member? This deletes their authentication credentials and profile.")) {
      return;
    }

    setActionLoadingId(userId);

    try {
      const res = await fetch('/api/admin/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member');
      }

      setStaffList(prev => prev.filter(member => member.id !== userId));
    } catch (err: any) {
      alert(`Failed to delete staff member: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-3xl text-flora-brown">Staff Directory</h2>
          <p className="text-sm font-sans text-gray-500 mt-1">
            Manage your boutique cashier and management staff accounts.
          </p>
        </div>
        <button
          onClick={() => { setShowInviteModal(true); setInviteError(''); }}
          className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus size={16} />
          Invite Staff Member
        </button>
      </div>

      {/* Staff directory table & Cards */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
        {/* Desktop Table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Staff Member</th>
                <th className="py-3 px-6">Email Address</th>
                <th className="py-3 px-6">Role</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Created Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-serif">
                    No staff members registered.
                  </td>
                </tr>
              ) : (
                staffList.map(member => {
                  const initial = member.full_name ? member.full_name.charAt(0).toUpperCase() : '?';
                  const isSelf = member.id === currentUserId;
                  
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold-100 border border-gold-200 text-gold-800 font-serif flex items-center justify-center text-sm font-bold">
                          {initial}
                        </div>
                        <div>
                          <p className="font-serif font-semibold text-flora-brown">
                            {member.full_name || 'No Name'}
                            {isSelf && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">You</span>}
                          </p>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 font-mono text-xs">
                        {member.email}
                      </td>

                      {/* Role dropdown/badge */}
                      <td className="py-4 px-6">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-gold-100 border border-gold-200 text-gold-800">
                            {member.role}
                          </span>
                        ) : (
                          <div className="relative inline-block text-left">
                            <select
                              value={member.role}
                              disabled={actionLoadingId === member.id}
                              onChange={e => handleRoleChange(member.id, e.target.value as any)}
                              className={`text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 border focus:outline-none cursor-pointer disabled:opacity-50 transition-all
                                ${member.role === 'admin'
                                  ? 'bg-gold-50 border-gold-200 text-gold-700'
                                  : 'bg-olive-50 border-olive-200 text-olive-700'}`}
                            >
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider
                          ${member.is_active 
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                            : 'bg-red-50 border border-red-200 text-red-700'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {member.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>

                      {/* Created date */}
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {new Date(member.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-1.5">
                        {/* Toggle active / block status */}
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={isSelf || actionLoadingId === member.id}
                          title={member.is_active ? 'Deactivate User' : 'Activate User'}
                          className={`p-1.5 rounded border transition-colors disabled:opacity-30
                            ${member.is_active
                              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {member.is_active ? <UserMinus size={15} /> : <UserCheck size={15} />}
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteStaff(member.id)}
                          disabled={isSelf || actionLoadingId === member.id}
                          title="Delete User Account"
                          className="p-1.5 rounded border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List view */}
        <div className="md:hidden divide-y divide-gray-100">
          {staffList.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-serif text-sm">
              No staff members registered.
            </div>
          ) : (
            staffList.map(member => {
              const initial = member.full_name ? member.full_name.charAt(0).toUpperCase() : '?';
              const isSelf = member.id === currentUserId;
              
              return (
                <div key={member.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-100 border border-gold-200 text-gold-800 font-serif flex items-center justify-center text-sm font-bold shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-semibold text-flora-brown truncate">
                        {member.full_name || 'No Name'}
                        {isSelf && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">You</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate font-mono mt-0.5">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Role:</span>
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gold-100 border border-gold-200 text-gold-800">
                          {member.role}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={actionLoadingId === member.id}
                          onChange={e => handleRoleChange(member.id, e.target.value as any)}
                          className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border focus:outline-none cursor-pointer disabled:opacity-50 transition-all
                            ${member.role === 'admin'
                              ? 'bg-gold-50 border-gold-200 text-gold-700'
                              : 'bg-olive-50 border-olive-200 text-olive-700'}`}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider
                      ${member.is_active 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {member.is_active ? 'Active' : 'Blocked'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">
                      Added: {new Date(member.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Toggle active / block status */}
                      <button
                        onClick={() => handleToggleActive(member)}
                        disabled={isSelf || actionLoadingId === member.id}
                        title={member.is_active ? 'Deactivate User' : 'Activate User'}
                        className={`p-2 rounded border transition-colors disabled:opacity-30 flex items-center justify-center min-w-[36px] min-h-[36px]
                          ${member.is_active
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {member.is_active ? <UserMinus size={16} /> : <UserCheck size={16} />}
                      </button>

                      {/* Delete User */}
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        disabled={isSelf || actionLoadingId === member.id}
                        title="Delete User Account"
                        className="p-2 rounded border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-lg shadow-xl overflow-hidden border border-gray-100 animate-fadeIn flex flex-col">
            {/* Modal Header */}
            <div className="bg-flora-brown px-6 py-4 flex items-center justify-between text-flora-cream shrink-0">
              <h3 className="font-serif text-lg font-semibold tracking-wide">Invite Staff Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-flora-cream/60 hover:text-flora-cream transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleInviteStaff} className="p-6 space-y-4 flex-1 overflow-y-auto pb-safe scroll-touch">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded leading-normal">
                  {inviteError}
                </div>
              )}

              <div>
                <label className="label">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Perera"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah@chrishflora.lk"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="input"
                >
                  <option value="staff">Staff (POS & Orders Only)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-5 py-3 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded transition-colors h-11 flex items-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-gold px-6 py-3 h-11 flex items-center justify-center"
                >
                  {inviting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
