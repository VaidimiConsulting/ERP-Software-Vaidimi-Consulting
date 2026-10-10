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

async function testEmployeeDates() {
  const adminRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const adminToken = adminRes.data.token;

  const emps = await req(`${API_BASE}/employees`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Employees:', emps.data.data.map(e => ({ id: e.id, name: e.first_name, phone: e.phone })));

  const firstEmp = emps.data.data[0];
  const updateRes = await req(`${API_BASE}/employees/${firstEmp.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      first_name: firstEmp.first_name,
      last_name: firstEmp.last_name,
      date_of_birth: '',
      internship_start_date: '',
      internship_end_date: '',
    }
  });

  console.log('Update Employee with empty date strings Result:', updateRes.status, updateRes.data);
}

testEmployeeDates();
