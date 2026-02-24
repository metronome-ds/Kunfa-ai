'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserPlus,
  Trash2,
  MoreVertical,
  Mail,
  Shield
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted';
  joined_at: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface InviteForm {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'member',
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/team');

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const { data } = await response.json();
      setTeamMembers(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const { error: errorMsg } = await response.json();
        throw new Error(errorMsg || 'Failed to invite team member');
      }

      setSuccessMessage('Team member invited successfully!');
      setInviteForm({ email: '', role: 'member' });
      setIsInviteModalOpen(false);

      setTimeout(() => {
        setSuccessMessage(null);
        fetchTeamMembers();
      }, 2000);
    } catch (err) {
      console.error('Error inviting team member:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite team member');
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      setSuccessMessage('Team member removed successfully');
      setTimeout(() => {
        setSuccessMessage(null);
        fetchTeamMembers();
      }, 2000);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      setSuccessMessage('Role updated successfully');
      setTimeout(() => {
        setSuccessMessage(null);
        fetchTeamMembers();
      }, 2000);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update role');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'accepted'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Team Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your team members and their permissions
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          Invite Member
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Team Members Section */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Loading team members...</p>
          </div>
        </div>
      ) : teamMembers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Build your team
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Invite colleagues to collaborate with you. Start by inviting team members to get started.
            </p>
            <Button onClick={() => setIsInviteModalOpen(true)}>
              Invite Your First Member
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {member.users?.avatar_url ? (
                      <img
                        src={member.users.avatar_url}
                        alt={member.users.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                        {member.users?.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {member.users?.full_name || 'Pending User'}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Mail className="h-4 w-4" />
                      {member.email}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                      <Shield className="h-4 w-4" />
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(member.status)}`}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </div>

                  {/* Joined Date */}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative ml-4">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>

                  {openMenuId === member.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-2">
                        <button
                          onClick={() => handleChangeRole(member.id, 'admin')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() => handleChangeRole(member.id, 'member')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          Make Member
                        </button>
                        <button
                          onClick={() => handleChangeRole(member.id, 'viewer')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          Make Viewer
                        </button>
                        <hr className="my-2" />
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-700 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setError(null);
        }}
        title="Invite Team Member"
        size="md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'member' | 'viewer' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="member">Member (Can view and manage deals)</option>
              <option value="admin">Admin (Full access)</option>
              <option value="viewer">Viewer (Read-only access)</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsInviteModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSending}
              disabled={!inviteForm.email}
            >
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
