import type React from "react"

interface FloorSelectorProps {
  floors: number[]
  selectedFloor: number
  onFloorChange: (floor: number) => void
}

const FloorSelector: React.FC<FloorSelectorProps> = ({ floors, selectedFloor, onFloorChange }) => {
  return (
    <div className="mb-6 flex justify-center items-center">
      <label htmlFor="floor-select" className="mr-3 text-gray-700 font-medium">
        Select Floor:
      </label>
      <select
        id="floor-select"
        value={selectedFloor}
        onChange={(e) => onFloorChange(Number.parseInt(e.target.value))}
        className="border rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {floors.map((floor) => (
          <option key={floor} value={floor}>
            Floor {floor}
          </option>
        ))}
      </select>
    </div>
  )
}

export default FloorSelector

