import { Plus, Edit, Trash2, Clock, CheckCircle, XCircle, FileText, ImageIcon, FileCode, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';

const TaskManagement = ({ tasks, onCreateTask, onEditTask, onDeleteTask, onBulkDelete }) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map(t => t._id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    onBulkDelete(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="task-manager-view">
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
         <div>
           <h3 style={{ margin: 0 }}>Campaign Portfolio</h3>
           <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Deploy and manage intelligence acquisition protocols</p>
         </div>
         
         <div style={{ display: 'flex', gap: '12px' }}>
            {selectedIds.length > 0 && (
              <button className="btn btn-danger" onClick={handleBulkDeleteClick}>
                <Trash2 size={18} /> Decommission ({selectedIds.length})
              </button>
            )}
            <button className="btn btn-outline" onClick={selectAll} style={{ background: selectedIds.length > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
              {selectedIds.length === tasks.length && tasks.length > 0 ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} />}
              {selectedIds.length > 0 ? `Selected ${selectedIds.length}` : 'Select All'}
            </button>
            <button className="btn btn-primary" onClick={onCreateTask}>
              <Plus size={18} /> Initialize Campaign
            </button>
         </div>
      </div>

      <div className="task-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {tasks.map(task => {
          const isSelected = selectedIds.includes(task._id);
          return (
            <div 
              key={task._id} 
              className="glass-panel" 
              style={{ 
                padding: '24px', position: 'relative', 
                border: isSelected ? '2px solid var(--blue)' : '1px solid var(--glass-border)',
                transition: 'var(--transition)'
              }}
            >
              {/* Checkbox */}
              <div 
                onClick={() => toggleSelect(task._id)}
                style={{ 
                  position: 'absolute', top: '12px', left: '12px', zIndex: 5,
                  width: '24px', height: '24px', borderRadius: '6px', background: isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {isSelected && <CheckSquare size={14} color="white" />}
              </div>

              <div className="flex-between" style={{ marginBottom: '16px', marginLeft: '24px' }}>
                 <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: '#3b82f6' }}>
                    {task.inputType.includes('image') ? <ImageIcon size={20} /> : task.inputType.includes('file') ? <FileCode size={20} /> : <FileText size={20} />}
                 </div>
                 <span className="points-badge" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>+{task.rewardPoints} CR</span>
              </div>

              <h4 style={{ fontSize: '1.1rem', marginBottom: '12px', marginLeft: '24px' }}>{task.title}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px', lineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '3.8em' }}>
                {task.description}
              </p>

              <div className="flex-gap" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', marginBottom: '24px', justifyContent: 'space-around' }}>
                 <TaskStat mini icon={<Clock size={12} color="#f59e0b" />} value={task.stats?.pending || 0} label="Wait" />
                 <TaskStat mini icon={<CheckCircle size={12} color="#10b981" />} value={task.stats?.approved || 0} label="OK" />
                 <TaskStat mini icon={<XCircle size={12} color="#ef4444" />} value={task.stats?.rejected || 0} label="Bad" />
              </div>

              <div className="flex-between">
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Type: {task.inputType}</span>
                 <div className="flex-gap">
                    <button className="btn-icon" onClick={() => onEditTask(task)}><Edit size={16} /></button>
                    <button className="btn-icon danger" onClick={() => onDeleteTask(task._id)}><Trash2 size={16} /></button>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TaskStat = ({ icon, value, label }) => (
  <div style={{ textAlign: 'center' }}>
     <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
        {icon} <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{value}</span>
     </div>
     <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
  </div>
);

export default TaskManagement;
