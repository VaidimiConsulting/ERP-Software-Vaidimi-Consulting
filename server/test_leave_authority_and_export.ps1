$ErrorActionPreference = 'Stop'

Write-Host "=== TEST 1: Admin Login ==="
$loginBody = @{
    email = "admin@company.com"
    password = "AdminPassword123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$adminToken = $loginRes.token
$adminHeaders = @{
    Authorization = "Bearer $adminToken"
    "Content-Type" = "application/json"
}
Write-Host "Admin Login: SUCCESS! Token obtained."

Write-Host "`n=== TEST 2: Fetch Employees & Balances ==="
$empRes = Invoke-RestMethod -Uri "http://localhost:5000/api/employees?status=ACTIVE" -Method GET -Headers $adminHeaders
$emp = $empRes.data[0]
Write-Host "Selected Employee: $($emp.first_name) $($emp.last_name) (ID: $($emp.id))"

$balancesRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/balances/$($emp.id)" -Method GET -Headers $adminHeaders
$paidBalance = $balancesRes.data | Where-Object { $_.leave_type -eq 'PAID_LEAVE' } | Select-Object -First 1
Write-Host "Initial Paid Leave Quota: Total=$($paidBalance.total_days), Remaining=$($paidBalance.remaining_days)"

Write-Host "`n=== TEST 3: Admin Adjusts Quota (+3 bonus days) ==="
$adjustBody = @{
    employee_id = $emp.id
    leave_type = "PAID_LEAVE"
    days_delta = 3
    reason = "Annual excellence reward (+3 days bonus)"
} | ConvertTo-Json

$adjustRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/balances/adjust" -Method POST -Headers $adminHeaders -Body $adjustBody
Write-Host "Adjustment Response: $($adjustRes.message)"
Write-Host "Updated Paid Leave Quota: Total=$($adjustRes.data.total_days), Remaining=$($adjustRes.data.remaining_days)"

if ([double]$adjustRes.data.total_days -ne ([double]$paidBalance.total_days + 3)) {
    throw "Total days did not increase by 3!"
}

Write-Host "`n=== TEST 4: Admin Deducts Quota (-1 day) ==="
$deductBody = @{
    employee_id = $emp.id
    leave_type = "PAID_LEAVE"
    days_delta = -1
    reason = "Administrative quota correction (-1 day)"
} | ConvertTo-Json

$deductRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/balances/adjust" -Method POST -Headers $adminHeaders -Body $deductBody
Write-Host "Updated Quota after deduction: Total=$($deductRes.data.total_days), Remaining=$($deductRes.data.remaining_days)"

if ([double]$deductRes.data.total_days -ne ([double]$paidBalance.total_days + 2)) {
    throw "Total days deduction failed!"
}

Write-Host "`n=== TEST 5: Leave Policy CRUD (Create, Update, Delete) ==="
$newPolicyBody = @{
    name = "Compassionate Leave"
    code = "COMPASSIONATE_LEAVE_$(Get-Random)"
    default_days = 5
    is_paid = $true
    description = "Special family emergency compassionate leave"
} | ConvertTo-Json

$createPolicyRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/policies" -Method POST -Headers $adminHeaders -Body $newPolicyBody
$createdPolicyId = $createPolicyRes.data.id
Write-Host "Created Leave Policy: ID=$createdPolicyId, Name=$($createPolicyRes.data.name), Days=$($createPolicyRes.data.default_days)"

$updatePolicyBody = @{
    default_days = 7
    description = "Updated description: 7 days compassionate leave"
} | ConvertTo-Json

$updatePolicyRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/policies/$createdPolicyId" -Method PUT -Headers $adminHeaders -Body $updatePolicyBody
Write-Host "Updated Leave Policy: Days=$($updatePolicyRes.data.default_days)"

$deletePolicyRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/policies/$createdPolicyId" -Method DELETE -Headers $adminHeaders
Write-Host "Deleted Leave Policy: $($deletePolicyRes.message)"

Write-Host "`n=== TEST 6: Admin Schedules Direct Leave for Employee ==="
$scheduleBody = @{
    employee_id = $emp.id
    leave_type = "CASUAL_LEAVE"
    start_date = "2026-11-20"
    end_date = "2026-11-20"
    is_half_day = $false
    reason = "Corporate client summit conference attendance"
} | ConvertTo-Json

$scheduleRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/schedule" -Method POST -Headers $adminHeaders -Body $scheduleBody
Write-Host "Scheduled Leave Result: Status=$($scheduleRes.data.status), Days=$($scheduleRes.data.days_requested)"
$scheduledLeaveId = $scheduleRes.data.id

Write-Host "`n=== TEST 7: Admin Updates Leave Status (Reject/Cancel with Remarks) ==="
$rejectBody = @{
    status = "CANCELLED"
    admin_remarks = "Summit cancelled by organizer, restoring quota."
} | ConvertTo-Json

$rejectRes = Invoke-RestMethod -Uri "http://localhost:5000/api/leaves/$scheduledLeaveId/status" -Method PUT -Headers $adminHeaders -Body $rejectBody
Write-Host "Update Status Result: $($rejectRes.message)"

Write-Host "`n=== ALL BACKEND AUTHORIZATION, LEAVE & CRUD TESTS PASSED SUCCESSFULLY! ==="
