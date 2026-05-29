import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  reorderDepartments,
} from '../../../api/departments';
import type { Department } from '../../../api/departments';
import { DragReorderList } from '../../components/DragReorderList';
import type { DragItem } from '../../components/DragReorderList';
import { VENDOR_ID } from '../../../env';
import './DepartmentsScreen.css';

// ─── helpers ────────────────────────────────────────────────────────────────

function deriveHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// ─── main component ─────────────────────────────────────────────────────────

export function DepartmentsScreen() {
  const navigate = useNavigate();
  const vendorId = VENDOR_ID;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDepartments = useCallback(() => {
    return listDepartments(vendorId)
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => a.position - b.position);
        setDepartments(sorted);
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // ── inline edit handlers ─────────────────────────────────────────────────

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setDraftName(dept.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftName('');
  }

  async function saveEdit(id: string) {
    if (!draftName.trim()) return cancelEdit();
    setSaving(true);
    try {
      await updateDepartment(id, { name: draftName.trim() });
      setEditingId(null);
      setDraftName('');
      await loadDepartments();
    } finally {
      setSaving(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  // ── reorder handler ──────────────────────────────────────────────────────

  async function handleReorder(newOrderIds: string[]) {
    // Drop any in-flight inline edit so an unsaved draft can't collide with the
    // reorder write (which restamps every row's position).
    if (editingId) cancelEdit();
    // Optimistic local update
    const reordered = newOrderIds
      .map((id) => departments.find((d) => d.id === id))
      .filter(Boolean) as Department[];
    setDepartments(reordered);

    const order = newOrderIds.map((id, i) => ({ id, position: i }));
    try {
      await reorderDepartments(vendorId, order);
    } catch {
      // Revert on failure
      await loadDepartments();
    }
  }

  // ── add department ───────────────────────────────────────────────────────

  async function handleAddSubmit() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await createDepartment({
        tenant_id: vendorId,
        name: addName.trim(),
        handle: deriveHandle(addName.trim()),
      });
      setAddName('');
      setShowAddForm(false);
      await loadDepartments();
    } finally {
      setSaving(false);
    }
  }

  // ── build drag items ─────────────────────────────────────────────────────

  const dragItems: DragItem[] = departments.map((dept) => ({
    id: dept.id,
    content: (
      <div className="departments-screen__dept-content">
        <div className="departments-screen__dept-icon">
          {dept.icon_url ?? '🏪'}
        </div>

        <div className="departments-screen__dept-name">
          {editingId === dept.id ? (
            <>
              <input
                type="text"
                className="departments-screen__rename-input"
                aria-label={`Rename ${dept.name}`}
                value={draftName}
                autoFocus
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, dept.id)}
                onBlur={() => saveEdit(dept.id)}
                disabled={saving}
              />
              <div className="departments-screen__edit-actions">
                <button
                  type="button"
                  className="departments-screen__btn-mini departments-screen__btn-mini--cancel"
                  onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="departments-screen__btn-mini departments-screen__btn-mini--ok"
                  onMouseDown={(e) => { e.preventDefault(); saveEdit(dept.id); }}
                  disabled={saving}
                >
                  ✓ Save
                </button>
              </div>
            </>
          ) : (
            <div className="departments-screen__dept-ttl">{dept.name}</div>
          )}
        </div>

        <div className="departments-screen__dept-stats">
          {dept.product_count !== undefined && (
            <div className="departments-screen__dept-stat">
              <span className="departments-screen__stat-val">{dept.product_count}</span>
              <span className="departments-screen__stat-lbl">Products</span>
            </div>
          )}
        </div>

        <div className="departments-screen__dept-actions">
          <button
            type="button"
            className="departments-screen__btn-icon"
            aria-label={`Edit ${dept.name}`}
            title="Edit"
            onClick={() => startEdit(dept)}
          >
            ✎
          </button>
        </div>
      </div>
    ),
  }));

  // ── render ───────────────────────────────────────────────────────────────

  const totalProducts = departments.reduce((s, d) => s + (d.product_count ?? 0), 0);

  return (
    <div className="departments-screen">
      {/* Header */}
      <div className="departments-screen__header">
        <div className="departments-screen__header-left">
          <button
            type="button"
            className="departments-screen__back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ‹
          </button>
          <div>
            <h1 className="departments-screen__title">Manage Departments</h1>
            <div className="departments-screen__subtitle">
              How customers browse your shop
            </div>
          </div>
        </div>
        <button
          type="button"
          className="departments-screen__reset-btn"
          onClick={() => alert('Reset to industry default — coming soon')}
        >
          ↺ Reset to industry default
        </button>
      </div>

      <div className="departments-screen__shell">
        {/* Industry header */}
        {/* TODO: source the industry name/icon from tenant config — hardcoded to
            grocery for the single-tenant pilot. */}
        <div className="departments-screen__industry-header">
          <div className="departments-screen__industry-ic">🛒</div>
          <div>
            <h2 className="departments-screen__industry-name">Grocery</h2>
            <div className="departments-screen__industry-sub">
              Industry-seeded defaults · departments shown to customers in this order
            </div>
          </div>
          <div className="departments-screen__stats">
            <div className="departments-screen__stat-pill">
              <strong>{departments.length}</strong> depts
            </div>
            <div className="departments-screen__stat-pill">
              <strong>{totalProducts}</strong> products
            </div>
          </div>
        </div>

        {/* List label */}
        <div className="departments-screen__list-label">
          In customer order — drag to rearrange
        </div>

        {/* Department list */}
        {loading ? (
          <div className="departments-screen__loading">Loading departments…</div>
        ) : (
          <DragReorderList items={dragItems} onReorder={handleReorder} />
        )}

        {/* Add department */}
        {showAddForm ? (
          <div className="departments-screen__add-form">
            <input
              type="text"
              className="departments-screen__add-input"
              aria-label="New department name"
              placeholder="Department name…"
              value={addName}
              autoFocus
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubmit();
                if (e.key === 'Escape') { setShowAddForm(false); setAddName(''); }
              }}
              disabled={saving}
            />
            <div className="departments-screen__add-actions">
              <button
                type="button"
                className="departments-screen__btn-mini departments-screen__btn-mini--cancel"
                onClick={() => { setShowAddForm(false); setAddName(''); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="departments-screen__btn-mini departments-screen__btn-mini--ok"
                onClick={handleAddSubmit}
                disabled={saving || !addName.trim()}
              >
                ＋ Add
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="departments-screen__add-row"
            onClick={() => setShowAddForm(true)}
          >
            ＋ Add a department
          </button>
        )}

        {/* Footer hint */}
        <div className="departments-screen__foot">
          <div className="departments-screen__foot-ic">💡</div>
          <div>
            <strong>Industry-seeded defaults</strong> — when you first onboard, Hanoot drops in
            the typical departments for your industry. You can rename, reorder, or remove any of
            them.
          </div>
        </div>
      </div>
    </div>
  );
}
