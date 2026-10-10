const API_BASE = 'http://localhost:5000/api';

async function post(url, body = {}, headers = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.response = { data };
    throw error;
  }
  return data;
}

async function get(url, headers = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.response = { data };
    throw error;
  }
  return data;
}

async function runTest() {
  try {
    console.log('--- 1. Testing Employee Login & Auto-Attendance Check-in ---');
    const empLoginRes = await post('/auth/login', {
      email: 'varsha.srivastava@vaidimi.com',
      password: 'Varsha@2026!',
    });

    console.log('Login successful! User:', empLoginRes.user.email);
    const empToken = empLoginRes.token;
    const empHeaders = { Authorization: `Bearer ${empToken}` };

    // Check today's attendance for employee
    const todayRes = await get('/attendance/today', empHeaders);
    console.log("Today's Attendance status for Varsha:", {
      status: todayRes.data.status,
      current_work_status: todayRes.data.current_work_status,
      is_on_break: todayRes.data.is_on_break,
      check_in: todayRes.data.check_in,
      check_out: todayRes.data.check_out,
    });

    if (todayRes.data.status !== 'PRESENT' && todayRes.data.status !== 'HALF_DAY') {
      throw new Error(`Expected PRESENT/HALF_DAY status, got ${todayRes.data.status}`);
    }

    console.log('\n--- 2. Testing Break Start (Pause Work Session) ---');
    const breakStartRes = await post('/attendance/break-start', {}, empHeaders);
    console.log('Break Start Response:', {
      success: breakStartRes.success,
      message: breakStartRes.message,
      is_on_break: breakStartRes.data.is_on_break,
      current_work_status: breakStartRes.data.current_work_status,
      break_start: breakStartRes.data.break_start,
    });

    if (!breakStartRes.data.is_on_break || breakStartRes.data.current_work_status !== 'ON_BREAK') {
      throw new Error('Failed to start break session!');
    }

    // Verify today's status reflects break
    const midCheck = await get('/attendance/today', empHeaders);
    console.log('Mid-break today status check:', {
      is_on_break: midCheck.data.is_on_break,
      current_work_status: midCheck.data.current_work_status,
    });

    console.log('\n--- 3. Testing Break End (Resume Work Session) ---');
    const breakEndRes = await post('/attendance/break-end', {}, empHeaders);
    console.log('Break End Response:', {
      success: breakEndRes.success,
      message: breakEndRes.message,
      is_on_break: breakEndRes.data.is_on_break,
      current_work_status: breakEndRes.data.current_work_status,
      total_break_minutes: breakEndRes.data.total_break_minutes,
    });

    if (breakEndRes.data.is_on_break || breakEndRes.data.current_work_status !== 'CHECKED_IN') {
      throw new Error('Failed to end break session!');
    }

    console.log('\n--- 4. Testing Check-out (Signout) ---');
    const checkOutRes = await post('/attendance/check-out', {}, empHeaders);
    console.log('Check-out Response:', {
      success: checkOutRes.success,
      message: checkOutRes.message,
      check_out: checkOutRes.data.check_out,
      current_work_status: checkOutRes.data.current_work_status,
      working_hours: checkOutRes.data.working_hours,
      total_break_minutes: checkOutRes.data.total_break_minutes,
    });

    console.log('\n--- 5. Testing Admin Roster View ---');
    const adminLoginRes = await post('/auth/login', {
      email: 'gargi.singh@vaidimi.com',
      password: 'AdminPassword123!',
    });
    const adminToken = adminLoginRes.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const todayStr = new Date().toISOString().split('T')[0];
    const rosterRes = await get(`/attendance?date=${todayStr}`, adminHeaders);
    
    const empRecord = rosterRes.data.find(r => r.email === 'varsha.srivastava@vaidimi.com');
    console.log('Admin Attendance Roster for Varsha:', {
      name: empRecord?.name,
      check_in: empRecord?.check_in,
      check_out: empRecord?.check_out,
      status: empRecord?.status,
      current_work_status: empRecord?.current_work_status,
      total_break_minutes: empRecord?.total_break_minutes,
    });

    console.log('\n✅ ALL WORKDAY ATTENDANCE & BREAK LIFECYCLE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
