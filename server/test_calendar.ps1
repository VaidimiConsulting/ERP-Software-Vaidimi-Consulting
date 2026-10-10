$loginRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"admin@company.com","password":"AdminPassword123!"}'
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }
try {
  $calRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/calendar/events' -Method GET -Headers $headers
  Write-Host "Calendar API Success! Events Count: $($calRes.data.Count)"
} catch {
  Write-Host "Calendar API Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Details: $($reader.ReadToEnd())"
  }
}
