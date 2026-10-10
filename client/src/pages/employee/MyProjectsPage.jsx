import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { getProjects } from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';

function MyProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadAssignedProjects = async () => {
      setLoading(true);
      try {
        const res = await getProjects();
        if (res.success) {
          setProjects(res.data);
        }
      } catch (err) {
        console.error('Failed to load employee projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssignedProjects();
  }, []);

  const getMyRole = (proj) => {
    const member = proj.members?.find((m) => m.id === user?.employeeProfile?.id);
    if (member && member.ProjectMember?.role_in_project) {
      return member.ProjectMember.role_in_project;
    }
    if (proj.project_manager_id === user?.employeeProfile?.id) {
      return 'Project Manager';
    }
    return 'Team Contributor';
  };

  return (
    <AppLayout pageTitle="My Assigned Projects" subtitle="Initiatives and deliverables you are actively contributing to">
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your assigned projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💼</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>No projects assigned yet</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            When your Project Manager assigns you to a project, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {projects.map((proj) => (
            <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '800',
                    color: 'var(--primary)',
                    backgroundColor: 'var(--primary-light)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem'
                  }}>
                    {proj.project_code}
                  </span>
                  <span className="badge badge-success">{proj.status.replace('_', ' ')}</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{proj.project_name}</h3>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  marginBottom: '1rem'
                }}>
                  My Role: {getMyRole(proj)}
                </div>

                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.25rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {proj.description || 'No description provided.'}
                </p>

                {/* Progress */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Project Completion</span>
                    <strong>{proj.completion_percentage}%</strong>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${proj.completion_percentage}%`,
                      height: '100%',
                      backgroundColor: 'var(--primary)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Manager: <strong>{proj.manager ? `${proj.manager.first_name} ${proj.manager.last_name}` : 'N/A'}</strong>
                  <div>Target Due: <strong>{proj.expected_end_date}</strong></div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/employee/projects/${proj.id}`)}
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  View Workspace &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default MyProjectsPage;
