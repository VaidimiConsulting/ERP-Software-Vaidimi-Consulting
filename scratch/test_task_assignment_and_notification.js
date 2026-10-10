/**
 * Test Task Assignment, Notification Dispatch & Front Page Dashboard Retrieval
 */
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

async function runTest() {
  console.log('================================================================');
  console.log('🧪 TESTING TASK ASSIGNMENT, INSTANT NOTIFICATION & FRONT PAGE DISPLAY');
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

  // 1. Admin login
  const adminLogin = await apiRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { loginId: 'admin@company.com', password: 'AdminPassword123!' },
  });
  assert('Admin Login', adminLogin.status === 200 && adminLogin.data?.token);
  const adminToken = adminLogin.data?.token;

  // 2. Employee (Varsha) login
  const empLogin = await apiRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { loginId: 'varsha', password: 'Varsha@2026!' },
  });
  assert('Employee Login', empLogin.status === 200 && empLogin.data?.token);
  const empToken = empLogin.data?.token;
  const empId = empLogin.data?.user?.employeeProfile?.id;
  assert('Employee ID Found', !!empId, `ID: ${empId}`);

  // 3. Fetch project
  const projRes = await apiRequest(`${BASE_URL}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const projectId = projRes.data?.data?.[0]?.id;
  assert('Project Available for Task Assignment', !!projectId, `Project ID: ${projectId}`);

  // 4. Create Task assigned to employee
  const testTitle = `Front-Page Priority Assignment ${Date.now().toString().slice(-4)}`;
  const taskCreate = await apiRequest(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      project_id: projectId,
      title: testTitle,
      description: 'Implement real-time dashboard notification listener and responsive review.',
      assigned_to: empId,
      priority: 'HIGH',
      status: 'TODO',
      due_date: '2026-09-30',
    },
  });
  assert('Task Created & Assigned to Employee', taskCreate.status === 201 && taskCreate.data?.success);
  const createdTaskId = taskCreate.data?.data?.id;

  // 5. Verify Employee receives Notification
  const notifRes = await apiRequest(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert('Employee Notifications Endpoint', notifRes.status === 200 && notifRes.data?.success);
  const matchedNotif = notifRes.data?.data?.find(n => n.title?.includes(testTitle) || n.message?.includes(testTitle));
  assert('Employee Received Instant Task Assigned Notification', !!matchedNotif, matchedNotif?.title);

  // 6. Verify Employee Dashboard Front Page has the task
  const dashRes = await apiRequest(`${BASE_URL}/dashboard/employee`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert('Employee Dashboard Metrics Fetch', dashRes.status === 200 && dashRes.data?.success);
  const currentTasks = dashRes.data?.data?.currentTasks || [];
  const taskOnFrontPage = currentTasks.find(t => t.id === createdTaskId);
  assert('Task Appears on Employee Front Page Dashboard', !!taskOnFrontPage, `Title: ${taskOnFrontPage?.title}`);

  // 7. Cleanup test task
  if (createdTaskId) {
    await apiRequest(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('  🧹 Cleaned up temporary test task.');
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTest();
