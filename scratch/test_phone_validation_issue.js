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

async function testPhoneIssue() {
  const adminRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const adminToken = adminRes.data.token;

  // Let's test with +91 9876543210
  const updateRes = await req(`${API_BASE}/employees/1`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      first_name: 'Gargi',
      last_name: 'Singh',
      phone: '+91 9876543210',
      skills: 'Updated skills'
    }
  });

  console.log('Update with +91 9876543210 Result:', updateRes.status, updateRes.data);
}

testPhoneIssue();
