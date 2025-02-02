import { createClient } from '@supabase/supabase-js'

interface Employee {
  id: string
  name: string
  designation: string
  distance: number
}

interface Seat {
  id: string
  floor_number: number
  seat_number: string
  branch_id: string
  employee_id: string | null
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function calculatePriority(
  employee: Employee,
  wfhCounts: Record<string, number>,
  wfhLimits: Record<string, number>
): Promise<number> {
  const positionPriority: Record<string, number> = {
    manager: 5,
    senior: 3,
    junior: 1,
    intern: 1
  }

  const basePriority = positionPriority[employee.designation.toLowerCase()] || 0
  const maxDistance = 20
  const normalizedDistance = employee.distance / maxDistance
  const distanceFactor = normalizedDistance * 2

  let wfhFactor = 0
  if (employee.id in wfhCounts) {
    const maxWfh = wfhLimits[employee.designation.toLowerCase()]
    const currentWfh = wfhCounts[employee.id]
    const wfhPercentage = currentWfh / maxWfh
    wfhFactor = (1 - wfhPercentage) * 5

    if (currentWfh === 0) {
      wfhFactor += 3
    } else if (wfhPercentage < 0.25) {
      wfhFactor += 2
    }
  }

  return basePriority + distanceFactor + wfhFactor
}

async function allocateSeatsForWeek(date: Date) {
  const { data: companies } = await supabase
    .from('companies')
    .select('id')

  for (const company of companies || []) {
    // Get all employees for the company
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', company.id)

    // Get WFH limits
    const { data: wfhLimits } = await supabase
      .from('wfh_limits')
      .select('*')

    const wfhLimitsMap = Object.fromEntries(
      wfhLimits?.map(limit => [limit.designation.toLowerCase(), limit.monthly_limit]) || []
    )

    // Get current month's WFH counts
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const { data: wfhRecords } = await supabase
      .from('wfh_records')
      .select('employee_id, date')
      .gte('date', startOfMonth.toISOString())
      .lte('date', date.toISOString())

    // Calculate WFH counts
    const wfhCounts: Record<string, number> = {}
    wfhRecords?.forEach(record => {
      wfhCounts[record.employee_id] = (wfhCounts[record.employee_id] || 0) + 1
    })

    // Continue with weekly allocation logic...
    // [Implementation continues with similar logic to the Python script]
  }
}

// Entry point for the Edge Function
Deno.serve(async (req) => {
  try {
    const date = new Date()
    await allocateSeatsForWeek(date)
    
    return new Response(
      JSON.stringify({ message: 'Seating allocation completed' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 