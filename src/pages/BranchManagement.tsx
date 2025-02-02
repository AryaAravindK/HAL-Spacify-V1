import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Plus, ArrowLeft, Pencil, Trash2 } from 'lucide-react';

interface Branch {
  id: string;
  company_id: string;
  name: string;
  address: string;
  num_floors: number;
  total_capacity: number;
}

export default function BranchManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isAddingBranch, setIsAddingBranch] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);
  const [companyId, setCompanyId] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    num_floors: 1,
    total_capacity: 0,
  });

  React.useEffect(() => {
    async function fetchCompanyId() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setCompanyId(data.company_id);
      } catch (error) {
        console.error('Error fetching company ID:', error);
        setError('Failed to load company data');
      }
    }

    fetchCompanyId();
  }, [user]);

  React.useEffect(() => {
    if (companyId) {
      fetchBranches();
    }
  }, [companyId]);

  async function fetchBranches() {
    if (!companyId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (fetchError) throw fetchError;
      setBranches(data || []);
    } catch (error) {
      setError('Failed to load branches');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'num_floors' || name === 'total_capacity' 
        ? parseInt(value) || 0 
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      setError('Company data not found');
      return;
    }

    try {
      if (editingBranch) {
        const { error: updateError } = await supabase
          .from('branches')
          .update(formData)
          .eq('id', editingBranch.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('branches')
          .insert([{
            ...formData,
            company_id: companyId
          }]);

        if (insertError) throw insertError;
      }

      setIsAddingBranch(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '', num_floors: 1, total_capacity: 0 });
      await fetchBranches();
    } catch (error) {
      setError('Failed to save branch');
      console.error('Error:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      num_floors: branch.num_floors,
      total_capacity: branch.total_capacity,
    });
    setIsAddingBranch(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchBranches();
    } catch (error) {
      setError('Failed to delete branch');
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Branch Management</h1>
          {!isAddingBranch && (
            <button
              onClick={() => {
                setIsAddingBranch(true);
                setEditingBranch(null);
                setFormData({ name: '', address: '', num_floors: 1, total_capacity: 0 });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {isAddingBranch ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Branch Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  name="address"
                  id="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="num_floors" className="block text-sm font-medium text-gray-700">
                  Number of Floors
                </label>
                <input
                  type="number"
                  name="num_floors"
                  id="num_floors"
                  required
                  min="1"
                  value={formData.num_floors}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="total_capacity" className="block text-sm font-medium text-gray-700">
                  Total Seating Capacity
                </label>
                <input
                  type="number"
                  name="total_capacity"
                  id="total_capacity"
                  required
                  min="1"
                  value={formData.total_capacity}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBranch(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingBranch ? 'Save Changes' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {branches.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No branches</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first branch.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {branches.map((branch) => (
                  <li key={branch.id}>
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
                          <p className="text-sm text-gray-500">{branch.address}</p>
                          <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                            <span>{branch.num_floors} floors</span>
                            <span>•</span>
                            <span>{branch.total_capacity} seats</span>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEdit(branch)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}