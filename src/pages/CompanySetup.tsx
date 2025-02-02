import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2 } from 'lucide-react';

interface CompanyForm {
  name: string;
  address: string;
  websiteUrl?: string;
  socialMediaLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<CompanyForm>({
    name: '',
    address: '',
    websiteUrl: '',
    socialMediaLinks: {
      linkedin: '',
      twitter: '',
      facebook: '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError('');

    try {
      // First validate the form data
      if (!formData.name.trim() || !formData.address.trim()) {
        throw new Error('Company name and address are required');
      }

      // Call the setup_company function
      const { data, error: setupError } = await supabase
        .rpc('setup_company', {
          p_user_id: user.id,
          p_company_name: formData.name.trim(),
          p_company_address: formData.address.trim(),
          p_website_url: formData.websiteUrl?.trim() || null,
          p_social_media_links: Object.fromEntries(
            Object.entries(formData.socialMediaLinks || {})
              .filter(([_, value]) => value?.trim())
              .map(([key, value]) => [key, value.trim()])
          ),
          p_admin_name: user.email?.split('@')[0] || 'Admin'
        });

      if (setupError) {
        console.error('Setup error:', setupError);
        throw new Error(setupError.message || 'Failed to setup company');
      }

      // Successfully created company and admin record
      navigate('/dashboard');
    } catch (error) {
      console.error('Setup error:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create company. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith('social_')) {
      const socialPlatform = name.replace('social_', '');
      setFormData((prev) => ({
        ...prev,
        socialMediaLinks: {
          ...prev.socialMediaLinks,
          [socialPlatform]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Building2 className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set up your company
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please provide your company details to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Company Address
              </label>
              <div className="mt-1">
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Website URL (optional)
              </label>
              <div className="mt-1">
                <input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Social Media Links (optional)</h3>
              
              <div>
                <label htmlFor="social_linkedin" className="block text-sm font-medium text-gray-700">
                  LinkedIn
                </label>
                <div className="mt-1">
                  <input
                    id="social_linkedin"
                    name="social_linkedin"
                    type="url"
                    value={formData.socialMediaLinks?.linkedin}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="social_twitter" className="block text-sm font-medium text-gray-700">
                  Twitter
                </label>
                <div className="mt-1">
                  <input
                    id="social_twitter"
                    name="social_twitter"
                    type="url"
                    value={formData.socialMediaLinks?.twitter}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="social_facebook" className="block text-sm font-medium text-gray-700">
                  Facebook
                </label>
                <div className="mt-1">
                  <input
                    id="social_facebook"
                    name="social_facebook"
                    type="url"
                    value={formData.socialMediaLinks?.facebook}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Setting up...' : 'Continue to Branch Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}