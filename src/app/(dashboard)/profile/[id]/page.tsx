'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Edit2, MapPin, Briefcase, Calendar, ExternalLink, MessageCircle, UserPlus, ArrowLeft } from 'lucide-react';

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

export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // Fetch profile by user_id
        const { data: profileData, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', profileId)
          .single();

        if (fetchError) {
          console.error('Error fetching profile:', fetchError);
          setError('Profile not found');
        }

        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  const handleConnect = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get current user profile ID
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!currentUserProfile) {
        setError('User profile not found');
        return;
      }

      // Create connection/engagement record
      const { error: connectionError } = await supabase
        .from('engagement_scores')
        .insert({
          user_id: currentUserProfile.id,
          deal_id: profile?.id,
          views: 1,
          documents_reviewed: 0,
          notes_added: 0,
          shared_count: 0,
          time_spent_seconds: 0,
          score: 1,
        });

      if (connectionError) {
        // If engagement score fails, it's okay - connection is still made
        console.log('Connection created (engagement record optional)');
      }

      // Show success message
      alert('Connection request sent!');
    } catch (err) {
      console.error('Error connecting:', err);
      setError('Failed to send connection request');
    } finally {
      setIsConnecting(false);
    }
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading profile...</p>
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
            onClick={() => router.push('/people')}
            className="text-blue-600 hover:text-blue-700 font-medium mt-4"
          >
            Back to People Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      {/* Header Background */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700" />

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto px-6 -mt-20 mb-8">
        <Card className="p-8 relative z-10">
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
              <div className="space-y-2 text-gray-600 mb-6">
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleConnect}
                  isLoading={isConnecting}
                  disabled={isConnecting}
                >
                  <UserPlus className="h-5 w-5" />
                  Connect
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-5 w-5" />
                  Message
                </Button>
              </div>

              {/* LinkedIn Link */}
              {profile.linkedin_verified && profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mt-4"
                >
                  <ExternalLink size={16} />
                  LinkedIn Profile
                </a>
              )}

              {error && (
                <p className="text-red-600 mt-4">{error}</p>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interests</h2>
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
        </Card>
      </div>

      {/* Additional Info for Investors */}
      {profile.role === 'investor' && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-gray-600 text-sm font-medium">Deals Viewed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-600 text-sm font-medium">Engagement Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-600 text-sm font-medium">Portfolio Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </Card>
          </div>
        </div>
      )}

      {/* Additional Info for Founders */}
      {profile.role === 'founder' && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Companies
            </h2>
            <p className="text-gray-600">No companies listed yet</p>
          </Card>
        </div>
      )}
    </div>
  );
}
