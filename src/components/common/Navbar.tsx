'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, Settings, User, ChevronDown, Check, CheckCheck, Plus, Building2, Landmark, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/components/TenantProvider';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

interface EntityOption {
  id: string;
  name: string;
  type: string; // 'startup' | 'fund' | 'family_office' | 'angel' | 'lender'
  logo_url: string | null;
  memberRole: string; // 'owner' | 'admin' | 'member' | 'observer'
}

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'Dashboard' }: NavbarProps) {
  const router = useRouter();
  const { tenant, isTenantContext } = useTenant();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Entity context state
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const entityDropdownRef = useRef<HTMLDivElement>(null);

  // Create entity modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<'fund' | 'startup'>('fund');
  const [createEntityName, setCreateEntityName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }

        // Fetch unread notification count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        setNotificationCount(count || 0);

        // Fetch entity context
        try {
          const res = await fetch('/api/entities');
          if (res.ok) {
            const data = await res.json();
            const entityList: EntityOption[] = (data.entities || []).map((e: any) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              logo_url: e.logo_url,
              memberRole: e.memberRole,
            }));
            setEntities(entityList);

            // Determine active entity from profile
            if (profile?.active_entity_id) {
              setActiveEntityId(profile.active_entity_id);
            } else if (entityList.length > 0) {
              setActiveEntityId(entityList[0].id);
            }
          }
        } catch {
          // Ignore — entity context is optional
        }
      }
    };

    loadUserProfile();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (entityDropdownRef.current && !entityDropdownRef.current.contains(event.target as Node)) {
        setIsEntityDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEntityDropdownOpen(false);
        setIsDropdownOpen(false);
        setIsNotificationsOpen(false);
        setIsCreateModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotifications = () => {
    const newState = !isNotificationsOpen;
    setIsNotificationsOpen(newState);
    if (newState) {
      fetchNotifications();
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setNotificationCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationCount(0);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      setIsNotificationsOpen(false);
      router.push(notification.link);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSwitchEntity = useCallback(async (entityId: string) => {
    setIsSwitching(true);
    setIsEntityDropdownOpen(false);
    try {
      const res = await fetch(`/api/entities/${entityId}/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        setIsSwitching(false);
      }
    } catch {
      setIsSwitching(false);
    }
  }, []);

  const handleCreateEntity = async () => {
    if (!createEntityName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createEntityName.trim(),
          type: createEntityType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setCreateEntityName('');
        // Switch to the new entity
        await handleSwitchEntity(data.entity.id);
      }
    } catch {
      // Error creating entity
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_invite':
        return '👥';
      case 'deal_stage_change':
        return '📊';
      case 'score_ready':
        return '⭐';
      case 'report_ready':
        return '📄';
      case 'data_room_view':
        return '👁️';
      case 'intro_request':
        return '🤝';
      case 'ai_recommendation':
        return '🤖';
      default:
        return '🔔';
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'fund': return { label: 'Fund', className: 'bg-blue-100 text-blue-700' };
      case 'startup': return { label: 'Startup', className: 'bg-purple-100 text-purple-700' };
      case 'family_office': return { label: 'Family Office', className: 'bg-emerald-100 text-emerald-700' };
      case 'angel': return { label: 'Angel', className: 'bg-amber-100 text-amber-700' };
      case 'lender': return { label: 'Lender', className: 'bg-teal-100 text-teal-700' };
      default: return { label: type, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const activeEntity = entities.find(e => e.id === activeEntityId) || entities[0] || null;
  const hasEntities = entities.length > 0;
  const userName = userProfile?.full_name || 'User';

  // What shows next to the user name
  const contextLabel = activeEntity?.name || (userProfile?.role === 'investor' ? 'Investor' : userProfile?.role === 'startup' || userProfile?.role === 'founder' ? 'Startup' : userProfile?.role || '');

  return (
    <div className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-[#E5E7EB] z-40">
      <div className="h-full px-8 flex items-center justify-between">
        {/* Left: Title/Breadcrumb */}
        <h2 className="text-xl font-bold text-[#111827]">
          {isTenantContext && tenant ? (tenant.display_name || tenant.name) : title}
        </h2>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden lg:flex items-center gap-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-3 py-2 w-64 hover:bg-gray-100 transition-colors">
            <Search className="h-4 w-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search deals, people, companies..."
              className="bg-transparent outline-none text-sm text-[#111827] placeholder-[#9CA3AF] w-full"
            />
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8F9FB] rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 max-h-[480px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {notificationCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-[#007CF8] hover:text-[#0066D6] transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="overflow-y-auto flex-1">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                          !notification.read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm leading-snug ${
                                  !notification.read
                                    ? 'font-semibold text-gray-900'
                                    : 'font-medium text-gray-700'
                                }`}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full mt-1.5"></span>
                              )}
                            </div>
                            {notification.body && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {notification.body}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Entity Switcher */}
          {hasEntities && (
            <div className="relative hidden sm:block" ref={entityDropdownRef}>
              <button
                onClick={() => setIsEntityDropdownOpen(!isEntityDropdownOpen)}
                disabled={isSwitching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F8F9FB] transition-colors text-sm disabled:opacity-50"
              >
                {activeEntity && (
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${getEntityTypeBadge(activeEntity.type).className}`}>
                    {getEntityTypeBadge(activeEntity.type).label}
                  </span>
                )}
                <span className="font-medium text-[#4B5563] max-w-[140px] truncate">
                  {activeEntity?.name || contextLabel}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform ${isEntityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isEntityDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-[#E5E7EB]">
                    <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Your Entities</p>
                  </div>
                  {entities.map((entity) => {
                    const isActive = entity.id === activeEntityId;
                    const badge = getEntityTypeBadge(entity.type);
                    return (
                      <button
                        key={entity.id}
                        onClick={() => {
                          if (isActive) {
                            setIsEntityDropdownOpen(false);
                            return;
                          }
                          handleSwitchEntity(entity.id);
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          isActive ? 'bg-[#F0F7FF]' : 'hover:bg-[#F8F9FB]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isActive ? 'font-semibold text-[#111827]' : 'font-medium text-[#111827]'}`}>
                            {entity.name}
                          </p>
                          {entity.memberRole !== 'owner' && (
                            <p className="text-xs text-[#9CA3AF]">{entity.memberRole}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
                          {badge.label}
                        </span>
                        {isActive && (
                          <Check className="h-4 w-4 text-[#007CF8] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {/* Create new entity options */}
                  <div className="border-t border-[#E5E7EB] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsEntityDropdownOpen(false);
                        setCreateEntityType('fund');
                        setCreateEntityName('');
                        setIsCreateModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-[#4B5563] hover:bg-[#F8F9FB] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <Landmark className="h-3.5 w-3.5" />
                      Create New Fund
                    </button>
                    <button
                      onClick={() => {
                        setIsEntityDropdownOpen(false);
                        setCreateEntityType('startup');
                        setCreateEntityName('');
                        setIsCreateModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-[#4B5563] hover:bg-[#F8F9FB] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <Building2 className="h-3.5 w-3.5" />
                      Create New Company
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Avatar Dropdown */}
          <div className="relative border-l border-[#E5E7EB] pl-4" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F8F9FB] transition-colors"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#007CF8] flex items-center justify-center text-white text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[#111827] leading-none">
                  {userName}
                </p>
                <p className="text-xs text-[#4B5563] leading-none mt-0.5">
                  {!hasEntities && contextLabel ? contextLabel : (userProfile?.role || '')}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF] hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-50">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-[#111827] hover:bg-[#F8F9FB] transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-[#111827] hover:bg-[#F8F9FB] transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <div className="border-t border-[#E5E7EB] my-1" />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Entity Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">
                Create New {createEntityType === 'fund' ? 'Fund' : 'Company'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-[#4B5563]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  {createEntityType === 'fund' ? 'Fund Name' : 'Company Name'}
                </label>
                <input
                  type="text"
                  value={createEntityName}
                  onChange={(e) => setCreateEntityName(e.target.value)}
                  placeholder={createEntityType === 'fund' ? 'e.g. Acme Ventures' : 'e.g. My Startup Inc.'}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007CF8] focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createEntityName.trim()) {
                      handleCreateEntity();
                    }
                  }}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#4B5563] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEntity}
                  disabled={!createEntityName.trim() || isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#007CF8] hover:bg-[#0066D6] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
