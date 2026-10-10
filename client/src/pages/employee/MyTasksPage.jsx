import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TaskWidgets from '../../components/tasks/TaskWidgets';
import { getTasks, getTaskStats, updateTask } from '../../services/taskService';

function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Local draft states for tasks: { [taskId]: { status, progress_percentage, completion_notes } }
  const [taskDrafts, setTaskDrafts] = useState({});

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (overdueFilter) params.overdue = 'true';

      const [taskRes, statsRes] = await Promise.all([
        getTasks(params),
        getTaskStats(),
      ]);

      if (taskRes.success) {
        setTasks(taskRes.data);
        const drafts = {};
        taskRes.data.forEach((t) => {
          drafts[t.id] = {
            status: t.status,
            progress_percentage: t.progress_percentage || 0,
            completion_notes: t.completion_notes || '',
          };
        });
        setTaskDrafts(drafts);
      }
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load employee tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, overdueFilter]);

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

  const handleDraftChange = (taskId, field, value) => {
    setTaskDrafts((prev) => {
      const current = prev[taskId] || {};
      const updated = { ...current, [field]: value };
      if (field === 'status' && value === 'COMPLETED') {
        updated.progress_percentage = 100;
      }
      return { ...prev, [taskId]: updated };
    });
  };

  const handleSaveAndNotify = async (task) => {
    const draft = taskDrafts[task.id] || {
      status: task.status,
      progress_percentage: task.progress_percentage || 0,
      completion_notes: task.completion_notes || '',
    };

    setUpdatingId(task.id);
    setSuccessNotice('');
    setErrorMessage('');

    try {
      const payload = {
        status: draft.status,
        progress_percentage: Number(draft.progress_percentage),
        completion_notes: draft.completion_notes ? draft.completion_notes.trim() : null,
      };

      const res = await updateTask(task.id, payload);
      if (res.success) {
        setSuccessNotice(`✅ Status updated for "${task.title}". Admin and HR leadership have been notified.`);
        loadTasks();
        setTimeout(() => setSuccessNotice(''), 6000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update task.');
      setTimeout(() => setErrorMessage(''), 6000);
    } finally {
      setUpdatingId(null);
    }
  };

  const isOverdue = (t) => {
    if (t.status === 'COMPLETED' || !t.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date < today;
  };

  return (
    <AppLayout pageTitle="My Assigned Tasks & Deliverables" subtitle="Update your deliverable progress and notify leadership in real-time">
      {/* Personal Task Widgets */}
      <TaskWidgets
        stats={stats}
        onFilterClick={handleWidgetClick}
        activeFilter={overdueFilter ? 'overdue' : statusFilter === 'COMPLETED' ? 'completed' : 'all'}
      />

      {/* Real-time Success Notification Alert */}
      {successNotice && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-xs)'
        }}>
          {successNotice}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Info Notice */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--border-color)'
      }}>
        <span>
          💡 <strong>Task Update & Delegation:</strong> You can update your work status (Pending / In Progress / Completed / Blocked), adjust progress %, and write completion remarks. Submitting automatically notifies Admin and HR.
        </span>
        {(statusFilter || overdueFilter) && (
          <button
            className="btn btn-secondary"
            onClick={() => { setStatusFilter(''); setOverdueFilter(false); }}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>No tasks assigned in this view</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            All clear! Check back when your manager assigns new project deliverables.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {tasks.map((task) => {
            const draft = taskDrafts[task.id] || {
              status: task.status,
              progress_percentage: task.progress_percentage || 0,
              completion_notes: task.completion_notes || '',
            };

            const isSubmittingThis = updatingId === task.id;

            return (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  borderLeft: `5px solid ${isOverdue(task) ? 'var(--danger)' : draft.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)'}`,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Task Header: Codes, Project, Priority, Due Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '800',
                        fontSize: '0.8125rem',
                        color: 'var(--primary)',
                        backgroundColor: 'var(--primary-light)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {task.task_code}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: '600' }}>
                        📁 Project: <strong style={{ color: 'var(--primary)' }}>{task.project?.project_name || 'General Project'}</strong>
                      </span>
                      <span className="badge badge-info">{task.priority} PRIORITY</span>
                      {isOverdue(task) && (
                        <span className="badge badge-danger">OVERDUE</span>
                      )}
                      <span className={`badge ${draft.status === 'COMPLETED' ? 'badge-success' : draft.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                        {draft.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '760px', marginBottom: '0.5rem' }}>
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <div>Target Deadline: <strong style={{ color: isOverdue(task) ? 'var(--danger)' : 'var(--text-main)' }}>{task.due_date || 'No deadline'}</strong></div>
                    {task.completed_at && (
                      <div style={{ color: 'var(--success)', marginTop: '0.2rem', fontWeight: '600' }}>
                        Completed: {task.completed_at.split('T')[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Update & Completion Remarks Form */}
                <div style={{
                  padding: '1.125rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginTop: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                    {/* Status Dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.375rem', color: 'var(--text-main)' }}>
                        Update Status:
                      </label>
                      <select
                        value={draft.status}
                        disabled={isSubmittingThis}
                        onChange={(e) => handleDraftChange(task.id, 'status', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          backgroundColor: '#fff',
                          fontWeight: '700',
                          color: draft.status === 'COMPLETED' ? 'var(--success)' : 'var(--text-main)'
                        }}
                      >
                        <option value="TODO">⏳ Pending / Todo</option>
                        <option value="IN_PROGRESS">⚡ In Progress</option>
                        <option value="COMPLETED">✅ Completed</option>
                        <option value="BLOCKED">🚫 Blocked / Issues</option>
                      </select>
                    </div>

                    {/* Progress Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          Completion Progress:
                        </label>
                        <strong style={{ fontSize: '0.9375rem', color: draft.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)' }}>
                          {draft.progress_percentage}%
                        </strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          disabled={isSubmittingThis || draft.status === 'COMPLETED'}
                          value={draft.progress_percentage}
                          onChange={(e) => handleDraftChange(task.id, 'progress_percentage', Number(e.target.value))}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {[0, 25, 50, 75, 100].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isSubmittingThis}
                              onClick={() => {
                                handleDraftChange(task.id, 'progress_percentage', val);
                                if (val === 100) handleDraftChange(task.id, 'status', 'COMPLETED');
                              }}
                              style={{
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.6875rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px',
                                backgroundColor: draft.progress_percentage === val ? 'var(--primary)' : '#fff',
                                color: draft.progress_percentage === val ? '#fff' : 'var(--text-main)',
                                cursor: 'pointer'
                              }}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completion Notes / Remarks Textarea */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.375rem', color: 'var(--text-main)' }}>
                      Work Status Notes / Completion Remarks (Notifies Admin & HR):
                    </label>
                    <textarea
                      rows="2"
                      placeholder="e.g., Completed the frontend layout and integrated backend API endpoints. Ready for QA review."
                      value={draft.completion_notes}
                      disabled={isSubmittingThis}
                      onChange={(e) => handleDraftChange(task.id, 'completion_notes', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {task.completion_notes && (
                        <span>Last Reported Remark: <em>"{task.completion_notes}"</em></span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isSubmittingThis}
                      onClick={() => handleSaveAndNotify(task)}
                      style={{
                        padding: '0.5rem 1.25rem',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isSubmittingThis ? 'Updating & Notifying...' : '📢 Update Status & Notify Admin / HR'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default MyTasksPage;

