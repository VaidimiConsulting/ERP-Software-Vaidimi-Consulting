import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import TaskWidgets from '../../components/tasks/TaskWidgets';
import { getAdminDashboardMetrics } from '../../services/dashboardService';
import { getTaskStats } from '../../services/taskService';
import { getEmployees } from '../../services/employeeService';

function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [recentStaff, setRecentStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [dashRes, taskRes, empRes] = await Promise.all([
          getAdminDashboardMetrics(),
          getTaskStats(),
          getEmployees(),
        ]);

        if (dashRes.success) setMetrics(dashRes.data);
        if (taskRes.success) setTaskStats(taskRes.data);
        if (empRes.success) setRecentStaff(empRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <AppLayout pageTitle="Executive Dashboard" subtitle="Enterprise operations, project pipelines, workforce presence, and pending approvals">
      {/* Top 4 Workforce & Attendance Cards */}
      <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/admin/employees')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Employees</span>
            <span style={{ fontSize: '1.25rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>{metrics?.totalEmployees ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Staff: <strong>{metrics?.activeEmployees ?? 0}</strong></div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0ea5e9', cursor: 'pointer' }} onClick={() => navigate('/admin/interns')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>Interns</span>
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>{metrics?.totalInterns ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enrolled in program</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b', cursor: 'pointer' }} onClick={() => navigate('/admin/leaves')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#b45309' }}>Pending Leaves</span>
            <span style={{ fontSize: '1.25rem' }}>🏖️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#b45309' }}>{metrics?.pendingLeaves ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting review & decision</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--success)', cursor: 'pointer' }} onClick={() => navigate('/admin/attendance')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-muted)' }}>On Leave Today</span>
            <span style={{ fontSize: '1.25rem' }}>🌴</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)' }}>{metrics?.employeesOnLeaveToday ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved absence</div>
        </div>
      </div>

      {/* Today's Corporate Workday Presence & Break Stream Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #bbf7d0',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#166534', margin: 0 }}>
                Today's Workforce Attendance & Live Shift Status
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#15803d', margin: '0.15rem 0 0 0' }}>
              Employees logging in automatically receive a Green Tick (✅ Present). Shift: <strong>10:00 AM — 05:30 PM</strong> (Net 6.0 hrs work) | Lunch Break: <strong>1:00 PM — 2:00 PM</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>Present Today</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>✅ {metrics?.presentTodayCount ?? 0}</div>
              </div>

              <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>On Break</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706' }}>☕ {metrics?.onBreakTodayCount ?? 0}</div>
              </div>

              <div style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Signed Out</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#334155' }}>🏁 {metrics?.checkedOutTodayCount ?? 0}</div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/attendance')}
              style={{ fontSize: '0.8125rem', backgroundColor: '#059669', borderColor: '#059669', fontWeight: '700' }}
            >
              View Full Attendance Roster &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Project Statuses Breakdown (Active, Completed, In-Progress, Not-Started) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Project Portfolio Status</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Active client deliverables and project lifecycle stages</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/projects')} style={{ fontSize: '0.8125rem' }}>
            Manage Projects &rarr;
          </button>
        </div>

        <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Projects</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
              {metrics?.activeProjects ?? 0}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0ea5e9', marginTop: '0.25rem' }}>
              {metrics?.inProgressProjects ?? 0}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.25rem' }}>
              {metrics?.completedProjects ?? 0}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Not Started / Planning</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {metrics?.notStartedProjects ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Tasks Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Tasks & Operations Monitor</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Overdue alerts, pending deliverables, and team completion health</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/tasks')} style={{ fontSize: '0.8125rem' }}>
          Open Tasks Hub &rarr;
        </button>
      </div>
      <TaskWidgets stats={taskStats} onFilterClick={() => navigate('/admin/tasks')} />

      {/* Deadlines & Quick Navigation */}
      <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Upcoming Project Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>🎯 Upcoming Deadlines (14 Days)</h3>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/calendar')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
              Corporate Calendar
            </button>
          </div>

          {!metrics?.upcomingDeadlines || metrics.upcomingDeadlines.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No critical project deadlines in the next 14 days.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {metrics.upcomingDeadlines.map((p) => (
                <div key={p.id} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-main)' }}>{p.project_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {p.project_code} &bull; Due: {p.expected_end_date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{p.completion_percentage}% done</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations Hub */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Enterprise Portals & Management</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Direct shortcuts to all management modules across the platform.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/admin/attendance')}>
              ⏱️ Attendance Hub
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/admin/leaves')}>
              🏖️ Leave Approvals
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/calendar')}>
              📅 Corporate Calendar
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/holidays')}>
              🎉 Holiday Admin
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/reports')}>
              📊 Business Reports
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/projects')}>
              🚀 Projects Hub
            </button>
          </div>
        </div>
      </div>

      {/* Recent Staff Directory */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Recent Workforce Directory</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Latest registered staff members</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/employees')} style={{ fontSize: '0.8125rem' }}>
            View Full Table &rarr;
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Name & Email</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Designation</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Department</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStaff.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{emp.employee_code}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: '600' }}>{emp.first_name} {emp.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{emp.designation}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                      {emp.department?.department_name || 'Unassigned'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${emp.employment_type === 'INTERN' ? 'badge-warning' : 'badge-info'}`}>
                      {emp.employment_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminDashboard;
