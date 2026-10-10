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

async function testTaskCreateAndUpdate() {
  try {
    const loginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@company.com', password: 'AdminPassword123!' }
    });
    const token = loginRes.data.token;

    // Fetch projects to get a project id
    const projRes = await req(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const proj = projRes.data.data[0];

    // Create task with empty strings
    const createRes = await req(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        project_id: proj.id,
        title: 'Diagnostic Test Task',
        assigned_to: '',
        start_date: '',
        due_date: '',
      }
    });
    console.log('Create Task Result:', createRes.status, createRes.data.message);

    const taskId = createRes.data.data.id;

    // Update task with empty strings
    const updateRes = await req(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Diagnostic Test Task - Updated',
        assigned_to: '',
        start_date: '',
        due_date: '',
        completion_notes: 'Tested empty dates and assigned_to'
      }
    });
    console.log('Update Task Result:', updateRes.status, updateRes.data.message);

    // Clean up task
    await req(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Task Cleaned Up successfully.');
  } catch (err) {
    console.log('Task Test Error:', err.message);
  }
}

testTaskCreateAndUpdate();
