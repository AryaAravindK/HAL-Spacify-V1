from datetime import datetime, timedelta

employees = {
    1: {"name": "Alice", "position": "manager", "distance": 10},
    2: {"name": "Bob", "position": "senior", "distance": 5},
    3: {"name": "Charlie", "position": "junior", "distance": 15},
    4: {"name": "David", "position": "intern", "distance": 3},
    5: {"name": "Eve", "position": "senior", "distance": 8},
    6: {"name": "Frank", "position": "senior", "distance": 12},
    7: {"name": "Grace", "position": "junior", "distance": 7},
    8: {"name": "Henry", "position": "intern", "distance": 4},
    9: {"name": "Ivy", "position": "junior", "distance": 9},
    10: {"name": "Ivy2", "position": "junior", "distance":19},
}

office_layout = {
    1: {"floor_seats": 2, "seats": [101, 102]},
    2: {"floor_seats": 3, "seats": [201, 202]},
    3: {"floor_seats": 1, "seats": [301, 302]},
    4: {"floor_seats": 4, "seats": [301, 402]},
}

seats = {
    101: {"floor": 1, "occupied_by": None},
    102: {"floor": 1, "occupied_by": None},
    201: {"floor": 2, "occupied_by": None},
    202: {"floor": 2, "occupied_by": None},
    301: {"floor": 3, "occupied_by": None},
    302: {"floor": 3, "occupied_by": None},
    401: {"floor": 4, "occupied_by": None},
    402: {"floor": 4, "occupied_by": None},
}

leave_requests = {}
seating_plan = {}
wfh_queue = []

# Add new global variables
wfh_limits = {
    "manager": 4,
    "senior": 6,
    "junior": 8,
    "intern": 8
}

wfh_counts = {}  # Track WFH days per employee per month
current_month = None

def calculate_priority(position, distance, emp_id):
    position_priority = {
        "manager": 5,
        "senior": 3,
        "junior": 1,
        "intern": 1
    }
    
    base_priority = position_priority.get(position, 0)
    
    # Normalize distance factor (0-2 points)
    max_distance = 20
    normalized_distance = distance / max_distance
    distance_factor = normalized_distance * 2
    
    # Enhanced WFH factor (0-5 points)
    wfh_factor = 0
    if emp_id in wfh_counts:
        # Calculate percentage of WFH days used
        max_wfh = wfh_limits[employees[emp_id]["position"]]
        current_wfh = wfh_counts[emp_id]
        wfh_percentage = current_wfh / max_wfh
        
        # Inverse relationship: less WFH = higher priority
        # Scale from 0-5 to make this factor more significant
        wfh_factor = (1 - wfh_percentage) * 5
        
        # Additional penalty for uneven distribution
        if current_wfh == 0:  # No WFH days yet
            wfh_factor += 3  # Boost priority significantly
        elif wfh_percentage < 0.25:  # Less than 25% of WFH used
            wfh_factor += 2
    
    final_priority = base_priority + distance_factor + wfh_factor
    return final_priority

def allocate_weekly_seating(week_start):
    global wfh_queue, wfh_counts, current_month
    
    # Initialize or reset WFH counts for new month
    if current_month != week_start.month:
        current_month = week_start.month
        wfh_counts = {emp_id: 0 for emp_id in employees.keys()}
        # Initialize WFH queue with all employees sorted by priority (low to high)
        wfh_queue = []
        priority_queue = []
        for emp_id, emp in employees.items():
            priority = calculate_priority(emp["position"], emp["distance"], emp_id)
            priority_queue.append((priority, emp_id))
        priority_queue.sort()  # Sort low to high
        wfh_queue = [emp_id for _, emp_id in priority_queue]
    
    assigned_seats = []
    this_week_wfh = []
    
    # Get available seats
    available_seats = []
    for floor, layout in office_layout.items():
        available_seats.extend(layout["seats"])
    total_seats = len(available_seats)
    
    # Reset seating plan
    for seat in seats.values():
        seat["occupied_by"] = None
    seating_plan.clear()
    
    # Calculate how many people need WFH this week
    wfh_needed = len(employees) - total_seats
    
    # Select WFH employees from the queue
    for _ in range(wfh_needed):
        if not wfh_queue:  # If queue is empty, refill it
            priority_queue = []
            for emp_id, emp in employees.items():
                if wfh_counts[emp_id] < wfh_limits[emp["position"]]:  # Only include those under limit
                    priority = calculate_priority(emp["position"], emp["distance"], emp_id)
                    priority_queue.append((priority, emp_id))
            priority_queue.sort()  # Sort low to high
            wfh_queue = [emp_id for _, emp_id in priority_queue]
        
        if wfh_queue:
            emp_id = wfh_queue.pop(0)  # Get next employee from queue
            if wfh_counts[emp_id] < wfh_limits[employees[emp_id]["position"]]:
                this_week_wfh.append(emp_id)
                wfh_counts[emp_id] = wfh_counts.get(emp_id, 0) + 1
    
    # Assign seats to remaining employees (those not WFH)
    remaining_employees = set(employees.keys()) - set(this_week_wfh)
    priority_queue = []
    for emp_id in remaining_employees:
        priority = calculate_priority(employees[emp_id]["position"], employees[emp_id]["distance"], emp_id)
        priority_queue.append((priority, emp_id))
    
    priority_queue.sort(reverse=True)  # High to low for office seating
    
    for priority, emp_id in priority_queue:
        if available_seats:
            seat_number = available_seats.pop(0)
            seating_plan[emp_id] = seat_number
            seats[seat_number]["occupied_by"] = emp_id
            assigned_seats.append((emp_id, seat_number))
    
    return {
        "seat_assignments": assigned_seats,
        "wfh_employees": this_week_wfh,
        "seating_by_floor": get_seating_by_floor(assigned_seats),
        "wfh_counts": wfh_counts
    }

def get_seating_by_floor(assigned_seats):
    floor_assignments = {}
    for emp_id, seat_num in assigned_seats:
        floor = seats[seat_num]["floor"]
        if floor not in floor_assignments:
            floor_assignments[floor] = []
        floor_assignments[floor].append({
            "employee": employees[emp_id]["name"],
            "seat": seat_num,
            "position": employees[emp_id]["position"]
        })
    return floor_assignments

def request_leave(employee_id, leave_date):
    leave_requests[employee_id] = leave_date
    return f"Leave request submitted for Employee {employee_id} on {leave_date}."

def reallocate_seats(today):
    vacant_seats = [seating_plan[emp_id] for emp_id, leave_date in leave_requests.items() 
                   if leave_date == today and emp_id in seating_plan]
    updated_seating = []

    for seat in vacant_seats:
        if wfh_queue:
            new_employee = wfh_queue.pop(0)
            seating_plan[new_employee] = seat
            seats[seat]["occupied_by"] = new_employee
            updated_seating.append((new_employee, seat))

    return updated_seating

def rotate_wfh(week_start):
    last_week_wfh = list(wfh_queue)
    wfh_queue.clear()

    for emp_id in employees.keys():
        if emp_id in last_week_wfh:
            wfh_queue.append(emp_id)

    return wfh_queue

def allocate_daily_seating(date, week_wfh_counts):
    """Allocate seating for a specific day, tracking WFH within weekly and monthly limits"""
    global wfh_counts, current_month, wfh_queue
    
    # Initialize or reset WFH counts for new month
    if current_month != date.month:
        current_month = date.month
        wfh_counts = {emp_id: 0 for emp_id in employees.keys()}
    
    assigned_seats = []
    today_wfh = []
    
    # Get available seats
    available_seats = []
    for floor, layout in office_layout.items():
        available_seats.extend(layout["seats"])
    total_seats = len(available_seats)
    
    # Reset seating plan for the day
    for seat in seats.values():
        seat["occupied_by"] = None
    seating_plan.clear()
    
    # Calculate how many people need WFH today
    wfh_needed = len(employees) - total_seats
    
    # If queue is empty or it's a new day, refill it with all eligible employees
    if not wfh_queue:
        priority_queue = []
        for emp_id, emp in employees.items():
            if (week_wfh_counts.get(emp_id, 0) < 5 and  # Max 5 days per week
                wfh_counts.get(emp_id, 0) < wfh_limits[emp["position"]]):  # Check monthly limit
                priority = calculate_priority(emp["position"], emp["distance"], emp_id)
                priority_queue.append((priority, emp_id))
        priority_queue.sort()  # Sort low to high
        wfh_queue = [emp_id for _, emp_id in priority_queue]
    
    # Assign WFH for the day
    temp_queue = wfh_queue.copy()  # Work with a copy to preserve the main queue
    while len(today_wfh) < wfh_needed and temp_queue:
        emp_id = temp_queue.pop(0)
        if (week_wfh_counts.get(emp_id, 0) < 5 and  # Max 5 days per week
            wfh_counts.get(emp_id, 0) < wfh_limits[employees[emp_id]["position"]]):  # Check monthly limit
            today_wfh.append(emp_id)
            week_wfh_counts[emp_id] = week_wfh_counts.get(emp_id, 0) + 1
            wfh_counts[emp_id] = wfh_counts.get(emp_id, 0) + 1
    
    # Rotate the WFH queue for tomorrow
    # Move today's WFH employees to the end of the queue
    wfh_queue = [emp_id for emp_id in wfh_queue if emp_id not in today_wfh]
    wfh_queue.extend(today_wfh)
    
    # Assign seats to remaining employees
    remaining_employees = set(employees.keys()) - set(today_wfh)
    priority_queue = []
    for emp_id in remaining_employees:
        priority = calculate_priority(employees[emp_id]["position"], employees[emp_id]["distance"], emp_id)
        priority_queue.append((priority, emp_id))
    
    priority_queue.sort(reverse=True)  # High to low for office seating
    
    for priority, emp_id in priority_queue:
        if available_seats:
            seat_number = available_seats.pop(0)
            seating_plan[emp_id] = seat_number
            seats[seat_number]["occupied_by"] = emp_id
            assigned_seats.append((emp_id, seat_number))
    
    return {
        "date": date.strftime("%Y-%m-%d"),
        "seat_assignments": assigned_seats,
        "wfh_employees": today_wfh,
        "seating_by_floor": get_seating_by_floor(assigned_seats)
    }

if __name__ == "__main__":
    # Simulate 4 weeks
    current_date = datetime.today()
    weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    for week in range(4):
        week_start = current_date + timedelta(days=(7 - current_date.weekday()))
        print(f"\n=== Week {week + 1} (Starting {week_start.strftime('%Y-%m-%d')}) ===")
        
        # Track WFH days for this week
        week_wfh_counts = {}
        
        # Generate plan for each workday
        for day in range(5):  # Monday to Friday
            current_day = week_start + timedelta(days=day)
            print(f"\n--- {weekdays[day]} ({current_day.strftime('%Y-%m-%d')}) ---")
            
            daily_allocation = allocate_daily_seating(current_day, week_wfh_counts)
            
            print("\nSeating Assignments by Floor:")
            for floor, assignments in daily_allocation["seating_by_floor"].items():
                print(f"\nFloor {floor}:")
                for assignment in assignments:
                    print(f"  {assignment['employee']} ({assignment['position']}): Seat {assignment['seat']}")
            
            print("\nWFH Employees:")
            wfh_emp_names = [f"{employees[emp_id]['name']}" 
                           for emp_id in daily_allocation["wfh_employees"]]
            print(", ".join(wfh_emp_names) if wfh_emp_names else "None")
        
        print("\nWeek Summary - WFH Days:")
        for emp_id, count in week_wfh_counts.items():
            emp = employees[emp_id]
            print(f"{emp['name']} ({emp['position']}): {count} days")
        
        print("\nMonth-to-Date WFH Usage:")
        for emp_id, count in wfh_counts.items():
            emp = employees[emp_id]
            remaining = wfh_limits[emp["position"]] - count
            print(f"{emp['name']} ({emp['position']}): {count}/{wfh_limits[emp['position']]} WFH days used ({remaining} remaining)")
        
        current_date = week_start + timedelta(days=7)
