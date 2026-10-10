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

async function testPayrollEmptyDate() {
  const adminRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const adminToken = adminRes.data.token;

  const payrolls = await req(`${API_BASE}/payroll`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstP = payrolls.data.data?.[0];
  if (!firstP) return;

  const updateRes = await req(`${API_BASE}/payroll/${firstP.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      base_salary: 35000,
      payment_date: ""
    }
  });

  console.log('Update Payroll with payment_date: "" Result:', updateRes.status, updateRes.data);
}

testPayrollEmptyDate();
