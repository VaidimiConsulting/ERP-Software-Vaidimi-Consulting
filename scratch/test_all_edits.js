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

async function testAllEdits() {
  console.log('=== TESTING ALL EDIT OPERATIONS ACROSS BACKEND & FRONTEND ===');

  // 1. Logins
  const adminRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const adminToken = adminRes.data.token;
  console.log('1. Admin Login:', adminRes.ok ? 'SUCCESS' : 'FAILED', adminRes.data);

  const empLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'aryan.tiwari@vaidimi.com', password: 'Aryan@2026' }
  });
  const empToken = empLogin.data.token;
  console.log('2. Employee Login:', empLogin.ok ? 'SUCCESS' : 'FAILED');

  // Test Employee Update as Admin
  console.log('\n--- 3. Testing Edit Employee (as Admin) ---');
  const emps = await req(`${API_BASE}/employees`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstEmp = emps.data.data?.[0];
  if (firstEmp) {
    console.log(`Found Employee: ${firstEmp.first_name} ${firstEmp.last_name}, phone: "${firstEmp.phone}", emergency_contact: "${firstEmp.emergency_contact}"`);
    
    // Simulate what the frontend sends when editing an employee without changing phone:
    const editPayload = {
      ...firstEmp,
      skills: firstEmp.skills + ', Unit Testing'
    };
    const updateEmpRes = await req(`${API_BASE}/employees/${firstEmp.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: editPayload
    });
    console.log('Edit Employee Result:', updateEmpRes.status, updateEmpRes.data.message || updateEmpRes.data);
  }

  // Test Project Update as Admin
  console.log('\n--- 4. Testing Edit Project (as Admin) ---');
  const projs = await req(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstProj = projs.data.data?.[0];
  if (firstProj) {
    console.log(`Found Project: ${firstProj.project_name} (ID: ${firstProj.id})`);
    const updateProjRes = await req(`${API_BASE}/projects/${firstProj.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        project_name: firstProj.project_name,
        description: firstProj.description || 'Updated description',
        status: firstProj.status
      }
    });
    console.log('Edit Project Result:', updateProjRes.status, updateProjRes.data.message || updateProjRes.data);
  }

  // Test Task Update as Admin & Employee
  console.log('\n--- 5. Testing Edit Task ---');
  const tasks = await req(`${API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstTask = tasks.data.data?.[0];
  if (firstTask) {
    console.log(`Found Task: ${firstTask.title} (ID: ${firstTask.id})`);
    const updateTaskRes = await req(`${API_BASE}/tasks/${firstTask.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'IN_PROGRESS',
        progress_percentage: 50
      }
    });
    console.log('Edit Task Result (Admin):', updateTaskRes.status, updateTaskRes.data.message || updateTaskRes.data);
  }

  // Test Payroll Update as Admin
  console.log('\n--- 6. Testing Edit Payroll (as Admin) ---');
  const payrolls = await req(`${API_BASE}/payroll`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstPayroll = payrolls.data.data?.[0];
  if (firstPayroll) {
    console.log(`Found Payroll: ID ${firstPayroll.id}, employee: ${firstPayroll.employee?.first_name}, month: ${firstPayroll.month}`);
    const updatePayRes = await req(`${API_BASE}/payroll/${firstPayroll.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        base_salary: Number(firstPayroll.base_salary),
        bonus: 1000,
        remarks: 'Bonus adjustment test'
      }
    });
    console.log('Edit Payroll Result:', updatePayRes.status, updatePayRes.data.message || updatePayRes.data);
  }

  // Test Self Profile Update
  console.log('\n--- 7. Testing Self Profile Edit (as Employee) ---');
  if (firstEmp) {
    const updateProfileRes = await req(`${API_BASE}/employees/${firstEmp.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${empToken}` },
      body: {
        address: 'New residential address test',
        phone: firstEmp.phone
      }
    });
    console.log('Edit Self Profile Result:', updateProfileRes.status, updateProfileRes.data.message || updateProfileRes.data);
  }
}

testAllEdits();
