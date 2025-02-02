import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, Upload, Search, Edit2, Trash2, Table, X, AlertCircle } from 'lucide-react';
import ExcelUploader from '../components/ExcelUploader';

interface Employee {
  id: string;
  company_id: string;
  employee_id: string;
  name: string;
  designation: string;
  email: string;
  branch_id?: string;
  seat_number?: string;
}

interface Branch {
  id: string;
  name: string;
  num_floors?: number;
  total_capacity?: number;
}

interface EmployeePreview extends Omit<Employee, 'id' | 'company_id'> {
  status?: 'valid' | 'error';
  error?: string;
}

interface SeatAllocation {
  employee_id: string;
  seat_number: string;
  is_wfh: boolean;
}

interface AllocationResult {
  date: string;
  seat_assignments: Array<{
    employee_id: string;
    employee_name: string;
    seat_number: string;
    is_wfh: false;
  }>;
  wfh_employees: Array<{
    employee_id: string;
    employee_name: string;
    is_wfh: true;
  }>;
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const calculatePriority = (
  designation: string,
  distance: number,
  wfhCount: number,
  wfhLimit: number
): number => {
  const positionPriority: Record<string, number> = {
    manager: 5,
    senior: 3,
    junior: 1,
    intern: 1
  };

  const basePriority = positionPriority[designation.toLowerCase()] || 0;
  const maxDistance = 20;
  const normalizedDistance = distance / maxDistance;
  const distanceFactor = normalizedDistance * 2;

  let wfhFactor = 0;
  const wfhPercentage = wfhCount / wfhLimit;
  wfhFactor = (1 - wfhPercentage) * 5;

  if (wfhCount === 0) {
    wfhFactor += 3;
  } else if (wfhPercentage < 0.25) {
    wfhFactor += 2;
  }

  return basePriority + distanceFactor + wfhFactor;
};

export default function EmployeeManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<string>('');
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [previewData, setPreviewData] = React.useState<EmployeePreview[]>([]);
  const [showPreview, setShowPreview] = React.useState(false);
  const [isAllocating, setIsAllocating] = React.useState(false);
  const [allocationResult, setAllocationResult] = React.useState<AllocationResult | null>(null);
  const [showAllocationModal, setShowAllocationModal] = React.useState(false);
  const [branchHasSeats, setBranchHasSeats] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    console.log('Auth user changed:', user);
    async function fetchCompanyId() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        console.log('Fetched company ID:', data.company_id);
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
      console.log('Company ID changed, fetching data...');
      fetchEmployees();
      fetchBranches();
      checkBranchSeatsDetails();
    }
  }, [companyId]);

  async function fetchEmployees() {
    if (!companyId) return;
    console.log('Fetching employees for company:', companyId);

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select(`
          id,
          company_id,
          employee_id,
          name,
          designation,
          email,
          distance,
          seats (
            branch_id,
            seat_number
          )
        `)
        .eq('company_id', companyId);

      if (fetchError) throw fetchError;
      
      console.log('Fetched employees:', data);
      
      const transformedData = (data || []).map(employee => ({
        id: employee.id,
        company_id: employee.company_id,
        employee_id: employee.employee_id,
        name: employee.name,
        designation: employee.designation,
        email: employee.email,
        distance: employee.distance || 0,
        branch_id: employee.seats?.[0]?.branch_id || null,
        seat_number: employee.seats?.[0]?.seat_number || null
      }));

      setEmployees(transformedData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function checkBranchSeats(branchId: string) {
    const { data: seats, error } = await supabase
      .from('seats')
      .select('id')
      .eq('branch_id', branchId);
    
    if (error) {
      console.error('Error checking seats:', error);
      return false;
    }
    return seats && seats.length > 0;
  }

  async function fetchBranches() {
    if (!companyId) return;
    console.log('Fetching branches for company:', companyId);

    try {
      const { data: branchData, error: fetchError } = await supabase
        .from('branches')
        .select(`
          id,
          name,
          num_floors,
          total_capacity
        `)
        .eq('company_id', companyId);

      if (fetchError) throw fetchError;
      console.log('Fetched branches:', branchData);
      
      // Check seats for each branch
      const seatChecks: Record<string, boolean> = {};
      for (const branch of branchData || []) {
        const { data: seats, error: seatsError } = await supabase
          .from('seats')
          .select('id')
          .eq('branch_id', branch.id)
          .limit(1);
        
        if (seatsError) {
          console.error('Error checking seats for branch:', branch.id, seatsError);
        }
        
        seatChecks[branch.id] = seats && seats.length > 0;
        console.log(`Branch ${branch.name} has seats:`, seatChecks[branch.id]);
      }
      
      setBranchHasSeats(seatChecks);
      setBranches(branchData || []);
      
      // Auto-select branch if only one with seats exists
      const branchesWithSeats = branchData?.filter(b => seatChecks[b.id]) || [];
      if (branchesWithSeats.length === 1) {
        console.log('Auto-selecting branch:', branchesWithSeats[0].id);
        setSelectedBranch(branchesWithSeats[0].id);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setError('Failed to load branches');
    }
  }

  const handleBranchSelect = async (branchId: string) => {
    const hasSeats = await checkBranchSeats(branchId);
    if (hasSeats) {
      setSelectedBranch(branchId);
      setError('');
    } else {
      setError('Selected branch has no seats configured');
      setSelectedBranch('');
    }
  };

  const handleUpload = async (employeeData: Omit<Employee, 'id' | 'company_id'>[]) => {
    const preview = employeeData.map(employee => {
      const status = validateEmployee(employee);
      return {
        ...employee,
        status: status.valid ? 'valid' : 'error',
        error: status.error
      };
    });

    setPreviewData(preview);
    setShowPreview(true);
  };

  const validateEmployee = (employee: Omit<Employee, 'id' | 'company_id'>) => {
    if (!employee.email.includes('@')) {
      return { valid: false, error: 'Invalid email format' };
    }
    if (!employee.employee_id || employee.employee_id.length < 2) {
      return { valid: false, error: 'Employee ID must be at least 2 characters' };
    }
    if (!employee.name || employee.name.trim().length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters' };
    }
    if (!employee.designation || employee.designation.trim().length < 2) {
      return { valid: false, error: 'Designation must be at least 2 characters' };
    }
    return { valid: true, error: undefined };
  };

  const handleConfirmUpload = async () => {
    if (!companyId) {
      setError('Company data not found');
      return;
    }

    const validEmployees = previewData.filter(emp => emp.status === 'valid');
    if (validEmployees.length === 0) {
      setError('No valid employees to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formattedEmployees = validEmployees.map(({ status, error, ...employee }) => ({
        company_id: companyId,
        employee_id: employee.employee_id,
        name: employee.name,
        designation: employee.designation,
        email: employee.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const batches = chunkArray(formattedEmployees, 5);
      let uploadedCount = 0;
      let failedCount = 0;

      for (const batch of batches) {
        try {
          const { error: uploadError } = await supabase
            .from('employees')
            .insert(batch);

          if (uploadError) {
            console.error('Batch upload error:', uploadError);
            failedCount += batch.length;
          } else {
            uploadedCount += batch.length;
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Batch error:', error);
          failedCount += batch.length;
        }
      }

      if (failedCount > 0) {
        setError(`Upload completed with errors. ${uploadedCount} records uploaded, ${failedCount} failed.`);
      } else {
        setError('');
      }

      await fetchEmployees();
      setShowPreview(false);
      setPreviewData([]);

    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error) {
        setError(`Failed to upload employees: ${error.message}`);
      } else {
        setError('Failed to upload employees');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      setError('Failed to delete employee');
      console.error('Error:', error);
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      (employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!selectedBranch || employee.branch_id === selectedBranch || !employee.branch_id)
  );

  const handleAllocateSeats = async () => {
    if (!companyId || !selectedBranch) {
      setError('Missing required data: company or branch not selected');
      return;
    }
    
    setIsAllocating(true);
    setError('');

    try {
      // First clear all existing assignments for this branch
      const { error: clearError } = await supabase
        .from('seats')
        .update({ employee_id: null })
        .eq('branch_id', selectedBranch);

      if (clearError) throw clearError;

      // Fetch all available seats for the branch
      const { data: availableSeats, error: seatsError } = await supabase
        .from('seats')
        .select('id, floor_number, seat_number')
        .eq('branch_id', selectedBranch)
        .order('floor_number')
        .order('seat_number');

      if (seatsError) throw seatsError;
      
      if (!availableSeats?.length) {
        throw new Error('No seats found for selected branch');
      }

      // Fetch WFH limits
      const { data: wfhLimits, error: limitsError } = await supabase
        .from('wfh_limits')
        .select('*');

      if (limitsError || !wfhLimits?.length) {
        throw new Error('Failed to fetch WFH limits');
      }

      if (employees.length === 0) {
        throw new Error('No employees found to allocate');
      }

      // Calculate priorities and sort employees
      const employeePriorities = employees
        .map(emp => ({
          ...emp,
          priority: calculatePriority(
            emp.designation,
            emp.distance || 0,
            0, // Initial WFH count
            wfhLimits.find(l => l.designation.toLowerCase() === emp.designation.toLowerCase())?.monthly_limit || 8
          )
        }))
        .sort((a, b) => b.priority - a.priority);

      // Split employees into office and WFH based on available seats
      const officeEmployees = employeePriorities.slice(0, availableSeats.length);
      const wfhEmployees = employeePriorities.slice(availableSeats.length);

      console.log(`Allocating seats for ${officeEmployees.length} employees`);
      console.log(`WFH assignments for ${wfhEmployees.length} employees`);

      // Create seat assignments batch
      const seatUpdates = officeEmployees.map((emp, index) => ({
        id: availableSeats[index].id,
        employee_id: emp.id
      }));

      // Batch update seats with new assignments
      for (const update of seatUpdates) {
        const { error: updateError } = await supabase
          .from('seats')
          .update({ employee_id: update.employee_id })
          .eq('id', update.id);

        if (updateError) {
          console.error('Error updating seat:', update, updateError);
          throw new Error(`Failed to update seat assignment for employee ${update.employee_id}`);
        }
      }

      // Record WFH assignments
      if (wfhEmployees.length > 0) {
        const { error: wfhError } = await supabase
          .from('wfh_records')
          .insert(
            wfhEmployees.map(emp => ({
              employee_id: emp.id,
              date: new Date().toISOString().split('T')[0],
              company_id: companyId
            }))
          );

        if (wfhError) throw wfhError;
      }

      // Verify assignments
      const { data: verifySeats, error: verifyError } = await supabase
        .from('seats')
        .select('id, employee_id')
        .eq('branch_id', selectedBranch);

      if (verifyError) throw verifyError;

      const unassignedSeats = verifySeats.filter(seat => !seat.employee_id).length;
      console.log(`Verification: ${unassignedSeats} seats remain unassigned`);

      // Prepare result for display
      const result: AllocationResult = {
        date: new Date().toISOString().split('T')[0],
        seat_assignments: seatUpdates.map(update => {
          const seat = availableSeats.find(s => s.id === update.id);
          const employee = employees.find(e => e.id === update.employee_id);
          return {
            employee_id: update.employee_id,
            employee_name: employee?.name || 'Unknown Employee',
            seat_number: seat?.seat_number || 'Unknown Seat',
            is_wfh: false
          };
        }),
        wfh_employees: wfhEmployees.map(emp => ({
          employee_id: emp.id,
          employee_name: emp.name || 'Unknown Employee',
          is_wfh: true
        }))
      };

      setAllocationResult(result);
      setShowAllocationModal(true);
      await fetchEmployees(); // Refresh the employee list

    } catch (error) {
      console.error('Allocation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to allocate seats');
    } finally {
      setIsAllocating(false);
    }
  };

  const PreviewModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Preview Uploaded Data</h3>
          <button
            onClick={() => {
              setShowPreview(false);
              setPreviewData([]);
            }}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-96 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.map((employee, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.status === 'valid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {employee.status === 'valid' ? 'Valid' : 'Error'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.designation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                    {employee.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowPreview(false);
              setPreviewData([]);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmUpload}
            disabled={isUploading || !previewData.some(emp => emp.status === 'valid')}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading in batches...' : 'Confirm Upload'}
          </button>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Valid records: {previewData.filter(emp => emp.status === 'valid').length} /{' '}
            {previewData.length}
          </p>
          {isUploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Uploading in batches of 5...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const AllocationModal = () => {
    if (!allocationResult) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Seat Allocation Results</h3>
            <button
              onClick={() => setShowAllocationModal(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Office Assignments</h4>
            <ul className="space-y-2">
              {allocationResult.seat_assignments.map((assignment) => (
                <li 
                  key={`seat-${assignment.employee_id}`} 
                  className="flex justify-between items-center bg-gray-50 p-2 rounded"
                >
                  <span>{assignment.employee_name}</span>
                  <span className="text-gray-600">Seat {assignment.seat_number}</span>
                </li>
              ))}
            </ul>
          </div>

          {allocationResult.wfh_employees && allocationResult.wfh_employees.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">WFH Assignments</h4>
              <ul className="space-y-2">
                {allocationResult.wfh_employees.map((emp) => (
                  <li 
                    key={`wfh-${emp.employee_id}`}
                    className="flex justify-between items-center bg-yellow-50 p-2 rounded"
                  >
                    <span>{emp.employee_name}</span>
                    <span className="text-yellow-600">WFH</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => setShowAllocationModal(false)}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DebugInfo = () => (
    <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
      <h3 className="font-bold mb-2">Debug Information:</h3>
      <pre>
        {JSON.stringify({
          companyId,
          selectedBranch,
          employeesCount: employees.length,
          branchesCount: branches.length,
          branchesWithSeats: Object.entries(branchHasSeats)
            .filter(([_, hasSeats]) => hasSeats)
            .map(([id]) => id),
          isAllocating,
        }, null, 2)}
      </pre>
    </div>
  );

  async function checkBranchSeatsDetails() {
    if (!companyId) return;
    
    try {
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select(`
          id,
          name,
          total_capacity,
          seats (
            id,
            floor_number,
            seat_number
          )
        `)
        .eq('company_id', companyId);

      if (branchError) throw branchError;

      console.log('Branch Seat Details:');
      branchData?.forEach(branch => {
        console.log(`Branch: ${branch.name}`);
        console.log(`Total Capacity: ${branch.total_capacity}`);
        console.log(`Configured Seats: ${branch.seats?.length || 0}`);
        console.log('---');
      });
    } catch (error) {
      console.error('Error checking branch seats:', error);
    }
  }

  async function configureBranchSeats(branchId: string) {
    try {
      // First, get the branch details including floors and capacity
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name, num_floors, total_capacity')
        .eq('id', branchId)
        .single();

      if (branchError) throw branchError;

      if (!branch.num_floors || !branch.total_capacity) {
        throw new Error('Branch floor count or capacity not configured');
      }

      // Calculate seats per floor (rounded up)
      const seatsPerFloor = Math.ceil(branch.total_capacity / branch.num_floors);

      // Generate seat records floor by floor
      let seatRecords = [];
      let seatCount = 0;

      for (let floor = 1; floor <= branch.num_floors; floor++) {
        // Calculate how many seats should be on this floor
        const seatsOnThisFloor = Math.min(
          seatsPerFloor,
          branch.total_capacity - seatCount
        );

        const floorSeats = Array.from({ length: seatsOnThisFloor }, (_, i) => ({
          branch_id: branchId,
          floor_number: floor,
          seat_number: `${String.fromCharCode(64 + floor)}${(i + 1).toString().padStart(2, '0')}`
        }));

        seatRecords = [...seatRecords, ...floorSeats];
        seatCount += seatsOnThisFloor;

        if (seatCount >= branch.total_capacity) break;
      }

      console.log(`Configuring ${seatRecords.length} seats for branch ${branch.name}`);
      console.log(`Floors: ${branch.num_floors}, Total Capacity: ${branch.total_capacity}`);

      // Insert seats
      const { error: insertError } = await supabase
        .from('seats')
        .insert(seatRecords);

      if (insertError) throw insertError;

      // Refresh the branch data
      await fetchBranches();
      setError('');
    } catch (error) {
      console.error('Error configuring seats:', error);
      setError(error instanceof Error ? error.message : 'Failed to configure seats');
    }
  }

  const BranchSeatsManager = () => (
    <div className="mt-4 p-4 bg-gray-50 rounded-md">
      <h3 className="text-lg font-medium mb-2">Branch Seat Configuration</h3>
      <div className="space-y-4">
        {branches.map(branch => (
          <div key={branch.id} className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium">{branch.name}</span>
                <div className="text-sm text-gray-500">
                  Floors: {branch.num_floors} | Capacity: {branch.total_capacity}
                </div>
              </div>
              {!branchHasSeats[branch.id] && (
                <button
                  onClick={() => configureBranchSeats(branch.id)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Configure Seats
                </button>
              )}
              {branchHasSeats[branch.id] && (
                <span className="text-green-500 text-sm">✓ Seats Configured</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  async function checkSeatAssignments() {
    if (!selectedBranch) return;

    try {
      const { data: seats, error } = await supabase
        .from('seats')
        .select(`
          id,
          seat_number,
          floor_number,
          employee_id,
          employees (
            name,
            designation
          )
        `)
        .eq('branch_id', selectedBranch);

      if (error) throw error;

      console.log('Seat Assignment Status:');
      seats?.forEach(seat => {
        console.log(`Seat ${seat.seat_number} (Floor ${seat.floor_number}):`,
          seat.employee_id 
            ? `Assigned to ${seat.employees?.name} (${seat.employees?.designation})`
            : 'Unassigned'
        );
      });

    } catch (error) {
      console.error('Error checking seat assignments:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">Employee Management</h1>
          <button
            onClick={handleAllocateSeats}
            disabled={isAllocating || !selectedBranch || !branchHasSeats[selectedBranch]}
            className={`ml-4 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white 
              ${isAllocating || !selectedBranch || !branchHasSeats[selectedBranch]
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
              }`}
            title={
              !selectedBranch 
                ? 'Please select a branch'
                : !branchHasSeats[selectedBranch]
                ? 'Selected branch has no seats configured'
                : ''
            }
          >
            {isAllocating ? 'Allocating...' : 'Allocate Seats'}
          </button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Employees</h2>
          <ExcelUploader
            onUpload={handleUpload}
            onError={setError}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex-1 w-full sm:w-auto sm:mr-4">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  !selectedBranch ? 'text-gray-500' : 'text-gray-900'
                }`}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option 
                    key={branch.id} 
                    value={branch.id}
                    disabled={!branchHasSeats[branch.id]}
                  >
                    {branch.name} {!branchHasSeats[branch.id] ? '(No seats configured)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-sm text-gray-500">
              <div>Selected Branch: {selectedBranch || 'None'}</div>
              <div>Branches with seats: {Object.entries(branchHasSeats)
                .filter(([_, hasSeats]) => hasSeats)
                .map(([id]) => branches.find(b => b.id === id)?.name)
                .join(', ')}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seat Assignment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.employee_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.seat_number ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Seat {employee.seat_number}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPreview && <PreviewModal />}
      {showAllocationModal && <AllocationModal />}
      {process.env.NODE_ENV === 'development' && <DebugInfo />}
      {process.env.NODE_ENV === 'development' && <BranchSeatsManager />}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={checkSeatAssignments}
          className="mt-2 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Check Seat Assignments
        </button>
      )}
    </div>
  );
} 