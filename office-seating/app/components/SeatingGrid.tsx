import type React from "react"
import { useState, useEffect } from "react"
import type { Employee } from "../types"

interface SeatingGridProps {
  floorNumber: number
  seatsPerFloor: number
  onSeatClick: (employee: Employee | null) => void
}

const SeatingGrid: React.FC<SeatingGridProps> = ({ floorNumber, seatsPerFloor, onSeatClick }) => {
  const [employees, setEmployees] = useState<(Employee | null)[]>([])

  useEffect(() => {
    const fetchEmployees = async () => {
      const dummyEmployees: (Employee | null)[] = Array.from({ length: seatsPerFloor }, (_, i) => {
        if (Math.random() > 0.3) {
          return {
            id: `${floorNumber}-${i + 1}`,
            name: `Employee ${i + 1}`,
            designation: ["Manager", "Developer", "Designer", "HR"][Math.floor(Math.random() * 4)],
            seatNumber: i + 1,
          }
        }
        return null
      })
      setEmployees(dummyEmployees)
    }

    fetchEmployees()
  }, [floorNumber, seatsPerFloor])

  const gridSize = Math.ceil(Math.sqrt(seatsPerFloor))
  const cellSize = Math.min(50, 600 / gridSize) // Adjust cell size based on grid size

  return (
    <div className="relative w-full h-full max-w-[800px] max-h-[600px] overflow-hidden bg-white rounded-lg shadow-lg">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: `${gridSize * cellSize}px`,
            height: `${gridSize * cellSize}px`,
            transform: "rotateX(60deg) rotateZ(-45deg)",
          }}
        >
          {employees.map((employee, index) => (
            <div
              key={index}
              className={`cursor-pointer transform transition-all duration-200 hover:translate-y-[-5px] ${
                employee ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-gray-200 to-gray-400"
              } rounded-lg shadow-md`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                transform: `translateZ(${Math.floor(index / gridSize) * 5}px)`,
              }}
              onClick={() => onSeatClick(employee)}
            >
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SeatingGrid

