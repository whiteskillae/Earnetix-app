import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Trophy, Crown, TrendingUp, Medal, Star } from 'lucide-react';

const LeaderboardPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { loading, request } = useApi();

  const fetchLeaderboard = async () => {
    setError(null);
    try {
      const res = await request('get', '/users/leaderboard');
      setData(res.data.data);
    } catch (err) {
      setError("The High Command intelligence feed is temporarily offline. Please attempt reconnection.");
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [request]);

  if (loading && !data) return (
    <div className="flex-center" style={{ height: '60vh' }}>
       <div className="loader-new"></div>
    </div>
  );

  if (error && !data) return (
    <div className="flex-center" style={{ height: '60vh', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '20px' }}>
       <div className="logo-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '80px', height: '80px', borderRadius: '24px' }}>
          <Star size={40} />
       </div>
       <h2 style={{ margin: 0 }}>CONNECTION INTERRUPTED</h2>
       <p style={{ color: 'var(--gray-500)', maxWidth: '400px' }}>{error}</p>
       <button className="btn btn-primary" onClick={fetchLeaderboard}>RE-INITIALIZE FEED</button>
    </div>
  );

  const topThree = data?.slice(0, 3) || [];
  const others = data?.slice(3) || [];

  return (
    <div className="leaderboard-view fade-in">
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Trophy color="#f59e0b" size={32} /> HALL OF FAME
        </h1>
        <p>Recognizing our top performing agents worldwide</p>
      </div>

      {/* Premium Podium */}
      <div className="podium-container">
        {/* Second Place */}
        {topThree[1] && (
          <div className="podium-item second slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="podium-avatar">
               {topThree[1].avatar ? (
                 <img src={topThree[1].avatar} alt={topThree[1].username || topThree[1].name} style={{ width: '70px', height: '70px', borderRadius: '20px', objectFit: 'cover' }} />
               ) : (
                 <div className="user-avatar-wrap" style={{ width: '70px', height: '70px', fontSize: '1.5rem', background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)' }}>
                   {((topThree[1].username || topThree[1].name || 'U').charAt(0) || 'U').toUpperCase()}
                 </div>
               )}
               <div className="rank-badge" style={{ background: '#94a3b8' }}>2</div>
            </div>
            <div className="podium-name" title={topThree[1].uid}>@{topThree[1].username || topThree[1].name.split(' ')[0]}</div>
            <div className="podium-points">{topThree[1].points.toLocaleString()} PTS</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', marginTop: '4px' }}>UID: {topThree[1].uid || 'N/A'}</div>
          </div>
        )}

        {/* First Place */}
        {topThree[0] && (
          <div className="podium-item first slide-up">
            <div className="podium-avatar">
               <Crown className="crown-icon" style={{ position: 'absolute', top: '-25px', color: '#f59e0b' }} size={32} fill="#f59e0b" />
               {topThree[0].avatar ? (
                 <img src={topThree[0].avatar} alt={topThree[0].username || topThree[0].name} style={{ width: '100px', height: '100px', borderRadius: '28px', border: '4px solid #f59e0b', objectFit: 'cover' }} />
               ) : (
                 <div className="user-avatar-wrap" style={{ width: '100px', height: '100px', fontSize: '2.5rem', border: '4px solid #f59e0b' }}>
                   {((topThree[0].username || topThree[0].name || 'U').charAt(0) || 'U').toUpperCase()}
                 </div>
               )}
               <div className="rank-badge">1</div>
            </div>
            <div className="podium-name" style={{ fontSize: '1.1rem' }} title={topThree[0].uid}>@{topThree[0].username || topThree[0].name.split(' ')[0]}</div>
            <div className="podium-points" style={{ fontSize: '0.9rem' }}>{topThree[0].points.toLocaleString()} PTS</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '4px' }}>UID: {topThree[0].uid || 'N/A'}</div>
          </div>
        )}

        {/* Third Place */}
        {topThree[2] && (
          <div className="podium-item third slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="podium-avatar">
               {topThree[2].avatar ? (
                 <img src={topThree[2].avatar} alt={topThree[2].username || topThree[2].name} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover' }} />
               ) : (
                 <div className="user-avatar-wrap" style={{ width: '60px', height: '60px', fontSize: '1.2rem', background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' }}>
                   {((topThree[2].username || topThree[2].name || 'U').charAt(0) || 'U').toUpperCase()}
                 </div>
               )}
               <div className="rank-badge" style={{ background: '#b45309' }}>3</div>
            </div>
            <div className="podium-name" title={topThree[2].uid}>@{topThree[2].username || topThree[2].name.split(' ')[0]}</div>
            <div className="podium-points">{topThree[2].points.toLocaleString()} PTS</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', marginTop: '4px' }}>UID: {topThree[2].uid || 'N/A'}</div>
          </div>
        )}
      </div>

      {/* Global Rankings List */}
      <div className="rankings-list glass-panel" style={{ padding: '10px' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--blue)" /> GLOBAL RANKINGS
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 700 }}>UPDATED REAL-TIME</span>
        </div>

        <div className="rankings-scroll" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {others.map((user) => (
            <div key={user._id} className="rank-row">
              <div className="rank-number">#{user.rank}</div>
              {user.avatar ? (
                <img src={user.avatar} alt={user.username || user.name} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
              ) : (
                <div className="user-avatar-wrap" style={{ width: '36px', height: '36px', fontSize: '0.9rem', borderRadius: '10px' }}>
                  {((user.username || user.name || 'U').charAt(0) || 'U').toUpperCase()}
                </div>
              )}
              <div className="rank-user-info">
                <span className="rank-username">@{user.username || user.name}</span>
                <span className="rank-meta">UID: {user.uid || 'N/A'} • {user.country || 'Global'}</span>
              </div>
              <div className="rank-score">
                {user.points.toLocaleString()} <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>PTS</span>
              </div>
            </div>
          ))}
          
          {data?.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
              Calculating rankings... Check back soon!
            </div>
          )}
        </div>
      </div>

      <style>{`
        .rank-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: var(--transition);
        }
        .rank-row:hover { background: rgba(255,255,255,0.02); }
        .rank-number { font-weight: 800; font-size: 0.9rem; color: var(--gray-500); width: 30px; }
        .rank-user-info { display: flex; flex-direction: column; flex: 1; }
        .rank-username { font-weight: 700; color: white; font-size: 0.95rem; }
        .rank-meta { font-size: 0.7rem; color: var(--gray-500); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .rank-score { font-weight: 800; color: var(--green); font-size: 1rem; text-align: right; }
        
        .crown-icon { animation: float 3s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-5px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

export default LeaderboardPage;
