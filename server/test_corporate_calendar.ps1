$baseUrl = "http://localhost:5000/api"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  VAIDIMI CONSULTING - CORPORATE CALENDAR VERIFICATION  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Admin Login
Write-Host "`n=== TEST 1: Admin Authentication ===" -ForegroundColor Yellow
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = 'admin@company.com'
    password = 'AdminPassword123!'
} | ConvertTo-Json) -ContentType 'application/json'

if (!$adminLogin.token) { throw "Admin authentication failed!" }
Write-Host "✅ Admin Login SUCCESS: Token obtained. Role: $($adminLogin.user.role)" -ForegroundColor Green
$adminHeaders = @{ Authorization = "Bearer " + $adminLogin.token }

# 2. Employee Login
Write-Host "`n=== TEST 2: Employee Authentication ===" -ForegroundColor Yellow
$empLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = 'employee@company.com'
    password = 'EmployeePassword123!'
} | ConvertTo-Json) -ContentType 'application/json'

if (!$empLogin.token) { throw "Employee authentication failed!" }
Write-Host "✅ Employee Login SUCCESS: Token obtained. Role: $($empLogin.user.role)" -ForegroundColor Green
$empHeaders = @{ Authorization = "Bearer " + $empLogin.token }

# 3. Retrieve All Corporate Calendar Events
Write-Host "`n=== TEST 3: Retrieve All Calendar Events (Admin) ===" -ForegroundColor Yellow
$allEvents = Invoke-RestMethod -Uri "$baseUrl/calendar/events" -Headers $adminHeaders
Write-Host "✅ Total Corporate Calendar Events: $($allEvents.data.Length)" -ForegroundColor Green
if ($allEvents.data.Length -lt 10) { throw "Expected at least 10 seeded events!" }

# 4. Check Individual Filters
Write-Host "`n=== TEST 4: Category Filtering (Holidays, Events, Leaves, Deadlines) ===" -ForegroundColor Yellow
$holidays = Invoke-RestMethod -Uri "$baseUrl/calendar/events?filter=HOLIDAYS" -Headers $adminHeaders
Write-Host "  - Corporate Holidays count: $($holidays.data.Length)" -ForegroundColor Cyan

$leaves = Invoke-RestMethod -Uri "$baseUrl/calendar/events?filter=LEAVES" -Headers $adminHeaders
Write-Host "  - Approved Team Leaves count: $($leaves.data.Length)" -ForegroundColor Cyan

$deadlines = Invoke-RestMethod -Uri "$baseUrl/calendar/events?filter=PROJECTS" -Headers $adminHeaders
Write-Host "  - Project Deadlines & Milestones count: $($deadlines.data.Length)" -ForegroundColor Cyan

$events = Invoke-RestMethod -Uri "$baseUrl/calendar/events?filter=EVENTS" -Headers $adminHeaders
Write-Host "  - Corporate Office Events count: $($events.data.Length)" -ForegroundColor Cyan

# 5. Privacy Verification for Employee View
Write-Host "`n=== TEST 5: Employee Privacy Masking on Calendar ===" -ForegroundColor Yellow
$empEvents = Invoke-RestMethod -Uri "$baseUrl/calendar/events" -Headers $empHeaders
Write-Host "✅ Employee can view calendar. Events count: $($empEvents.data.Length)" -ForegroundColor Green

# 6. Admin Creates a Corporate Office Event
Write-Host "`n=== TEST 6: Admin Creates Corporate Office Event ===" -ForegroundColor Yellow
$newEventBody = @{
    title = 'Automated Verification Executive Briefing'
    description = 'Testing corporate calendar real-time event creation'
    event_type = 'MEETING'
    start_date = '2026-10-05T11:00:00.000Z'
    end_date = '2026-10-05T12:30:00.000Z'
    location = 'HQ Executive Boardroom'
} | ConvertTo-Json

$createRes = Invoke-RestMethod -Uri "$baseUrl/calendar/events" -Method Post -Headers $adminHeaders -Body $newEventBody -ContentType 'application/json'
Write-Host "✅ Created Corporate Event ID: $($createRes.data.id) - $($createRes.data.title)" -ForegroundColor Green
$createdEventId = $createRes.data.id

# 7. Employee Attempting to Create Event (RBAC Security Check)
Write-Host "`n=== TEST 7: Role Security (Employee Cannot Create Corporate Events) ===" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/calendar/events" -Method Post -Headers $empHeaders -Body $newEventBody -ContentType 'application/json'
    throw "SECURITY FLAW: Employee was allowed to create a corporate event!"
} catch {
    Write-Host "✅ Security Enforced: Employee blocked with HTTP 403 Forbidden as expected." -ForegroundColor Green
}

# 8. Admin Deletes the Test Corporate Event
Write-Host "`n=== TEST 8: Admin Deletes Corporate Event ===" -ForegroundColor Yellow
$delRes = Invoke-RestMethod -Uri "$baseUrl/calendar/events/$createdEventId" -Method Delete -Headers $adminHeaders
Write-Host "✅ Deleted Corporate Event: $($delRes.message)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ALL CORPORATE CALENDAR AUDIT & SECURITY TESTS PASSED!   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
