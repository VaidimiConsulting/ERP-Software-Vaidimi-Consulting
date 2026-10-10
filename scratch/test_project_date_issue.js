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

async function testProjectDateIssue() {
  const adminRes = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'AdminPassword123!' }
  });
  const adminToken = adminRes.data.token;

  // Let's test updating project with actual_end_date: ""
  const projs = await req(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const proj = projs.data.data?.[0];
  if (!proj) return;

  const updateRes = await req(`${API_BASE}/projects/${proj.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      project_name: proj.project_name,
      actual_end_date: ""
    }
  });

  console.log('Update Project with actual_end_date: "" Result:', updateRes.status, updateRes.data);
}

testProjectDateIssue();
