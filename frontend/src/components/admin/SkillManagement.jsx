import Modal from '../common/Modal';
import ConfirmModal from '../common/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Save, X, Tag } from 'lucide-react';

const SkillManagement = () => {
  const { request } = useApi();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', skillsString: '' });

  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await request('get', '/skill-categories');
      if (res.success) setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const skills = form.skillsString.split(',').map(s => s.trim()).filter(s => s);
    const payload = { name: form.name, skills };

    try {
      if (editingCategory) {
        await request('put', `/skill-categories/${editingCategory._id}`, payload);
        toast.success('Category updated');
      } else {
        await request('post', '/skill-categories', payload);
        toast.success('Category created');
      }
      setShowModal(false);
      setForm({ name: '', skillsString: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Dismantle Infrastructure',
      message: 'Are you sure you want to dismantle this skill sector? This will remove all associated expertise tags from the global registry.',
      type: 'danger',
      confirmText: 'Dismantle Sector',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await request('delete', `/skill-categories/${id}`);
          toast.success('Sector Dismantled');
          fetchCategories();
          setConfirmModal(prev => ({ ...prev, open: false }));
        } catch (err) {}
        setActionLoading(false);
      }
    });
  };

  if (loading) return <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>Syncing Expert Databases...</div>;

  return (
    <div className="skill-management fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Skill Infrastructure</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Manage professional sectors and available expertise tags</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setForm({ name: '', skillsString: '' }); setShowModal(true); }}>
          <Plus size={18} /> New Sector
        </button>
      </div>

      <div className="grid-2" style={{ gap: '20px' }}>
        {categories.map(cat => (
          <div key={cat._id} className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: 'var(--blue-light)' }}>
                  <Tag size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{cat.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon" onClick={() => { setEditingCategory(cat); setForm({ name: cat.name, skillsString: cat.skills.join(', ') }); setShowModal(true); }}><Edit size={16} /></button>
                <button className="btn-icon danger" onClick={() => handleDelete(cat._id)}><Trash2 size={16} /></button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {cat.skills.map((skill, idx) => (
                <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', color: 'var(--gray-300)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Update Expertise Sector' : 'Define New Sector'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sector Name</label>
            <input 
              className="form-input" 
              placeholder="e.g. Creative Arts, FinTech"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Skills (Comma separated)</label>
            <textarea 
              className="form-input" 
              rows="5"
              placeholder="Coding, Web Development, App Development..."
              value={form.skillsString}
              onChange={(e) => setForm({ ...form, skillsString: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            <Save size={18} /> {editingCategory ? 'Update Infrastructure' : 'Initialize Sector'}
          </button>
        </form>
      </Modal>
      <ConfirmModal 
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={actionLoading}
      />
    </div>
  );
};

export default SkillManagement;
