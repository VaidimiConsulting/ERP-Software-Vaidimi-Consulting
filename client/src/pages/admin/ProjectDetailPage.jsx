import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import {
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  createMilestone,
  updateMilestone,
  createProjectTask,
} from '../../services/projectService';
import { getEmployees } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isHR, isAdminOrHR } = useAuth();

  const [project, setProject] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'team', 'milestones', 'tasks'

  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [memberRole, setMemberRole] = useState('Frontend Developer');

  // Milestone Modal State
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Edit Project Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    project_name: '',
    client_name: '',
    description: '',
    technology_stack: '',
    priority: 'MEDIUM',
    status: 'PLANNING',
    completion_percentage: 0,
    project_manager_id: '',
    start_date: '',
    expected_end_date: '',
    actual_end_date: '',
  });

  const [actionError, setActionError] = useState('');

  const loadProject = async () => {
    setLoading(true);
    setActionError('');
    try {
      const res = await getProjectById(id);
      if (res.success) {
        setProject(res.data);
      }
      if (isAdminOrHR) {
        const empRes = await getEmployees();
        if (empRes.success) setAllEmployees(empRes.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  // Handle Status Change
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await updateProject(project.id, { status: newStatus });
      if (res.success) loadProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update project status.');
    }
  };

  // Handle Progress Percentage Change
  const handleProgressChange = async (newProgress) => {
    try {
      const res = await updateProject(project.id, { completion_percentage: newProgress });
      if (res.success) loadProject();
    } catch (err) {
      alert('Failed to update progress.');
    }
  };

  // Edit Project Details
  const handleOpenEdit = () => {
    setEditFormData({
      project_name: project.project_name || '',
      client_name: project.client_name || '',
      description: project.description || '',
      technology_stack: project.technology_stack || '',
      priority: project.priority || 'MEDIUM',
      status: project.status || 'PLANNING',
      completion_percentage: project.completion_percentage || 0,
      project_manager_id: project.project_manager_id || '',
      start_date: project.start_date || '',
      expected_end_date: project.expected_end_date || '',
      actual_end_date: project.actual_end_date || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    try {
      const sanitized = {
        ...editFormData,
        project_manager_id: editFormData.project_manager_id ? Number(editFormData.project_manager_id) : null,
        start_date: editFormData.start_date || null,
        expected_end_date: editFormData.expected_end_date || null,
        actual_end_date: editFormData.actual_end_date || null,
      };
      const res = await updateProject(project.id, sanitized);
      if (res.success) {
        setIsEditModalOpen(false);
        loadProject();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update project.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete project '${project.project_name}' (${project.project_code})? All milestones, tasks, and team associations will also be removed.`)) {
      return;
    }

    try {
      const res = await deleteProject(project.id);
      if (res.success) {
        navigate(isAdminOrHR ? '/admin/projects' : '/employee/projects');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  // Assign Member
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      const res = await addProjectMember(project.id, {
        employee_id: selectedEmpId,
        role_in_project: memberRole,
      });
      if (res.success) {
        setIsMemberModalOpen(false);
        setSelectedEmpId('');
        loadProject();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (employeeId) => {
    if (window.confirm('Remove this member from the project?')) {
      try {
        const res = await removeProjectMember(project.id, employeeId);
        if (res.success) loadProject();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to remove member.');
      }
    }
  };

  // Add Milestone
  const handleAddMilestoneSubmit = async (e) => {
    e.preventDefault();
    if (!milestoneTitle || !milestoneDueDate) return;
    try {
      const res = await createMilestone(project.id, {
        title: milestoneTitle,
        description: milestoneDesc,
        due_date: milestoneDueDate,
      });
      if (res.success) {
        setIsMilestoneModalOpen(false);
        setMilestoneTitle('');
        setMilestoneDesc('');
        setMilestoneDueDate('');
        loadProject();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add milestone.');
    }
  };

  // Update Milestone Status
  const handleToggleMilestone = async (m) => {
    const nextStatus = m.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    const nextPercent = nextStatus === 'COMPLETED' ? 100 : 50;
    try {
      await updateMilestone(project.id, m.id, { status: nextStatus, completion_percentage: nextPercent });
      loadProject();
    } catch (err) {
      alert('Failed to update milestone.');
    }
  };

  // Add Task
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle) return;
    try {
      const res = await createProjectTask(project.id, {
        title: taskTitle,
        description: taskDesc,
        assigned_to: taskAssignee || null,
        priority: taskPriority,
        due_date: taskDueDate || null,
      });
      if (res.success) {
        setIsTaskModalOpen(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssignee('');
        loadProject();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task.');
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Project Workspace" subtitle="Loading project data...">
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading project workspace...
        </div>
      </AppLayout>
    );
  }

  if (actionError || !project) {
    return (
      <AppLayout pageTitle="Project Workspace" subtitle="Error loading project">
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚫</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
            {actionError || 'Project Not Found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You may not be authorized to view this project or it may have been deleted.
          </p>
          <button className="btn btn-primary" onClick={() => navigate(isAdminOrHR ? '/admin/projects' : '/employee/projects')}>
            Return to Projects
          </button>
        </div>
      </AppLayout>
    );
  }

  const membersList = project.projectMembers || [];
  const milestonesList = project.milestones || [];
  const tasksList = project.tasks || [];

  return (
    <AppLayout pageTitle={project.project_name} subtitle={`Project Workspace &bull; Code: ${project.project_code}`}>
      {/* Project Banner & Progress Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: '800',
                color: 'var(--primary)',
                backgroundColor: 'var(--primary-light)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem'
              }}>
                {project.project_code}
              </span>
              <span className="badge badge-info">{project.priority} PRIORITY</span>
              <span className="badge badge-success">{project.status.replace('_', ' ')}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{project.project_name}</h1>
            {project.client_name && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Client: <strong>{project.client_name}</strong>
              </p>
            )}
          </div>

          {/* Admin / HR Status & Progress Controls */}
          {isAdminOrHR && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Project Status:
                </label>
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    backgroundColor: '#fff',
                    fontWeight: '600'
                  }}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Progress:
                </label>
                <select
                  value={project.completion_percentage}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    backgroundColor: '#fff',
                    fontWeight: '600'
                  }}
                >
                  {[0, 10, 25, 40, 50, 65, 75, 90, 100].map((p) => (
                    <option key={p} value={p}>{p}%</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenEdit}
                style={{ fontSize: '0.8125rem', padding: '0.45rem 0.8rem', fontWeight: '600' }}
              >
                ✏️ Edit Project
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDeleteProject}
                style={{ fontSize: '0.8125rem', padding: '0.45rem 0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: '600' }}
              >
                🗑️ Delete Project
              </button>
            </div>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Start: <strong>{project.start_date}</strong> &bull; Expected Target: <strong>{project.expected_end_date}</strong>
            </span>
            <strong style={{ color: 'var(--primary)' }}>{project.completion_percentage}% Completed</strong>
          </div>
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${project.completion_percentage}%`,
              height: '100%',
              backgroundColor: project.completion_percentage === 100 ? 'var(--success)' : 'var(--primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.25rem'
      }}>
        {[
          { id: 'overview', label: 'Overview & Specs', icon: '📋' },
          { id: 'team', label: `Team Members (${membersList.length})`, icon: '👥' },
          { id: 'milestones', label: `Milestones (${milestonesList.length})`, icon: '🚩' },
          { id: 'tasks', label: `Tasks (${tasksList.length})`, icon: '✅' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? '700' : '500',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              fontSize: '0.875rem'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2">
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Project Scope & Goals</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
              {project.description || 'No detailed scope written for this project.'}
            </p>

            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Technology Stack
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {project.technology_stack ? (
                project.technology_stack.split(',').map((tech, idx) => (
                  <span key={idx} style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: '600'
                  }}>
                    {tech.trim()}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>None specified</span>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Project Metadata & Leadership</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Project Manager</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>
                  {project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}
                </div>
                {project.manager && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {project.manager.email} &bull; {project.manager.designation}
                  </div>
                )}
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Client Name</div>
                <div style={{ fontWeight: '600' }}>{project.client_name || 'Internal Company Project'}</div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timeline</div>
                <div style={{ fontWeight: '600' }}>
                  {project.start_date} &rarr; {project.expected_end_date}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Team Members (Many-to-Many) */}
      {activeTab === 'team' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '1.125rem' }}>Project Team Allocation</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Team strength: <strong>{membersList.length} members</strong> collaborating &bull; Dedicated roles & deliverables
              </p>
            </div>
            {isAdminOrHR && (
              <button className="btn btn-primary" onClick={() => setIsMemberModalOpen(true)}>
                ➕ Assign Team Member
              </button>
            )}
          </div>

          {membersList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No members assigned to this project yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Staff Member</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Assigned Part / Role</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Department</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Assigned Deliverables</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Assigned Date</th>
                    {isAdminOrHR && <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {membersList.map((pm) => {
                    const memberTasks = tasksList.filter((t) => t.assigned_to === pm.employee_id);
                    const completedCount = memberTasks.filter((t) => t.status === 'COMPLETED').length;
                    return (
                      <tr key={pm.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: '600' }}>
                            {pm.employee?.first_name} {pm.employee?.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {pm.employee?.email} &bull; {pm.employee?.employee_code}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '700',
                            fontSize: '0.8125rem'
                          }}>
                            {pm.role_in_project}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {pm.employee?.department?.department_name || 'Engineering'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className={`badge ${pm.employee?.employment_type === 'INTERN' ? 'badge-warning' : 'badge-info'}`}>
                            {pm.employee?.employment_type || 'EMPLOYEE'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.8125rem' }}>
                            {memberTasks.length} task(s)
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {completedCount} completed, {memberTasks.length - completedCount} pending
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                          {pm.assigned_date}
                        </td>
                        {isAdminOrHR && (
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleRemoveMember(pm.employee_id)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Milestones */}
      {activeTab === 'milestones' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem' }}>Project Milestones & Timeline</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Target phases and completion gates
              </p>
            </div>
            {isAdminOrHR && (
              <button className="btn btn-primary" onClick={() => setIsMilestoneModalOpen(true)}>
                ➕ Add Milestone
              </button>
            )}
          </div>

          {milestonesList.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No milestones defined yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {milestonesList.map((m) => (
                <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={m.status === 'COMPLETED'}
                      onChange={() => handleToggleMilestone(m)}
                      disabled={!isAdmin}
                      style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }}
                    />
                    <div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        textDecoration: m.status === 'COMPLETED' ? 'line-through' : 'none',
                        color: m.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--text-main)'
                      }}>
                        {m.title}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {m.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Due Date</div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{m.due_date}</div>
                    </div>
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Tasks */}
      {activeTab === 'tasks' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '1.125rem' }}>Deliverable Task Board</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Action items for team contributors</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
              ➕ Add Task
            </button>
          </div>

          {tasksList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks assigned yet. Click "Add Task" to create one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Code</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Task & Remarks</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Assignee & Role</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Priority</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Status & Progress</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Target Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksList.map((t) => {
                    const memberAssignment = membersList.find((m) => m.employee_id === t.assigned_to);
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--primary)', verticalAlign: 'top' }}>
                          {t.task_code}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: '600' }}>{t.title}</div>
                          {t.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t.description}</div>
                          )}
                          {t.completion_notes && (
                            <div style={{
                              marginTop: '0.45rem',
                              padding: '0.35rem 0.6rem',
                              backgroundColor: 'var(--bg-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              borderLeft: '3px solid var(--primary)',
                              fontSize: '0.75rem',
                              color: 'var(--text-main)'
                            }}>
                              💬 <strong>Employee Remark:</strong> "{t.completion_notes}"
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                          {t.assignee ? (
                            <div>
                              <div style={{ fontWeight: '600' }}>
                                {t.assignee.first_name} {t.assignee.last_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500' }}>
                                {memberAssignment?.role_in_project || t.assignee.designation || 'Team Member'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                          <span className="badge badge-info">{t.priority}</span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: '0.375rem' }}>
                            <span className={`badge ${t.status === 'COMPLETED' ? 'badge-success' : t.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'}`}>
                              {t.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '110px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{
                                width: `${t.progress_percentage || 0}%`,
                                height: '100%',
                                backgroundColor: t.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{t.progress_percentage || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                          {t.due_date || 'No deadline'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Assign Team Member */}
      {isMemberModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Assign Staff to Project</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Add an employee or intern and specify their functional role.
            </p>

            <form onSubmit={handleAddMemberSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Select Employee / Intern *
                </label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                >
                  <option value="">Choose Staff Member</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code} &bull; {emp.employment_type})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Role in this Project *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Frontend Architect, Backend Developer, QA"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMemberModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Milestone */}
      {isMilestoneModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Add Project Milestone</h3>
            <form onSubmit={handleAddMilestoneSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beta Release & Client Acceptance"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Description
                </label>
                <textarea
                  rows="2"
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Target Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMilestoneModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {isTaskModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Add Deliverable Task</h3>
            <form onSubmit={handleAddTaskSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build User Authentication Screens"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Assign To
                </label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                >
                  <option value="">Unassigned</option>
                  {membersList.map((pm) => (
                    <option key={pm.employee_id} value={pm.employee_id}>
                      {pm.employee?.first_name} {pm.employee?.last_name} ({pm.role_in_project})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Project */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: '800' }}>
                  ✏️ Edit Project: {project.project_code}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Update project roadmap, deadlines, client information, and leadership.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Project Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.project_name}
                    onChange={(e) => setEditFormData({ ...editFormData, project_name: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.client_name}
                    onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Project Description
                </label>
                <textarea
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Technology Stack
                  </label>
                  <input
                    type="text"
                    value={editFormData.technology_stack}
                    onChange={(e) => setEditFormData({ ...editFormData, technology_stack: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Project Manager
                  </label>
                  <select
                    value={editFormData.project_manager_id}
                    onChange={(e) => setEditFormData({ ...editFormData, project_manager_id: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Select Project Manager (Optional) --</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Priority
                  </label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Progress %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.completion_percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, completion_percentage: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Expected End Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.expected_end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, expected_end_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isEditSubmitting}
                >
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default ProjectDetailPage;
