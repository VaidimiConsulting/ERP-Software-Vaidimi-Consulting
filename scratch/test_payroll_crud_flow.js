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
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runPayrollCrudTests() {
  console.log('--- Starting Comprehensive Payroll CRUD & Disbursal Test ---');

  try {
    // 1. Logins
    console.log('\n[Step 1] Logging in as Admin, HR, and Employee...');
    const adminLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@company.com', password: 'AdminPassword123!' }
    });
    const adminToken = adminLoginRes.token;
    console.log('✓ Admin login successful');

    const hrLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'vinit.kumar@vaidimi.com', password: 'Vinit@2026' }
    });
    const hrToken = hrLoginRes.token;
    console.log('✓ HR login successful (vinit.kumar@vaidimi.com)');

    const empLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'aryan.tiwari@vaidimi.com', password: 'Aryan@2026' }
    });
    const empToken = empLoginRes.token;
    const empUser = empLoginRes.user;
    console.log('✓ Employee login successful (Aryan Tiwari, ID:', empUser.id, ')');

    // Get Aryan's employee record id
    const employeesRes = await req(`${API_BASE}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const aryanEmp = employeesRes.data.find(e => e.email === 'aryan.tiwari@vaidimi.com');
    if (!aryanEmp) throw new Error('Aryan employee record not found in /api/employees');
    console.log(`✓ Found Aryan Employee record ID: ${aryanEmp.id}, current master base_salary: ₹${aryanEmp.base_salary}`);

    // 2. Admin creates a custom payroll record
    console.log('\n[Step 2] Admin creates a custom payroll entry...');
    const testMonth = '2026-11';
    
    // Clean up if previous test run left one
    const existingPayrolls = await req(`${API_BASE}/payroll?month=${testMonth}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const existing = existingPayrolls.data.find(p => p.employee_id === aryanEmp.id);
    if (existing) {
      await req(`${API_BASE}/payroll/${existing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✓ Cleaned up pre-existing test payroll record');
    }

    const createRes = await req(`${API_BASE}/payroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        employee_id: aryanEmp.id,
        month: testMonth,
        base_salary: 55000,
        bonus: 5000,
        allowances: 3000,
        deductions: 2000,
        payment_status: 'PENDING',
        is_sent_to_employee: false,
        remarks: 'Automated test initial salary entry'
      }
    });

    console.log('✓ Custom payroll created successfully:', {
      id: createRes.data.id,
      base_salary: createRes.data.base_salary,
      bonus: createRes.data.bonus,
      allowances: createRes.data.allowances,
      gross_salary: createRes.data.gross_salary,
      net_salary: createRes.data.net_salary,
      is_sent: createRes.data.is_sent_to_employee
    });

    const payrollId = createRes.data.id;

    // 3. Admin edits/increases salary and updates master salary
    console.log('\n[Step 3] Admin edits/increases salary and sets update_master_salary=true...');
    const updateRes = await req(`${API_BASE}/payroll/${payrollId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        base_salary: 62000,
        bonus: 7000,
        allowances: 4000,
        deductions: 2500,
        payment_status: 'PAID',
        update_master_salary: true,
        remarks: 'Promoted with salary increase'
      }
    });

    console.log('✓ Payroll updated successfully:', {
      id: updateRes.data.id,
      base_salary: updateRes.data.base_salary,
      bonus: updateRes.data.bonus,
      net_salary: updateRes.data.net_salary,
      remarks: updateRes.data.remarks
    });

    // Check if master salary in employee table was updated
    const empCheckRes = await req(`${API_BASE}/employees/${aryanEmp.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ Master salary in Employee record is now: ₹${empCheckRes.data.base_salary} (Expected: 62000)`);
    if (Number(empCheckRes.data.base_salary) !== 62000) {
      throw new Error(`Master salary mismatch: expected 62000, got ${empCheckRes.data.base_salary}`);
    }

    // 4. Admin sends payroll directly to employee portal
    console.log('\n[Step 4] Admin sends payroll statement directly to employee portal...');
    const sendRes = await req(`${API_BASE}/payroll/${payrollId}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Send response:', sendRes.message);
    console.log('✓ Payroll record is_sent_to_employee:', sendRes.data.is_sent_to_employee, 'at:', sendRes.data.sent_at);

    // 5. Employee verifies portal received payroll and notification
    console.log('\n[Step 5] Employee logs in to check portal statement and notification...');
    const mySalaryRes = await req(`${API_BASE}/payroll/my`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const myRecord = mySalaryRes.data.find(p => p.id === payrollId);
    if (!myRecord) {
      throw new Error('Employee could not find the newly disbursed payroll record in their portal!');
    }
    console.log('✓ Employee portal successfully received statement:', {
      month: myRecord.month,
      net_salary: myRecord.net_salary,
      is_sent_to_employee: myRecord.is_sent_to_employee
    });

    const notifRes = await req(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const salaryNotif = notifRes.data.find(n => n.title?.includes('Salary Statement Released') || n.message?.includes(testMonth));
    if (salaryNotif) {
      console.log('✓ Employee received in-app portal notification:', salaryNotif.title, '-', salaryNotif.message);
    } else {
      console.log('ℹ Notifications present:', notifRes.data?.length);
    }

    // 6. Security Check: Verify HR CANNOT create, update, or delete payroll
    console.log('\n[Step 6] Security Check: Ensuring HR is blocked from Admin-only Payroll CRUD...');
    try {
      await req(`${API_BASE}/payroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${hrToken}` },
        body: { employee_id: aryanEmp.id, month: '2026-12', base_salary: 50000 }
      });
      throw new Error('SECURITY VIOLATION: HR was able to create custom payroll!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✓ Confirmed: HR was blocked from POST /api/payroll (403 Forbidden: Admin only)');
      } else {
        throw err;
      }
    }

    try {
      await req(`${API_BASE}/payroll/${payrollId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${hrToken}` },
        body: { base_salary: 80000 }
      });
      throw new Error('SECURITY VIOLATION: HR was able to update payroll/salary!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✓ Confirmed: HR was blocked from PUT /api/payroll/:id (403 Forbidden: Admin only)');
      } else {
        throw err;
      }
    }

    try {
      await req(`${API_BASE}/payroll/${payrollId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${hrToken}` }
      });
      throw new Error('SECURITY VIOLATION: HR was able to delete payroll!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✓ Confirmed: HR was blocked from DELETE /api/payroll/:id (403 Forbidden: Admin only)');
      } else {
        throw err;
      }
    }

    // 7. Admin tests Bulk Portal Disbursal
    console.log('\n[Step 7] Admin tests Send Bulk Payrolls to Portals...');
    const bulkRes = await req(`${API_BASE}/payroll/send-bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { month: testMonth }
    });
    console.log('✓ Bulk send result:', bulkRes.message);

    // 8. Admin deletes the test payroll record
    console.log('\n[Step 8] Admin deletes test payroll record...');
    const deleteRes = await req(`${API_BASE}/payroll/${payrollId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Delete response:', deleteRes.message);

    // Verify deletion
    const verifyDelRes = await req(`${API_BASE}/payroll?month=${testMonth}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stillExists = verifyDelRes.data.some(p => p.id === payrollId);
    if (stillExists) {
      throw new Error('Payroll record still exists after deletion!');
    }
    console.log('✓ Payroll record successfully deleted from database');

    console.log('\n🎉 ALL PAYROLL CRUD & PORTAL DISBURSAL TESTS PASSED WITH 100% SUCCESS!');
  } catch (error) {
    console.error('❌ Test failed:', error.message, error.data || '');
    process.exit(1);
  }
}

runPayrollCrudTests();
