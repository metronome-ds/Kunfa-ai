'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Edit2, MapPin, Briefcase, Calendar, ExternalLink } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  company: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  role: string;
  linkedin_url: string | null;
  linkedin_verified: boolean;
  interests: string[];
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // If no userId in params, show current user's profile
      const targetUserId = userId || user.id;
      setIsOwnProfile(!userId || userId === user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setIsLoading(false);
    };

    fetchProfile();
  }, [userId, router]);

  const handleEditProfile = () => {
    router.push('/settings');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Profile not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Background */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700"></div>

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto px-6 -mt-20 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center md:items-start">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-24 h-24 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}

              {isOwnProfile && (
                <button
                  onClick={handleEditProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all mt-4"
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile Details */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.full_name}
                </h1>
                {profile.headline && (
                  <p className="text-lg text-gray-600 mt-1">{profile.headline}</p>
                )}
              </div>

              {/* Role Badge */}
              {profile.role && (
                <div className="inline-block mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Briefcase size={16} className="mr-2" />
                    {profile.role.charAt(0).toUpperCase() +
                      profile.role.slice(1).replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Location & Company */}
              <div className="space-y-2 text-gray-600 mb-4">
                {profile.company && (
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-gray-400" />
                    <span>{profile.company}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-gray-400" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <span>Member since {formatDate(profile.created_at)}</span>
                  </div>
                )}
              </div>

              {/* LinkedIn Link */}
              {profile.linkedin_verified && profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  LinkedIn Profile
                </a>
              )}
            </div>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Interests Section */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats Section (for investors/founders) */}
      {profile.role === 'investor' && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm font-medium">Deals Viewed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm font-medium">Engagement Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm font-medium">Connections</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
          </div>
        </div>
      )}

      {profile.role === 'founder' && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Listed Deals
            </h2>
            <p className="text-gray-600">No deals listed yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
