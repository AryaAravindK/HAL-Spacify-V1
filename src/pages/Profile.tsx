import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Mail, User as UserIcon } from 'lucide-react';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  company: {
    id: string;
    name: string;
    address: string;
    website_url?: string;
    social_media_links?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
  };
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<AdminProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        // First get the admin data with company details
        const { data, error: profileError } = await supabase
          .from('admins')
          .select(`
            id,
            name,
            company:companies (
              id,
              name,
              address,
              website_url,
              social_media_links
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (data) {
          setProfile({
            id: data.id,
            name: data.name,
            email: user.email || '',
            company: {
              id: data.company.id,
              name: data.company.name,
              address: data.company.address,
              website_url: data.company.website_url,
              social_media_links: data.company.social_media_links
            }
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Admin Profile</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal and company details.</p>
          </div>
          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-700 border-l-4 border-red-400">
              {error}
            </div>
          )}
          {profile && (
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Admin Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.name}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-gray-400" />
                    Email Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.email}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-gray-400" />
                    Company Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.company.name}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Company Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.company.address}
                  </dd>
                </div>
                {profile.company.website_url && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a
                        href={profile.company.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {profile.company.website_url}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Social Media</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="space-y-2">
                      {profile.company.social_media_links?.linkedin && (
                        <a
                          href={profile.company.social_media_links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 block"
                        >
                          LinkedIn
                        </a>
                      )}
                      {profile.company.social_media_links?.twitter && (
                        <a
                          href={profile.company.social_media_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 block"
                        >
                          Twitter
                        </a>
                      )}
                      {profile.company.social_media_links?.facebook && (
                        <a
                          href={profile.company.social_media_links.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 block"
                        >
                          Facebook
                        </a>
                      )}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}