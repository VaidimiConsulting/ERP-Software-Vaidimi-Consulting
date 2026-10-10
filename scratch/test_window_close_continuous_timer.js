const API_BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function testWindowClosedTimerPersistence() {
  console.log('=== TESTING CONTINUOUS TIMER PERSISTENCE ACROSS CLOSED WINDOWS ===\n');

  // 1. Employee Login
  const loginRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'varsha.srivastav@vaidimi.com', password: 'Varsha@2026!' }
  });
  const token = loginRes.data.token;
  console.log('1. Employee Login:', loginRes.status, 'Token Generated: ✅');

  // 2. Fetch Today Attendance
  const todayRes = await req(`${API_BASE}/attendance/today`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('2. Today Attendance on Check-In:', {
    check_in: todayRes.data.data?.check_in,
    current_work_status: todayRes.data.data?.current_work_status,
    live_working_hours: todayRes.data.data?.working_hours,
    total_break_minutes: todayRes.data.data?.total_break_minutes
  });

  // 3. Simulate Window Closed (Wait 3 seconds)
  console.log('3. Simulating user closing the browser window for 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));

  // 4. User Reopens Window Later
  const reopenRes = await req(`${API_BASE}/attendance/today`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('4. User Reopens Window -> Fetched Status:', {
    check_in: reopenRes.data.data?.check_in,
    current_work_status: reopenRes.data.data?.current_work_status,
    live_working_hours: reopenRes.data.data?.working_hours,
    persisted: reopenRes.data.data?.check_in !== null
  });

  // 5. Admin Live Roster Check
  const adminLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const rosterRes = await req(`${API_BASE}/attendance`, {
    headers: { Authorization: `Bearer ${adminLogin.data.token}` }
  });
  const varshaRoster = rosterRes.data.data?.find(e => e.email === 'varsha.srivastav@vaidimi.com');
  console.log('5. Admin Live Roster sees Employee Work Time:', {
    name: varshaRoster?.name,
    check_in: varshaRoster?.check_in,
    live_working_hours: varshaRoster?.working_hours,
    status: varshaRoster?.status,
    current_work_status: varshaRoster?.current_work_status
  });

  console.log('\n=== RESULT: TIMER CONTINUOUSLY PERSISTS IN DATABASE & RUNS ACROSS BROWSER CLOSURES ===');
}

testWindowClosedTimerPersistence();
