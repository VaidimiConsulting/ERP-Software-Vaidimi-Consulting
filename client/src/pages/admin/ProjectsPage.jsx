import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getProjects, createProject, updateProject, deleteProject } from '../../services/projectService';
import { getEmployees } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/csvUtils';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Add Project Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Project Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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

  const { isAdmin, isHR, isAdminOrHR } = useAuth();
  const navigate = useNavigate();

  const initialForm = {
    project_name: '',
    client_name: '',
    description: '',
    technology_stack: '',
    priority: 'MEDIUM',
    status: 'PLANNING',
    completion_percentage: 0,
    project_manager_id: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_end_date: '',
    members: [],
  };
  const [formData, setFormData] = useState(initialForm);

  const handleAddMemberRow = () => {
    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, { employee_id: '', role_in_project: 'Project Contributor' }],
    }));
  };

  const handleMemberChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.members];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, members: updated };
    });
  };

  const handleRemoveMemberRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [projRes, empRes] = await Promise.all([
        getProjects(params),
        getEmployees(),
      ]);

      if (projRes.success) setProjects(projRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, priorityFilter]);

  // Create Project
  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        project_manager_id: formData.project_manager_id ? Number(formData.project_manager_id) : null,
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
        actual_end_date: formData.actual_end_date || null,
        members: (formData.members || []).filter((m) => m.employee_id),
      };
      const res = await createProject(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        loadData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Project
  const handleOpenEdit = (proj, e) => {
    e.stopPropagation();
    setEditingProject(proj);
    setEditFormData({
      project_name: proj.project_name || '',
      client_name: proj.client_name || '',
      description: proj.description || '',
      technology_stack: proj.technology_stack || '',
      priority: proj.priority || 'MEDIUM',
      status: proj.status || 'PLANNING',
      completion_percentage: proj.completion_percentage || 0,
      project_manager_id: proj.project_manager_id || '',
      start_date: proj.start_date || '',
      expected_end_date: proj.expected_end_date || '',
      actual_end_date: proj.actual_end_date || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const sanitized = {
        ...editFormData,
        project_manager_id: editFormData.project_manager_id ? Number(editFormData.project_manager_id) : null,
        start_date: editFormData.start_date || null,
        expected_end_date: editFormData.expected_end_date || null,
        actual_end_date: editFormData.actual_end_date || null,
      };
      const res = await updateProject(editingProject.id, sanitized);
      if (res.success) {
        setIsEditModalOpen(false);
        setEditingProject(null);
        loadData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (proj, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete project '${proj.project_name}' (${proj.project_code})? All associated milestones and tasks will also be removed.`)) {
      return;
    }

    try {
      const res = await deleteProject(proj.id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  // Excel / CSV Export
  const handleExportCsv = () => {
    const columns = [
      { key: 'project_code', label: 'Project Code' },
      { key: 'project_name', label: 'Project Name' },
      { key: 'client_name', label: 'Client Name', format: (v) => v || 'Internal / N/A' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'completion_percentage', label: 'Progress (%)', format: (v) => `${v || 0}%` },
      { key: 'start_date', label: 'Start Date' },
      { key: 'expected_end_date', label: 'Expected Deadline' },
      { key: 'actual_end_date', label: 'Actual Completion Date', format: (v) => v || 'In Progress' },
      {
        key: 'manager',
        label: 'Project Manager',
        format: (_, r) => (r.manager ? `${r.manager.first_name} ${r.manager.last_name} (${r.manager.email})` : 'Unassigned'),
      },
      { key: 'technology_stack', label: 'Technology Stack', format: (v) => v || '-' },
      { key: 'team_size', label: 'Team Size', format: (_, r) => r.members?.length || 0 },
      { key: 'description', label: 'Project Scope & Summary', format: (v) => v || '' },
    ];

    exportToCsv(
      `vaidimi_projects_portfolio_${new Date().toISOString().split('T')[0]}.csv`,
      projects,
      columns
    );
  };

  // Quick Portfolio Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const planning = projects.filter((p) => p.status === 'PLANNING' || p.status === 'NOT_STARTED').length;
    const onHold = projects.filter((p) => p.status === 'ON_HOLD' || p.status === 'CANCELLED').length;
    return { total, inProgress, completed, planning, onHold };
  }, [projects]);

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MEDIUM': return 'badge-info';
      default: return 'badge-info';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'badge-success';
      case 'IN_PROGRESS': return 'badge-info';
      case 'PLANNING': return 'badge-warning';
      case 'ON_HOLD': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const detailRoutePrefix = isAdminOrHR ? (isAdmin ? '/admin/projects' : '/hr/projects') : '/employee/projects';

  return (
    <AppLayout pageTitle="Projects Portfolio" subtitle="Manage enterprise client solutions, architecture roadmaps, deliverables, and team allocations">
      {/* Portfolio Overview KPI Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '160px', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Total Projects
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{metrics.total}</div>
        </div>

        <div style={{ flex: 1, minWidth: '160px', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            ⚡ In Progress
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0284c7' }}>{metrics.inProgress}</div>
        </div>

        <div style={{ flex: 1, minWidth: '160px', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            ✅ Completed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{metrics.completed}</div>
        </div>

        <div style={{ flex: 1, minWidth: '160px', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            📐 Planning
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d97706' }}>{metrics.planning}</div>
        </div>
      </div>

      {/* Top Filter & Action Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Search projects by title, code, client, tech stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="PLANNING">Planning</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              title="Download full project portfolio as CSV spreadsheet for Excel"
              style={{ fontWeight: '600', fontSize: '0.8125rem' }}
            >
              📥 Export Projects (Excel / CSV)
            </button>
            {isAdminOrHR && (
              <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontSize: '0.8125rem' }}>
                ➕ Create Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading project portfolio...
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💼</div>
          <h3 style={{ fontSize: '1.375rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            No Projects in Portfolio
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
            All dummy projects have been purged. You can now create your official company projects and assign teams.
          </p>
          {isAdminOrHR && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              ➕ Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                {/* Header: Code, Badges & Quick Action Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '800',
                      fontSize: '0.8125rem',
                      color: 'var(--primary)',
                      padding: '0.2rem 0.5rem',
                      backgroundColor: 'var(--primary-light)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      {proj.project_code}
                    </span>
                    <span className={`badge ${getPriorityBadgeClass(proj.priority)}`}>
                      {proj.priority}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(proj.status)}`}>
                      {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  {isAdminOrHR && (
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(proj, e)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--primary)', borderColor: 'var(--border-color)' }}
                        title="Edit Project Details"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj, e)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          borderColor: '#fca5a5',
                          backgroundColor: '#fef2f2',
                          fontWeight: '600'
                        }}
                        title="Delete Project Permanently"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Title & Client */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                  {proj.project_name}
                </h3>
                {proj.client_name && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Client: <strong>{proj.client_name}</strong>
                  </div>
                )}

                {/* Description snippet */}
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.5',
                  marginBottom: '1rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {proj.description || 'No description provided.'}
                </p>

                {/* Technology Stack Tags */}
                {proj.technology_stack && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
                    {proj.technology_stack.split(',').map((tech, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.6875rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontWeight: '600'
                      }}>
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Overall Progress</span>
                    <strong style={{ color: 'var(--primary)' }}>{proj.completion_percentage}%</strong>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${proj.completion_percentage}%`,
                      height: '100%',
                      backgroundColor: proj.completion_percentage === 100 ? 'var(--success)' : 'var(--primary)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Team Members & Assigned Parts Preview */}
                {proj.members && proj.members.length > 0 ? (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                      <span>👥 Team Roster ({proj.members.length} Members):</span>
                      <span>Assigned Part / Role</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '96px', overflowY: 'auto' }}>
                      {proj.members.slice(0, 4).map((m) => {
                        const role = m.ProjectMember?.role_in_project || m.project_members?.role_in_project || m.role_in_project || m.designation || 'Member';
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                              👤 {m.first_name} {m.last_name}
                            </span>
                            <span style={{
                              fontSize: '0.6875rem',
                              color: 'var(--primary)',
                              backgroundColor: 'var(--primary-light)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              {role}
                            </span>
                          </div>
                        );
                      })}
                      {proj.members.length > 4 && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.15rem' }}>
                          +{proj.members.length - 4} more team members
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-color)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>👥 Team: No members allocated yet</span>
                    <button
                      type="button"
                      onClick={() => navigate(`${detailRoutePrefix}/${proj.id}`)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}
                    >
                      + Assign Team
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer: Manager, Members Count, Dates & Workspace Link */}
              <div style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Manager: <strong>{proj.manager ? `${proj.manager.first_name} ${proj.manager.last_name}` : 'Unassigned'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Due: <strong>{proj.expected_end_date}</strong> &bull; Team: <strong>{proj.members?.length || 0} members</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(`${detailRoutePrefix}/${proj.id}`)}
                    style={{ fontSize: '0.8125rem', padding: '0.45rem 0.85rem', fontWeight: '700' }}
                  >
                    👁️ View Workspace &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Project */}
      {isAddModalOpen && (
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
                <h2 style={{ fontSize: '1.375rem', fontWeight: '800' }}>Create New Company Project</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Initiate a project, set timeline targets, and designate project leadership.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              {/* Row 1: Title & Client */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Project Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise CRM Cloud Architecture"
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Horizon Global Holdings"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                  Project Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Summary of goals, scope, and key deliverables..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                />
              </div>

              {/* Row 2: Tech Stack & Manager */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Technology Stack (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="React, Node.js, MySQL, Docker"
                    value={formData.technology_stack}
                    onChange={(e) => setFormData({ ...formData, technology_stack: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Project Manager
                  </label>
                  <select
                    value={formData.project_manager_id}
                    onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Select Project Manager (Optional) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Priority, Status, Progress */}
              <div className="grid grid-cols-3" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
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
                    value={formData.completion_percentage}
                    onChange={(e) => setFormData({ ...formData, completion_percentage: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Row 4: Start Date & Due Date */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2199-12-31"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Expected End Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2199-12-31"
                    required
                    value={formData.expected_end_date}
                    onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Section: Team Composition & Roles (Kitne logo ki team h & kaun sa employee kaun sa part dekh rha h) */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>
                      👥 Project Team Allocation (Optional)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Assign team members and specify what part or role each employee will handle.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMemberRow}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    ➕ Add Member
                  </button>
                </div>

                {formData.members.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
                    No team members added yet. Click "+ Add Member" to allocate staff now, or add them later from the project workspace.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {formData.members.map((member, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={member.employee_id}
                          onChange={(e) => handleMemberChange(idx, 'employee_id', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#fff',
                            fontSize: '0.8125rem'
                          }}
                        >
                          <option value="">-- Choose Employee / Intern --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name} ({emp.designation || emp.employment_type})
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Assigned Part / Role (e.g. Frontend Lead, QA, Site Eng)"
                          value={member.role_in_project}
                          onChange={(e) => handleMemberChange(idx, 'role_in_project', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8125rem'
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveMemberRow(idx)}
                          style={{
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                          title="Remove Member"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Project */}
      {isEditModalOpen && editingProject && (
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
                  ✏️ Edit Project: {editingProject.project_code}
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

            {formError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              {/* Row 1: Title & Client */}
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

              {/* Description */}
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

              {/* Row 2: Tech Stack & Manager */}
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
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Priority, Status, Progress */}
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
                    Progress % (0 - 100)
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

              {/* Row 4: Start Date & Due Date */}
              <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    min="1900-01-01"
                    max="2199-12-31"
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
                    min="1900-01-01"
                    max="2199-12-31"
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default ProjectsPage;
