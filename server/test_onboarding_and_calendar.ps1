# ==============================================================================
# Vaidimi Consulting - Onboarding, Validations & Calendar Leave Verification Test
# ==============================================================================

$BaseUrl = "http://localhost:5000/api"
$TestPass = 0
$TestFail = 0

function Assert-Equal($actual, $expected, $testName) {
    if ($actual -eq $expected) {
        Write-Host "[PASS] $testName" -ForegroundColor Green
        $script:TestPass++
    } else {
        Write-Host "[FAIL] $testName - Expected: '$expected', Got: '$actual'" -ForegroundColor Red
        $script:TestFail++
    }
}

function Assert-True($condition, $testName) {
    if ($condition) {
        Write-Host "[PASS] $testName" -ForegroundColor Green
        $script:TestPass++
    } else {
        Write-Host "[FAIL] $testName - Condition was False" -ForegroundColor Red
        $script:TestFail++
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUITE: VAIDIMI CONSULTING ONBOARDING & CALENDAR VERIFICATION   " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Login as Admin
Write-Host "`n--> 1. Authenticating as Administrator..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@company.com"
    password = "AdminPassword123!"
} | ConvertTo-Json

try {
    $adminLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $AdminToken = $adminLogin.token
    Assert-True ($adminLogin.success -eq $true) "Admin successfully authenticated"
} catch {
    Write-Host "[FATAL] Admin login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$AdminHeaders = @{
    "Authorization" = "Bearer $AdminToken"
    "Content-Type" = "application/json"
}

# 2. Test Invalid Email Validation
Write-Host "`n--> 2. Testing Invalid Email Validation..." -ForegroundColor Yellow
$invalidEmailBody = @{
    first_name = "Aarav"
    last_name = "Patel"
    email = "invalid-email-format"
    phone = "9876543210"
    designation = "Associate Consultant"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/employees" -Method Post -Headers $AdminHeaders -Body $invalidEmailBody
    Assert-True $false "Rejected invalid email"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert-Equal $statusCode 400 "Invalid email rejected with 400 Bad Request"
}

# 3. Test Invalid Mobile Number Validation
Write-Host "`n--> 3. Testing Invalid Mobile Number Validation..." -ForegroundColor Yellow
$invalidPhoneBody = @{
    first_name = "Aarav"
    last_name = "Patel"
    email = "aarav.patel@vaidimi.com"
    phone = "12345" # not 10 digits
    designation = "Associate Consultant"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/employees" -Method Post -Headers $AdminHeaders -Body $invalidPhoneBody
    Assert-True $false "Rejected invalid phone number"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert-Equal $statusCode 400 "Invalid 5-digit phone rejected with 400 Bad Request"
}

# 4. Test Invalid Name Validation
Write-Host "`n--> 4. Testing Invalid Name Validation..." -ForegroundColor Yellow
$invalidNameBody = @{
    first_name = "Aarav123#"
    last_name = "Patel"
    email = "aarav.patel@vaidimi.com"
    phone = "9876543210"
    designation = "Associate Consultant"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/employees" -Method Post -Headers $AdminHeaders -Body $invalidNameBody
    Assert-True $false "Rejected dummy/invalid name with numbers and symbols"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert-Equal $statusCode 400 "Invalid name rejected with 400 Bad Request"
}

# 5. Test Valid Employee Onboarding with Credential Generation
Write-Host "`n--> 5. Onboarding Valid Employee with Credential Generation..." -ForegroundColor Yellow
$uniqueEmail = "priya.sharma_$(Get-Date -Format 'yyyyMMddHHmmss')@vaidimi.com"
$empPassword = "Vaidimi@2026!Priya"
$validEmpBody = @{
    first_name = "Priya"
    last_name = "Sharma"
    email = $uniqueEmail
    phone = "9876543210"
    designation = "Senior Business Consultant"
    employment_type = "EMPLOYEE"
    password = $empPassword
} | ConvertTo-Json

$createdEmpRes = Invoke-RestMethod -Uri "$BaseUrl/employees" -Method Post -Headers $AdminHeaders -Body $validEmpBody
Assert-True ($createdEmpRes.success -eq $true) "Employee Priya Sharma onboarded successfully"
Assert-True ($null -ne $createdEmpRes.generatedCredentials) "API returned generatedCredentials object"
Assert-Equal $createdEmpRes.generatedCredentials.email $uniqueEmail "Generated credential email matches"
Assert-Equal $createdEmpRes.generatedCredentials.temporaryPassword $empPassword "Generated credential password matches"
$NewEmployeeId = $createdEmpRes.data.id

# 6. Test New Employee Login with Generated Credentials
Write-Host "`n--> 6. Verifying Employee Login with Onboarded Credentials..." -ForegroundColor Yellow
$empLoginBody = @{
    email = $uniqueEmail
    password = $empPassword
} | ConvertTo-Json

$empLoginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $empLoginBody -ContentType "application/json"
Assert-True ($empLoginRes.success -eq $true) "New employee logged in successfully with generated credentials"
Assert-Equal $empLoginRes.user.email $uniqueEmail "Logged in user email matches"
$EmpToken = $empLoginRes.token

# 7. Test Manager / Admin Schedule Employee Leave
Write-Host "`n--> 7. Testing Manager Calendar Leave Scheduling..." -ForegroundColor Yellow
$scheduleLeaveBody = @{
    employee_id = $NewEmployeeId
    leave_type = "PAID_LEAVE"
    start_date = "2026-10-12"
    end_date = "2026-10-14"
    is_half_day = $false
    reason = "Pre-approved family wedding leave scheduled by Manager"
} | ConvertTo-Json

$scheduleRes = Invoke-RestMethod -Uri "$BaseUrl/leaves/schedule" -Method Post -Headers $AdminHeaders -Body $scheduleLeaveBody
Assert-True ($scheduleRes.success -eq $true) "Manager scheduled leave successfully"
Assert-Equal $scheduleRes.data.status "APPROVED" "Scheduled leave is directly APPROVED"
Assert-Equal ([double]$scheduleRes.data.total_days) 3.0 "Total days calculated correctly as 3"
$ScheduledLeaveId = $scheduleRes.data.id

# 8. Test Calendar Events Aggregation
Write-Host "`n--> 8. Verifying Scheduled Leave on Unified Calendar..." -ForegroundColor Yellow
$calRes = Invoke-RestMethod -Uri "$BaseUrl/calendar/events?filter=LEAVES&start=2026-10-01&end=2026-10-31" -Method Get -Headers $AdminHeaders
Assert-True ($calRes.success -eq $true) "Calendar events retrieved successfully"
$matchingLeaveEvent = $calRes.data | Where-Object { $_.extendedProps.leave_id -eq $ScheduledLeaveId }
Assert-True ($null -ne $matchingLeaveEvent) "Scheduled leave found on Calendar events list"
Assert-Equal $matchingLeaveEvent.extendedProps.category "LEAVE" "Event categorized as LEAVE"
Assert-True ($matchingLeaveEvent.title -like "*Priya Sharma*") "Event title includes employee name"

# 9. Test Manager Revoking / Cancelling Leave
Write-Host "`n--> 9. Testing Manager Revoking Leave from Calendar..." -ForegroundColor Yellow
$cancelLeaveBody = @{
    status = "CANCELLED"
    admin_remarks = "Cancelled as requested by employee"
} | ConvertTo-Json

$cancelRes = Invoke-RestMethod -Uri "$BaseUrl/leaves/$ScheduledLeaveId/status" -Method Put -Headers $AdminHeaders -Body $cancelLeaveBody
Assert-True ($cancelRes.success -eq $true) "Leave revoked/cancelled successfully"
Assert-Equal $cancelRes.data.status "CANCELLED" "Leave status changed to CANCELLED"

# Verify it is no longer returned in active calendar leaves
$calAfterCancel = Invoke-RestMethod -Uri "$BaseUrl/calendar/events?filter=LEAVES&start=2026-10-01&end=2026-10-31" -Method Get -Headers $AdminHeaders
$stillActive = $calAfterCancel.data | Where-Object { $_.extendedProps.leave_id -eq $ScheduledLeaveId }
Assert-True ($null -eq $stillActive) "Revoked leave no longer appears on Calendar"

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE: $TestPass PASSED, $TestFail FAILED" -ForegroundColor $(if ($TestFail -eq 0) { "Green" } else { "Red" })
Write-Host "======================================================================" -ForegroundColor Cyan
