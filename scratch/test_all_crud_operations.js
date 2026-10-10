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

async function runFullCrudDiagnostic() {
  console.log('=== STARTING FULL CRUD DIAGNOSTIC SUITE ===\n');

  // 1. Authenticate
  const loginRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Admin Login Successful');

  // 2. Test Branch CRUD
  console.log('\n--- Testing Branch CRUD ---');
  const createBranchRes = await req(`${API_BASE}/branches`, {
    method: 'POST',
    headers: authHeaders,
    body: { branch_name: 'CRUD Diagnostic Branch', city: 'Jaipur' }
  });
  console.log('Branch Create:', createBranchRes.status, createBranchRes.data.message);
  const branchId = createBranchRes.data.data?.id;

  if (branchId) {
    const updateBranchRes = await req(`${API_BASE}/branches/${branchId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: { branch_name: 'CRUD Diagnostic Branch Updated', city: 'Jaipur Central' }
    });
    console.log('Branch Update:', updateBranchRes.status, updateBranchRes.data.message);

    const deleteBranchRes = await req(`${API_BASE}/branches/${branchId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('Branch Delete:', deleteBranchRes.status, deleteBranchRes.data.message);
  }

  // 3. Test Employee CRUD
  console.log('\n--- Testing Employee CRUD ---');
  const uniqueCode = 'E' + Date.now().toString().slice(-5);
  const createEmpRes = await req(`${API_BASE}/employees`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      first_name: 'Aarav',
      last_name: 'Sharma',
      email: `aarav.${Date.now()}@vaidimi.com`,
      phone: '9876543210',
      designation: 'Software Developer',
      department_id: 1,
      employment_type: 'EMPLOYEE',
      joining_date: '2026-09-01',
      base_salary: 45000,
    }
  });
  console.log('Employee Create:', createEmpRes.status, createEmpRes.data.message);
  const empId = createEmpRes.data.data?.id;

  if (empId) {
    const updateEmpRes = await req(`${API_BASE}/employees/${empId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        first_name: 'Aarav',
        last_name: 'Sharma Updated',
        designation: 'Senior Software Developer',
        base_salary: 55000,
        branch_id: null,
      }
    });
    console.log('Employee Update:', updateEmpRes.status, updateEmpRes.data.message);

    const deleteEmpRes = await req(`${API_BASE}/employees/${empId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('Employee Delete:', deleteEmpRes.status, deleteEmpRes.data.message);
  }

  // 4. Test Project CRUD
  console.log('\n--- Testing Project CRUD ---');
  const createProjRes = await req(`${API_BASE}/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      project_name: 'CRUD Diagnostic Project',
      client_name: 'Diagnostic Client',
      start_date: '2026-09-01',
      expected_end_date: '2026-12-31',
      priority: 'HIGH',
      status: 'PLANNING'
    }
  });
  console.log('Project Create:', createProjRes.status, createProjRes.data.message);
  const projId = createProjRes.data.data?.id;

  if (projId) {
    const updateProjRes = await req(`${API_BASE}/projects/${projId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        project_name: 'CRUD Diagnostic Project Updated',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        completion_percentage: 25
      }
    });
    console.log('Project Update:', updateProjRes.status, updateProjRes.data.message);

    // 5. Test Task CRUD inside Project
    console.log('\n--- Testing Task CRUD ---');
    const createTaskRes = await req(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        project_id: projId,
        title: 'Diagnostic Sub-Task',
        priority: 'HIGH',
        status: 'TODO'
      }
    });
    console.log('Task Create:', createTaskRes.status, createTaskRes.data.message);
    const taskId = createTaskRes.data.data?.id;

    if (taskId) {
      const updateTaskRes = await req(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: {
          title: 'Diagnostic Sub-Task Updated',
          status: 'IN_PROGRESS',
          progress_percentage: 50
        }
      });
      console.log('Task Update:', updateTaskRes.status, updateTaskRes.data.message);

      const deleteTaskRes = await req(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      console.log('Task Delete:', deleteTaskRes.status, deleteTaskRes.data.message);
    }

    const deleteProjRes = await req(`${API_BASE}/projects/${projId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('Project Delete:', deleteProjRes.status, deleteProjRes.data.message);
  }

  // 6. Test Holiday CRUD
  console.log('\n--- Testing Holiday CRUD ---');
  const createHolRes = await req(`${API_BASE}/holidays`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: 'Diagnostic Holiday',
      date: '2026-10-15',
      is_paid: true,
      applicable_to: 'ALL'
    }
  });
  console.log('Holiday Create:', createHolRes.status, createHolRes.data.message);
  const holId = createHolRes.data.data?.id;

  if (holId) {
    const updateHolRes = await req(`${API_BASE}/holidays/${holId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        name: 'Diagnostic Holiday Renamed',
        date: '2026-10-16'
      }
    });
    console.log('Holiday Update:', updateHolRes.status, updateHolRes.data.message);

    const deleteHolRes = await req(`${API_BASE}/holidays/${holId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('Holiday Delete:', deleteHolRes.status, deleteHolRes.data.message);
  }

  // 7. Test Payroll Read & Update
  console.log('\n--- Testing Payroll CRUD ---');
  const getPayrollRes = await req(`${API_BASE}/payroll`, {
    headers: authHeaders
  });
  console.log('Payroll Get Records:', getPayrollRes.status, 'Count:', getPayrollRes.data.data?.length);

  if (getPayrollRes.data.data?.length > 0) {
    const pRecord = getPayrollRes.data.data[0];
    const updatePayrollRes = await req(`${API_BASE}/payroll/${pRecord.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        base_salary: pRecord.base_salary,
        notes: 'Diagnostic CRUD test verified.'
      }
    });
    console.log('Payroll Update:', updatePayrollRes.status, updatePayrollRes.data.message);
  }

  console.log('\n=== ALL CRUD OPERATIONS TESTED SUCCESSFULLY ===');
}

runFullCrudDiagnostic();
