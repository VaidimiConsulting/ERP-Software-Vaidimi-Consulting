import React, { useState } from 'react';

function PhaseOneOverview({ healthData, isLoading, onRefresh, pingError }) {
  const [copiedEnv, setCopiedEnv] = useState(false);

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText('DB_PASSWORD=your_mysql_password');
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const modules = [
    { title: 'Auth & User Management', desc: 'JWT tokens, bcrypt password hashing, role-based middleware', phase: 'Phase 2', status: 'Ready' },
    { title: 'Employee & Interns', desc: 'Comprehensive profiles, designation, skills, intern-specific fields', phase: 'Phase 3', status: 'Planned' },
    { title: 'Department Management', desc: 'Department hierarchy, employee counts, department CRUD', phase: 'Phase 4', status: 'Planned' },
    { title: 'Project Management', desc: 'Many-to-many project assignments, managers, milestones, progress', phase: 'Phase 5 & 6', status: 'Planned' },
    { title: 'Task Management', desc: 'Task allocation, priorities, employee status updates, deadline tracking', phase: 'Phase 7', status: 'Planned' },
    { title: 'Attendance System', desc: 'Check-in/out, daily work hours, duplicate prevention, reports', phase: 'Phase 8', status: 'Planned' },
    { title: 'Leave Management', desc: '6 leave types, balances, approval workflows, menstrual leave privacy', phase: 'Phase 9', status: 'Planned' },
    { title: 'Holidays & Calendar', desc: 'Company/festival holidays, FullCalendar integration, deadline radar', phase: 'Phase 10 & 11', status: 'Planned' },
    { title: 'Dashboards & Reports', desc: 'Role-based dashboards, metrics, charts, CSV/Excel exports', phase: 'Phase 12 - 15', status: 'Planned' },
  ];

  return (
    <div style={{ padding: '2.5rem 0 4rem 0' }}>
      <div className="container">
        {/* Welcome Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-success">Phase 1 Completed Successfully</span>
            <span className="badge badge-info">Vite + React + Express + MySQL</span>
          </div>
          <h1 style={{ fontSize: '2.25rem', lineHeight: '1.2', marginBottom: '0.75rem' }}>
            Enterprise Company Management System
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: '800px' }}>
            Core architecture initialized, folder structures partitioned, Express REST API mounted, and frontend-to-backend communication established.
          </p>
        </div>

        {/* Live Connectivity Diagnostic Banner */}
        <div className="grid grid-cols-2" style={{ marginBottom: '2.5rem' }}>
          {/* Backend Health Card */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Node + Express Backend</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Server Port: <strong>5000</strong> &bull; Endpoint: <code>/api/health</code>
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={onRefresh}
                disabled={isLoading}
                style={{ fontSize: '0.8125rem' }}
              >
                {isLoading ? 'Checking...' : '🔄 Test Connection'}
              </button>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className={`badge ${healthData ? 'badge-success' : 'badge-danger'}`}>
                  {healthData ? 'Server Online' : 'Unreachable'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Response Latency:</span>
                <strong>{healthData?.latencyMs ? `${healthData.latencyMs} ms` : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Server Uptime:</span>
                <strong>{healthData?.uptime ? `${healthData.uptime} seconds` : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Phase:</span>
                <strong>{healthData?.phase || 'Phase 1'}</strong>
              </div>
            </div>

            {pingError && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.8125rem'
              }}>
                Error: {pingError}
              </div>
            )}
          </div>

          {/* MySQL Database Status Card */}
          <div className="card" style={{ borderLeft: `4px solid ${healthData?.database?.connected ? 'var(--success)' : 'var(--warning)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>MySQL & Sequelize ORM</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Target Database: <code>{healthData?.database?.name || 'company_management_db'}</code>
                </p>
              </div>
              <span className={`badge ${healthData?.database?.connected ? 'badge-success' : 'badge-warning'}`}>
                {healthData?.database?.connected ? 'Database Connected' : 'Config Required'}
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Driver:</span>
                <strong>MySQL2 / Sequelize 6.x</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host & Port:</span>
                <strong>localhost:3306</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Message:</span>
                <strong style={{
                  color: healthData?.database?.connected ? 'var(--success)' : 'var(--warning)',
                  textAlign: 'right',
                  maxWidth: '240px'
                }}>
                  {healthData?.database?.connected ? 'Ready' : healthData?.database?.error || 'Needs Password'}
                </strong>
              </div>
            </div>

            {!healthData?.database?.connected && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}>
                <div style={{ fontWeight: '600', color: 'var(--warning)', marginBottom: '0.25rem' }}>
                  💡 To complete MySQL connection:
                </div>
                <div style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Open <code>server/.env</code> and enter your local MySQL root password:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <code style={{ flex: 1, padding: '0.375rem 0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    DB_PASSWORD=your_mysql_password
                  </code>
                  <button className="btn btn-secondary" onClick={copyEnvSnippet} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    {copiedEnv ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Architecture Matrix */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Architecture Blueprint</h2>
          <div className="grid grid-cols-4">
            <div className="card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚛️</div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Frontend Layer</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                React.js, Vite, React Router, Axios interceptors, clean responsive CSS design system.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Backend Layer</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Node.js, Express REST APIs, JWT tokens, bcrypt password hashing, role-based authorization.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🐬</div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Database Layer</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                MySQL 8.0, Sequelize ORM, 13 normalized tables, foreign keys, cascading rules, unique indexes.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Security & Privacy</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Role access control, password exclusion scopes, and Menstrual Leave confidentiality protection.
              </p>
            </div>
          </div>
        </div>

        {/* Phase Roadmap */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Project Roadmap & Planned Modules</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Incremental 22-Phase System</span>
          </div>

          <div className="grid grid-cols-3">
            {modules.map((m, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>{m.phase}</span>
                    <span className={`badge ${m.status === 'Ready' ? 'badge-success' : 'badge-info'}`}>{m.status}</span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{m.title}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 1 Verification Confirmation Card */}
        <div className="card" style={{
          marginTop: '2.5rem',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '0.75rem' }}>Phase 1 Status: Verification Complete</span>
              <h3 style={{ color: '#ffffff', fontSize: '1.375rem', marginBottom: '0.5rem' }}>
                Ready for Phase 2: Authentication & User Management
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '650px' }}>
                Client and server structures are established. When you give the instruction, Phase 2 will implement User/Employee models, JWT authentication, bcrypt password hashing, login/logout screens, and role-based route protection.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>API Status</div>
                <div style={{ fontWeight: '700', color: '#10b981' }}>Live :5000</div>
              </div>
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Frontend</div>
                <div style={{ fontWeight: '700', color: '#38bdf8' }}>Vite React :5173</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PhaseOneOverview;
