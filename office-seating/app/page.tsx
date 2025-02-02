"use client"

import { useState } from "react"
import FloorSelector from "./components/FloorSelector"
import SeatingGrid from "./components/SeatingGrid"
import EmployeePopup from "./components/EmployeePopup"
import type { Employee } from "./types"

export default function OfficeSeatVisualization() {
  const [floors, setFloors] = useState<{ [key: number]: number }>({ 1: 20 })
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const handleFloorChange = (floor: number) => {
    setSelectedFloor(floor)
  }

  const handleSeatClick = (employee: Employee | null) => {
    setSelectedEmployee(employee)
  }

  const handleAddFloor = () => {
    const newFloorNumber = Object.keys(floors).length + 1
    setFloors((prev) => ({ ...prev, [newFloorNumber]: 20 }))
  }

  const handleUpdateFloorCapacity = (floor: number, capacity: number) => {
    setFloors((prev) => ({ ...prev, [floor]: capacity }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Office Seating Arrangement</h1>
        <div className="mb-6 flex flex-wrap justify-center gap-4">
          {Object.entries(floors).map(([floor, capacity]) => (
            <div key={floor} className="flex items-center gap-2">
              <label className="text-gray-700">Floor {floor} Capacity:</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => handleUpdateFloorCapacity(Number(floor), Math.max(1, Number.parseInt(e.target.value)))}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
              />
            </div>
          ))}
          <button
            onClick={handleAddFloor}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
          >
            Add Floor
          </button>
        </div>
        <FloorSelector
          floors={Object.keys(floors).map(Number)}
          selectedFloor={selectedFloor}
          onFloorChange={handleFloorChange}
        />
        <div className="flex justify-center items-center h-[calc(100vh-300px)]">
          <SeatingGrid
            floorNumber={selectedFloor}
            seatsPerFloor={floors[selectedFloor]}
            onSeatClick={handleSeatClick}
          />
        </div>
      </div>
      {selectedEmployee && <EmployeePopup employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
    </div>
  )
}

