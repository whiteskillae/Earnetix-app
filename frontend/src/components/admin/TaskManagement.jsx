import { Plus, Edit, Trash2, Clock, CheckCircle, XCircle, FileText, ImageIcon, FileCode } from 'lucide-react';

const TaskManagement = ({ tasks, onCreateTask, onEditTask, onDeleteTask }) => {
  return (
    <div className="task-manager-view">
      <div className="flex-between" style={{ marginBottom: '32px' }}>
         <h3 style={{ margin: 0 }}>Campaign Portfolio</h3>
         <button className="btn btn-primary" onClick={onCreateTask}>
           <Plus size={18} /> Launch New Campaign
         </button>
      </div>

      <div className="task-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {tasks.map(task => (
          <div key={task._id} className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
               <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: '#3b82f6' }}>
                  {task.inputType.includes('image') ? <ImageIcon size={20} /> : task.inputType.includes('file') ? <FileCode size={20} /> : <FileText size={20} />}
               </div>
               <span className="points-badge" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>+{task.rewardPoints} CR</span>
            </div>

            <h4 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{task.title}</h4>
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
        ))}
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
