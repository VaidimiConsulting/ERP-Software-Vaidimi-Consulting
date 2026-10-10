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

async function runComprehensiveEditTests() {
  console.log('--- STARTING COMPREHENSIVE EDIT VERIFICATION ---');

  // 1. Admin Login
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
  console.log('✅ Admin authenticated successfully.');

  // 2. Test Employee Edit (Empty dates, +91 phone, empty department/manager)
  const empListRes = await req(`${API_BASE}/employees?employment_type=EMPLOYEE`, { headers: authHeaders });
  const testEmp = empListRes.data.data?.[0];
  if (testEmp) {
    const empUpdate = await req(`${API_BASE}/employees/${testEmp.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        first_name: testEmp.first_name,
        last_name: testEmp.last_name,
        phone: '+91 9876543210',
        date_of_birth: '',
        joining_date: testEmp.joining_date,
        internship_start_date: '',
        internship_end_date: '',
        department_id: '',
        reporting_manager_id: '',
        mentor_id: '',
        skills: 'Full Stack, React, Node.js',
        emergency_contact: '9876543211',
      }
    });
    console.log('1. Employee Edit Test:', empUpdate.status, empUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + empUpdate.data.message);
  }

  // 3. Test Intern Create & Edit
  const internListRes = await req(`${API_BASE}/employees?employment_type=INTERN`, { headers: authHeaders });
  let testIntern = internListRes.data.data?.[0];
  let createdTestIntern = false;
  if (!testIntern) {
    const createInternRes = await req(`${API_BASE}/employees`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        first_name: 'Pooja',
        last_name: 'Sharma',
        email: 'pooja.intern@vaidimi.com',
        phone: '+91 9876543212',
        gender: 'FEMALE',
        designation: 'SDE Intern',
        employment_type: 'INTERN',
        internship_start_date: '2026-09-01',
        college: 'IIT Kanpur',
        course: 'B.Tech CSE',
        password: 'Intern@2026!',
      }
    });
    if (createInternRes.ok) {
      testIntern = createInternRes.data.data;
      createdTestIntern = true;
    }
  }

  if (testIntern) {
    const internUpdate = await req(`${API_BASE}/employees/${testIntern.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        first_name: testIntern.first_name,
        last_name: testIntern.last_name,
        phone: '+91 9876543212',
        date_of_birth: '',
        internship_start_date: testIntern.internship_start_date || '2026-09-01',
        internship_end_date: '',
        college: 'National Institute of Technology',
        course: 'B.Tech CSE (Updated)',
        highest_qualification: 'Graduation',
        education_field: 'Computer Applications & IT',
      }
    });
    console.log('2. Intern Edit Test:', internUpdate.status, internUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + internUpdate.data.message);

    if (createdTestIntern) {
      await req(`${API_BASE}/employees/${testIntern.id}`, { method: 'DELETE', headers: authHeaders });
    }
  }

  // 4. Test Project Edit (Empty actual_end_date, null project_manager_id)
  const projListRes = await req(`${API_BASE}/projects`, { headers: authHeaders });
  const testProj = projListRes.data.data?.[0];
  if (testProj) {
    const projUpdate = await req(`${API_BASE}/projects/${testProj.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        project_name: testProj.project_name,
        project_manager_id: '',
        start_date: testProj.start_date,
        expected_end_date: testProj.expected_end_date,
        actual_end_date: '',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        completion_percentage: 45
      }
    });
    console.log('3. Project Edit Test:', projUpdate.status, projUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + projUpdate.data.message);
  }

  // 5. Test Payroll Edit (Empty payment_date, increase salary)
  const payrollListRes = await req(`${API_BASE}/payroll?month=2026-09`, { headers: authHeaders });
  const testPayroll = payrollListRes.data.data?.[0];
  if (testPayroll) {
    const payrollUpdate = await req(`${API_BASE}/payroll/${testPayroll.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        base_salary: Number(testPayroll.base_salary) + 2000,
        bonus: 1500,
        payment_status: 'GENERATED',
        payment_date: '',
        notes: 'Verified salary revision safely.'
      }
    });
    console.log('4. Payroll Edit Test:', payrollUpdate.status, payrollUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + payrollUpdate.data.message);
  }

  // 6. Test Task Edit (Empty start_date, empty due_date, empty assigned_to)
  if (testProj) {
    const taskCreate = await req(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        project_id: testProj.id,
        title: 'Edit Verification Task',
        assigned_to: '',
        start_date: '',
        due_date: '',
      }
    });
    if (taskCreate.ok) {
      const taskId = taskCreate.data.data.id;
      const taskUpdate = await req(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: {
          title: 'Edit Verification Task - Updated Successfully',
          assigned_to: '',
          start_date: '',
          due_date: '',
          status: 'IN_PROGRESS',
          progress_percentage: 50,
          completion_notes: 'Tested edit functionality.'
        }
      });
      console.log('5. Task Edit Test:', taskUpdate.status, taskUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + taskUpdate.data.message);

      // Clean up
      await req(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders });
    }
  }

  // 7. Test Holiday Edit (Date format check)
  const holidayListRes = await req(`${API_BASE}/holidays?year=2026`, { headers: authHeaders });
  const testHoliday = holidayListRes.data.data?.[0];
  if (testHoliday) {
    const holidayUpdate = await req(`${API_BASE}/holidays/${testHoliday.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        name: testHoliday.name,
        date: testHoliday.date,
        is_paid: true,
        description: 'Verified holiday edit.'
      }
    });
    console.log('6. Holiday Edit Test:', holidayUpdate.status, holidayUpdate.data.success ? '✅ PASSED' : '❌ FAILED: ' + holidayUpdate.data.message);
  }

  console.log('--- ALL EDIT OPTION VERIFICATION COMPLETE ---');
}

runComprehensiveEditTests();
