import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Users, EarOff as ChairOffice, LogOut } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string;
  total_capacity: number;
  seats: {
    total: number;
    assigned: number;
  };
}

export default function Dashboard() {
  const { signOut } = useAuth();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    async function fetchBranches() {
      try {
        // First get basic branch data
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select(`
            id,
            name,
            address,
            total_capacity
          `);

        if (branchError) throw branchError;

        // Get seat counts and employee counts for each branch
        const branchesWithSeats = await Promise.all(
          (branchData || []).map(async (branch) => {
            // Get assigned seats count
            const { count: assignedSeats } = await supabase
              .from('seats')
              .select('*', { count: 'exact' })
              .eq('branch_id', branch.id)
              .not('employee_id', 'is', null);

            return {
              ...branch,
              seats: {
                total: branch.total_capacity,
                assigned: assignedSeats || 0,
              }
            };
          })
        );

        console.log('Fetched branches with data:', branchesWithSeats);
        setBranches(branchesWithSeats);
      } catch (error) {
        console.error('Error in fetchBranches:', error);
        setError('Failed to load branches');
      } finally {
        setLoading(false);
      }
    }

    fetchBranches();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Office Manager</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              <Link
                to="/employee-management"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Employees
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Branch Overview</h1>
            <Link
              to="/branch-management"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Manage Branches
            </Link>
          </div>

          {branches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No branches</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first branch.</p>
              <div className="mt-6">
                <Link
                  to="/branch-management"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Branch
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-3">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  onClick={() => navigate(`/branch/${branch.id}`)}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">{branch.name}</h2>
                      <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <p className="text-gray-600 mb-4">{branch.address}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <ChairOffice className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-500">Total Seats</span>
                        </div>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                          {branch.seats.total}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-500">Assigned</span>
                        </div>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                          {branch.seats.assigned}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-indigo-600">
                              Occupancy
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-indigo-600">
                              {Math.round((branch.seats.assigned / branch.seats.total) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                          <div
                            style={{
                              width: `${(branch.seats.assigned / branch.seats.total) * 100}%`,
                            }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}