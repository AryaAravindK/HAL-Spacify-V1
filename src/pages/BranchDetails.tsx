import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Filter } from 'lucide-react';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  designation: string;
  seat_number: string;
}

interface Seat {
  id: string;
  seat_number: string;
  employee?: Employee;
}

interface BranchDetails {
  id: string;
  name: string;
  num_floors: number;
  total_capacity: number;
  seats: Seat[];
}

export default function BranchDetails() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = React.useState<BranchDetails | null>(null);
  const [selectedFloor, setSelectedFloor] = React.useState<string>('A');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);

  React.useEffect(() => {
    fetchBranchDetails();
  }, [branchId]);

  async function fetchBranchDetails() {
    try {
      // Fetch branch details
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select(`
          id,
          name,
          num_floors,
          total_capacity,
          seats (
            id,
            seat_number,
            employee:employees (
              id,
              employee_id,
              name,
              designation
            )
          )
        `)
        .eq('id', branchId)
        .single();

      if (branchError) throw branchError;
      setBranch(branchData);
    } catch (error) {
      setError('Failed to load branch details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const getFloorSeats = (floor: string) => {
    if (!branch?.seats) return [];
    return branch.seats.filter(seat => seat.seat_number.startsWith(floor));
  };

  const filteredSeats = React.useMemo(() => {
    if (!branch?.seats) return [];
    let seats = getFloorSeats(selectedFloor);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      seats = seats.filter(seat => 
        seat.employee?.name.toLowerCase().includes(term) ||
        seat.employee?.employee_id.toLowerCase().includes(term)
      );
    }
    
    return seats;
  }, [branch?.seats, selectedFloor, searchTerm]);

  const renderSeatGrid = () => {
    const seats = getFloorSeats(selectedFloor);
    const totalSeats = branch?.total_capacity || 0;
    const gridSize = Math.ceil(Math.sqrt(totalSeats));

    // Calculate dynamic seat size based on total seats
    const getSeatSize = () => {
      if (totalSeats <= 16) return 16; // Default size for small number of seats
      if (totalSeats <= 25) return 14;
      if (totalSeats <= 36) return 12;
      if (totalSeats <= 49) return 10;
      if (totalSeats <= 64) return 8;
      return 6; // Minimum size for large number of seats
    };

    const seatSize = getSeatSize();
    const gapSize = Math.max(seatSize / 4, 2); // Dynamic gap size proportional to seat size

    // Generate all possible seats for the floor
    const allSeats = Array.from({ length: totalSeats }, (_, index) => {
      const seatNumber = `${selectedFloor}${index + 1}`;
      return seats.find(s => s.seat_number === seatNumber) || {
        id: `empty-${seatNumber}`,
        seat_number: seatNumber,
        employee: undefined
      };
    });

    return (
      <div className="relative w-full max-w-4xl mx-auto h-[500px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute transform"
          style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gap: `${gapSize}px`,
            transform: 'rotate(45deg) translateY(-10%)',
            maxWidth: '90%',
            maxHeight: '90%'
          }}
        >
          {allSeats.map((seat) => (
            <div
              key={seat.id}
              onClick={() => setSelectedSeat(seat)}
              style={{
                width: `${seatSize * 4}px`,
                height: `${seatSize * 4}px`
              }}
              className={`
                transform -rotate-45
                cursor-pointer transition-all duration-200
                ${seat.employee ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}
                hover:shadow-lg hover:scale-105
                rounded-lg flex items-center justify-center
                relative
              `}
            >
              <span className={`
                text-sm font-medium transform rotate-0
                ${seatSize <= 8 ? 'text-xs' : 'text-sm'}
              `}>
                {seat.seat_number}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-indigo-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">{branch?.name}</h1>
          
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Floor
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {Array.from({ length: branch?.num_floors || 0 }).map((_, index) => (
                  <option key={index} value={String.fromCharCode(65 + index)}>
                    Floor {index + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Seat Visualizer with fixed height container */}
          <div className="mb-12 border rounded-lg p-4 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Floor Plan</h2>
            <div className="relative w-full aspect-square max-h-[600px]">
              {renderSeatGrid()}
            </div>
          </div>

          {/* Employee Table */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Assigned Employees</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seat
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSeats.map((seat) => (
                    <tr key={seat.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {seat.seat_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {seat.employee?.employee_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {seat.employee?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {seat.employee?.designation || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Seat Modal */}
        {selectedSeat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Seat {selectedSeat.seat_number}</h3>
              {selectedSeat.employee ? (
                <div>
                  <p><span className="font-medium">Employee ID:</span> {selectedSeat.employee.employee_id}</p>
                  <p><span className="font-medium">Name:</span> {selectedSeat.employee.name}</p>
                  <p><span className="font-medium">Designation:</span> {selectedSeat.employee.designation}</p>
                </div>
              ) : (
                <p>This seat is unassigned</p>
              )}
              <button
                onClick={() => setSelectedSeat(null)}
                className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 