import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../../services/branchService';
import { getEmployees } from '../../services/employeeService';

function BranchesPage() {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    branch_code: '',
    branch_name: '',
    city: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    branch_head_id: '',
    is_active: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, eRes] = await Promise.all([
        getBranches(),
        getEmployees({ status: 'ACTIVE' }),
      ]);
      if (bRes.success) setBranches(bRes.data || []);
      if (eRes.success) setEmployees(eRes.data || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      branch_code: '',
      branch_name: '',
      city: '',
      state: '',
      address: '',
      phone: '',
      email: '',
      branch_head_id: '',
      is_active: true,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_code: branch.branch_code || '',
      branch_name: branch.branch_name || '',
      city: branch.city || '',
      state: branch.state || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      branch_head_id: branch.branch_head_id || '',
      is_active: branch.is_active !== false,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (!formData.branch_name.trim() || !formData.city.trim()) {
        setErrorMsg('Branch Name and City are required.');
        setSubmitting(false);
        return;
      }

      if (editingBranch) {
        const res = await updateBranch(editingBranch.id, formData);
        if (res.success) {
          setSuccessMsg(`Branch "${formData.branch_name}" updated successfully.`);
          setIsModalOpen(false);
          loadData();
        } else {
          setErrorMsg(res.message || 'Failed to update branch.');
        }
      } else {
        const res = await createBranch(formData);
        if (res.success) {
          setSuccessMsg(`New branch "${formData.branch_name}" added successfully.`);
          setIsModalOpen(false);
          loadData();
        } else {
          setErrorMsg(res.message || 'Failed to create branch.');
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (branch) => {
    if (!window.confirm(`Are you sure you want to deactivate "${branch.branch_name}"?`)) return;
    try {
      const res = await deleteBranch(branch.id);
      if (res.success) {
        setSuccessMsg(res.message);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.branch_name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.branch_code.toLowerCase().includes(q)
    );
  });

  const totalStaffAll = branches.reduce((acc, b) => acc + (b.totalStaff || 0), 0);
  const totalEmployeesAll = branches.reduce((acc, b) => acc + (b.totalEmployees || 0), 0);
  const totalInternsAll = branches.reduce((acc, b) => acc + (b.totalInterns || 0), 0);

  return (
    <AppLayout>
      <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🏢</span> Company Branches & Regional Offices
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Multi-Branch Architecture: Manage company physical locations, regional hubs, and assign branch-scoped HR managers.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <span>➕</span> Add New Branch
            </button>
          )}
        </div>

        {/* Alerts */}
        {successMsg && (
          <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Branches</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>{branches.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Across {new Set(branches.map((b) => b.city)).size} cities</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Workforce</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#2563eb', marginTop: '0.25rem' }}>{totalStaffAll}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active staff members</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Permanent Employees</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#059669', marginTop: '0.25rem' }}>{totalEmployeesAll}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Standard payroll staff</div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Active Interns</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#7c3aed', marginTop: '0.25rem' }}>{totalInternsAll}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Training cohorts</div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search branches by name, code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              🔍
            </span>
          </div>
        </div>

        {/* Branch Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading branch data...
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
            <h3>No Branches Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try modifying your search criteria or create a new branch.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredBranches.map((b) => (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: b.branch_code === 'BR-HQ' ? '4px solid #0f766e' : '4px solid #3b82f6',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: b.branch_code === 'BR-HQ' ? '#ccfbf1' : '#eff6ff',
                          color: b.branch_code === 'BR-HQ' ? '#0f766e' : '#1d4ed8',
                        }}
                      >
                        {b.branch_code}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.4rem', marginBottom: '0.2rem' }}>
                        {b.branch_name}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>📍</span> {b.city} {b.state ? `• ${b.state}` : ''}
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: b.is_active ? '#ecfdf5' : '#fef2f2',
                        color: b.is_active ? '#059669' : '#dc2626',
                      }}
                    >
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Address & Contact */}
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                    {b.address && <p style={{ marginBottom: '0.3rem' }}>🏢 {b.address}</p>}
                    {b.phone && <p style={{ marginBottom: '0.3rem' }}>📞 {b.phone}</p>}
                    {b.email && <p style={{ marginBottom: '0.3rem' }}>✉️ {b.email}</p>}
                  </div>

                  {/* Branch Head / Lead */}
                  <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                      Branch Head / Lead HR
                    </div>
                    {b.branchHead ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#0f766e',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                          }}
                        >
                          {b.branchHead.first_name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            {b.branchHead.first_name} {b.branchHead.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {b.branchHead.designation}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        Unassigned (Managed by Super Admin)
                      </div>
                    )}
                  </div>

                  {/* Staff Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f766e' }}>{b.totalEmployees || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employees</div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#7c3aed' }}>{b.totalInterns || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interns</div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>{b.totalProjects || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projects</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => openEditModal(b)}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                    >
                      ✏️ Edit Branch
                    </button>
                    {b.branch_code !== 'BR-HQ' && (
                      <button
                        onClick={() => handleDeactivate(b)}
                        className="btn btn-outline-danger"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                        title="Deactivate branch"
                      >
                        {b.is_active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                  {editingBranch ? `Edit Branch: ${editingBranch.branch_name}` : '➕ Add New Company Branch'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              {errorMsg && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      Branch Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BR-NOI or DEL-01"
                      value={formData.branch_code}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      Branch Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Noida Tech Development Hub"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Noida, Delhi, Lucknow"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      State / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Uttar Pradesh, Delhi NCR"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Full Office Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Floor, Building, Tech Park, Street Address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+91 120 4567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                      Official Email
                    </label>
                    <input
                      type="email"
                      placeholder="info@vaidimiconsulting.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Assign Branch Head / Lead HR
                  </label>
                  <select
                    value={formData.branch_head_id}
                    onChange={(e) => setFormData({ ...formData, branch_head_id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="">-- No specific head assigned (Managed by Admin) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.designation}) - {emp.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default BranchesPage;
