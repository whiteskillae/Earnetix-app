import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RulesPage = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState(0);

  const rules = [
    {
      title: '1. General Guidelines',
      content: 'All tasks and missions on Earnetix must be completed truthfully and accurately. Do not use bots, automated scripts, or fake accounts. Any such activity will result in immediate suspension and forfeiture of points.'
    },
    {
      title: '2. Submitting Proof',
      content: 'When submitting images or links as proof, ensure they are clear, relevant, and directly address the task requirements. Blurred images or broken links will lead to rejection. Submissions are reviewed by our admin team within 24-48 hours.'
    },
    {
      title: '3. Blog Writing Rules',
      content: 'You can only write a blog if a specific Blog-type task is available or assigned to you. Blogs must be original content (no plagiarism) and meet the minimum word count specified in the task description.'
    },
    {
      title: '4. Rejections & Resubmissions',
      content: 'If your submission is rejected, you will receive a notification with a reason. You are allowed up to 2 resubmissions per task. Make sure to fix the highlighted issues before submitting again.'
    },
    {
      title: '5. Points & Rewards',
      content: 'Points are awarded only after a submission is successfully reviewed and approved. If a task requires KYC verification, you will need to complete that process before rewards are credited.'
    }
  ];

  return (
    <div className="rules-page fade-in">
      <button 
        onClick={() => navigate('/more')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--gray-400)', fontWeight: 700, cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to More
      </button>

      <div className="page-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white' }}>How to Play & Rules</h1>
        <p style={{ color: 'var(--gray-400)', marginTop: '8px', fontSize: '1.05rem', lineHeight: 1.6 }}>Understand the platform guidelines to ensure your submissions are approved and you earn rewards successfully.</p>
      </div>

      <div className="rules-container glass-panel" style={{ padding: '24px' }}>
        {rules.map((rule, idx) => (
          <div key={idx} style={{ borderBottom: idx !== rules.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', padding: '16px 0' }}>
            <button 
              onClick={() => setOpenSection(openSection === idx ? null : idx)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left', padding: '8px 0' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {idx === 0 && <AlertCircle size={20} color="var(--blue-light)" />}
                {idx === 1 && <CheckCircle size={20} color="var(--green)" />}
                {idx === 2 && <Shield size={20} color="var(--purple)" />}
                {idx > 2 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--yellow)' }} />}
                {rule.title}
              </span>
              {openSection === idx ? <ChevronUp size={20} color="var(--gray-500)" /> : <ChevronDown size={20} color="var(--gray-500)" />}
            </button>
            
            {openSection === idx && (
              <div className="rule-content slide-up" style={{ padding: '16px 0 8px 32px', color: 'var(--gray-300)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                {rule.content}
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`.rules-page { max-width: 800px; margin: 0 auto; padding-bottom: 80px; }`}</style>
    </div>
  );
};

export default RulesPage;
