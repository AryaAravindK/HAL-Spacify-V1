import type React from "react"
import type { Employee } from "../types"

interface EmployeePopupProps {
  employee: Employee
  onClose: () => void
}

const EmployeePopup: React.FC<EmployeePopupProps> = ({ employee, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Employee Details</h2>
        <div className="space-y-2">
          <p className="text-gray-700">
            <span className="font-semibold">Name:</span> {employee.name}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Designation:</span> {employee.designation}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Seat Number:</span> {employee.seatNumber}
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default EmployeePopup

