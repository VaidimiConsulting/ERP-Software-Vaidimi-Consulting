const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE AUDIT & CONNECTION RESILIENCE VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${extra ? `(${extra})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  // 1. Health check & DB Status
  console.log('\n--- 1. Health & Database Connectivity Check ---');
  try {
    const res = await apiRequest(`${BASE_URL}/health`);
    assert('Health Check Endpoint', res.status === 200);
    assert('Database Status Connected', res.data?.database?.connected === true, res.data?.database?.message);
    assert('API Status OK', res.data?.success === true);
  } catch (err) {
    assert('Health Check Endpoint', false, err.message);
  }

  // 2. Authentication: Positive & Negative Cases
  console.log('\n--- 2. Authentication & Security Edge Cases ---');
  let adminToken = '';
  let employeeToken = '';

  // 2.1 Admin login
  try {
    const res = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        loginId: 'admin@company.com',
        password: 'AdminPassword123!',
      },
    });
    assert('Admin Login', res.status === 200 && res.data?.success);
    adminToken = res.data?.token;
  } catch (err) {
    assert('Admin Login', false, err.message);
  }

  // 2.2 Employee login by username alias
  try {
    const res = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        loginId: 'varsha',
        password: 'Varsha@2026!',
      },
    });
    assert('Employee Login by Alias ("varsha")', res.status === 200 && res.data?.success);
    employeeToken = res.data?.token;
    assert('Auto Attendance on Login', res.data?.user?.todayAttendance !== undefined);
  } catch (err) {
    assert('Employee Login by Alias ("varsha")', false, err.message);
  }

  // 2.3 Bad password (should fail safely with 401, not 500)
  try {
    const res = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        loginId: 'admin@company.com',
        password: 'WrongPassword999!',
      },
    });
    assert('Bad Password Safe Rejection (401)', res.status === 401);
  } catch (err) {
    assert('Bad Password Safe Rejection', false, err.message);
  }

  // 2.4 Empty credentials
  try {
    const res = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        loginId: '',
        password: '',
      },
    });
    assert('Empty Credentials Safe Rejection (400)', res.status === 400);
  } catch (err) {
    assert('Empty Credentials Safe Rejection', false, err.message);
  }

  // 2.5 Invalid Token access (should return 401)
  try {
    const res = await apiRequest(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer fake_invalid_jwt_token_here' },
    });
    assert('Invalid Token Safe Rejection (401)', res.status === 401);
  } catch (err) {
    assert('Invalid Token Safe Rejection', false, err.message);
  }

  // 3. Attendance Lifecycle & Live Timer Check
  console.log('\n--- 3. Attendance Lifecycle & Real-Time Dynamic Timer ---');
  try {
    const empHeaders = { Authorization: `Bearer ${employeeToken}` };
    const todayRes = await apiRequest(`${BASE_URL}/attendance/today`, { headers: empHeaders });
    assert('Get Today Attendance', todayRes.status === 200 && todayRes.data?.success);
    const att = todayRes.data?.data;
    assert('Attendance Record Exists', !!att);
    assert('Live Working Hours Dynamically Computed', typeof att?.working_hours === 'number' && att.working_hours >= 0, `live: ${att?.working_hours} hrs`);

    // Verify Admin sees dynamic live hours
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const allAttRes = await apiRequest(`${BASE_URL}/attendance?date=${att?.date}`, { headers: adminHeaders });
    const foundEmpAtt = allAttRes.data?.data?.find(a => a.id === att?.id || a.attendance_id === att?.id || a.employee_id === att?.employee_id);
    assert('Admin Sees Attendance Record Matching ID', !!foundEmpAtt && (foundEmpAtt.id === att?.id || foundEmpAtt.attendance_id === att?.id));
    assert('Admin Sees Dynamic Working Hours For Employee', typeof foundEmpAtt?.working_hours === 'number' && foundEmpAtt?.working_hours >= 0, `admin sees: ${foundEmpAtt?.working_hours} hrs`);
    assert('Admin Sees Dynamic Live Hours Property', typeof foundEmpAtt?.live_working_hours === 'number' && foundEmpAtt?.live_working_hours >= 0, `live_working_hours: ${foundEmpAtt?.live_working_hours} hrs`);
  } catch (err) {
    assert('Attendance Verification', false, err.message);
  }

  // 4. CRUD Tests (Create, Update, Delete) across entities
  console.log('\n--- 4. Future-Proofing CRUD Resilience ---');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 4.1 Branch CRUD
  let testBranchId = null;
  try {
    const bCreate = await apiRequest(`${BASE_URL}/branches`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        branch_code: `BR-AUDIT-${Date.now().toString().slice(-4)}`,
        branch_name: 'Audit Resilience Branch',
        city: 'Noida',
        state: 'Uttar Pradesh',
        country: 'India',
      },
    });
    assert('Branch CREATE', bCreate.status === 201 && bCreate.data?.success);
    testBranchId = bCreate.data?.data?.id;

    const bUpdate = await apiRequest(`${BASE_URL}/branches/${testBranchId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        branch_name: 'Audit Resilience Branch Updated',
        city: 'Greater Noida',
      },
    });
    assert('Branch UPDATE', bUpdate.status === 200 && bUpdate.data?.data?.branch_name === 'Audit Resilience Branch Updated');

    const bDelete = await apiRequest(`${BASE_URL}/branches/${testBranchId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert('Branch DELETE', bDelete.status === 200 && bDelete.data?.success);
  } catch (err) {
    assert('Branch CRUD', false, err.message);
  }

  // 4.2 Holiday CRUD
  let testHolidayId = null;
  try {
    const hCreate = await apiRequest(`${BASE_URL}/holidays`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: `Audit Test Holiday ${Date.now().toString().slice(-4)}`,
        date: '2026-12-25',
        is_paid: true,
        applicable_to: 'ALL',
        description: 'Audit test description',
      },
    });
    assert('Holiday CREATE', hCreate.status === 201 && hCreate.data?.success);
    testHolidayId = hCreate.data?.data?.id;

    const hUpdate = await apiRequest(`${BASE_URL}/holidays/${testHolidayId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        name: 'Audit Test Holiday Updated',
      },
    });
    assert('Holiday UPDATE', hUpdate.status === 200 && hUpdate.data?.data?.name === 'Audit Test Holiday Updated');

    const hDelete = await apiRequest(`${BASE_URL}/holidays/${testHolidayId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert('Holiday DELETE', hDelete.status === 200 && hDelete.data?.success);
  } catch (err) {
    assert('Holiday CRUD', false, err.message);
  }

  // 4.3 Task CRUD
  let testTaskId = null;
  try {
    // Get an existing project or create one
    const projRes = await apiRequest(`${BASE_URL}/projects`, { headers: adminHeaders });
    let projectId = projRes.data?.data?.[0]?.id;
    if (!projectId) {
      const newProj = await apiRequest(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: adminHeaders,
        body: {
          project_name: 'Audit Task Test Project',
          start_date: '2026-01-01',
          status: 'IN_PROGRESS',
        },
      });
      projectId = newProj.data?.data?.id;
    }

    const tCreate = await apiRequest(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        project_id: projectId,
        title: 'Audit Test Task',
        description: 'Audit task description',
        priority: 'MEDIUM',
        status: 'TODO',
      },
    });
    assert('Task CREATE', tCreate.status === 201 && tCreate.data?.success);
    testTaskId = tCreate.data?.data?.id;

    const tUpdate = await apiRequest(`${BASE_URL}/tasks/${testTaskId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        status: 'IN_PROGRESS',
        title: 'Audit Test Task Updated',
      },
    });
    assert('Task UPDATE', tUpdate.status === 200 && tUpdate.data?.data?.status === 'IN_PROGRESS');

    const tDelete = await apiRequest(`${BASE_URL}/tasks/${testTaskId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert('Task DELETE', tDelete.status === 200 && tDelete.data?.success);
  } catch (err) {
    assert('Task CRUD', false, err.message);
  }

  // 5. Non-existent route 404 handler check
  console.log('\n--- 5. Global Error & 404 Resilience ---');
  try {
    const res = await apiRequest(`${BASE_URL}/this-route-does-not-exist-at-all`);
    assert('Unknown Route Returns Clean 404 (Not 500)', res.status === 404);
  } catch (err) {
    assert('Unknown Route 404 Handling', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit();
