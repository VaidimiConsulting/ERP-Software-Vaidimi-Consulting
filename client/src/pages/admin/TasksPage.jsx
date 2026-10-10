import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TaskWidgets from '../../components/tasks/TaskWidgets';
import { getTasks, getTaskStats, createTask, updateTask, deleteTask } from '../../services/taskService';
import { getProjects } from '../../services/projectService';
import { getEmployees } from '../../services/employeeService';
import { exportToCsv } from '../../utils/csvUtils';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const initialForm = {
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    status: 'TODO',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    progress_percentage: 0,
    completion_notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const loadAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (projectFilter) params.project_id = projectFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assigned_to = assigneeFilter;
      if (overdueFilter) params.overdue = 'true';

      const [taskRes, statsRes, projRes, empRes] = await Promise.all([
        getTasks(params),
        getTaskStats(),
        getProjects(),
        getEmployees(),
      ]);

      if (taskRes.success) setTasks(taskRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (projRes.success) setProjects(projRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load task dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [search, projectFilter, statusFilter, priorityFilter, assigneeFilter, overdueFilter]);

  // Widget click quick filter
  const handleWidgetClick = (type) => {
    if (type === 'pending') {
      setStatusFilter('');
      setOverdueFilter(false);
    } else if (type === 'completed') {
      setStatusFilter('COMPLETED');
      setOverdueFilter(false);
    } else if (type === 'overdue') {
      setStatusFilter('');
      setOverdueFilter(true);
    } else {
      setStatusFilter('');
      setOverdueFilter(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedTaskId(null);
    setFormData({
      ...initialForm,
      project_id: projects.length > 0 ? projects[0].id : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setIsEditing(true);
    setSelectedTaskId(t.id);
    setFormData({
      project_id: t.project_id,
      title: t.title,
      description: t.description || '',
      assigned_to: t.assigned_to || '',
      priority: t.priority,
      status: t.status,
      start_date: t.start_date || '',
      due_date: t.due_date || '',
      progress_percentage: t.progress_percentage || 0,
      completion_notes: t.completion_notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const sanitized = {
        ...formData,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        progress_percentage: Number(formData.progress_percentage) || 0,
      };

      if (isEditing) {
        const res = await updateTask(selectedTaskId, sanitized);
        if (res.success) {
          setIsModalOpen(false);
          loadAll();
        }
      } else {
        const res = await createTask(sanitized);
        if (res.success) {
          setIsModalOpen(false);
          loadAll();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: 'title', label: 'Task Title' },
      { key: 'project', label: 'Project', format: (v, r) => r.project?.project_name || '' },
      { key: 'assigned_to', label: 'Assignee', format: (v, r) => `${r.assignee?.first_name || ''} ${r.assignee?.last_name || ''}`.trim() || 'Unassigned' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'progress_percentage', label: 'Progress (%)', format: (v) => `${v || 0}%` },
      { key: 'start_date', label: 'Start Date' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'description', label: 'Description' },
    ];
    exportToCsv('vaidimi_tasks_export.csv', tasks, columns);
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Delete task '${task.title}'?`)) {
      try {
        const res = await deleteTask(task.id);
        if (res.success) loadAll();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete task.');
      }
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'COMPLETED' || !task.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.due_date < today;
  };

  return (
    <AppLayout pageTitle="Deliverable & Task Board" subtitle="Manage workflow assignments, sprint items, and deliverables across projects">
      {/* Dashboard Widgets */}
      <TaskWidgets
        stats={stats}
        onFilterClick={handleWidgetClick}
        activeFilter={overdueFilter ? 'overdue' : statusFilter === 'COMPLETED' ? 'completed' : 'all'}
      />

      {/* Filter & Action Controls */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="🔍 Search tasks by title, code, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="">All Statuses</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="">All Assignees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>

          {/* Overdue Button Toggle */}
          <button
            className={`btn ${overdueFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOverdueFilter(!overdueFilter)}
            style={{ fontSize: '0.8125rem' }}
          >
            {overdueFilter ? '⚠️ Showing Overdue' : 'Show Overdue'}
          </button>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              title="Download tasks as CSV"
            >
              📥 Export Tasks (CSV)
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              ➕ Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Task Table Card */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            Showing <strong>{tasks.length}</strong> tasks
          </div>
          {(search || projectFilter || statusFilter || priorityFilter || assigneeFilter || overdueFilter) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setProjectFilter('');
                setStatusFilter('');
                setPriorityFilter('');
                setAssigneeFilter('');
                setOverdueFilter(false);
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>No tasks found</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Try adjusting your query or create a new task.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Code & Title</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Project</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Assignee</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Priority</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status & Progress</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Due Date</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Code & Title */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--primary)', fontSize: '0.8125rem' }}>
                          {t.task_code}
                        </span>
                        {isOverdue(t) && (
                          <span className="badge badge-danger" style={{ fontSize: '0.625rem', padding: '0.1rem 0.4rem' }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '340px' }}>
                          {t.description}
                        </div>
                      )}
                      {t.completion_notes && (
                        <div style={{
                          marginTop: '0.35rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid var(--primary)',
                          fontSize: '0.75rem',
                          color: 'var(--text-main)',
                          maxWidth: '360px'
                        }}>
                          💬 <strong>Assignee Remark:</strong> "{t.completion_notes}"
                        </div>
                      )}
                    </td>

                    {/* Project */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: '500' }}>{t.project?.project_name || 'General'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.project?.project_code}
                      </div>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {t.assignee ? (
                        <div>
                          <div style={{ fontWeight: '600' }}>
                            {t.assignee.first_name} {t.assignee.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t.assignee.designation}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className={`badge ${t.priority === 'URGENT' ? 'badge-danger' : t.priority === 'HIGH' ? 'badge-warning' : 'badge-info'}`}>
                        {t.priority}
                      </span>
                    </td>

                    {/* Status & Progress */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ marginBottom: '0.375rem' }}>
                        <span className={`badge ${t.status === 'COMPLETED' ? 'badge-success' : t.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                          {t.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${t.progress_percentage}%`,
                            height: '100%',
                            backgroundColor: t.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{t.progress_percentage}%</span>
                      </div>
                    </td>

                    {/* Due Date & Completed Date */}
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem' }}>
                      <div style={{ color: isOverdue(t) ? 'var(--danger)' : 'var(--text-main)', fontWeight: isOverdue(t) ? '700' : '500' }}>
                        Due: {t.due_date || 'N/A'}
                      </div>
                      {t.completed_at && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--success)', marginTop: '0.2rem' }}>
                          Done: {t.completed_at.split('T')[0]}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEdit(t)}
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDelete(t)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                            fontWeight: '600'
                          }}
                          title="Delete Task Permanently"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Task */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.375rem' }}>
                {isEditing ? 'Edit Task Assignment' : 'Create New Deliverable Task'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* Project Select */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Project Assignment *
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Role-Based Access Control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Description & Specifications
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions for the assigned developer or tester..."
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              {/* Assignee & Priority */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Status & Progress */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Task Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Progress % (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2199-12-31"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Completion Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Completion Remarks / Progress Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Status details, obstacles, or completion remarks..."
                  value={formData.completion_notes}
                  onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default TasksPage;
