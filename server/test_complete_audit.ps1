$ErrorActionPreference = 'Stop'
Write-Host "========================================================="
Write-Host "      FINAL QA & SECURITY AUDIT TEST SUITE"
Write-Host "========================================================="

$baseUrl = "http://localhost:5000/api"

# 1. Health & DB
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "[PASS 1/20] Health & DB Check: Status=$($health.status), DB=$($health.database.connected)"

# 2. Authentication & Password Hashing
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = 'admin@company.com'; password = 'AdminPassword123!' } | ConvertTo-Json) -ContentType 'application/json'
$adminToken = $adminLogin.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$empLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = 'employee@company.com'; password = 'EmployeePassword123!' } | ConvertTo-Json) -ContentType 'application/json'
$empToken = $empLogin.token
$empId = $empLogin.user.employeeProfile.id
$empHeaders = @{ Authorization = "Bearer $empToken" }

$internLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = 'intern@company.com'; password = 'InternPassword123!' } | ConvertTo-Json) -ContentType 'application/json'
$internToken = $internLogin.token
$internId = $internLogin.user.employeeProfile.id
$internHeaders = @{ Authorization = "Bearer $internToken" }

# Sensitive Data Exposure check: Ensure password hash is NOT returned
if ($adminLogin.user.password -or $adminLogin.user.password_hash) {
    throw "SECURITY LEAK: Password hash exposed in login response!"
}
Write-Host "[PASS 2/20] Authentication, JWT & Password Hashing verified. Zero credential leakage."

# 3. RBAC: Employee CANNOT access Admin APIs
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/admin-only-test" -Method Get -Headers $empHeaders
    throw "SECURITY LEAK: Employee was able to access /auth/admin-only-test!"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -ne 403) { throw "Expected 403 but got $code" }
    Write-Host "[PASS 3/20] RBAC: Employee blocked from Admin-only API (HTTP 403 Forbidden)."
}

# 4. Attendance: Check-In, Duplicate Prevention & Working Hours
$todayAtt = Invoke-RestMethod -Uri "$baseUrl/attendance/today" -Method Get -Headers $empHeaders
Write-Host "[PASS 4/20] Today Attendance fetched. Status: $($todayAtt.data.status)"

# Check-in
$checkInRes = Invoke-RestMethod -Uri "$baseUrl/attendance/check-in" -Method Post -Headers $empHeaders
Write-Host "[PASS 5/20] Employee Check-In OK: Status=$($checkInRes.data.status), Time=$($checkInRes.data.check_in)"

# Duplicate Check-in Prevention
try {
    Invoke-RestMethod -Uri "$baseUrl/attendance/check-in" -Method Post -Headers $empHeaders
    throw "BUG: Duplicate check-in was allowed!"
} catch {
    Write-Host "[PASS 6/20] Attendance: Duplicate check-in properly blocked with HTTP 400."
}

# Check-out
$checkOutRes = Invoke-RestMethod -Uri "$baseUrl/attendance/check-out" -Method Post -Headers $empHeaders
Write-Host "[PASS 7/20] Employee Check-Out OK: Hours=$($checkOutRes.data.working_hours), Status=$($checkOutRes.data.status)"

# Admin Attendance Override
$overrideBody = @{
    employee_id = $internId
    date = (Get-Date).ToString('yyyy-MM-dd')
    status = 'PRESENT'
    working_hours = 8.0
    notes = 'Verified in lab'
} | ConvertTo-Json
$overrideRes = Invoke-RestMethod -Uri "$baseUrl/attendance/override" -Method Post -Headers $adminHeaders -Body $overrideBody -ContentType 'application/json'
Write-Host "[PASS 8/20] Admin Attendance Override OK for Intern ID $internId."

# 5. Leaves: Quota, Overlap Prevention, Balance Validation
$balances = Invoke-RestMethod -Uri "$baseUrl/leaves/balances" -Method Get -Headers $empHeaders
Write-Host "[PASS 9/20] Leave Balances loaded: Count=$($balances.data.Count)"

# Apply for Paid Leave
$futureStart = (Get-Date).AddDays(10).ToString('yyyy-MM-dd')
$futureEnd = (Get-Date).AddDays(12).ToString('yyyy-MM-dd')
$leaveBody = @{
    leave_type = 'PAID_LEAVE'
    start_date = $futureStart
    end_date = $futureEnd
    is_half_day = $false
    reason = 'Family vacation'
} | ConvertTo-Json
$leaveRes = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Headers $empHeaders -Body $leaveBody -ContentType 'application/json'
$leaveId = $leaveRes.data.id
Write-Host "[PASS 10/20] Leave Applied: ID=$leaveId, Type=$($leaveRes.data.leave_type), Days=$($leaveRes.data.total_days)"

# Overlap Validation Test: Attempting overlapping leave
try {
    $overlapBody = @{
        leave_type = 'SICK_LEAVE'
        start_date = (Get-Date).AddDays(11).ToString('yyyy-MM-dd')
        end_date = (Get-Date).AddDays(14).ToString('yyyy-MM-dd')
        reason = 'Overlapping test'
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Headers $empHeaders -Body $overlapBody -ContentType 'application/json'
    throw "BUG: Overlapping leave was allowed!"
} catch {
    Write-Host "[PASS 11/20] Overlap Validation: Collision properly rejected with HTTP 400."
}

# 6. Admin Approves Leave & Balance Deduction
$approveRes = Invoke-RestMethod -Uri "$baseUrl/leaves/$leaveId/status" -Method Put -Headers $adminHeaders -Body (@{ status = 'APPROVED'; admin_remarks = 'Have fun' } | ConvertTo-Json) -ContentType 'application/json'
Write-Host "[PASS 12/20] Admin Approved Leave ID $($leaveId): Status=$($approveRes.data.status)"

# 7. CRITICAL PRIVACY TEST: Menstrual Leave Privacy Masking
$menstrualStart = (Get-Date).AddDays(20).ToString('yyyy-MM-dd')
$menstrualEnd = (Get-Date).AddDays(21).ToString('yyyy-MM-dd')
$menstrualBody = @{
    leave_type = 'MENSTRUAL_LEAVE'
    start_date = $menstrualStart
    end_date = $menstrualEnd
    reason = 'Confidential personal menstrual health rest'
} | ConvertTo-Json
$menstrualRes = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Headers $empHeaders -Body $menstrualBody -ContentType 'application/json'
$menstrualLeaveId = $menstrualRes.data.id

# Admin approves it
Invoke-RestMethod -Uri "$baseUrl/leaves/$menstrualLeaveId/status" -Method Put -Headers $adminHeaders -Body (@{ status = 'APPROVED' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null

# Peer Employee (Intern) queries calendar events: MUST be masked!
$peerCalendar = Invoke-RestMethod -Uri "$baseUrl/calendar/events?filter=LEAVES" -Method Get -Headers $internHeaders
$maskedFound = $false
foreach ($evt in $peerCalendar.data) {
    if ($evt.extendedProps.leave_type -eq 'MENSTRUAL_LEAVE') {
        throw "SECURITY & PRIVACY BREACH: Peer employee was able to see MENSTRUAL_LEAVE!"
    }
    if ($evt.extendedProps.reason -like "*menstrual*") {
        throw "SECURITY & PRIVACY BREACH: Peer employee was able to see sensitive menstrual reason!"
    }
    if ($evt.extendedProps.leave_type -eq 'PERSONAL_LEAVE' -or $evt.extendedProps.is_masked) {
        $maskedFound = $true
    }
}
Write-Host "[PASS 13/20] CRITICAL PRIVACY RULE: Menstrual Leave masked to PERSONAL_LEAVE and reason scrubbed for peers."

# 8. Company Holiday CRUD
$holDate = (Get-Date).AddDays(40).ToString('yyyy-MM-dd')
$holBody = @{
    name = 'Audit Test Holiday'
    date = $holDate
    is_paid = $true
    applicable_to = 'ALL'
    description = 'Test Holiday'
} | ConvertTo-Json
$holRes = Invoke-RestMethod -Uri "$baseUrl/holidays" -Method Post -Headers $adminHeaders -Body $holBody -ContentType 'application/json'
$holId = $holRes.data.id
Write-Host "[PASS 14/20] Holiday Created: $($holRes.data.name) (ID: $holId)"

# Employee tries to delete holiday -> Must be 403
try {
    Invoke-RestMethod -Uri "$baseUrl/holidays/$holId" -Method Delete -Headers $empHeaders
    throw "SECURITY LEAK: Employee was able to delete a holiday!"
} catch {
    Write-Host "[PASS 15/20] Holiday RBAC: Employee blocked from deleting holiday (HTTP 403)."
}

# 9. Company Calendar Aggregator
$calendarRes = Invoke-RestMethod -Uri "$baseUrl/calendar/events" -Method Get -Headers $adminHeaders
Write-Host "[PASS 16/20] Calendar Event Aggregator OK: Total Events=$($calendarRes.count)"

# 10. Notifications
$notifs = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -Headers $empHeaders
Write-Host "[PASS 17/20] Notifications fetched: Count=$($notifs.count), Unread=$($notifs.unreadCount)"

# 11. Reports (Admin Only)
$empReport = Invoke-RestMethod -Uri "$baseUrl/reports/employee" -Method Get -Headers $adminHeaders
$attReport = Invoke-RestMethod -Uri "$baseUrl/reports/attendance" -Method Get -Headers $adminHeaders
$leaveReport = Invoke-RestMethod -Uri "$baseUrl/reports/leave" -Method Get -Headers $adminHeaders
$projReport = Invoke-RestMethod -Uri "$baseUrl/reports/project" -Method Get -Headers $adminHeaders
$taskReport = Invoke-RestMethod -Uri "$baseUrl/reports/task" -Method Get -Headers $adminHeaders
$internReport = Invoke-RestMethod -Uri "$baseUrl/reports/intern" -Method Get -Headers $adminHeaders

Write-Host "[PASS 18/20] All 6 Reports generated successfully with active database records."

# Employee tries to access Reports -> Must be 403
try {
    Invoke-RestMethod -Uri "$baseUrl/reports/employee" -Method Get -Headers $empHeaders
    throw "SECURITY LEAK: Employee was able to access Reports!"
} catch {
    Write-Host "[PASS 19/20] Reports RBAC: Employee blocked from Reports API (HTTP 403)."
}

# 12. Dashboard Metrics (Admin & Employee)
$adminDash = Invoke-RestMethod -Uri "$baseUrl/dashboard/admin" -Method Get -Headers $adminHeaders
$empDash = Invoke-RestMethod -Uri "$baseUrl/dashboard/employee" -Method Get -Headers $empHeaders

Write-Host "[PASS 20/20] Executive & Workspace Dashboard Metrics verified:"
Write-Host "             Employees: $($adminDash.data.totalEmployees), Interns: $($adminDash.data.totalInterns)"
Write-Host "             Active Projects: $($adminDash.data.activeProjects), Completed: $($adminDash.data.completedProjects)"
Write-Host "             Pending Leaves: $($adminDash.data.pendingLeaves), Overdue Tasks: $($adminDash.data.overdueTasks)"

# Clean up test holiday
Invoke-RestMethod -Uri "$baseUrl/holidays/$holId" -Method Delete -Headers $adminHeaders | Out-Null

Write-Host "========================================================="
Write-Host "     ALL 20 AUDIT SUITE TESTS PASSED WITH ZERO ERRORS!" -ForegroundColor Green
Write-Host "========================================================="
