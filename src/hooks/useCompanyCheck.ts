import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useCompanyCheck() {
  const { user } = useAuth();
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkCompany() {
      if (!user) {
        setHasCompany(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admins')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setHasCompany(!!data?.company_id);
      } catch (error) {
        console.error('Error checking company:', error);
        setHasCompany(false);
      } finally {
        setLoading(false);
      }
    }

    checkCompany();
  }, [user]);

  return { hasCompany, loading };
} 