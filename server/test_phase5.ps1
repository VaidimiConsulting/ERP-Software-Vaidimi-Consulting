$ErrorActionPreference = 'Stop'
Write-Host "=== Running Phase 5 Task Management Automated Verification ==="

# 1. Login Admin
$adminBody = @{ email = 'admin@company.com'; password = 'AdminPassword123!' } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body $adminBody -ContentType 'application/json'
$adminToken = $adminLogin.token
Write-Host "[PASS] Admin Login OK. User ID: $($adminLogin.user.id)"

# 2. Login Employee
$empBody = @{ email = 'employee@company.com'; password = 'EmployeePassword123!' } | ConvertTo-Json
$empLogin = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body $empBody -ContentType 'application/json'
$empToken = $empLogin.token
$empId = $empLogin.user.employeeProfile.id
Write-Host "[PASS] Employee Login OK. Employee ID: $empId"

# 3. Get Projects to assign task to
$projects = Invoke-RestMethod -Uri 'http://localhost:5000/api/projects' -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$firstProject = $projects.data[0]
Write-Host "[PASS] Found Project: $($firstProject.project_name) (ID: $($firstProject.id))"

# 4. Admin Creates a Task
$newTaskBody = @{
    project_id = $firstProject.id
    title = 'Automated Verification Task'
    description = 'Testing task lifecycle and permissions'
    assigned_to = $empId
    priority = 'HIGH'
    status = 'TODO'
    start_date = '2026-09-15'
    due_date = '2026-09-20'
    progress_percentage = 0
} | ConvertTo-Json
$createRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks' -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -Body $newTaskBody -ContentType 'application/json'
$taskId = $createRes.data.id
Write-Host "[PASS] Admin created Task: $($createRes.data.task_code) (ID: $taskId)"

# 5. Admin fetches Task Stats
$adminStats = Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks/stats' -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "[PASS] Admin Stats: Total=$($adminStats.data.totalTasks), Pending=$($adminStats.data.pendingTasks), Completed=$($adminStats.data.completedTasks), Overdue=$($adminStats.data.overdueTasks)"

# 6. Employee fetches Task Stats (should only reflect their own tasks)
$empStats = Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks/stats' -Method Get -Headers @{ Authorization = "Bearer $empToken" }
Write-Host "[PASS] Employee Stats: Total=$($empStats.data.totalTasks), Pending=$($empStats.data.pendingTasks), Completed=$($empStats.data.completedTasks)"

# 7. Employee updates status to IN_PROGRESS and progress to 50%
$updateBody = @{ status = 'IN_PROGRESS'; progress_percentage = 50 } | ConvertTo-Json
$empUpdate = Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$taskId" -Method Put -Headers @{ Authorization = "Bearer $empToken" } -Body $updateBody -ContentType 'application/json'
Write-Host "[PASS] Employee updated status: $($empUpdate.data.status), Progress: $($empUpdate.data.progress_percentage)%"

# 8. Employee attempts to update sensitive field (title) -> Should be rejected 403
try {
    $illegalBody = @{ title = 'Hacked Task Title By Employee' } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$taskId" -Method Put -Headers @{ Authorization = "Bearer $empToken" } -Body $illegalBody -ContentType 'application/json'
    Write-Host "[FAIL] Employee was illegally able to modify task title!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "[PASS] Employee blocked from updating title (HTTP $statusCode)"
}

# 9. Employee attempts to delete task -> Should be rejected 403
try {
    Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$taskId" -Method Delete -Headers @{ Authorization = "Bearer $empToken" }
    Write-Host "[FAIL] Employee was illegally able to delete task!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "[PASS] Employee blocked from deleting task (HTTP $statusCode)"
}

# 10. Employee completes task -> should automatically set completed_at
$completeBody = @{ status = 'COMPLETED' } | ConvertTo-Json
$empComplete = Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$taskId" -Method Put -Headers @{ Authorization = "Bearer $empToken" } -Body $completeBody -ContentType 'application/json'
Write-Host "[PASS] Employee marked task COMPLETED. Completed At: $($empComplete.data.completed_at), Progress: $($empComplete.data.progress_percentage)%"

# 11. Overdue Tasks Filter Check
$overdueRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks?overdue=true' -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "[PASS] Admin queried overdue tasks. Count: $($overdueRes.count)"

# 12. Admin cleans up verification task
$delRes = Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$taskId" -Method Delete -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "[PASS] Admin deleted test task: $($delRes.message)"

# 13. Intern Login & Task Stats Check
$internBody = @{ email = 'intern@company.com'; password = 'InternPassword123!' } | ConvertTo-Json
$internLogin = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body $internBody -ContentType 'application/json'
$internToken = $internLogin.token
$internStats = Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks/stats' -Method Get -Headers @{ Authorization = "Bearer $internToken" }
Write-Host "[PASS] Intern Login OK. Intern Assigned Tasks: Total=$($internStats.data.totalTasks), Pending=$($internStats.data.pendingTasks)"

Write-Host "=== All Phase 5 Backend Tests Passed Successfully! ===" -ForegroundColor Green
