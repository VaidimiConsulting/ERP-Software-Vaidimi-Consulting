const API_BASE = 'http://localhost:5000/api';

async function scanGetEndpoints() {
  console.log('=== SCANNING ALL GET API ENDPOINTS FOR 500 ERRORS ===\n');

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'AdminPassword123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const headers = { Authorization: `Bearer ${token}` };

  const getEndpoints = [
    '/health',
    '/auth/me',
    '/employees',
    '/employees/1',
    '/departments',
    '/projects',
    '/projects/4',
    '/tasks',
    '/tasks/stats',
    '/branches',
    '/branches/1',
    '/holidays',
    '/leaves',
    '/leaves/balances',
    '/leaves/my',
    '/leaves/policies',
    '/leaves/summary-report',
    '/attendance',
    '/attendance/today',
    '/attendance/monthly',
    '/payroll',
    '/payroll/my',
    '/chat/conversations',
    '/notifications',
    '/notifications/unread-count',
    '/reports/employee-summary',
    '/reports/attendance-summary',
    '/reports/leave-summary',
    '/reports/project-progress',
    '/dashboard/admin-metrics',
    '/dashboard/hr-metrics',
    '/dashboard/employee-metrics',
    '/settings',
    '/calendar/events',
  ];

  let errors = [];

  for (const ep of getEndpoints) {
    try {
      const res = await fetch(`${API_BASE}${ep}`, { headers });
      const status = res.status;
      let body;
      try {
        body = await res.json();
      } catch (e) {
        body = 'Non-JSON response';
      }

      if (status >= 500) {
        console.error(`❌ [HTTP ${status}] ${ep}:`, body.message || body);
        errors.push({ endpoint: ep, status, error: body.message || body });
      } else if (status >= 400 && status !== 404) {
        console.warn(`⚠️ [HTTP ${status}] ${ep}:`, body.message || body);
      } else {
        console.log(`✅ [HTTP ${status}] ${ep}`);
      }
    } catch (err) {
      console.error(`❌ [CONNECTION ERROR] ${ep}:`, err.message);
      errors.push({ endpoint: ep, error: err.message });
    }
  }

  console.log('\n--- SCAN SUMMARY ---');
  if (errors.length === 0) {
    console.log('🎉 ZERO 500 ERRORS DETECTED ON ANY GET ENDPOINT!');
  } else {
    console.error(`💥 Found ${errors.length} failing endpoints:`, errors);
  }
}

scanGetEndpoints();
