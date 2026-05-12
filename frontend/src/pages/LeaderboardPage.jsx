import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Loader from '../components/common/Loader';
import { Trophy, Medal, Crown, TrendingUp, Users } from 'lucide-react';

const LeaderboardPage = () => {
  const { request, loading } = useApi();
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await request('get', '/users/leaderboard');
      setLeaders(res.data);
    } catch {}
  };

  if (loading && leaders.length === 0) return <Loader text="Calculating rankings..." />;

  const topThree = leaders.slice(0, 3);
  const remaining = leaders.slice(3);

  return (
    <div className="leaderboard-view fade-in">
      <header className="page-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
         <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Global Hall of Fame</h1>
         <p className="subtitle">The top earners in the EARNETIX ecosystem</p>
      </header>

      {/* Podium Section */}
      <div className="podium-container">
        {/* Second Place */}
        {topThree[1] && (
          <div className="podium-item second">
            <div className="avatar-wrapper">
              <div className="podium-rank">2</div>
              <div className="avatar-big">{topThree[1].name.charAt(0)}</div>
              <Medal size={24} className="medal-icon" color="#cbd5e1" />
            </div>
            <div className="podium-info">
              <h3>{topThree[1].name}</h3>
              <p className="points-badge">{topThree[1].points} PTS</p>
            </div>
          </div>
        )}

        {/* First Place */}
        {topThree[0] && (
          <div className="podium-item first">
            <div className="avatar-wrapper">
              <Crown size={32} className="crown-icon" color="#fbbf24" />
              <div className="podium-rank">1</div>
              <div className="avatar-huge">{topThree[0].name.charAt(0)}</div>
            </div>
            <div className="podium-info">
              <h3>{topThree[0].name}</h3>
              <p className="points-badge primary">{topThree[0].points} PTS</p>
            </div>
          </div>
        )}

        {/* Third Place */}
        {topThree[2] && (
          <div className="podium-item third">
            <div className="avatar-wrapper">
              <div className="podium-rank">3</div>
              <div className="avatar-big">{topThree[2].name.charAt(0)}</div>
              <Medal size={24} className="medal-icon" color="#b45309" />
            </div>
            <div className="podium-info">
              <h3>{topThree[2].name}</h3>
              <p className="points-badge">{topThree[2].points} PTS</p>
            </div>
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="glass-panel" style={{ marginTop: '40px' }}>
        <div className="flex-between" style={{ padding: '0 16px 20px' }}>
           <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <TrendingUp size={18} color="#3b82f6" /> Rankings #4 - #50
           </h4>
           <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Updated hourly</span>
        </div>
        
        <div className="leader-list">
          {remaining.map((user, index) => (
            <div key={user._id} className="leader-row">
               <div className="rank">#{index + 4}</div>
               <div className="user-pill">
                  <div className="avatar-mini">{user.name.charAt(0)}</div>
                  <div className="user-meta">
                    <span className="name">{user.name}</span>
                    <span className="date">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
               </div>
               <div className="score">{user.points} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>PTS</span></div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .podium-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 20px;
          margin-top: 60px;
          padding: 0 10px;
        }
        .podium-item {
          flex: 1;
          max-width: 140px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.3s ease;
        }
        .podium-item:hover { transform: translateY(-5px); }
        .podium-item.first { order: 2; max-width: 180px; }
        .podium-item.second { order: 1; }
        .podium-item.third { order: 3; }

        .avatar-wrapper { position: relative; margin-bottom: 16px; }
        .avatar-huge { width: 100px; height: 100px; border-radius: 30px; background: var(--blue-gradient); display: flex; alignItems: center; justifyContent: center; font-size: 2.5rem; font-weight: 800; border: 4px solid #fbbf24; box-shadow: 0 0 30px rgba(251, 191, 36, 0.3); }
        .avatar-big { width: 80px; height: 80px; border-radius: 24px; background: rgba(255,255,255,0.05); display: flex; alignItems: center; justifyContent: center; font-size: 1.8rem; font-weight: 800; border: 2px solid rgba(255,255,255,0.1); }
        
        .podium-rank { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #1e293b; padding: 2px 12px; border-radius: 20px; font-weight: 800; border: 2px solid rgba(255,255,255,0.1); font-size: 0.9rem; z-index: 10; }
        .crown-icon { position: absolute; top: -35px; left: 50%; transform: translateX(-50%) rotate(-10deg); filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.5)); }
        .medal-icon { position: absolute; top: -15px; right: -10px; }

        .podium-info h3 { font-size: 1rem; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        .points-badge { font-size: 0.8rem; font-weight: 800; color: #94a3b8; background: rgba(255,255,255,0.03); padding: 4px 12px; border-radius: 10px; }
        .points-badge.primary { color: #fbbf24; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); }

        .leader-row { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); gap: 16px; }
        .leader-row:last-child { border: none; }
        .leader-row .rank { width: 40px; font-weight: 800; color: #64748b; font-size: 0.9rem; }
        .user-pill { flex: 1; display: flex; align-items: center; gap: 12px; }
        .avatar-mini { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.03); display: flex; alignItems: center; justifyContent: center; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.05); }
        .user-meta { display: flex; flex-direction: column; }
        .user-meta .name { font-weight: 700; font-size: 0.95rem; }
        .user-meta .date { font-size: 0.7rem; color: #64748b; }
        .leader-row .score { font-weight: 800; color: #10b981; }

        @media (max-width: 480px) {
          .podium-container { gap: 10px; }
          .avatar-huge { width: 80px; height: 80px; font-size: 2rem; }
          .avatar-big { width: 60px; height: 60px; font-size: 1.5rem; }
          .podium-info h3 { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
};

export default LeaderboardPage;
