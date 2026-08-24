
(function(){
  const LEVELS = ["Mới chơi", "Trung bình", "Khá", "Giỏi"];
  const LEVEL_COLOR = { 
    "Mới chơi": ["#FFF5EB", "#B85C00", "🥉 Mới chơi", "1px solid #FFD3A3"], 
    "Trung bình": ["#F1F3F5", "#495057", "🥈 Trung bình", "1px solid #CED4DA"], 
    "Khá": ["#FFF9DB", "#F59F00", "🥇 Khá", "1px solid #FFE066"], 
    "Giỏi": ["#E3FAF2", "#0CA678", "💎 Giỏi", "1px solid #96F2D7"] 
  };
  const MAX_MEMBERS = 50;
  const MONTH_NAMES = ["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"];
  const ROLE_LABEL = { admin: "Admin", r1: "R1", r2: "R2" };
  const ROLE_COLOR = { admin: ["#FAECE7","#993C1D"], r1: ["#FAEEDA","#854F0B"], r2: ["#F1EFE8","#444441"] };

  // ===================== XP RANK SYSTEM =====================
  // 5 cấp độ tay vợt – Chuẩn hóa cho CLB sinh hoạt 4 buổi/tháng (Mùa giải 6 tháng)
  const XP_RANKS = [
    { key: 'novice',    label: 'Tập sự',    emoji: '🐣', min: 0,    max: 299,  avatarBg: 'linear-gradient(135deg,#B0BEC5,#78909C)',      avatarFg: '#FFF',   ringColor: '#90A4AE' },
    { key: 'student',   label: 'Học viên',  emoji: '🏸', min: 300,  max: 899,  avatarBg: 'linear-gradient(135deg,#66BB6A,#388E3C)',      avatarFg: '#FFF',   ringColor: '#4CAF50' },
    { key: 'warrior',   label: 'Chiến binh',emoji: '⚔️', min: 900,  max: 1499, avatarBg: 'linear-gradient(135deg,#42A5F5,#1565C0)',      avatarFg: '#FFF',   ringColor: '#1E88E5' },
    { key: 'master',    label: 'Cao thủ',   emoji: '🐉', min: 1500, max: 2499, avatarBg: 'linear-gradient(135deg,#AB47BC,#6A1B9A)',      avatarFg: '#FFF',   ringColor: '#9C27B0' },
    { key: 'legendary', label: 'Huyền thoại',emoji:'👑', min: 2500, max: Infinity, avatarBg: 'linear-gradient(135deg,#FFD700 0%,#FF8C00 50%,#FFD700 100%)', avatarFg: '#3E2400', ringColor: '#FFD700', shimmer: true }
  ];

  // Hàm kiểm tra vote đúng giờ: trước 10h sáng ngày hôm trước buổi đánh
  function isVoteOnTime(session, memberId, memberName) {
    if (session.autoVoted && session.autoVoted[memberId]) return false;
    
    // Dữ liệu cũ chưa có timestamp thì tính mặc định là đúng giờ
    if (!session.voteTimestamps || !session.voteTimestamps[memberName]) return true;

    if (session.date) {
      const [yyyy, mm, dd] = session.date.split('-');
      const deadline = new Date(yyyy, mm - 1, dd);
      deadline.setDate(deadline.getDate() - 1);
      deadline.setHours(10, 0, 0, 0);
      return session.voteTimestamps[memberName] <= deadline.getTime();
    }
    return true;
  }

  function getXPRank(xp) {
    for (let i = XP_RANKS.length - 1; i >= 0; i--) {
      if (xp >= XP_RANKS[i].min) return XP_RANKS[i];
    }
    return XP_RANKS[0];
  }

  // Tính XP của 1 thành viên dựa trên toàn bộ sessions (tự động tích lũy từ lịch sử)
  function calculateMemberXP(memberId, sessions) {
    if (!sessions || !memberId) return 0;
    const mem = state.members.find(m => m.id === memberId);
    const memberName = mem ? mem.name : null;
    if (!memberName) return 0;
    
    const seasonStart = (state.settings && state.settings.xpSeasonStartDate) || null;
    let filteredSessions = [...sessions];
    if (seasonStart) {
      filteredSessions = filteredSessions.filter(s => (s.date || '') >= seasonStart);
    }
    
    let xp = 0;
    let streakCount = 0;
    const sortedSessions = filteredSessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sortedSessions.forEach(s => {
      const votes = s.votes || {};
      const passes = s.passes || {};
      const v = votes[memberName];
      const isReceiver = Object.values(passes).includes(memberId);
      const hasPassed   = Object.keys(passes).includes(memberId);
      
      if (isReceiver || (v === 'yes' && !hasPassed)) {
        xp += 50; // +50 XP mỗi buổi tham gia
        streakCount++;
        if (streakCount === 2) xp += 30; // +30 XP chuỗi 2 buổi liên tiếp
        if (streakCount >= 4) xp += 50; // +50 XP chuỗi 4 buổi hoàn hảo
      } else if (v === 'no' || hasPassed) {
        streakCount = 0;
      }

      // +15 XP nếu tự vote đúng giờ (trước 10h sáng ngày hôm trước)
      if ((v === 'yes' || v === 'no') && isVoteOnTime(s, memberId, memberName)) {
        xp += 15;
      }

      // + XP từ Thách đấu trong lịch sử (chỉ tính khi trận đấu ĐÃ HOÀN THÀNH)
      (s.challenges || []).forEach(c => {
        const isDone = c.status === 'done' || (c.score1 !== null && c.score2 !== null && c.score1 !== undefined && c.score2 !== undefined);
        if (isDone) {
          if (c.createdBy === memberName) xp += 15; // +15 XP khi trận đấu hoàn thành
          const s1 = parseInt(c.score1, 10) || 0;
          const s2 = parseInt(c.score2, 10) || 0;
          if ((c.team1 || []).includes(memberName)) {
            if (s1 > s2) xp += 40;      // Thắng +40 XP
            else if (s1 < s2) xp += 15; // Thua +15 XP
            else xp += 25;              // Hòa +25 XP
          }
          if ((c.team2 || []).includes(memberName)) {
            if (s2 > s1) xp += 40;      // Thắng +40 XP
            else if (s2 < s1) xp += 15; // Thua +15 XP
            else xp += 25;              // Hòa +25 XP
          }
        }
      });
    });
    return Math.max(0, xp);
  }

  // Tính XP tháng của 1 thành viên (dùng cho bảng XH tháng)
  function calculateMemberMonthXP(memberId, sessions, month) {
    if (!sessions || !memberId) return 0;
    const mem = state.members.find(m => m.id === memberId);
    const memberName = mem ? mem.name : null;
    if (!memberName) return 0;
    let xp = 0;
    let streakCount = 0;
    const monthSessions = sessions.filter(s => sessionMonthKey(s) === month)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    monthSessions.forEach(s => {
      const votes = s.votes || {};
      const passes = s.passes || {};
      const v = votes[memberName];
      const isReceiver = Object.values(passes).includes(memberId);
      const hasPassed   = Object.keys(passes).includes(memberId);

      if (isReceiver || (v === 'yes' && !hasPassed)) {
        xp += 50; // +50 XP mỗi buổi tham gia
        streakCount++;
        if (streakCount === 2) xp += 30;
        if (streakCount >= 4) xp += 50;
      } else if (v === 'no' || hasPassed) {
        streakCount = 0;
      }

      if ((v === 'yes' || v === 'no') && isVoteOnTime(s, memberId, memberName)) {
        xp += 15; // +15 XP vote đúng giờ
      }

      (s.challenges || []).forEach(c => {
        const isDone = c.status === 'done' || (c.score1 !== null && c.score2 !== null && c.score1 !== undefined && c.score2 !== undefined);
        if (isDone) {
          if (c.createdBy === memberName) xp += 15; // +15 XP khi trận đấu hoàn thành
          const s1 = parseInt(c.score1, 10) || 0;
          const s2 = parseInt(c.score2, 10) || 0;
          if ((c.team1 || []).includes(memberName)) {
            if (s1 > s2) xp += 40;
            else if (s1 < s2) xp += 15;
            else xp += 25;
          }
          if ((c.team2 || []).includes(memberName)) {
            if (s2 > s1) xp += 40;
            else if (s2 < s1) xp += 15;
            else xp += 25;
          }
        }
      });
    });
    return Math.max(0, xp);
  }



  // Số buổi tham gia của 1 thành viên (toàn thời gian)
  function countAttended(memberId, sessions) {
    if (!sessions) return 0;
    const mem = state.members.find(m => m.id === memberId);
    const memberName = mem ? mem.name : null;
    if (!memberName) return 0;
    return sessions.filter(s => {
      const passes = s.passes || {};
      const v = (s.votes || {})[memberName];
      const isReceiver = Object.values(passes).includes(memberId);
      const hasPassed   = Object.keys(passes).includes(memberId);
      if (!v && !isReceiver) return false;
      return isReceiver || (v === 'yes' && !hasPassed);
    }).length;
  }

  // ===================== BADGES SYSTEM =====================
  const BADGES = [
    { id: 'streak_fire', label: 'Chuỗi Lửa', emoji: '🔥', desc: 'Tham gia 3+ buổi liên tiếp', color: '#F26419', bg: 'rgba(242,100,25,0.12)' },
    { id: 'thunder_win', label: 'Sấm Sét',  emoji: '⚡', desc: 'Thắng 3+ trận thách đấu', color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
    { id: 'sniper_vote', label: 'Bắn Tỉa',  emoji: '🎯', desc: 'Vote đúng giờ 5+ lần', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
    { id: 'mvp_master',  label: 'Cao Thủ',  emoji: '🏆', desc: 'Đạt cấp Cao thủ hoặc Huyền thoại', color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
    { id: 'diligent',    label: 'Cần Mẫn',  emoji: '🐢', desc: 'Tham gia 10+ buổi tập', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' }
  ];

  function getMemberChallengeWins(memberName, sessions) {
    if (!sessions || !memberName) return 0;
    let wins = 0;
    sessions.forEach(s => {
      (s.challenges || []).forEach(c => {
        const isDone = c.status === 'done' || (c.score1 !== null && c.score2 !== null && c.score1 !== undefined && c.score2 !== undefined);
        if (isDone) {
          const s1 = parseInt(c.score1, 10) || 0;
          const s2 = parseInt(c.score2, 10) || 0;
          if ((c.team1 || []).includes(memberName) && s1 > s2) wins++;
          if ((c.team2 || []).includes(memberName) && s2 > s1) wins++;
        }
      });
    });
    return wins;
  }

  function getMemberBadges(memberId, sessions) {
    if (!memberId || !sessions) return [];
    const mem = state.members.find(m => m.id === memberId);
    if (!mem) return [];
    const memberName = mem.name;
    const badges = [];

    // 1. Diligent (10+ attended)
    const attended = countAttended(memberId, sessions);
    if (attended >= 10) badges.push(BADGES[4]);

    // 2. XP Rank Master/Legendary (XP >= 700)
    const xp = calculateMemberXP(memberId, sessions);
    if (xp >= 700) badges.push(BADGES[3]);

    // 3. Challenge Wins (3+)
    const wins = getMemberChallengeWins(memberName, sessions);
    if (wins >= 3) badges.push(BADGES[1]);

    // 4. Streak Fire (current streak >= 3)
    let streak = 0;
    const sorted = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sorted.forEach(s => {
      const passes = s.passes || {};
      const v = (s.votes || {})[memberName];
      const isReceiver = Object.values(passes).includes(memberId);
      const hasPassed   = Object.keys(passes).includes(memberId);
      if (isReceiver || (v === 'yes' && !hasPassed)) {
        streak++;
      } else if (v === 'no' || hasPassed) {
        streak = 0;
      }
    });
    if (streak >= 3) badges.push(BADGES[0]);

    // 5. Sniper Vote (5+ manual votes)
    let manualVotes = 0;
    sessions.forEach(s => {
      const v = (s.votes || {})[memberName];
      if ((v === 'yes' || v === 'no') && isVoteOnTime(s, memberId, memberName)) {
        manualVotes++;
      }
    });
    if (manualVotes >= 5) badges.push(BADGES[2]);

    return badges.filter(Boolean);
  }

  // ===================== 1-CLICK QUICK CHALLENGE MODAL =====================
  function openQuickChallengeModal(targetMember) {
    if (!state.me) {
      alert('Vui lòng đăng nhập để gửi chiến thư thách đấu!');
      return;
    }
    if (state.me.id === targetMember.id) {
      alert('Bạn không thể tự thách đấu chính mình!');
      return;
    }

    const todayStr = (new Date()).toISOString().slice(0, 10);
    const upcomingSessions = (state.sessions || [])
      .filter(s => (s.date || '') >= todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (upcomingSessions.length === 0) {
      alert('Hiện chưa có buổi đánh sắp tới nào để đặt kèo thách đấu.');
      return;
    }

    // Xóa modal cũ nếu có
    const oldModal = document.getElementById('bc-quick-challenge-modal');
    if (oldModal) oldModal.remove();

    const myName = state.me.name;
    const targetName = targetMember.name;
    const activeMembers = state.members.filter(m => m.status === 'active' && m.id !== state.me.id && m.id !== targetMember.id);

    const modalHtml = el(`<div id="bc-quick-challenge-modal" style="
        position:fixed; top:0; left:0; width:100vw; height:100vh;
        background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
      <div class="bc-card" style="
          width:100%; max-width:440px; background:var(--card-bg); border:2px solid #F26419;
          border-radius:20px; padding:1.4rem; box-shadow:0 20px 40px rgba(0,0,0,0.4); animation:rankBadgePop 0.3s ease;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <div style="font-size:18px; font-weight:800; color:#F26419; font-family:'Oswald',sans-serif; display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px; animation:shuttleBounce 1.2s infinite; display:inline-block;">⚡</span>
            <span>GỬI CHIẾN THƯ THÁCH ĐẤU</span>
          </div>
          <button id="qc-close" style="background:none; border:none; font-size:20px; color:var(--text-muted); cursor:pointer;">✕</button>
        </div>

        <div style="background:rgba(242,100,25,0.08); border:1px dashed #F26419; border-radius:12px; padding:10px 14px; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:8px;">
            ${avatarHtml(state.me, 32)}
            <span style="font-size:13px; font-weight:700;">${escapeHtml(myName)}</span>
          </div>
          <span style="font-size:16px; font-weight:900; color:#F26419;">VS</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:13px; font-weight:700;">${escapeHtml(targetName)}</span>
            ${avatarHtml(targetMember, 32)}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
          <div>
            <label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">📅 Chọn buổi đánh:</label>
            <select class="bc-select" id="qc-session" style="width:100%; padding:8px 10px;">
              ${upcomingSessions.map(s => `<option value="${s.id}">${s.date} (${s.time||'18:00'}${s.note ? ' - ' + escapeHtml(s.note) : ''})</option>`).join('')}
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:2px;">Đồng đội của bạn (tuỳ chọn):</label>
              <select class="bc-select" id="qc-p2" style="width:100%; padding:6px 8px; font-size:12px;">
                <option value="">-- Đánh đơn 1v1 --</option>
                ${activeMembers.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.nickname || m.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:2px;">Đồng đội đối thủ (tuỳ chọn):</label>
              <select class="bc-select" id="qc-p4" style="width:100%; padding:6px 8px; font-size:12px;">
                <option value="">-- Đánh đơn 1v1 --</option>
                ${activeMembers.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.nickname || m.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">🎯 Mức chấp kèo:</label>
            <select class="bc-select" id="qc-handicap" style="width:100%; padding:8px 10px;">
              <option value="Đánh đều (không chấp)">Đánh đều (không chấp)</option>
              <option value="Chấp 2 điểm">Chấp 2 điểm</option>
              <option value="Chấp 3 điểm">Chấp 3 điểm</option>
              <option value="Chấp 5 điểm">Chấp 5 điểm</option>
              <option value="Thua chung 1 chai nước 🥤">Thua chung 1 chai nước 🥤</option>
              <option value="Thua chung 1 ly trà sữa 🧋">Thua chung 1 ly trà sữa 🧋</option>
            </select>
          </div>

          <button class="bc-btn" id="qc-submit" style="
              background:linear-gradient(135deg,#F26419,#E76F51); border:none; color:#FFF;
              font-weight:700; font-size:15px; padding:12px; border-radius:12px; margin-top:6px;
              box-shadow:0 4px 15px rgba(242,100,25,0.35); cursor:pointer;">
            🔥 PHÁT CHIẾN THƯ NGAY (+5 XP)
          </button>
        </div>
      </div>
    </div>`);

    document.body.appendChild(modalHtml);

    document.getElementById('qc-close').onclick = () => modalHtml.remove();
    document.getElementById('qc-submit').onclick = () => {
      const sessId = document.getElementById('qc-session').value;
      const sess = state.sessions.find(s => s.id === sessId);
      if (!sess) { alert('Không tìm thấy buổi đánh.'); return; }

      const p2 = document.getElementById('qc-p2').value;
      const p4 = document.getElementById('qc-p4').value;
      const handicap = document.getElementById('qc-handicap').value;

      const newChallenge = {
        id: uid(),
        team1: [myName, p2].filter(Boolean),
        team2: [targetName, p4].filter(Boolean),
        handicap: handicap,
        status: 'pending',
        score1: null,
        score2: null,
        createdBy: myName,
        createdAt: Date.now()
      };

      const t1Str = [myName, p2].filter(Boolean).join(' & ');
      const t2Str = [targetName, p4].filter(Boolean).join(' & ');

      mutateSessions(latest => {
        const targetSess = latest.find(s => s.id === sessId);
        if (targetSess) {
          targetSess.challenges = targetSess.challenges || [];
          targetSess.challenges.push(newChallenge);
        }
        return latest;
      }).then(ok => {
        if (ok) {
          state.announcements = state.announcements || [];
          state.announcements.push({
            id: uid(),
            category: 'match',
            title: `🔥 CHIẾN THƯ THÁCH ĐẤU: ${t1Str} ⚔️ ${t2Str}`,
            content: `⚡ ${myName} vừa chính thức gửi chiến thư thách đấu tới ${targetName} cho buổi ngày ${sess.date}!\n\n🏸 Đội 1: ${t1Str}\n🏸 Đội 2: ${t2Str}\n📌 Thể thức: ${handicap}\n\n👉 Vui lòng vào app bấm "Nhận kèo" để chính thức mở màn trận đánh đỉnh cao này! ⚔️🔥`,
            expireDate: null,
            pinned: false,
            author: myName,
            phone: 'Thách đấu',
            createdAt: Date.now(),
            reactions: { thumbs: [], heart: [], fire: [] },
            isChallengeResult: true,
            sessionId: sess.id
          });

          saveAnnouncements();
          modalHtml.remove();
          render();
          showToast(`⚡ Đã phát chiến thư thách đấu tới ${targetName}!`, 'success');
        }
      });
    };
  }


  function monthKey(d){ d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
  function monthLabel(key){ const [y,m] = key.split('-'); return MONTH_NAMES[parseInt(m,10)-1] + '/' + y; }
  function sessionMonthKey(s){ return (s.date || '').slice(0,7) || monthKey(); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function normEmail(e){ return (e||'').trim().toLowerCase(); }
  function normUsername(u){ return (u||'').trim().toLowerCase().replace(/\s+/g,''); }
  function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str;
  }
  async function hashPassword(password, username) {
    if (!password) return '';
    const encoder = new TextEncoder();
    const salt = normUsername(username);
    const data = encoder.encode(password + salt + "badminton_secure_salt_9988");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function sendSystemEmail(to, subject, htmlBody) {
    const config = (state.settings && state.settings.mailServer) || {};
    if (!config.enabled) {
      console.warn('Mail server is disabled. Email not sent.');
      return false;
    }
    try {
      // 1. Ưu tiên Google Apps Script nếu User đã cấu hình và bật
      if (config.useGoogleScript && config.googleScriptUrl && config.googleScriptUrl !== '••••') {
        const payload = {
          to: to,
          subject: subject,
          body: htmlBody
        };
        // Sử dụng mode: 'no-cors' để tránh lỗi CORS khi Google Redirect (302) sang googleusercontent
        await fetch(config.googleScriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        return true;
      }

      // 2. Gửi qua Database RPC nếu không dùng Google Script (Bảo mật tuyệt đối, tránh lộ Credentials ở Client)
      try {
        const { data: rpcRes, error: rpcError } = await sb.rpc('bc_send_email', {
          p_to: to,
          p_subject: subject,
          p_body: htmlBody
        });
        if (!rpcError) {
          if (rpcRes && typeof rpcRes === 'string' && rpcRes.startsWith('ERROR')) {
            console.warn('DB RPC error response:', rpcRes);
          } else {
            console.log('Email sent successfully via DB RPC.');
            return true;
          }
        } else {
          console.warn('DB RPC failed or not installed. Falling back to SMTPJS...', rpcError);
        }
      } catch (rpcEx) {
        console.warn('Failed to call DB RPC:', rpcEx);
      }

      // 3. Fallback sang SMTPJS cũ (đã ngừng hoạt động, giữ lại để tương thích cấu hình cũ)
      if (config.secureToken !== '••••' && config.password !== '••••') {
        const payload = {
          To: to,
          From: `${config.senderName || 'CLB ARON Badminton'} <${config.senderEmail || config.username || ''}>`,
          Subject: subject,
          Body: htmlBody,
          Action: "Send",
          nocache: Math.floor(1e6 * Math.random() + 1)
        };

        if (config.useSecureToken && config.secureToken) {
          payload.SecureToken = config.secureToken;
        } else {
          payload.Host = config.host || 'smtp.gmail.com';
          payload.Port = parseInt(config.port) || 465;
          payload.Username = config.username || '';
          payload.Password = config.password || '';
        }

        const response = await fetch("https://smtpjs.com/v3/smtpjs.aspx?", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.error('SMTPJS network error:', response.statusText);
          return false;
        }

        const res = await response.text();
        if (res === 'OK') {
          return true;
        } else {
          console.error('SmtpJS send error:', res);
          return false;
        }
      }
      return false;
    } catch (e) {
      console.error('Email sending exception:', e);
      return false;
    }
  }
  function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = el(`<div id="toast-container" style="position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none;"></div>`);
      document.body.appendChild(container);
    }
    const bg = type === 'error' ? '#EF4444' : (type === 'warning' ? '#F59E0B' : '#2D6A4F');
    const toast = el(`<div style="background:${bg}; color:#FFF; padding:12px 16px; border-radius:8px; font-size:13px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.15); opacity:0; transform:translateY(20px); transition:all 0.3s ease; pointer-events:auto; display:flex; align-items:center; gap:8px;">
      <span>${message}</span>
    </div>`);
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => { toast.remove(); }, 300);
    }, 3500);
  }
  function formatVND(n, signed){
    n = Math.round(n || 0);
    const abs = Math.abs(n).toLocaleString('vi-VN');
    if (signed) return (n >= 0 ? '+' : '-') + abs + 'đ';
    return (n < 0 ? '-' : '') + abs + 'đ';
  }
  function formatDate(d){ if (!d) return ''; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
  const WEEKDAYS = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
  function weekdayLabel(d){ if (!d) return ''; const dt = new Date(d + 'T00:00:00'); return isNaN(dt) ? '' : WEEKDAYS[dt.getDay()]; }
  function formatTimeRange(start, end){ return end ? `${start} - ${end}` : start; }

  let state = {
    members: [], courts: [], sessions: [], tournaments: [], settings: { casualMultiplier: 1.5, logoUrl: '', bannerUrl: '', payment: { bankId: '', accountNo: '', accountName: '', qrUrl: '' } },
    payments: {}, fund: {}, donations: [], paymentRequests: [],
    me: null, myUsername: null, tab: 'sessions', memberFilter: 'all', viewMonth: monthKey(),
    authMode: 'login', authError: '', remember: false,
    sessionSearchDate: '', sessionSearchCourt: '', pastVisibleCount: 3,
    memberSearch: '', memberVisibleCount: 15,
    lastUpdated: {},
    editingMemberId: null,
    pendingRedirect: null,
    pendingAction: null
  };

  // ---------- Quyền ----------
  function isOwner(m){
    const u = m ? m.username : (state.me ? state.me.username : null);
    return u && normUsername(u) === 'kietdmt';
  }
  function role(){ return state.me ? state.me.role : null; }
  function isAdmin(){ return role() === 'admin' || isOwner(); }
  function canManage(){ return role() === 'admin' || role() === 'r1' || isOwner(); } // tạo/sửa, không xoá
  function canDelete(){ return isAdmin(); } // chỉ admin được xoá

  // ---------- Lưu trữ ----------
  // !!! DÁN URL VÀ ANON KEY CỦA SUPABASE VÀO 2 DÒNG DƯỚI ĐÂY TRƯỚC KHI ĐĂNG LÊN GITHUB !!!
  const SUPABASE_URL = "https://wuodiipueefiyeshimfx.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Sw5RS4XOOkZMG2p8qhuuzA_UGR0P_bX";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function showSaveError(key, detail){
    state.saveError = 'Không lưu được dữ liệu (' + key + '). ' + (detail ? '[' + detail + '] ' : '') + 'Kiểm tra lại kết nối mạng hoặc cấu hình Supabase, vui lòng thử lại.';
    render();
  }

  function showLoading(message) {
    message = message || 'Đang xử lý, vui lòng đợi...';
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
      overlay = el(`<div id="global-loading-overlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(10,25,47,0.6); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; z-index:99999; color:#FFFFFF; transition:opacity 0.3s ease; opacity:0; pointer-events:none;">
        <div style="width:50px; height:50px; border:4px solid rgba(255,255,255,0.15); border-top-color:#F26419; border-radius:50%; animation:spin 1s infinite linear; box-shadow:0 0 15px rgba(242,100,25,0.3);"></div>
        <div id="global-loading-text" style="font-family:'Outfit', sans-serif; font-size:15px; font-weight:500; text-shadow:0 2px 4px rgba(0,0,0,0.5);">${escapeHtml(message)}</div>
      </div>`);
      document.body.appendChild(overlay);
      overlay.offsetHeight;
    } else {
      document.getElementById('global-loading-text').textContent = message;
    }
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
  }

  function hideLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        if (overlay.parentNode && overlay.style.opacity === '0') {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
  }
  async function save(key, val, attempt){
    const currentRole = role();
    if (key === 'bc_settings' && currentRole !== 'admin' && !isOwner()) {
      console.error('Security block: unauthorized write to bc_settings via save.');
      return false;
    }
    if (key === 'bc_fund' && currentRole !== 'admin' && currentRole !== 'r1' && !isOwner()) {
      console.error('Security block: unauthorized write to bc_fund via save.');
      return false;
    }
    if (key === 'bc_members' && currentRole !== 'admin' && !isOwner()) {
      if (state.me !== null) {
        console.error('Security block: unauthorized write to bc_members via save.');
        return false;
      }
    }

    let finalVal = val;
    if (key === 'bc_settings' && !isOwner() && val) {
      finalVal = Object.assign({}, val);
      try {
        const { data } = await sb.from('bc_data').select('value').eq('key', 'bc_settings').maybeSingle();
        if (data && data.value && data.value.mailServer) {
          finalVal.mailServer = data.value.mailServer;
        }
      } catch (e) {
        console.error('Failed to preserve mailServer configuration:', e);
      }
    }

    attempt = attempt || 1;
    if (attempt === 1) {
      showLoading('Đang ghi dữ liệu lên đám mây...');
    }
    const json = JSON.stringify(finalVal);
    if (json.length > 4500000) { 
      hideLoading();
      showSaveError(key + ' (dữ liệu quá lớn, ảnh logo/banner nên dưới ~1MB)'); 
      return false; 
    }
    try {
      const authUser = state.me ? state.me.username : '';
      const pwHash = state.myPasswordHash || (state.rememberData ? state.rememberData.password : '');
      const { error } = await sb.rpc('bc_save_data', {
        p_key: key,
        p_value: finalVal,
        p_auth_username: authUser,
        p_auth_password_hash: pwHash
      });
      if (error) throw error;
      const nowStr = new Date().toISOString();
      state.saveError = null;
      state.lastUpdated[key] = nowStr;
      hideLoading();
      return true;
    } catch(e) {
      console.error('Lưu thất bại', key, e);
      if (attempt < 3) {
        await new Promise(res => setTimeout(res, 600 * attempt));
        return save(key, val, attempt + 1);
      }
      hideLoading();
      showSaveError(key, e.message || String(e));
      return false;
    }
  }
  function compressImage(file, maxDim, quality, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        callback(dataUrl);
      };
      img.onerror = () => {
        callback(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  async function loadKey(key, fallback){
    try {
      if (key === 'bc_members') {
        const { data, error } = await sb.rpc('bc_get_members');
        if (error) throw error;
        return data || fallback;
      }
      const { data, error } = await sb.from('bc_data').select('value, updated_at').eq('key', key).maybeSingle();
      if (error) throw error;
      if (data) {
        state.lastUpdated[key] = data.updated_at;
        const val = data.value;
        if (key === 'bc_settings' && !isOwner() && val && val.mailServer) {
          val.mailServer = Object.assign({}, val.mailServer, {
            password: val.mailServer.password ? '••••' : '',
            secureToken: val.mailServer.secureToken ? '••••' : '',
            googleScriptUrl: val.mailServer.googleScriptUrl ? '••••' : ''
          });
        }
        return val;
      }
      return fallback;
    } catch(e) { console.error('Đọc thất bại', key, e); return fallback; }
  }
  const saveMembers = () => { save('bc_members', state.members); if (typeof sb !== 'undefined' && sb) mutateKey('bc_members', () => state.members, []).catch(() => {}); };
  const saveCourts = () => { save('bc_courts', state.courts); if (typeof sb !== 'undefined' && sb) mutateKey('bc_courts', () => state.courts, []).catch(() => {}); };
  const saveSessions = () => { save('bc_sessions', state.sessions); if (typeof sb !== 'undefined' && sb) mutateKey('bc_sessions', () => state.sessions, []).catch(() => {}); };
  const saveSettings = () => { save('bc_settings', state.settings); if (typeof sb !== 'undefined' && sb) mutateKey('bc_settings', () => state.settings, {}).catch(() => {}); };
  const savePayments = () => { save('bc_payments', state.payments); if (typeof sb !== 'undefined' && sb) mutateKey('bc_payments', () => state.payments, {}).catch(() => {}); };
  const saveFund = () => { save('bc_fund', state.fund); if (typeof sb !== 'undefined' && sb) mutateKey('bc_fund', () => state.fund, {}).catch(() => {}); };
  const saveAnnouncements = () => { save('bc_announcements', state.announcements); if (typeof sb !== 'undefined' && sb) mutateKey('bc_announcements', () => state.announcements, []).catch(() => {}); };
  const saveTieVotes = () => { save('bc_tie_votes', state.tieVotes); if (typeof sb !== 'undefined' && sb) mutateKey('bc_tie_votes', () => state.tieVotes, {}).catch(() => {}); };


  function getMemberTieVotes(memberName, monthKey) {
    if (!state.tieVotes || !state.tieVotes[monthKey] || !memberName) return 0;
    const monthVotes = state.tieVotes[monthKey];
    return Object.values(monthVotes).filter(v => v === memberName).length;
  }

  function isMonthLocked(month) {
    return (state.settings.lockedMonths || []).includes(month);
  }

  async function toggleMonthLock(month) {
    if (!state.settings.lockedMonths) state.settings.lockedMonths = [];
    if (state.settings.lockedMonths.includes(month)) {
      state.settings.lockedMonths = state.settings.lockedMonths.filter(m => m !== month);
    } else {
      state.settings.lockedMonths.push(month);
    }
    await saveSettings();
    render();
  }

  // Thiết lập Rule: Tự động mặc định vote "Tham gia" cho các thành viên Cố định chưa vote
  // vào lúc 10:00 sáng của ngày hôm trước ngày đánh (khi chưa chốt buổi)
  function applyAutoLockVote(sessions) {
    if (!Array.isArray(sessions) || !Array.isArray(state.members) || state.members.length === 0) return false;
    
    // Đọc cấu hình Rule 1 (Khóa vote) từ settings
    const autoRules = (state.settings && state.settings.autoRules) || {};
    const lockVoteCfg = autoRules.lockVote || { enabled: true, days: 1, time: '10:00' };
    if (!lockVoteCfg.enabled) return false;

    let modified = false;
    const now = new Date();
    const nowStamp = now.toLocaleDateString('sv-SE') + 'T' + now.toTimeString().slice(0, 8);

    sessions.forEach(s => {
      if (!s || !s.date || s.locked) return;
      
      const parts = s.date.split('-').map(Number);
      if (parts.length < 3) return;
      const [y, m, d] = parts;
      const cutoffDate = new Date(y, m - 1, d);
      
      // Lùi ngày theo cấu hình
      const daysBefore = parseInt(lockVoteCfg.days) || 1;
      cutoffDate.setDate(cutoffDate.getDate() - daysBefore);
      
      // Lấy giờ phút từ cấu hình
      const [timeH, timeM] = (lockVoteCfg.time || '10:00').split(':');
      cutoffDate.setHours(timeH, timeM, 0, 0);

      const cY = cutoffDate.getFullYear();
      const cM = String(cutoffDate.getMonth() + 1).padStart(2, '0');
      const cD = String(cutoffDate.getDate()).padStart(2, '0');
      const cutoffTimeStr = `${cY}-${cM}-${cD}T${String(timeH).padStart(2, '0')}:${String(timeM).padStart(2, '0')}:00`;

      if (nowStamp >= cutoffTimeStr) {
        const mKey = sessionMonthKey(s);
        s.votes = s.votes || {};
        s.passes = s.passes || {};
        s.autoVoted = s.autoVoted || {};

        state.members.forEach(member => {
          if (member.status !== 'active') return;
          const curType = (member.monthlyType || {})[mKey] || '';
          if (curType === 'fixed' || curType === 'casual') {
            const hasVoted = !!s.votes[member.name];
            const hasPassed = !!s.passes[member.id];
            if (!hasVoted && !hasPassed) {
              s.votes[member.name] = curType === 'fixed' ? 'yes' : 'no';
              s.autoVoted[member.id] = true;
              modified = true;
            }
          }
        });
      }
    });

    return modified;
  }

  // Helper cho ghi dữ liệu có kiểm tra xung đột đồng thời (Optimistic Concurrency Control)
  async function mutateKey(key, mutator, fallbackVal) {
    const currentRole = role();
    if (key === 'bc_settings' && currentRole !== 'admin' && !isOwner()) {
      console.error('Security block: unauthorized write to bc_settings.');
      return null;
    }
    if (key === 'bc_fund' && currentRole !== 'admin' && currentRole !== 'r1' && !isOwner()) {
      console.error('Security block: unauthorized write to bc_fund.');
      return null;
    }

    showLoading('Đang lưu dữ liệu lên đám mây...');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await sb.from('bc_data')
          .select('value, updated_at')
          .eq('key', key)
          .maybeSingle();
        
        if (error) throw error;
        
        const latestVal = data ? data.value : fallbackVal;
        const lastKnownUpdated = data ? data.updated_at : null;
        
        const updatedVal = mutator(latestVal);
        if (updatedVal === null) {
          hideLoading();
          return null;
        }
        
        const authUser = state.me ? state.me.username : '';
        const pwHash = state.myPasswordHash || (state.rememberData ? state.rememberData.password : '');
        const { error: saveError } = await sb.rpc('bc_save_data', {
          p_key: key,
          p_value: updatedVal,
          p_auth_username: authUser,
          p_auth_password_hash: pwHash,
          p_last_known_updated: lastKnownUpdated
        });
        if (saveError) throw saveError;
        
        const nowStr = new Date().toISOString();
        state.lastUpdated[key] = nowStr;
        hideLoading();
        return updatedVal;
      } catch (e) {
        console.error(`Lỗi mutate key "${key}" lần thử ${attempt}:`, e);
        if (attempt === maxRetries) {
          hideLoading();
          showSaveError(key, e.message || String(e));
          return null;
        }
        await new Promise(r => setTimeout(r, 200 * attempt));
      }
    }
    hideLoading();
    return null;
  }

  async function mutatePayments(mutator){
    const updated = await mutateKey('bc_payments', mutator, {});
    if (updated === null) return false;
    state.payments = updated;
    return true;
  }
  async function mutateFund(mutator){
    const updated = await mutateKey('bc_fund', mutator, {});
    if (updated === null) return false;
    state.fund = updated;
    return true;
  }
  async function mutateDonations(mutator){
    const updated = await mutateKey('bc_donations', mutator, []);
    if (updated === null) return false;
    state.donations = updated;
    return true;
  }
  async function mutateSessions(mutator){
    const updated = await mutateKey('bc_sessions', mutator, []);
    if (updated === null) return false;
    state.sessions = updated;
    return true;
  }
  async function mutateMembers(mutator){
    const updated = await mutateKey('bc_members', latest => {
      const prev = latest || [];
      const next = mutator(prev);
      if (next === null) return null;

      const currentUser = state.me;
      const currentRole = role();

      // Nếu chưa đăng nhập, chỉ cho phép khách tự đăng ký tài khoản mới OR khôi phục mật khẩu (chỉ thay đổi trường password của chính họ)
      if (!currentUser) {
        // Trường hợp 1: Đăng ký mới
        if (next.length === prev.length + 1) {
          const newMember = next.find(x => !prev.some(y => y.id === x.id));
          if (newMember) {
            const isFirst = prev.length === 0;
            const expectedStatus = isFirst ? 'active' : 'pending';
            const expectedRole = isFirst ? 'admin' : 'r2';
            if (newMember.status === expectedStatus && newMember.role === expectedRole) {
              return next;
            }
          }
        }
        // Trường hợp 2: Khôi phục mật khẩu (chỉ thay đổi trường password của đúng 1 thành viên hiện có)
        else if (next.length === prev.length) {
          let diffCount = 0;
          let changedMemberPrev = null;
          let changedMemberNext = null;
          for (let i = 0; i < prev.length; i++) {
            const p = prev[i];
            const n = next.find(x => x.id === p.id);
            if (!n) { diffCount = 99; break; }
            
            const keys = Object.keys(Object.assign({}, p, n));
            let memberChanged = false;
            for (const key of keys) {
              if (key === 'password') {
                if (p[key] !== n[key]) memberChanged = true;
              } else {
                if (p[key] !== n[key]) {
                  diffCount = 99;
                  break;
                }
              }
            }
            if (memberChanged) {
              diffCount++;
              changedMemberPrev = p;
              changedMemberNext = n;
            }
          }
          if (diffCount === 1 && changedMemberPrev && changedMemberNext) {
            return next;
          }
        }
        console.error('Security block: unauthorized write to bc_members (no session).');
        return null;
      }

      // Owner kietdmt có toàn quyền thay đổi
      if (isOwner()) {
        return next;
      }

      // Đối với Admin thường (không phải Owner kietdmt), áp dụng các giới hạn bảo mật nghiêm ngặt
      if (currentRole === 'admin') {
        // 1. Ngăn chặn thêm mới thành viên với quyền Admin/Owner
        const newMembers = next.filter(m => !prev.some(o => o.id === m.id));
        for (const nm of newMembers) {
          if (nm.role === 'admin' || nm.role === 'owner') {
            console.error('Security block: regular admin attempted to add Admin/Owner.');
            return null;
          }
        }

        for (let i = 0; i < prev.length; i++) {
          const pM = prev[i];
          const nM = next.find(x => x.id === pM.id);

          // 2. Ngăn chặn xóa Admin/Owner hoặc chính mình
          if (!nM) {
            if (pM.role === 'admin' || isOwner(pM)) {
              console.error('Security block: regular admin attempted to delete Admin/Owner.');
              return null;
            }
            continue;
          }

          // So sánh thay đổi của từng người dùng
          const diffs = [];
          for (const k in pM) {
            if (JSON.stringify(pM[k]) !== JSON.stringify(nM[k])) diffs.push(k);
          }
          for (const k in nM) {
            if (!(k in pM)) diffs.push(k);
          }

          if (diffs.length > 0) {
            // 3. Ngăn chặn thay đổi thông tin của Owner kietdmt
            if (isOwner(pM)) {
              console.error('Security block: regular admin attempted to modify Owner kietdmt.');
              return null;
            }

            // 4. Ngăn tự ý thay đổi quyền hạn/trạng thái của chính mình
            if (pM.id === currentUser.id) {
              if (diffs.includes('role') || diffs.includes('status')) {
                console.error('Security block: admin attempted self role/status modification.');
                return null;
              }
            }

            // 5. Ngăn chặn bổ nhiệm Admin/Owner mới
            if (pM.role !== 'admin' && nM.role === 'admin') {
              console.error('Security block: regular admin attempted to appoint a new Admin.');
              return null;
            }
            if (nM.role === 'owner') {
              console.error('Security block: regular admin attempted to appoint an Owner.');
              return null;
            }
          }
        }
        return next;
      }

      // Đối với R1 và R2, kiểm tra chi tiết các thay đổi để ngăn chặn leo thang quyền lực
      if (next.length > prev.length) {
        console.error('Security block: non-admin attempted to add members.');
        return null;
      }
      if (next.length < prev.length) {
        console.error('Security block: non-admin attempted to delete members.');
        return null;
      }

      for (let i = 0; i < prev.length; i++) {
        const pM = prev[i];
        const nM = next.find(x => x.id === pM.id);
        if (!nM) return null; // blocked (delete operation detected)

        // So sánh các thay đổi
        const diffs = [];
        for (const k in pM) {
          if (JSON.stringify(pM[k]) !== JSON.stringify(nM[k])) diffs.push(k);
        }
        for (const k in nM) {
          if (!(k in pM)) diffs.push(k);
        }

        if (diffs.length > 0) {
          if (pM.id !== currentUser.id) {
            // Đang chỉnh sửa tài khoản của người khác
            const isTargetAdminOrOwner = pM.role === 'admin' || isOwner(pM);
            if (currentRole === 'r1') {
              if (isTargetAdminOrOwner) {
                // Đối với Admin/Owner, R1 chỉ được phép sửa duy nhất trường đăng ký tháng (monthlyType)
                const unauthorizedDiffs = diffs.filter(k => k !== 'monthlyType');
                if (unauthorizedDiffs.length > 0) {
                  console.error('Security block: R1 attempted to modify administrative fields on Admin/Owner.', unauthorizedDiffs);
                  return null;
                }
              } else {
                // Đối với thành viên thường (R2/R1 khác), R1 được phép sửa đổi thông tin/mật khẩu, nhưng cấm sửa vai trò (role) và trạng thái (status)
                const forbiddenKeysForR1 = ['role', 'status'];
                const violations = diffs.filter(k => forbiddenKeysForR1.includes(k));
                if (violations.length > 0) {
                  console.error('Security block: R1 attempted unauthorized modification of role/status on other member.', violations);
                  return null;
                }
              }
            } else {
              // R2 cấm sửa bất kỳ tài khoản nào khác
              console.error('Security block: R2 attempted to modify other member.');
              return null;
            }
          } else {
            // Đang chỉnh sửa tài khoản của chính mình
            // Thành viên thường (R1/R2) cấm tự ý thay đổi: vai trò (role), trạng thái (status), mã định danh (id)
            const forbiddenKeys = ['role', 'status', 'id'];
            const violations = diffs.filter(k => forbiddenKeys.includes(k));
            if (violations.length > 0) {
              console.error('Security block: member attempted unauthorized self-modification.', violations);
              return null;
            }
          }
        }
      }

      return next;
    }, []);
    if (updated === null) return false;
    state.members = updated;
    resolveMe();
    return true;
  }
  async function mutatePaymentRequests(mutator){
    const ok = await mutatePayments(latest => {
      const updated = Object.assign({}, latest);
      const curRequests = updated.paymentRequests || [];
      updated.paymentRequests = mutator(curRequests);
      return updated;
    });
    if (ok) {
      state.paymentRequests = state.payments.paymentRequests || [];
    }
    return ok;
  }
  async function mutateTournaments(mutator){
    const ok = await mutateKey('bc_settings', latestSettings => {
      const updatedSettings = Object.assign({}, latestSettings || {});
      let curTours = updatedSettings.tournaments || [];
      if (!Array.isArray(curTours)) {
        if (curTours && typeof curTours === 'object' && curTours.id) {
          curTours = [curTours];
        } else {
          curTours = [];
        }
      }
      const updatedTours = mutator(curTours);
      if (updatedTours === null) return null;
      updatedSettings.tournaments = updatedTours;
      return updatedSettings;
    }, {});
    
    if (ok) {
      state.settings = ok;
      state.tournaments = state.settings.tournaments || [];
      if (!Array.isArray(state.tournaments)) {
        state.tournaments = [];
      }
      return true;
    }
    return false;
  }

  // Dữ liệu riêng từng máy (đăng nhập, nhớ mật khẩu) lưu bằng localStorage của trình duyệt
  function lsGet(key){ try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
  function lsSet(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
  const saveMyUsername = () => lsSet('bc_my_username', state.myUsername);
  const saveRemember = (data) => lsSet('bc_remember', data);

  // Khởi tạo theme lưu trữ
  const savedTheme = lsGet('bc_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  async function loadAll(){
    try {
      const { data, error } = await sb.from('bc_data').select('key, value, updated_at');
      if (error) throw error;
      
      const dbMap = {};
      if (data) {
        data.forEach(row => {
          dbMap[row.key] = row.value;
          state.lastUpdated[row.key] = row.updated_at;
        });
      }
      
      state.members = dbMap['bc_members'] || [];
      state.courts = dbMap['bc_courts'] || [];
      state.sessions = dbMap['bc_sessions'] || [];
      state.announcements = dbMap['bc_announcements'] || [];
      state.tieVotes = dbMap['bc_tie_votes'] || {};
      const settingsRaw = dbMap['bc_settings'] || {};
      if (settingsRaw.mailServer) {
        settingsRaw.mailServer = Object.assign({}, settingsRaw.mailServer, {
          password: settingsRaw.mailServer.password ? '••••' : '',
          secureToken: settingsRaw.mailServer.secureToken ? '••••' : '',
          googleScriptUrl: settingsRaw.mailServer.googleScriptUrl ? '••••' : ''
        });
      }
      state.settings = Object.assign({ casualMultiplier: 1.5, logoUrl: '', bannerUrl: '', lockedMonths: [] }, settingsRaw);
      state.settings.payment = Object.assign({
        bankId: settingsRaw.bankId || (settingsRaw.payment && settingsRaw.payment.bankId) || '',
        accountNo: settingsRaw.accountNo || (settingsRaw.payment && settingsRaw.payment.accountNo) || '',
        accountName: settingsRaw.accountName || (settingsRaw.payment && settingsRaw.payment.accountName) || '',
        qrUrl: settingsRaw.qrUrl || (settingsRaw.payment && settingsRaw.payment.qrUrl) || ''
      }, settingsRaw.payment || {});
      state.settings.mailServer = Object.assign({
        enabled: false, host: 'smtp.gmail.com', port: 465, username: '', password: '', senderEmail: '', senderName: ''
      }, settingsRaw.mailServer || {});
      state.tournaments = state.settings.tournaments || [];
      state.payments = dbMap['bc_payments'] || {};
      state.fund = dbMap['bc_fund'] || {};
      state.donations = dbMap['bc_donations'] || [];
      state.paymentRequests = state.payments.paymentRequests || [];
    } catch (e) {
      console.warn('loadAll không kết nối được Supabase, tải dữ liệu từ LocalStorage:', e);
      state.members = lsGet('bc_members') || [];
      state.courts = lsGet('bc_courts') || [];
      state.sessions = lsGet('bc_sessions') || [];
      state.announcements = lsGet('bc_announcements') || [];
      state.tieVotes = lsGet('bc_tie_votes') || {};
      const settingsRaw = lsGet('bc_settings') || {};
      state.settings = Object.assign({ casualMultiplier: 1.5, logoUrl: '', bannerUrl: '', lockedMonths: [] }, settingsRaw);
      state.settings.payment = Object.assign({
        bankId: settingsRaw.bankId || (settingsRaw.payment && settingsRaw.payment.bankId) || '',
        accountNo: settingsRaw.accountNo || (settingsRaw.payment && settingsRaw.payment.accountNo) || '',
        accountName: settingsRaw.accountName || (settingsRaw.payment && settingsRaw.payment.accountName) || '',
        qrUrl: settingsRaw.qrUrl || (settingsRaw.payment && settingsRaw.payment.qrUrl) || ''
      }, settingsRaw.payment || {});
      state.settings.mailServer = Object.assign({
        enabled: false, host: 'smtp.gmail.com', port: 465, username: '', password: '', senderEmail: '', senderName: ''
      }, settingsRaw.mailServer || {});
      state.tournaments = state.settings.tournaments || [];
      state.payments = lsGet('bc_payments') || {};
      state.fund = lsGet('bc_fund') || {};
      state.donations = lsGet('bc_donations') || [];
      state.paymentRequests = state.payments.paymentRequests || [];
    }


    // Tự động sửa chữa dữ liệu giải đấu nếu bị lưu sai định dạng ở database
    if (!Array.isArray(state.tournaments)) {
      if (state.tournaments && typeof state.tournaments === 'object' && state.tournaments.id) {
        state.tournaments = [state.tournaments];
      } else {
        state.tournaments = [];
      }
    }

    // Tự động kiểm tra và di cư (băm) mật khẩu cũ
    let migrated = false;
    if (state.members && state.members.length > 0) {
      for (let m of state.members) {
        if (m.password && m.password.length < 64) {
          m.password = await hashPassword(m.password, m.username);
          migrated = true;
        }
      }
      if (migrated) {
        await saveMembers();
      }
    }

    let needSave = applyAutoLockVote(state.sessions);

    function normStr(str) {
      return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    // Tự động dọn dẹp các kèo thách đấu đã bị hủy khỏi sessions (không phân biệt hoa/thường/dấu)
    if (Array.isArray(state.sessions)) {
      state.sessions.forEach(s => {
        if (s.challenges && s.challenges.length > 0) {
          const origLen = s.challenges.length;
          s.challenges = s.challenges.filter(c => {
            const allNames = [...(c.team1 || []), ...(c.team2 || []), c.createdBy || ''].map(normStr);
            const hasTuAnh = allNames.some(n => n.includes('tu anh'));
            const hasHuyenTram = allNames.some(n => n.includes('huyen tram'));
            if (hasTuAnh || hasHuyenTram) {
              return false;
            }
            return true;
          });
          if (s.challenges.length !== origLen) needSave = true;
        }
      });
    }

    if (needSave) {
      await saveSessions();
    }

    if (Array.isArray(state.announcements)) {
      const origAnnLen = state.announcements.length;
      state.announcements = state.announcements.filter(a => {
        const normTitle = normStr(a.title);
        const normContent = normStr(a.content);
        if (a.isChallengeResult && ((normTitle.includes('tu anh') || normContent.includes('tu anh')) || (normTitle.includes('huyen tram') || normContent.includes('huyen tram')))) {
          return false;
        }
        return true;
      });
      if (state.announcements.length !== origAnnLen) {
        saveAnnouncements();
      }
    }




    state.myUsername = lsGet('bc_my_username');
    state.rememberData = lsGet('bc_remember');
    if (state.rememberData && state.rememberData.username) {
      const passwordHash = state.rememberData.password && state.rememberData.password.length < 64 
        ? await hashPassword(state.rememberData.password, state.rememberData.username)
        : state.rememberData.password;
      try {
        const { data: found } = await sb.rpc('bc_verify_login', {
          p_username: state.rememberData.username,
          p_password_hash: passwordHash
        });
        if (found) {
          state.myUsername = found.username;
          state.myPasswordHash = passwordHash;
        } else {
          state.myUsername = null;
          state.rememberData = null;
          saveRemember(null);
          saveMyUsername();
        }
      } catch (e) {
        console.error('Lỗi kiểm tra tự động đăng nhập:', e);
        state.myUsername = null;
      }
    } else {
      state.myUsername = null;
      saveMyUsername();
    }
    resolveMe();
    if (isOwner()) {
      try {
        const { data, error } = await sb.from('bc_data').select('value').eq('key', 'bc_settings').maybeSingle();
        if (!error && data && data.value) {
          state.settings = Object.assign(state.settings || {}, data.value);
          state.settings.mailServer = Object.assign(state.settings.mailServer || {}, data.value.mailServer || {});
        }
      } catch (e) {
        console.error('Failed to reload unmasked settings for owner:', e);
      }
    }
    await checkPendingAction();
  }

  function resolveMe(){
    if (!state.myUsername) { state.me = null; return; }
    const found = state.members.find(m => normUsername(m.username) === normUsername(state.myUsername));
    if (found && found.status === 'pending') {
      state.authError = 'Tài khoản của bạn đang chờ phê duyệt. Vui lòng liên hệ Admin/R1!';
      state.authMode = 'login';
      state.me = null;
      state.myUsername = null;
      saveMyUsername();
      return;
    }
    state.me = found || null;
    if (!found) state.myUsername = null;
  }

  function memberType(name, mKey){
    const m = state.members.find(x => x.name === name);
    if (!m || !m.monthlyType) return 'casual';
    return m.monthlyType[mKey] || 'casual';
  }

  function computeShares(s){
    const mKey = sessionMonthKey(s);
    const activeMembers = state.members.filter(m => {
      const curType = (m.monthlyType || {})[mKey] || '';
      return curType === 'fixed' || curType === 'casual';
    });
    const activeNames = activeMembers.map(m => m.name);
    const yesNames = Object.entries(s.votes)
      .filter(([,v]) => v === 'yes')
      .map(([name]) => name)
      .filter(name => activeNames.includes(name));
    let fixedNames = state.members.filter(m => (m.monthlyType || {})[mKey] === 'fixed' && m.status === 'active').map(m => m.name);
    let casualNames = yesNames.filter(n => memberType(n, mKey) !== 'fixed');

    // Pass slot: cố định đã pass vẫn trả phí; vãng lai nhận pass MIỄN PHÍ
    const passes = s.passes || {};
    const freeNames = [];
    Object.entries(passes).forEach(([fixedMemberId, casualMemberId]) => {
      if (!casualMemberId) return;
      const fixedMember = state.members.find(x => x.id === fixedMemberId);
      const casualMember = state.members.find(x => x.id === casualMemberId);
      if (fixedMember && !fixedNames.includes(fixedMember.name)) fixedNames.push(fixedMember.name);
      if (casualMember) {
        casualNames = casualNames.filter(n => n !== casualMember.name);
        if (!freeNames.includes(casualMember.name)) freeNames.push(casualMember.name);
      }
    });

    // --- Chế độ áp mức cố định (flat rate) ---
    const fr = s.flatRate || {};
    if (fr.enabled) {
      const fixedShare = fr.fixed || 0;
      const casualShare = fr.casual || 0;
      const total = fixedNames.length * fixedShare + casualNames.length * casualShare;
      return {
        mode: 'flat',
        total, fixedNames, casualNames, freeNames,
        fixedShare, casualShare, multiplier: fixedShare > 0 ? (casualShare / fixedShare) : null,
        passedFromNames: Object.keys(passes).map(fid => state.members.find(x => x.id === fid)?.name).filter(Boolean),
        passedToNames: freeNames
      };
    }

    // --- Chế độ chia chi phí (mặc định) ---
    const costs = s.costs || { court: 0, water: 0, shuttle: 0, other: 0 };
    const total = (costs.court||0) + (costs.water||0) + (costs.shuttle||0) + (costs.other||0);
    const m = state.settings.casualMultiplier || 1.5;
    const denom = fixedNames.length + m * casualNames.length;
    const unit = denom > 0 ? total / denom : 0;
    return {
      mode: 'split',
      total, fixedNames, casualNames, freeNames,
      fixedShare: unit, casualShare: unit * m, multiplier: m,
      passedFromNames: Object.keys(passes).map(fid => state.members.find(x => x.id === fid)?.name).filter(Boolean),
      passedToNames: freeNames
    };
  }

  // ---------- RENDER ROOT ----------
  function render(){
    const appEl = document.getElementById('app');
    if (appEl) {
      if (state.me && state.tab === 'report') {
        appEl.style.maxWidth = '1000px';
      } else {
        appEl.style.maxWidth = '720px';
      }
    }
    const root = document.getElementById('root');
    root.innerHTML = '';
    
    if (state.me && state.quickVoteMode) {
      root.appendChild(renderQuickVoteScreen());
      return;
    }
    
    if (!state.me) {
      root.appendChild(renderAuth());
      return;
    }
    root.appendChild(renderHeader());
    if (state.saveError) {
      const errBanner = el(`<div class="bc-card" style="background:#FAECE7; border-color:#E3A693; color:#993C1D; font-size:13px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span>⚠ ${escapeHtml(state.saveError)}</span>
        <button class="bc-btn danger small" id="bc-dismiss-err">Đóng</button>
      </div>`);
      root.appendChild(errBanner);
      setTimeout(() => { const b = document.getElementById('bc-dismiss-err'); if (b) b.onclick = () => { state.saveError = null; render(); }; }, 0);
    }
    root.appendChild(renderTabs());
    if (state.tab === 'sessions') root.appendChild(renderSessions());
    if (state.tab === 'leaderboard') root.appendChild(renderLeaderboard());
    if (state.tab === 'members') root.appendChild(renderMembers());
    if (state.tab === 'fund') root.appendChild(renderFund());
    if (state.tab === 'payments_mgr') root.appendChild(renderPaymentsMgr());
    if (state.tab === 'tournament') root.appendChild(renderTournament());
    if (state.tab === 'report') root.appendChild(renderReport());
  }

  function renderQuickVoteScreen() {
    const qv = state.quickVoteMode;
    const sess = state.sessions.find(s => s.id === qv.sessionId);
    const member = state.members.find(m => m.username.toLowerCase() === qv.username.toLowerCase());
    
    const wrap = el(`<div style="display:flex; flex-direction:column; align-items:center; width:100%; padding:20px 0;"></div>`);
    
    if (!sess || !member) {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:30px;">
        <h3 style="color:#993C1D;">⚠ Lỗi dữ liệu</h3>
        <p style="color:#6b7a73; font-size:14px; margin-bottom:20px;">Không tìm thấy thông tin buổi tập hoặc thành viên tương ứng.</p>
        <button class="bc-btn" id="qv-goto-main">Vào ứng dụng chính</button>
      </div>`));
      setTimeout(() => {
        document.getElementById('qv-goto-main').onclick = () => {
          state.quickVoteMode = null;
          render();
        };
      }, 0);
      return wrap;
    }

    const court = state.courts.find(c => c.id === sess.courtId);
    const courtName = court ? court.name : 'Chưa chọn sân';
    const courtAddress = court && court.address ? court.address : '';
    const mapLink = court && court.mapLink ? court.mapLink : '';
    
    const mKey = sessionMonthKey(sess);
    const myType = (member.monthlyType || {})[mKey] || '';
    const myVote = sess.votes[member.name];
    
    let statusText = 'Bạn chưa biểu quyết';
    let statusColor = '#888780';
    let statusBg = '#F1EFE8';
    
    const isReceiver = Object.values(sess.passes || {}).includes(member.id);
    const hasPassed = myType === 'fixed' && sess.passes && sess.passes[member.id];
    
    if (hasPassed) {
      statusText = 'Bạn đã nhường slot (tính vắng)';
      statusColor = '#854F0B';
      statusBg = '#FAEEDA';
    } else if (isReceiver) {
      statusText = 'Bạn tham gia (Nhận pass)';
      statusColor = '#0C447C';
      statusBg = '#E6F1FB';
    } else if (myVote === 'yes') {
      statusText = 'Bạn đã chọn: THAM GIA 🏸';
      statusColor = '#27500A';
      statusBg = '#EAF3DE';
    } else if (myVote === 'no') {
      statusText = 'Bạn đã chọn: BÁO VẮNG ❌';
      statusColor = '#993C1D';
      statusBg = '#FAECE7';
    }

    let isCasualFull = false;
    if (myType === 'casual' && myVote !== 'yes') {
      let casualPlaying = 0;
      state.members.forEach(x => {
        const t = (x.monthlyType || {})[mKey] || '';
        const v = sess.votes[x.name];
        if (x.status === 'active' && t === 'casual' && v === 'yes') {
          casualPlaying++;
        }
      });
      if (sess.maxCasual && casualPlaying >= sess.maxCasual) {
        isCasualFull = true;
      }
    }

    const card = el(`<div class="bc-card" style="width:100%; max-width:480px; box-shadow:0 12px 40px rgba(0,0,0,0.15); border-radius:16px; background:#FFF; border: 1px solid var(--card-border); padding:24px; text-align:center;">
      <div style="font-size:36px; margin-bottom:10px;">🏸</div>
      <h2 style="font-size:20px; font-weight:700; color:#1B4332; margin-top:0; margin-bottom:6px; font-family:'Oswald', sans-serif; letter-spacing:0.5px;">
        BIỂU QUYẾT NHANH BUỔI TẬP
      </h2>
      <div style="font-size:13px; color:#6b7a73; margin-bottom:20px;">Chào <strong>${escapeHtml(memberDisplayName(member))}</strong> (${myType === 'fixed' ? 'Cố định' : 'Vãng lai'})</div>
      
      <div style="background:#FAF8F5; border:1px solid #E3E0D6; border-radius:10px; padding:12px; margin-bottom:20px; text-align:left; font-size:14px;">
        <div style="font-weight:600; color:#1B4332; margin-bottom:4px;">📅 Lịch tập:</div>
        <div style="color:#2D6A4F; font-weight:500;">${weekdayLabel(sess.date)}, ngày ${formatDate(sess.date)}</div>
        <div style="color:#6b7a73; margin-top:2px;">⏰ Giờ: ${formatTimeRange(sess.time, sess.timeEnd)}</div>
        <div style="color:#6b7a73; margin-top:2px;">📍 Sân: ${escapeHtml(courtName)}</div>
        ${courtAddress ? `<div style="color:#8a877d; font-size:12px; margin-top:2px;">${escapeHtml(courtAddress)}</div>` : ''}
        ${mapLink ? `<div style="margin-top:6px;"><a href="${escapeHtml(mapLink)}" target="_blank" style="color:#0C447C; font-weight:600; text-decoration:none; font-size:12px; display:inline-flex; align-items:center; gap:4px;">📍 Xem bản đồ Google Maps →</a></div>` : ''}
      </div>

      <div style="margin-bottom:25px; padding:10px; border-radius:8px; font-weight:600; font-size:14px; background:${statusBg}; color:${statusColor}; border:1px solid rgba(0,0,0,0.05);">
        ${statusText}
      </div>

      ${sess.locked ? `<div style="color:#993C1D; font-weight:600; font-size:13px; margin-bottom:20px;">🔒 Buổi tập này đã chốt danh sách, không thể thay đổi vote!</div>` : `
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:25px;">
          <button class="bc-btn" id="qv-yes-btn" style="background:linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%); color:#FFF; font-size:15px; padding:12px; font-weight:600; border-radius:10px; box-shadow:0 4px 15px rgba(45,106,79,0.25); display:flex; align-items:center; justify-content:center; gap:8px;" ${isCasualFull ? 'disabled' : ''}>
            🏸 ĐI CHƠI NGAY ${isCasualFull ? '(Hết chỗ)' : ''}
          </button>
          <button class="bc-btn outline" id="qv-no-btn" style="border-color:#993C1D; color:#993C1D; font-size:15px; padding:12px; font-weight:600; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
            ❌ BÁO VẮNG
          </button>
          ${myType === 'fixed' ? `
            <button class="bc-btn outline" id="qv-pass-btn" style="border-color:#854F0B; color:#854F0B; font-size:15px; padding:12px; font-weight:600; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
              🔄 NHƯỜNG SLOT (PASS)
            </button>
          ` : ''}
        </div>
      `}

      <div style="border-top:1px dashed #E3E0D6; padding-top:15px;">
        <button class="bc-btn outline small" id="qv-main-btn" style="border-color:#8a877d; color:#8a877d; font-size:12px; padding:6px 16px;">
          🏠 Vào trang chủ ứng dụng
        </button>
      </div>
    </div>`);

    wrap.appendChild(card);

    setTimeout(() => {
      const btnYes = card.querySelector('#qv-yes-btn');
      const btnNo = card.querySelector('#qv-no-btn');
      const btnPass = card.querySelector('#qv-pass-btn');
      const btnMain = card.querySelector('#qv-main-btn');

      if (btnYes) btnYes.onclick = async () => {
        showLoading('Đang xử lý...');
        const ok = await mutateSessions(latest => {
          const list = Array.isArray(latest) ? latest : [];
          return list.map(s => {
            if (s.id === sess.id) {
              const updatedSess = Object.assign({}, s);
              updatedSess.votes = Object.assign({}, s.votes || {});
              updatedSess.passes = Object.assign({}, s.passes || {});
              updatedSess.votes[member.name] = 'yes';
              delete updatedSess.passes[member.id];
              return updatedSess;
            }
            return s;
          });
        });
        hideLoading();
        if (ok) {
          showToast('Đã ghi nhận biểu quyết tham gia của bạn! 🏸', 'success');
          render();
        } else {
          showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
        }
      };

      if (btnNo) btnNo.onclick = async () => {
        showLoading('Đang xử lý...');
        const ok = await mutateSessions(latest => {
          const list = Array.isArray(latest) ? latest : [];
          return list.map(s => {
            if (s.id === sess.id) {
              const updatedSess = Object.assign({}, s);
              updatedSess.votes = Object.assign({}, s.votes || {});
              updatedSess.passes = Object.assign({}, s.passes || {});
              updatedSess.votes[member.name] = 'no';
              delete updatedSess.passes[member.id];
              return updatedSess;
            }
            return s;
          });
        });
        hideLoading();
        if (ok) {
          showToast('Đã ghi nhận biểu quyết vắng của bạn! ❌', 'success');
          render();
        } else {
          showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
        }
      };

      if (btnPass) btnPass.onclick = async () => {
        showLoading('Đang xử lý...');
        const ok = await mutateSessions(latest => {
          const list = Array.isArray(latest) ? latest : [];
          return list.map(s => {
            if (s.id === sess.id) {
              const updatedSess = Object.assign({}, s);
              updatedSess.votes = Object.assign({}, s.votes || {});
              updatedSess.passes = Object.assign({}, s.passes || {});
              updatedSess.votes[member.name] = 'no';
              updatedSess.passes[member.id] = 'pending';
              return updatedSess;
            }
            return s;
          });
        });
        hideLoading();
        if (ok) {
          showToast('Đã ghi nhận nhường slot của bạn! 🔄', 'success');
          render();
        } else {
          showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
        }
      };

      if (btnMain) btnMain.onclick = () => {
        state.quickVoteMode = null;
        render();
      };
    }, 0);

    return wrap;
  }

  function showForgotPasswordDialog() {
    let dialog = document.getElementById('forgot-pw-dialog');
    const mailConfig = (state.settings && state.settings.mailServer) || {};
    const isEmailEnabled = mailConfig.enabled && mailConfig.username;

    if (!dialog) {
      dialog = el(`<dialog id="forgot-pw-dialog" style="border:none; border-radius:12px; padding:0; max-width:420px; width:90%; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); background:#FAF8F5;">
        <div style="padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3 style="font-size:16px; font-weight:600; color:#1B4332; margin:0;">Khôi phục mật khẩu</h3>
            <button id="forgot-pw-close" style="background:none; border:none; font-size:20px; color:#8a877d; cursor:pointer; line-height:1;">&times;</button>
          </div>
          
          <div id="forgot-pw-email-flow" style="display:${isEmailEnabled ? 'block' : 'none'};">
            <div style="font-size:13px; color:#6b7a73; margin-bottom:1rem; line-height:1.5;">
              Nhập email hoặc tên đăng nhập của bạn. Hệ thống sẽ tạo một mật khẩu tạm thời mới và gửi về email đã đăng ký của bạn.
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:1rem;">
              <input class="bc-input" id="forgot-pw-input" placeholder="Tên đăng nhập hoặc Email..." />
              <button class="bc-btn" id="forgot-pw-submit-btn">Gửi mật khẩu tạm qua Email</button>
              <div id="forgot-pw-msg" style="font-size:12px; margin-top:4px;"></div>
            </div>
            <div style="text-align:center; border-top:1px dashed #E3E0D6; padding-top:10px; font-size:12px;">
              <a href="#" id="forgot-pw-switch-contact" style="color:#1B4332; font-weight:500;">Liên hệ trực tiếp Admin</a>
            </div>
          </div>

          <div id="forgot-pw-contact-flow" style="display:${isEmailEnabled ? 'none' : 'block'};">
            <div style="font-size:13px; color:#6b7a73; margin-bottom:1rem; line-height:1.5;">
              Hệ thống sử dụng mật khẩu mã hóa bảo mật. Để khôi phục mật khẩu mới, bạn vui lòng liên hệ trực tiếp với các <strong>Admin</strong> hoặc <strong>Ban điều hành (R1)</strong> hoạt động dưới đây:
            </div>
            <div id="forgot-pw-admins" style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; margin-bottom:1rem;">
            </div>
            ${isEmailEnabled ? `
              <div style="text-align:center; border-top:1px dashed #E3E0D6; padding-top:10px; font-size:12px; margin-bottom:10px;">
                <a href="#" id="forgot-pw-switch-email" style="color:#1B4332; font-weight:500;">Khôi phục qua Email</a>
              </div>
            ` : ''}
            <div style="text-align:right;">
              <button class="bc-btn outline" id="forgot-pw-close-btn" style="padding:6px 16px; font-size:13px;">Đóng</button>
            </div>
          </div>
        </div>
      </dialog>`);
      document.body.appendChild(dialog);
      
      const style = document.createElement('style');
      style.textContent = `
        #forgot-pw-dialog::backdrop {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
        }
      `;
      document.head.appendChild(style);
    } else {
      document.getElementById('forgot-pw-email-flow').style.display = isEmailEnabled ? 'block' : 'none';
      document.getElementById('forgot-pw-contact-flow').style.display = isEmailEnabled ? 'none' : 'block';
    }

    document.getElementById('forgot-pw-close').onclick = () => dialog.close();
    const closeBtn = document.getElementById('forgot-pw-close-btn');
    if (closeBtn) closeBtn.onclick = () => dialog.close();

    const switchContact = document.getElementById('forgot-pw-switch-contact');
    if (switchContact) {
      switchContact.onclick = (e) => {
        e.preventDefault();
        document.getElementById('forgot-pw-email-flow').style.display = 'none';
        document.getElementById('forgot-pw-contact-flow').style.display = 'block';
      };
    }

    const switchEmail = document.getElementById('forgot-pw-switch-email');
    if (switchEmail) {
      switchEmail.onclick = (e) => {
        e.preventDefault();
        document.getElementById('forgot-pw-email-flow').style.display = 'block';
        document.getElementById('forgot-pw-contact-flow').style.display = 'none';
      };
    }

    const adminsContainer = document.getElementById('forgot-pw-admins');
    adminsContainer.innerHTML = '';
    const contactable = state.members.filter(m => (m.role === 'admin' || m.role === 'r1') && m.status === 'active');
    if (contactable.length === 0) {
      adminsContainer.appendChild(el(`<div style="font-size:13px; color:#993C1D; text-align:center; padding:10px;">Chưa có Admin nào hoạt động trong CLB.</div>`));
    } else {
      contactable.forEach(adm => {
        const phoneText = adm.phone ? adm.phone : 'Chưa cập nhật SĐT';
        const cleanPhone = adm.phone ? adm.phone.replace(/[^0-9]/g, '') : '';
        const callLink = cleanPhone ? `<a href="tel:${cleanPhone}" class="bc-btn small" style="padding:4px 8px; font-size:11px; display:inline-flex; align-items:center; gap:3px; background:#27500A; border-color:#27500A; color:#FFF; font-weight:500; text-decoration:none;">📞 Gọi</a>` : '';
        const zaloLink = cleanPhone ? `<a href="https://zalo.me/${cleanPhone}" target="_blank" class="bc-btn outline small" style="padding:4px 8px; font-size:11px; color:#0A54A6; border-color:#0A54A6; display:inline-flex; align-items:center; gap:3px; text-decoration:none;">💬 Zalo</a>` : '';
        
        adminsContainer.appendChild(el(`<div class="bc-card" style="padding:10px; margin:0; border:1px solid #E3E0D6; display:flex; justify-content:space-between; align-items:center; background:#fff;">
          <div>
            <div style="font-weight:500; font-size:13px; color:#1B4332;">${escapeHtml(adm.name)}</div>
            <div style="font-size:12px; color:#8a877d; margin-top:2px;">SĐT: ${escapeHtml(phoneText)}</div>
          </div>
          <div style="display:flex; gap:4px;">
            ${callLink}
            ${zaloLink}
          </div>
        </div>`));
      });
    }

    const submitBtn = document.getElementById('forgot-pw-submit-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const inputVal = document.getElementById('forgot-pw-input').value.trim().toLowerCase();
        const msg = document.getElementById('forgot-pw-msg');
        if (!inputVal) {
          msg.style.color = '#993C1D';
          msg.textContent = 'Vui lòng nhập tên đăng nhập hoặc email.';
          return;
        }

        submitBtn.disabled = true;
        msg.style.color = '#6b7a73';
        msg.textContent = 'Đang kiểm tra thông tin tài khoản...';

        const targetMember = state.members.find(m => 
          m.username.toLowerCase() === inputVal || 
          (m.email && m.email.toLowerCase() === inputVal)
        );

        if (!targetMember) {
          submitBtn.disabled = false;
          msg.style.color = '#993C1D';
          msg.textContent = 'Không tìm thấy tài khoản phù hợp với thông tin đã nhập.';
          return;
        }

        if (!targetMember.email) {
          submitBtn.disabled = false;
          msg.style.color = '#993C1D';
          msg.textContent = 'Tài khoản này chưa có email đăng ký, không thể khôi phục tự động. Vui lòng liên hệ Admin.';
          return;
        }

        const tempPassword = Math.random().toString(36).slice(-6).toUpperCase();
        
        try {
          msg.textContent = 'Đang cập nhật mật khẩu mới lên máy chủ...';
          const passwordHash = await hashPassword(tempPassword, targetMember.username);

          const ok = await mutateMembers(latest => {
            return latest.map(x => x.id === targetMember.id ? Object.assign({}, x, { password: passwordHash }) : x);
          });

          if (!ok) {
            submitBtn.disabled = false;
            msg.style.color = '#993C1D';
            msg.textContent = 'Lỗi cập nhật mật khẩu lên máy chủ. Vui lòng thử lại.';
            return;
          }

          msg.textContent = 'Đang gửi email chứa mật khẩu mới...';

          const emailSubject = `[CLB ARON] Khôi phục mật khẩu tài khoản`;
          const emailBody = `<h3>Chào ${targetMember.name},</h3>
            <p>Yêu cầu khôi phục mật khẩu cho tài khoản <strong>${targetMember.username}</strong> đã được thực hiện thành công.</p>
            <p>Mật khẩu tạm thời mới của bạn là: <strong style="font-size:16px; color:#993C1D; background:#FAECE7; padding:4px 8px; border-radius:4px; font-family:monospace;">${tempPassword}</strong></p>
            <p>Vui lòng sử dụng mật khẩu này để đăng nhập và đổi lại mật khẩu cá nhân ngay tại tab <strong>Thành viên</strong> sau khi đăng nhập.</p>
            <br/>
            <p>Trân trọng,</p>
            <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;

          const emailSent = await sendSystemEmail(targetMember.email, emailSubject, emailBody);

          submitBtn.disabled = false;
          if (emailSent) {
            msg.style.color = '#27500A';
            msg.textContent = `Mật khẩu tạm thời đã được gửi tới email ${targetMember.email}. Vui lòng kiểm tra hộp thư (và cả mục Spam nếu không thấy).`;
            document.getElementById('forgot-pw-input').value = '';
          } else {
            msg.style.color = '#993C1D';
            msg.textContent = 'Lỗi gửi email. Mật khẩu đã được đặt lại nhưng không gửi đi được. Vui lòng báo với Admin để được cấp mật khẩu mới.';
          }
        } catch (e) {
          submitBtn.disabled = false;
          msg.style.color = '#993C1D';
          msg.textContent = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
          console.error(e);
        }
      };
    }

    dialog.showModal();
  }

  function showPaymentQrDialog(amount, memo, onDone) {
    let dialog = document.getElementById('payment-qr-dialog');
    if (!dialog) {
      dialog = el(`<dialog id="payment-qr-dialog" style="border:none; border-radius:16px; padding:0; max-width:440px; width:90%; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -6px rgba(0,0,0,0.1); background:#FAF8F5; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid #E3E0D6; display:flex; justify-content:space-between; align-items:center; background:#FFF;">
          <h3 style="margin:0; font-size:15px; color:#1B4332; font-family:'Oswald', sans-serif;">🔒 QUÉT MÃ VIETQR THANH TOÁN</h3>
          <button id="pay-qr-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:#8a877d; line-height:1;">&times;</button>
        </div>
        <div style="padding:20px; display:flex; flex-direction:column; gap:16px; align-items:center; max-height:80vh; overflow-y:auto;" id="pay-qr-content">
        </div>
      </dialog>`);
      document.body.appendChild(dialog);
      
      const style = document.createElement('style');
      style.innerHTML = `
        #payment-qr-dialog::backdrop {
          background-color: rgba(27, 67, 50, 0.4);
          backdrop-filter: blur(4px);
        }
      `;
      document.head.appendChild(style);
      
      document.getElementById('pay-qr-close').onclick = () => dialog.close();
    }
    
    const content = document.getElementById('pay-qr-content');
    const payment = state.settings.payment || {};
    const receiveType = payment.receiveType || 'bank';
    const bankId = payment.bankId || '';
    const accountNo = payment.accountNo || '';
    const accountName = payment.accountName || '';
    const qrUrl = payment.qrUrl || '';
    
    content.innerHTML = '';
    
    const intro = el(`<div style="text-align:center; width:100%;">
      <div style="font-size:14px; font-weight:600; color:#27500A; background:#EAF3DE; padding:10px; border-radius:8px; border:1px solid rgba(39,80,10,0.15); margin-bottom:12px;">
        🎉 Gửi yêu cầu chuyển khoản thành công!
      </div>
      <div style="font-size:12px; color:#6b7a73; line-height:1.4;">
        Vui lòng quét mã QR dưới đây để thực hiện thanh toán chuyển khoản ngay:
      </div>
    </div>`);
    content.appendChild(intro);
    
    if (receiveType === 'momo') {
      const cleanMemo = removeVietnameseTones(memo).replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const qrImageSrc = qrUrl || '';
      
      let qrElementHtml = '';
      if (qrImageSrc) {
        qrElementHtml = `<img src="${qrImageSrc}" style="max-width:240px; width:100%; border:1px solid #E3E0D6; border-radius:12px; padding:8px; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.05);" />`;
      } else {
        qrElementHtml = `<div style="text-align:center; padding:20px; border:1px dashed #E3E0D6; border-radius:12px; background:#FFF; font-size:13px; color:#993C1D; max-width:240px; margin: 0 auto;">
          ⚠️ Chưa tải lên ảnh QR MoMo tĩnh.<br>Vui lòng chuyển khoản thủ công hoặc nhắc Thủ quỹ tải ảnh QR lên.
        </div>`;
      }
      
      const cardAndQr = el(`<div style="display:flex; flex-direction:column; align-items:center; gap:16px; width:100%;">
        <div style="position:relative; width:100%; max-width:320px; height:180px; background:linear-gradient(135deg, #A50064 0%, #D82D8A 100%); border-radius:16px; padding:20px; color:#FFF; box-shadow:0 10px 25px rgba(165,0,100,0.3); border:1px solid rgba(255,255,255,0.1); overflow:hidden; text-align:left; user-select:none;">
          <div style="position:absolute; top:0; left:0; right:0; height:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%); transform:skewY(-10deg) translateY(-20px); pointer-events:none;"></div>
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span style="font-size:11px; font-weight:700; color:#FFD700; letter-spacing:1px; text-transform:uppercase;">MOMO E-WALLET CARD</span>
            <span style="font-size:14px; font-weight:700; color:#FFF; letter-spacing:1px; text-transform:uppercase;">MOMO</span>
          </div>
          
          <div style="width:38px; height:28px; background:linear-gradient(135deg, #FFD700 0%, #B8860B 100%); border-radius:5px; margin-bottom:12px; position:relative; box-shadow:inset 0 1px 3px rgba(255,255,255,0.5);">
            <div style="position:absolute; top:3px; left:3px; right:3px; bottom:3px; border:1px solid rgba(0,0,0,0.1); border-radius:3px;"></div>
          </div>
          
          <div style="font-size:18px; font-weight:600; letter-spacing:2px; margin-bottom:12px; color:#F4F1EA; font-family:monospace;">
            ${escapeHtml(accountNo || treasurerPhone || '')}
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <div style="font-size:8px; color:#FFC0CB; text-transform:uppercase; letter-spacing:0.5px;">Chủ tài khoản ví</div>
              <div style="font-size:13px; font-weight:600; color:#FFF; text-transform:uppercase;">${escapeHtml(accountName)}</div>
            </div>
            <span style="font-size:18px; line-height:1;">💖</span>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px; width:100%;">
          ${qrElementHtml}
          <div style="font-size:13px; color:#1B4332; background:#EAF3DE; padding:6px 12px; border-radius:8px; font-weight:600; width:100%; max-width:320px; border:1px solid rgba(39,80,10,0.1); text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>Nội dung CK: <strong style="color:#27500A; font-family:monospace; font-size:13px;">${cleanMemo}</strong></span>
            <button class="bc-btn outline small" id="momo-copy-memo-btn" style="padding:2px 8px; font-size:11px; margin-left:auto; border-color:#27500A; color:#27500A; background:transparent;">Sao chép</button>
          </div>
          <div style="font-size:12px; color:#6b7a73; text-align:center; padding:0 12px; line-height:1.4;">
            💡 <em>Vui lòng dùng ứng dụng MoMo để quét ảnh mã QR nhận tiền cá nhân của Thủ quỹ ở trên. Bấm nút <strong>Sao chép</strong> để dán lời nhắn chuyển tiền và tự nhập số tiền cần chuyển.</em>
          </div>
          <div style="font-size:14px; color:#993C1D; font-weight:700; margin-top:4px;">
            Số tiền cần chuyển: ${formatVND(amount)}
          </div>
        </div>
      </div>`);
      
      content.appendChild(cardAndQr);
      
      setTimeout(() => {
        const copyMemoBtn = cardAndQr.querySelector('#momo-copy-memo-btn');
        if (copyMemoBtn) {
          copyMemoBtn.onclick = () => {
            navigator.clipboard.writeText(cleanMemo).then(() => {
              copyMemoBtn.textContent = 'Đã chép! ✓';
              copyMemoBtn.style.color = '#FFF';
              copyMemoBtn.style.background = '#27500A';
              copyMemoBtn.style.borderColor = '#27500A';
              setTimeout(() => {
                copyMemoBtn.textContent = 'Sao chép';
                copyMemoBtn.style.color = '#27500A';
                copyMemoBtn.style.background = 'transparent';
                copyMemoBtn.style.borderColor = '#27500A';
              }, 2000);
            });
          };
        }
      }, 0);
    } else if (bankId && accountNo) {
      const cleanMemo = removeVietnameseTones(memo).replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(accountName)}`;
      
      const cardAndQr = el(`<div style="display:flex; flex-direction:column; align-items:center; gap:16px; width:100%;">
        <div style="position:relative; width:100%; max-width:320px; height:180px; background:linear-gradient(135deg, #0A2540 0%, #134074 100%); border-radius:16px; padding:20px; color:#FFF; box-shadow:0 10px 25px rgba(10,37,64,0.3); border:1px solid rgba(255,255,255,0.1); overflow:hidden; text-align:left; user-select:none;">
          <div style="position:absolute; top:0; left:0; right:0; height:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%); transform:skewY(-10deg) translateY(-20px); pointer-events:none;"></div>
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span style="font-size:11px; font-weight:700; color:#D8973C; letter-spacing:1px; text-transform:uppercase;">VIETQR MEMBER CARD</span>
            <span style="font-size:14px; font-weight:700; color:#FFF; letter-spacing:1px; text-transform:uppercase;">${escapeHtml(bankId)}</span>
          </div>
          
          <div style="width:38px; height:28px; background:linear-gradient(135deg, #FFD700 0%, #B8860B 100%); border-radius:5px; margin-bottom:12px; position:relative; box-shadow:inset 0 1px 3px rgba(255,255,255,0.5);">
            <div style="position:absolute; top:3px; left:3px; right:3px; bottom:3px; border:1px solid rgba(0,0,0,0.1); border-radius:3px;"></div>
          </div>
          
          <div style="font-size:18px; font-weight:600; letter-spacing:2px; margin-bottom:12px; color:#F4F1EA; font-family:monospace;">
            ${escapeHtml(accountNo)}
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <div style="font-size:8px; color:#85A394; text-transform:uppercase; letter-spacing:0.5px;">Chủ tài khoản</div>
              <div style="font-size:13px; font-weight:600; color:#FFF; text-transform:uppercase;">${escapeHtml(accountName)}</div>
            </div>
            <span style="font-size:18px; line-height:1;">📶</span>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px; width:100%;">
          <img src="${vietQrUrl}" style="max-width:240px; width:100%; border:1px solid #E3E0D6; border-radius:12px; padding:8px; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.05);" />
          <div style="font-size:13px; color:#1B4332; background:#EAF3DE; padding:6px 12px; border-radius:8px; font-weight:600; width:100%; max-width:320px; border:1px solid rgba(39,80,10,0.1); text-align:center;">
            Nội dung CK: <strong style="color:#27500A; font-family:monospace; font-size:14px;">${cleanMemo}</strong>
          </div>
          <div style="font-size:14px; color:#993C1D; font-weight:700; margin-top:4px;">
            Số tiền cần quét: ${formatVND(amount)}
          </div>
        </div>
      </div>`);
      content.appendChild(cardAndQr);
    } else if (qrUrl) {
      const cardAndQr = el(`<div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
        <img src="${qrUrl}" style="max-width:280px; border:1px solid #E3E0D6; border-radius:12px;" />
        <div style="font-size:14px; color:#993C1D; font-weight:700;">
          Số tiền cần chuyển: ${formatVND(amount)}
        </div>
      </div>`);
      content.appendChild(cardAndQr);
    } else {
      content.appendChild(el(`<div style="font-size:13px; color:#993C1D; padding:10px;">Chưa cấu hình tài khoản ngân hàng nhận tiền.</div>`));
    }
    
    const treasurerPhone = payment.treasurerPhone || '';
    let zaloBtnHtml = '';
    if (treasurerPhone) {
      zaloBtnHtml = `<button class="bc-btn outline" id="pay-qr-zalo-btn" style="width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:6px; border-color:#0068FF; color:#0068FF; background:rgba(0,104,255,0.05); font-weight:600;">
        💬 Nhắn xác nhận Zalo cho Thủ quỹ
      </button>`;
    }
    const footer = el(`<div style="width:100%; text-align:center; margin-top:8px;">
      ${zaloBtnHtml}
      <button class="bc-btn" id="pay-qr-done-btn" style="width:100%;">Tôi đã chuyển khoản xong ✅</button>
    </div>`);
    content.appendChild(footer);
    
    document.getElementById('pay-qr-done-btn').onclick = async () => {
      dialog.close();
      if (typeof onDone === 'function') {
        await onDone();
      } else {
        render();
      }
    };
    
    if (treasurerPhone) {
      const zaloBtn = footer.querySelector('#pay-qr-zalo-btn');
      if (zaloBtn) {
        zaloBtn.onclick = () => {
          const cleanMemo = removeVietnameseTones(memo).replace(/[^a-zA-Z0-9 ]/g, '').trim();
          const copyText = `Chào bạn, tôi vừa chuyển khoản nộp phí số tiền ${formatVND(amount)}, nội dung chuyển khoản: "${cleanMemo}". Bạn duyệt giúp tôi nhé!`;
          navigator.clipboard.writeText(copyText).then(() => {
            alert('Đã sao chép nội dung tin nhắn xác nhận! Ứng dụng sẽ tự động mở cuộc trò chuyện Zalo với Thủ quỹ, bạn chỉ cần Dán (Paste) và nhấn Gửi.');
            window.open(`https://zalo.me/${treasurerPhone.replace(/\s+/g, '')}`, '_blank');
          }).catch(err => {
            console.error('Clipboard copy failed', err);
            window.open(`https://zalo.me/${treasurerPhone.replace(/\s+/g, '')}`, '_blank');
          });
        };
      }
    }
    
    dialog.showModal();
  }

  // ---------- AUTH ----------
  function renderAuth(){
    const wrap = el(`<div style="max-width:420px; margin:1.5rem auto;"></div>`);

    const bannerUrl = state.settings.bannerUrl || 'badminton_banner.jpg';
    wrap.appendChild(el(`<img src="${bannerUrl}" style="width:100%; height:130px; object-fit:cover; border-radius:16px; margin-bottom:12px; box-shadow: 0 4px 15px rgba(27,67,50,0.15);" />`));

    const head = el(`<div style="text-align:center; margin-bottom:1rem;"></div>`);
    const logoUrl = state.settings.logoUrl || 'icon-192.jpg';
    if (logoUrl) {
      head.appendChild(el(`<img src="${logoUrl}" style="width:64px; height:64px; object-fit:cover; border-radius:50%; margin-bottom:8px;" />`));
    }
    head.appendChild(el(`<h1 style="font-size:20px; color:#1B4332;">Hội cầu lông</h1>`));
    head.appendChild(el(`<p style="font-size:13px; color:#8a877d; margin-top:4px;">Đăng nhập bằng email và mật khẩu để vote, đăng ký lịch và xem chi phí.</p>`));
    
    const activeCount = state.members.filter(m=>m.status==='active').length;
    const courtsCount = state.courts.length;
    const sessionsCount = state.sessions.length;
    const isDark = document.body.classList.contains('dark-theme');
    head.appendChild(el(`<div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:12px; font-size:12px; align-items:center;">
      <span class="bc-badge" style="background:rgba(27,67,50,0.06); color:#1B4332; font-weight:600; border:1px solid rgba(27,67,50,0.1);">👥 ${activeCount} Thành viên</span>
      <span class="bc-badge" style="background:rgba(45,106,79,0.06); color:#2D6A4F; font-weight:600; border:1px solid rgba(45,106,79,0.1);">🏸 ${courtsCount} Sân tập</span>
      <span class="bc-badge" style="background:rgba(64,145,108,0.06); color:#40916C; font-weight:600; border:1px solid rgba(64,145,108,0.1);">🏆 ${sessionsCount} Buổi tập</span>
      <button class="bc-btn outline small" id="auth-theme-toggle" style="padding:2px 8px; font-size:11px; margin-left:4px;" title="Đổi giao diện Sáng/Tối">${isDark ? '☀️ Sáng' : '🌙 Tối'}</button>
    </div>`));

    wrap.appendChild(head);

    const tabs = el(`<div style="display:flex; gap:6px; justify-content:center; margin-bottom:1rem;">
      <div class="bc-tab ${state.authMode==='login'?'active':''}" data-mode="login">Đăng nhập</div>
      <div class="bc-tab ${state.authMode==='register'?'active':''}" data-mode="register">Đăng ký mới</div>
    </div>`);
    wrap.appendChild(tabs);

    const card = el(`<div class="bc-card"></div>`);
    if (state.authMode === 'login') {
      const remUsername = (state.rememberData && state.rememberData.username) || '';
      card.appendChild(el(`<div style="display:flex; flex-direction:column; gap:8px;">
        <input class="bc-input" id="auth-username" placeholder="Tên đăng nhập (username)" value="${escapeHtml(remUsername)}" />
        <input class="bc-input" id="auth-password" type="password" placeholder="Mật khẩu" />
        <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:#6b7a73;">
          <input type="checkbox" id="auth-remember" ${state.rememberData ? 'checked' : ''} /> Nhớ đăng nhập trên máy này
        </label>
        <button class="bc-btn" id="auth-login-btn">Đăng nhập</button>
        ${state.authError ? `<div class="bc-err">${escapeHtml(state.authError)}</div>` : ''}
        <div style="font-size:12px; color:#8a877d; margin-top:4px;">
          <a href="#" id="auth-forgot-pw-link" style="color:#1B4332; text-decoration:underline; font-weight:500;">Quên mật khẩu?</a> · Chưa có tài khoản? Bấm "Đăng ký mới".
        </div>
      </div>`));
    } else {
      const atLimit = state.members.length >= MAX_MEMBERS;
      card.appendChild(el(`<div style="display:flex; flex-direction:column; gap:8px;">
        ${atLimit ? `<div class="bc-err">Nhóm đã đạt giới hạn ${MAX_MEMBERS} thành viên, liên hệ Admin để được thêm.</div>` : ''}
        <input class="bc-input" id="auth-name" placeholder="Họ tên (bắt buộc)" ${atLimit?'disabled':''} />
        <input class="bc-input" id="auth-nickname" placeholder="Biệt danh (tối đa 35 ký tự, tuỳ chọn)" maxlength="35" ${atLimit?'disabled':''} />
        <input class="bc-input" id="auth-username2" placeholder="Tên đăng nhập (username, không dấu cách)" ${atLimit?'disabled':''} />
        <input class="bc-input" id="auth-email2" type="email" placeholder="Email của bạn (bắt buộc)" ${atLimit?'disabled':''} />
        <input class="bc-input" id="auth-phone" placeholder="SĐT (tuỳ chọn)" ${atLimit?'disabled':''} />
        <select class="bc-select" id="auth-level" ${atLimit?'disabled':''}>${LEVELS.map(l=>`<option>${l}</option>`).join('')}</select>
        <input class="bc-input" id="auth-pw1" type="password" placeholder="Đặt mật khẩu (tối thiểu 4 ký tự)" ${atLimit?'disabled':''} />
        <input class="bc-input" id="auth-pw2" type="password" placeholder="Nhập lại mật khẩu" ${atLimit?'disabled':''} />
        <button class="bc-btn" id="auth-register-btn" ${atLimit?'disabled':''}>Đăng ký</button>
        ${state.authError ? `<div class="bc-err">${escapeHtml(state.authError)}</div>` : ''}
        <div style="font-size:12px; color:#8a877d; margin-top:4px;">${state.members.length === 0 ? 'Bạn là người đầu tiên đăng ký sẽ tự động là Admin.' : 'Tài khoản mới mặc định ở vai trò R2 (tự vote và đăng ký tháng).'}</div>
      </div>`));
    }
    wrap.appendChild(card);

    if (state.authMode === 'login') {
      // Thêm Bảng tin trực tiếp giải đấu trước (nếu có giải đang thi đấu)
      const activeTour = state.tournaments.find(t => t.status === 'playing');
      if (activeTour) {
        const tourCard = el(`<div class="bc-card" style="margin-top: 1rem; background: linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.95)); border: 1px solid rgba(216, 151, 60, 0.25);">
          <h2 style="font-size:16px; color:#1B4332; font-weight:600; display:flex; align-items:center; gap:8px; margin-bottom:12px; font-family:'Oswald', sans-serif;">
            🏆 GIẢI ĐẤU: ${escapeHtml(activeTour.name)}
          </h2>
          <div style="font-size:12px; color:#6b7a73; margin-bottom:10px;">⚡ Trạng thái: <strong>Đang thi đấu trực tiếp</strong></div>
          <div id="login-tour-courts" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;"></div>
          <div style="text-align:center;">
            <span style="font-size:11px; color:#8a877d; font-style:italic;">Đăng nhập để xem đầy đủ xếp hạng &amp; sơ đồ nhánh trực tiếp!</span>
          </div>
        </div>`);
        
        const tourCourtsList = tourCard.querySelector('#login-tour-courts');
        activeTour.courtIds.forEach(cid => {
          const courtObj = state.courts.find(c => c.id === cid);
          const courtName = courtObj ? courtObj.name : 'Sân';
          const m = activeTour.matches.find(match => match.courtId === cid && match.status === 'playing');
          
          let courtRowHtml = '';
          if (m) {
            const titleText = m.stage === 'group' ? `Bảng ${m.groupName}` : m.roundLabel;
            const getPairNameLocal = (pid) => {
              const p = activeTour.pairs.find(x => x.id === pid);
              return p ? p.name : 'Chờ xác định';
            };
            courtRowHtml = `<div style="display:flex; justify-content:space-between; align-items:center; background:#FFF; border:1px solid rgba(64, 145, 108, 0.2); padding:6px 12px; border-radius:8px; font-size:12px;">
              <div style="text-align:left;">
                <span style="font-weight:700; color:#1B4332;">📍 ${escapeHtml(courtName)}:</span>
                <span style="color:#6b7a73; margin-left:6px;">${escapeHtml(getPairNameLocal(m.pair1Id))} vs ${escapeHtml(getPairNameLocal(m.pair2Id))}</span>
              </div>
              <span class="bc-badge" style="background:#E6F1FB; color:#0C447C; font-size:10px; font-weight:600;">${titleText}</span>
            </div>`;
          } else {
            courtRowHtml = `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.01); border:1px dashed #D8D4C6; padding:6px 12px; border-radius:8px; font-size:12px; color:#8a877d; font-style:italic;">
              <span>📍 ${escapeHtml(courtName)}</span>
              <span>Sân trống</span>
            </div>`;
          }
          tourCourtsList.appendChild(el(courtRowHtml));
        });
        wrap.appendChild(tourCard);
      }

      // Thêm Bảng tin Lịch hoạt động sắp tới
      const bulletinCard = el(`<div class="bc-card" style="margin-top: 1.25rem; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(250, 248, 245, 0.98)); border: 1px solid rgba(242, 100, 25, 0.3); padding: 1.2rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:8px;">
          <h2 style="font-size:16px; color:#1B4332; font-weight:700; display:flex; align-items:center; gap:8px; font-family:'Oswald', sans-serif; letter-spacing:0.5px; margin:0;">
            📢 BẢN TIN LỊCH CHƠI CẦU
          </h2>
          <span style="font-size:11px; color:#8a877d; font-weight:500;">Cập nhật tự động</span>
        </div>
        <div id="bulletin-list" style="display:flex; flex-direction:column; gap:14px;"></div>
      </div>`);
      
      const bulletinList = bulletinCard.querySelector('#bulletin-list');
      applyAutoLockVote(state.sessions);
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const upcoming = state.sessions
        .filter(s => s.date >= todayStr)
        .sort((a,b) => (a.date + (a.time||'')).localeCompare(b.date + (b.time||'')));
        
      if (upcoming.length === 0) {
        bulletinList.appendChild(el(`<div style="text-align:center; padding:20px; color:#8a877d; font-size:13px; font-style:italic;">
          Hiện chưa có lịch chơi cầu tiếp theo được lên kế hoạch. Vui lòng quay lại sau!
        </div>`));
      } else {
        upcoming.forEach((s, idx) => {
          const mKey = sessionMonthKey(s);
          const court = state.courts.find(c => c.id === s.courtId);
          const courtName = court ? court.name : 'Chưa xếp sân';
          const weekday = weekdayLabel(s.date);
          const formattedDate = formatDate(s.date);
          const timeRange = formatTimeRange(s.time, s.timeEnd);
          const passes = s.passes || {};

          // Thống kê thành viên tham gia / chưa vote
          const activeMembers = state.members.filter(m => {
            const curType = (m.monthlyType || {})[mKey] || '';
            return m.status === 'active' && (curType === 'fixed' || curType === 'casual');
          });

          let yesCount = 0;
          let noCount = 0;
          let unvotedCount = 0;

          activeMembers.forEach(m => {
            const v = s.votes[m.name];
            const t = (m.monthlyType || {})[mKey] || '';
            const isReceiver = Object.values(passes).includes(m.id);
            const hasPassed = t === 'fixed' && passes[m.id];
            
            if (isReceiver || (v === 'yes' && !hasPassed)) {
              yesCount++;
            } else if (hasPassed || v === 'no') {
              noCount++;
            } else {
              unvotedCount++;
            }
          });

          // Bổ sung các phiếu yes từ người ngoài hoặc tài khoản cũ (nếu có)
          const currentNames = state.members.map(m => m.name);
          Object.entries(s.votes).forEach(([name, v]) => {
            if (!currentNames.includes(name) && v === 'yes') {
              yesCount++;
            }
          });

          if (idx === 0) {
            // BUỔI ĐÁNH GẦN NHẤT: HIGHLIGHT ĐẶC BIỆT VỚI ANIMATION
            const isShortOfPlayers = yesCount < 4;
            const targetPlayers = s.max || 24;
            const progressPercent = Math.min(100, Math.round((yesCount / targetPlayers) * 100));

            let alertBoxHtml = '';
            if (isShortOfPlayers) {
              alertBoxHtml = `
                <div style="background: linear-gradient(135deg, rgba(242, 100, 25, 0.12) 0%, rgba(231, 111, 81, 0.18) 100%); border: 1.5px dashed #E76F51; border-radius: 10px; padding: 10px 12px; margin-top: 10px;">
                  <div style="display:flex; align-items:flex-start; gap:8px;">
                    <span style="font-size: 20px; line-height:1; animation: shuttleBounce 1.2s infinite; display:inline-block;">⚠️</span>
                    <div style="flex:1;">
                      <div style="font-size:13px; font-weight:700; color:#993C1D; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;">
                        <span>ĐANG THIẾU TAY VỢT THAM GIA!</span>
                        <span style="font-size:11px; background:#993C1D; color:#FFF; padding:2px 6px; border-radius:10px;">Cần thêm người</span>
                      </div>
                      <div style="font-size:12px; color:#854F0B; margin-top:3px; line-height:1.35;">
                        Hiện mới có <strong>${yesCount}</strong> người tham gia · Còn <strong style="color:#993C1D; font-size:13px;">${unvotedCount}</strong> thành viên chưa biểu quyết!
                      </div>
                    </div>
                  </div>
                  <!-- Progress Bar based on max capacity -->
                  <div style="margin-top:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#854F0B; margin-bottom:3px;">
                      <span>Tiến độ ghi danh:</span>
                      <span><strong>${yesCount}/${targetPlayers}</strong> tay vợt (${progressPercent}%)</span>
                    </div>
                    <div style="width:100%; height:7px; background:rgba(0,0,0,0.08); border-radius:10px; overflow:hidden;">
                      <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #F26419, #E76F51); border-radius:10px; transition: width 0.4s ease;"></div>
                    </div>
                  </div>
                  <div style="font-size:11.5px; color:#993C1D; font-weight:600; text-align:center; margin-top:6px;">
                    👉 Hãy đăng nhập và biểu quyết (vote) ngay giúp CLB chốt sân!
                  </div>
                </div>`;
            } else {
              alertBoxHtml = `
                <div style="background: rgba(45, 106, 79, 0.08); border: 1px solid rgba(45, 106, 79, 0.25); border-radius: 10px; padding: 10px 12px; margin-top: 10px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:16px; animation: shuttleBounce 1.5s infinite; display:inline-block;">🏸</span>
                      <span style="font-size:12.5px; font-weight:700; color:#27500A;">Đã sẵn sàng ${yesCount} tay vợt tham gia!</span>
                    </div>
                    ${unvotedCount > 0 ? `<span style="font-size:11px; color:#854F0B; font-weight:600;">Còn ${unvotedCount} người chưa vote</span>` : `<span style="font-size:11px; color:#27500A; font-weight:600;">✓ Đã biểu quyết đầy đủ</span>`}
                  </div>
                  <!-- Progress Bar based on max capacity -->
                  <div style="margin-top:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#27500A; margin-bottom:3px;">
                      <span>Tiến độ ghi danh:</span>
                      <span><strong>${yesCount}/${targetPlayers}</strong> tay vợt (${progressPercent}%)</span>
                    </div>
                    <div style="width:100%; height:7px; background:rgba(0,0,0,0.08); border-radius:10px; overflow:hidden;">
                      <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #40916C, #2D6A4F); border-radius:10px; transition: width 0.4s ease;"></div>
                    </div>
                  </div>
                </div>`;
            }

            const heroRow = el(`<div style="background: linear-gradient(135deg, rgba(242, 100, 25, 0.06) 0%, rgba(255, 255, 255, 0.95) 100%); border: 1.5px solid #F26419; border-radius: 14px; padding: 12px 14px; box-shadow: 0 4px 18px rgba(242,100,25,0.15); animation: spotlightPulse 3s infinite; position: relative;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#F26419; animation: beaconGlow 1.5s infinite;"></span>
                  <span style="font-size:11px; font-weight:700; color:#F26419; letter-spacing:0.6px; text-transform:uppercase; font-family:'Oswald', sans-serif;">⚡ TRẬN ĐÁNH TIẾP THEO (GẦN NHẤT)</span>
                </div>
                <span class="bc-badge" style="background:#F26419; color:#FFF; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; box-shadow:0 2px 6px rgba(242,100,25,0.3);">
                  🔥 ${yesCount} tham gia
                </span>
              </div>
              <div style="font-weight:700; font-size:16px; color:#1B4332; margin-bottom:6px; animation: titleGlowPulse 2.2s infinite ease-in-out; display:inline-block;">
                ${escapeHtml(s.note || 'Buổi sinh hoạt thường kỳ')}
              </div>
              <div style="font-size:12.5px; color:#4A5568; display:flex; flex-direction:column; gap:3px;">
                <div>📅 <strong>${weekday}, ${formattedDate}</strong></div>
                <div>⏰ Giờ: <strong>${timeRange}</strong></div>
                <div>📍 Sân: <strong>${escapeHtml(courtName)}</strong></div>
              </div>
              ${alertBoxHtml}
            </div>`);
            bulletinList.appendChild(heroRow);
          } else {
            // CÁC BUỔI TIẾP THEO
            const sessionRow = el(`<div style="border-left:4px solid #40916C; padding:8px 12px; background:rgba(64,145,108,0.03); border-radius:4px 12px 12px 4px; display:flex; flex-direction:column; gap:4px; border:1px solid rgba(64,145,108,0.15); border-left-width:4px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:4px;">
                <span style="font-weight:600; font-size:13.5px; color:#1B4332;">${escapeHtml(s.note || 'Buổi sinh hoạt thường kỳ')}</span>
                <span class="bc-badge" style="background:#EAF3DE; color:#27500A; font-size:11px; font-weight:600;">🔥 ${yesCount} tham gia</span>
              </div>
              <div style="font-size:12px; color:#6b7a73; display:flex; flex-direction:column; gap:2px;">
                <div>📅 <strong>${weekday}, ${formattedDate}</strong></div>
                <div>⏰ Giờ: <strong>${timeRange}</strong></div>
                <div>📍 Sân: <strong>${escapeHtml(courtName)}</strong></div>
              </div>
            </div>`);
            bulletinList.appendChild(sessionRow);
          }
        });
      }
      wrap.appendChild(bulletinCard);
    }

    setTimeout(() => {
      tabs.querySelectorAll('[data-mode]').forEach(n => n.onclick = () => { state.authMode = n.dataset.mode; state.authError = ''; render(); });
      
      const forgotLink = document.getElementById('auth-forgot-pw-link');
      if (forgotLink) {
        forgotLink.onclick = (e) => {
          e.preventDefault();
          showForgotPasswordDialog();
        };
      }

      const loginBtn = document.getElementById('auth-login-btn');
      if (loginBtn) loginBtn.onclick = async () => {
        const username = normUsername(document.getElementById('auth-username').value);
        const password = document.getElementById('auth-password').value;
        const remember = document.getElementById('auth-remember').checked;
        if (!username || !password) { state.authError = 'Nhập tên đăng nhập và mật khẩu.'; render(); return; }
        
        showLoading('Đang đăng nhập...');
        try {
          const passwordHash = await hashPassword(password, username);
          const { data: found, error: authError } = await sb.rpc('bc_verify_login', {
            p_username: username,
            p_password_hash: passwordHash
          });
          if (authError || !found) {
            state.authError = 'Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản chưa được duyệt / bị khóa.';
            hideLoading();
            render();
            return;
          }
          state.myUsername = found.username;
          state.myPasswordHash = passwordHash;
          state.authError = '';
          saveMyUsername();
          if (remember) { state.rememberData = { username: found.username, password: passwordHash }; saveRemember(state.rememberData); }
          else { state.rememberData = null; saveRemember(null); }
          
           // Sau khi đăng nhập thành công, tải lại toàn bộ danh sách thành viên mới nhất từ database
          state.members = await loadKey('bc_members', state.members);
          resolveMe(); 
          if (isOwner()) {
            try {
              const { data, error } = await sb.from('bc_data').select('value').eq('key', 'bc_settings').maybeSingle();
              if (!error && data && data.value) {
                state.settings = Object.assign(state.settings || {}, data.value);
                state.settings.mailServer = Object.assign(state.settings.mailServer || {}, data.value.mailServer || {});
              }
            } catch (e) {
              console.error('Failed to reload unmasked settings for owner:', e);
            }
          }
          await checkPendingAction();

          // Xử lý chuyển hướng thanh toán tự động nếu khớp username
          if (state.pendingRedirect) {
            const pr = state.pendingRedirect;
            if (state.me && state.me.username.toLowerCase() === pr.user.toLowerCase()) {
              state.tab = 'fund';
              state.viewMonth = pr.month;
              state.autoOpenPaymentQr = true;
            }
            state.pendingRedirect = null;
          }

          hideLoading();
          render();
        } catch (err) {
          hideLoading();
          state.authError = 'Lỗi kết nối mạng hoặc cơ sở dữ liệu, vui lòng thử lại.';
          render();
        }
      };
      
      const regBtn = document.getElementById('auth-register-btn');
      if (regBtn) regBtn.onclick = async () => {
        if (state.members.length >= MAX_MEMBERS) return;
        const name = document.getElementById('auth-name').value.trim();
        const nickname = (document.getElementById('auth-nickname').value || '').trim().slice(0, 35);
        const username = normUsername(document.getElementById('auth-username2').value);
        const email = normEmail(document.getElementById('auth-email2').value);
        const phone = document.getElementById('auth-phone').value.trim();
        const level = document.getElementById('auth-level').value;
        const pw1 = document.getElementById('auth-pw1').value;
        const pw2 = document.getElementById('auth-pw2').value;
        if (!name || !username || !email) { state.authError = 'Nhập đầy đủ họ tên, tên đăng nhập và email.'; render(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { state.authError = 'Địa chỉ email không đúng định dạng.'; render(); return; }
        if (!/^[a-z0-9_.]+$/.test(username)) { state.authError = 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm/gạch dưới, không dấu cách.'; render(); return; }
        if (!pw1 || pw1.length < 4) { state.authError = 'Mật khẩu cần ít nhất 4 ký tự.'; render(); return; }
        if (pw1 !== pw2) { state.authError = 'Hai mật khẩu không khớp.'; render(); return; }
        
        showLoading('Đang đăng ký thành viên mới...');
        try {
          const passwordHash = await hashPassword(pw1, username);
          let regError = '';
          const ok = await mutateMembers(latest => {
            if (latest.some(m => normUsername(m.username) === username)) { regError = 'Tên đăng nhập này đã được dùng, hãy chọn tên khác.'; return null; }
            if (latest.some(m => normEmail(m.email) === email)) { regError = 'Email này đã đăng ký, hãy chọn Đăng nhập.'; return null; }
            if (latest.length >= MAX_MEMBERS) { regError = 'Nhóm đã đạt giới hạn ' + MAX_MEMBERS + ' thành viên.'; return null; }
            const isFirst = latest.length === 0;
            const newMember = {
              id: uid(), name, nickname, username, email, phone, level, password: passwordHash,
              status: isFirst ? 'active' : 'pending',
              role: isFirst ? 'admin' : 'r2',
              monthlyType: {}, avatarUrl: ''
            };
            return latest.concat([newMember]);
          });
          
          hideLoading();
          if (!ok) { 
            state.authError = regError || 'Đăng ký thất bại, vui lòng thử lại.'; 
            render(); 
            return; 
          }
          state.myUsername = username; state.authError = ''; saveMyUsername(); resolveMe();

          // Gửi thông báo đăng ký mới cho Admin qua email
          const isFirst = state.members.length <= 1;
          if (!isFirst) {
            const adminEmails = state.members.filter(m => m.role === 'admin' && m.status === 'active' && m.email && normUsername(m.username) !== 'kietdmt').map(m => m.email);
            if (adminEmails.length > 0) {
              let origin = window.location.origin + window.location.pathname;
              if (window.location.protocol === 'file:' || origin.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('null')) {
                origin = 'https://kietdmt.github.io/ARON-Badmintion-Club/';
              }
              const approveUrl = `${origin}?action=approve_member&user=${username}`;
              const rejectUrl = `${origin}?action=reject_member&user=${username}`;

              const emailSubject = `[CLB ARON] Yêu cầu phê duyệt thành viên mới: ${name}${nickname ? ` (${nickname})` : ''}`;
              const emailBody = `<h3>Chào Ban quản trị CLB ARON,</h3>
                <p>Hệ thống vừa nhận được yêu cầu đăng ký thành viên mới:</p>
                <ul>
                  <li><strong>Họ tên:</strong> ${name}</li>
                  ${nickname ? `<li><strong>Biệt danh:</strong> ${nickname}</li>` : ''}
                  <li><strong>Tên đăng nhập (username):</strong> ${username}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Số điện thoại:</strong> ${phone || 'Chưa cập nhật'}</li>
                  <li><strong>Trình độ:</strong> ${level}</li>
                </ul>
                <p>Vui lòng nhấp vào một trong các liên kết dưới đây để phê duyệt hoặc từ chối yêu cầu đăng ký này:</p>
                <p style="margin:20px 0; display:flex; gap:12px;">
                  <a href="${approveUrl}" style="background:#27500A; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px; margin-right:8px;">👉 Duyệt Thành Viên</a>
                  <a href="${rejectUrl}" style="background:#993C1D; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px;">❌ Từ Chối</a>
                </p>
                <p style="font-size:11px; color:#8a877d;">(Sau khi nhấp liên kết, nếu bạn chưa đăng nhập bằng tài khoản Admin, hệ thống sẽ yêu cầu đăng nhập trước khi tự động xử lý).</p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>Hệ thống CLB Cầu lông ARON</strong></p>`;
              
              adminEmails.forEach(adminEmail => {
                sendSystemEmail(adminEmail, emailSubject, emailBody);
              });
            }
          }

          render();
        } catch (err) {
          hideLoading();
          state.authError = 'Lỗi kết nối mạng, vui lòng thử lại.';
          render();
        }
      };
      
      const authThemeToggle = document.getElementById('auth-theme-toggle');
      if (authThemeToggle) {
        authThemeToggle.onclick = () => {
          const darkActive = document.body.classList.toggle('dark-theme');
          lsSet('bc_theme', darkActive ? 'dark' : 'light');
          authThemeToggle.textContent = darkActive ? '☀️ Sáng' : '🌙 Tối';
          render();
        };
      }
    }, 0);

    return wrap;
  }

  function renderHeader(){
    const [bg, fg] = ROLE_COLOR[state.me.role] || ["#F1EFE8","#444441"];
    const isDark = document.body.classList.contains('dark-theme');
    const wrap = el(`<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:8px;">
      <div>
        <h1 style="font-size:20px; color:#1B4332;">Hội cầu lông</h1>
        <p style="font-size:13px; color:#8a877d; margin:2px 0 0;">${state.members.filter(m=>m.status==='active').length}/${MAX_MEMBERS} thành viên hoạt động · ${state.courts.length} sân đã lưu</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="bc-badge" style="background:${bg}; color:${fg};">${escapeHtml(state.me.name)} · ${ROLE_LABEL[state.me.role]}</span>
        <button class="bc-btn outline small" id="bc-sync" title="Đồng bộ lại dữ liệu tức thời">🔄 Đồng bộ</button>
        <button class="bc-btn outline small" id="bc-theme-toggle" title="Đổi giao diện Sáng/Tối">${isDark ? '☀️ Sáng' : '🌙 Tối'}</button>
        <button class="bc-btn outline small" id="bc-logout">Đăng xuất</button>
      </div>
    </div>`);
    setTimeout(() => {
      const syncBtn = document.getElementById('bc-sync');
      if (syncBtn) {
        syncBtn.onclick = async () => {
          syncBtn.disabled = true;
          syncBtn.textContent = '🔄 Đang đồng bộ...';
          try {
            state.lastUpdated = {};
            await refreshAll();
          } catch(e) {
            alert('Đồng bộ thất bại, vui lòng kiểm tra kết nối mạng.');
          } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = '🔄 Đồng bộ';
          }
        };
      }

      document.getElementById('bc-logout').onclick = () => {
        state.myUsername = null;
        state.me = null;
        saveMyUsername();
        render();
      };
      
      const themeToggle = document.getElementById('bc-theme-toggle');
      if (themeToggle) {
        themeToggle.onclick = () => {
          const darkActive = document.body.classList.toggle('dark-theme');
          lsSet('bc_theme', darkActive ? 'dark' : 'light');
          themeToggle.textContent = darkActive ? '☀️ Sáng' : '🌙 Tối';
          render();
        };
      }
    }, 0);
    return wrap;
  }

  function renderTabs(){
    const wrap = el(`<div style="display:flex; gap:6px; margin-bottom:1rem; border-bottom:1px solid #E3E0D6; padding-bottom:0.75rem; overflow-x:auto; white-space:nowrap; -webkit-overflow-scrolling:touch;"></div>`);
    
    let tabs = [
      ['sessions', 'Lịch đánh'],
      ['leaderboard', '🏆 BXH'],
      ['tournament', 'Giải đấu'],
      ['fund', 'Quỹ & chi phí'],
      ['report', 'Báo cáo']
    ];
    if (canManage()) {
      tabs.push(['payments_mgr', 'Duyệt & Cấu hình']);
    }
    tabs.push(['members', 'Thành viên']);

    const isManager = canManage();
    const pendingMembersCount = isManager ? state.members.filter(m => m.status === 'pending').length : 0;
    const pendingPaymentsCount = isManager ? (state.paymentRequests || []).filter(r => r.status === 'pending').length : 0;

    tabs.forEach(([key, label]) => {
      let badgeHtml = '';
      if (key === 'members' && pendingMembersCount > 0) {
        badgeHtml = ` <span style="display:inline-flex; align-items:center; justify-content:center; background:#EF4444; color:#FFF; font-size:10px; font-weight:700; width:16px; height:16px; border-radius:50%; margin-left:5px; line-height:1; flex-shrink:0;">${pendingMembersCount}</span>`;
      } else if (key === 'payments_mgr' && pendingPaymentsCount > 0) {
        badgeHtml = ` <span style="display:inline-flex; align-items:center; justify-content:center; background:#EF4444; color:#FFF; font-size:10px; font-weight:700; width:16px; height:16px; border-radius:50%; margin-left:5px; line-height:1; flex-shrink:0;">${pendingPaymentsCount}</span>`;
      }

      const t = el(`<div class="bc-tab ${state.tab===key?'active':''}" style="display:inline-flex; align-items:center; flex-shrink:0;">${label}${badgeHtml}</div>`);
      t.onclick = () => { state.tab = key; render(); refreshAll(); };
      wrap.appendChild(t);
    });
    return wrap;
  }

  function checkUrlRedirects() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const redirectMonth = params.get('month');
    const redirectUser = params.get('user');

    if (action === 'pay' && redirectMonth) {
      state.viewMonth = redirectMonth;
      state.tab = 'fund';
      
      if (state.me && state.me.username.toLowerCase() === (redirectUser || '').toLowerCase()) {
        state.autoOpenPaymentQr = true;
      } else {
        state.authMode = 'login';
        state.authError = `Vui lòng đăng nhập tài khoản @${redirectUser} để tiếp tục thanh toán phí tháng ${monthLabel(redirectMonth)}.`;
        state.pendingRedirect = { action, month: redirectMonth, user: redirectUser };
      }
    } 
    else if (action === 'approve_member' || action === 'approve_payment' || action === 'reject_member' || action === 'reject_payment') {
      state.pendingAction = { action, user: redirectUser, month: redirectMonth };
      checkPendingAction();
    }
    else if (action === 'quick_vote') {
      const voteSession = params.get('session');
      state.pendingAction = { action, session: voteSession, user: redirectUser };
      checkPendingAction();
    }
  }

  async function checkPendingAction() {
    if (!state.pendingAction) return;
    
    const pa = state.pendingAction;
    if (pa.action === 'quick_vote') {
      if (!state.me || state.me.username.toLowerCase() !== (pa.user || '').toLowerCase()) {
        state.authMode = 'login';
        state.authError = `Vui lòng đăng nhập tài khoản @${pa.user} để hoàn tất vote nhanh.`;
        render();
        return;
      }
    } else {
      if (!isAdmin()) {
        state.authMode = 'login';
        state.authError = 'Vui lòng đăng nhập bằng tài khoản Admin để thực hiện phê duyệt nhanh từ email.';
        render();
        return;
      }
    }
    
    state.pendingAction = null; // Xoá để tránh lặp lại hành động
    
    // Xoá tham số URL để làm sạch thanh địa chỉ trình duyệt
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    showLoading('Đang mở màn hình biểu quyết...');
    try {
      if (pa.action === 'quick_vote') {
        const sess = state.sessions.find(s => s.id === pa.session);
        const member = state.members.find(m => m.username.toLowerCase() === pa.user.toLowerCase());
        if (!sess || !member) {
          alert('Không tìm thấy buổi tập hoặc thành viên tương ứng!');
          return;
        }
        state.quickVoteMode = { sessionId: pa.session, username: pa.user };
      }
      else if (pa.action === 'approve_member') {
        const target = state.members.find(m => m.username.toLowerCase() === pa.user.toLowerCase());
        if (!target) {
          alert(`Không tìm thấy thành viên: ${pa.user}`);
          return;
        }
        if (target.status === 'active') {
          alert(`Thành viên ${target.name} đã được phê duyệt hoạt động trước đó.`);
          return;
        }
        
        const ok = await mutateMembers(latest => 
          latest.map(x => x.id === target.id ? Object.assign({}, x, { status: 'active' }) : x)
        );
        
        if (ok) {
          if (target.email) {
            const emailSubject = `[CLB ARON] Tài khoản của bạn đã được kích hoạt thành công`;
            const emailBody = `<h3>Chào ${target.name},</h3>
              <p>Chúc mừng! Yêu cầu đăng ký tài khoản của bạn tại CLB Cầu lông ARON đã được Ban quản trị phê duyệt thành công.</p>
              <p>Bây giờ bạn có thể đăng nhập vào ứng dụng để vote lịch chơi và theo dõi quỹ câu lạc bộ.</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
            sendSystemEmail(target.email, emailSubject, emailBody);
          }
          alert(`Đã phê duyệt thành công thành viên: ${target.name}`);
        } else {
          alert('Lỗi phê duyệt thành viên.');
        }
      } 
      else if (pa.action === 'approve_payment') {
        const target = state.members.find(m => m.username.toLowerCase() === pa.user.toLowerCase());
        if (!target) {
          alert(`Không tìm thấy thành viên: ${pa.user}`);
          return;
        }
        
        const req = (state.paymentRequests || []).find(r => 
          r.memberId === target.id && 
          r.month === pa.month && 
          r.status === 'pending'
        );
        
        if (!req) {
          alert(`Không tìm thấy yêu cầu đóng phí chờ duyệt nào của ${target.name} trong tháng ${monthLabel(pa.month)}.`);
          return;
        }
        
        const reqOk = await mutatePaymentRequests(latest => {
          const list = Array.isArray(latest) ? latest : [];
          return list.map(x => x.id === req.id ? Object.assign({}, x, { status: 'approved', approvedBy: state.me ? state.me.name : 'Admin' }) : x);
        });
        
        if (!reqOk) {
          alert('Lỗi duyệt yêu cầu đóng phí.');
          return;
        }
        
        await mutatePayments(latest => {
          const updated = Object.assign({}, latest);
          updated[req.memberId] = Object.assign({}, updated[req.memberId] || {});
          updated[req.memberId][req.month] = { paid: req.paid + req.prepaid, prepaid: 0, date: req.date };
          return updated;
        });
        
        if (target.email) {
          const emailSubject = `[CLB ARON] Yêu cầu đóng phí của bạn đã được duyệt`;
          const emailBody = `<h3>Chào ${target.name},</h3>
            <p>Yêu cầu đóng phí tháng <strong>${monthLabel(req.month)}</strong> của bạn đã được Ban quản trị phê duyệt thành công.</p>
            <p><strong>Số tiền:</strong> ${formatVND(req.paid + req.prepaid)}</p>
            <p>Cảm ơn sự đóng góp của bạn!</p>
            <br/>
            <p>Trân trọng,</p>
            <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
          sendSystemEmail(target.email, emailSubject, emailBody);
        }
        alert(`Đã duyệt thành công đóng phí tháng ${monthLabel(req.month)} của ${target.name}!`);
      }
      else if (pa.action === 'reject_member') {
        const target = state.members.find(m => m.username.toLowerCase() === pa.user.toLowerCase());
        if (!target) {
          alert(`Không tìm thấy thành viên: ${pa.user}`);
          return;
        }
        if (target.status !== 'pending') {
          alert(`Thành viên ${target.name} đã được xử lý (hoạt động hoặc đã từ chối) trước đó.`);
          return;
        }
        
        const ok = await mutateMembers(latest => 
          latest.filter(x => x.id !== target.id)
        );
        
        if (ok) {
          if (target.email) {
            const emailSubject = `[CLB ARON] Yêu cầu đăng ký tài khoản bị từ chối`;
            const emailBody = `<h3>Chào ${target.name},</h3>
              <p>Yêu cầu đăng ký tài khoản của bạn tại CLB Cầu lông ARON đã bị Ban quản trị từ chối phê duyệt.</p>
              <p>Vui lòng liên hệ Ban quản trị để được hỗ trợ giải đáp thắc mắc.</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
            sendSystemEmail(target.email, emailSubject, emailBody);
          }
          alert(`Đã từ chối đăng ký của thành viên: ${target.name}`);
        } else {
          alert('Lỗi từ chối đăng ký thành viên.');
        }
      }
      else if (pa.action === 'reject_payment') {
        const target = state.members.find(m => m.username.toLowerCase() === pa.user.toLowerCase());
        if (!target) {
          alert(`Không tìm thấy thành viên: ${pa.user}`);
          return;
        }
        
        const req = (state.paymentRequests || []).find(r => 
          r.memberId === target.id && 
          r.month === pa.month && 
          r.status === 'pending'
        );
        
        if (!req) {
          alert(`Không tìm thấy yêu cầu đóng phí chờ duyệt nào của ${target.name} trong tháng ${monthLabel(pa.month)}.`);
          return;
        }
        
        const reqOk = await mutatePaymentRequests(latest => {
          const list = Array.isArray(latest) ? latest : [];
          return list.map(x => x.id === req.id ? Object.assign({}, x, { status: 'rejected' }) : x);
        });
        
        if (!reqOk) {
          alert('Lỗi từ chối yêu cầu đóng phí.');
          return;
        }
        
        if (target.email) {
          const emailSubject = `[CLB ARON] Yêu cầu đóng phí bị từ chối`;
          const emailBody = `<h3>Chào ${target.name},</h3>
            <p>Yêu cầu đóng phí tháng <strong>${monthLabel(req.month)}</strong> của bạn đã bị Ban quản trị từ chối phê duyệt.</p>
            <p>Vui lòng kiểm tra lại thông tin chuyển khoản hoặc liên hệ Thủ quỹ để được hỗ trợ.</p>
            <br/>
            <p>Trân trọng,</p>
            <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
          sendSystemEmail(target.email, emailSubject, emailBody);
        }
        alert(`Đã từ chối yêu cầu đóng phí tháng ${monthLabel(req.month)} của ${target.name}!`);
      }
    } catch (e) {
      console.error('Error handling pending action:', e);
      alert('Đã xảy ra lỗi trong quá trình phê duyệt nhanh.');
    } finally {
      hideLoading();
      render();
    }
  }

  // ---------- MEMBERS ----------
  function renderMembers(){
    const wrap = el(`<div></div>`);
    const locked = isMonthLocked(state.viewMonth);

    if (!canManage()) {
      // R2: chỉ thấy thông tin của chính mình, không thấy thành viên khác
      const lockBadge = locked
        ? `<span class="bc-badge" style="background:#FAECE7; color:#993C1D; margin-left:6px;">🔒 Đăng ký đã chốt</span>`
        : `<span class="bc-badge" style="background:#EAF3DE; color:#27500A; margin-left:6px;">🔓 Đăng ký đang mở</span>`;

      wrap.appendChild(el(`<div style="font-size:12px; color:#8a877d; margin-bottom:0.5rem;">Bạn đang ở vai trò R2: chỉ thấy thông tin của chính mình. Tự đăng ký Cố định/Vãng lai theo từng tháng ở dưới.</div>`));
      const selfMonth = el(`<div style="display:flex; align-items:center; gap:6px; margin-bottom:0.75rem;">
        <span style="font-size:13px; color:#8a877d;">Tháng xem:</span>
        <input class="bc-input" type="month" id="mb-view-month-self" value="${state.viewMonth}" style="width:140px; padding:4px 8px;" />
        ${lockBadge}
      </div>`);
      wrap.appendChild(selfMonth);
      const myRow = state.members.find(m => state.me && m.id === state.me.id);
      if (myRow) wrap.appendChild(renderMemberRow(myRow));
      setTimeout(() => {
        document.getElementById('mb-view-month-self').onchange = (e) => { state.viewMonth = e.target.value || monthKey(); render(); };
      }, 0);
      return wrap;
    }

    const activeCount = state.members.filter(m=>m.status==='active').length;
    const pendingCount = state.members.filter(m=>m.status==='pending').length;
    const inactiveCount = state.members.length - activeCount - pendingCount;
    const registeredThisMonth = state.members.filter(m => (m.monthlyType||{})[state.viewMonth] === 'fixed').length;

    wrap.appendChild(el(`<div class="bc-card" style="background:#F4F1EA; display:flex; gap:18px; flex-wrap:wrap; font-size:13px; color:#6b7a73;">
      <span><strong style="color:#1B4332; font-weight:500;">${state.members.length}/${MAX_MEMBERS}</strong> tổng</span>
      <span><strong style="color:#27500A; font-weight:500;">${activeCount}</strong> hoạt động</span>
      <span><strong style="color:#854F0B; font-weight:500;">${pendingCount}</strong> chờ duyệt</span>
      <span><strong style="color:#993C1D; font-weight:500;">${inactiveCount}</strong> ngưng hoạt động</span>
      <span><strong style="color:#1B4332; font-weight:500;">${registeredThisMonth}</strong> đăng ký cố định ${monthLabel(state.viewMonth)}</span>
    </div>`));

    // Quản lý vai trò/trạng thái chỉ R1/Admin thấy form thêm thủ công (vẫn nên khuyến khích tự đăng ký)
    if (canManage()) {
      const atLimit = state.members.length >= MAX_MEMBERS;
      const form = el(`<div class="bc-card">
        <h3 style="font-size:15px; margin-bottom:10px; color:#1B4332;">Thêm thành viên (thay họ, nếu họ không tự đăng ký được)</h3>
        ${atLimit ? `<div class="bc-err">Đã đạt giới hạn ${MAX_MEMBERS} thành viên.</div>` : ''}
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input class="bc-input" id="mb-name" placeholder="Họ tên (bắt buộc)" style="flex:2; min-width:140px;" ${atLimit?'disabled':''} />
          <input class="bc-input" id="mb-nickname" placeholder="Biệt danh (tuỳ chọn)" maxlength="35" style="flex:1.5; min-width:120px;" ${atLimit?'disabled':''} />
          <input class="bc-input" id="mb-username" placeholder="Username" style="flex:1.2; min-width:120px;" ${atLimit?'disabled':''} />
          <input class="bc-input" id="mb-email" type="email" placeholder="Email (bắt buộc)" style="flex:2; min-width:160px;" ${atLimit?'disabled':''} />
          <select class="bc-select" id="mb-gender" style="flex:0.8; min-width:80px;" ${atLimit?'disabled':''}>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
          <select class="bc-select" id="mb-level" style="flex:1; min-width:120px;" ${atLimit?'disabled':''}>${LEVELS.map(l=>`<option>${l}</option>`).join('')}</select>
          <input class="bc-input" id="mb-phone" placeholder="SĐT (tuỳ chọn)" style="flex:1; min-width:120px;" ${atLimit?'disabled':''} />
          <button class="bc-btn" id="mb-add" ${atLimit?'disabled':''}>Thêm</button>
        </div>
      </div>`);
      wrap.appendChild(form);
      setTimeout(() => {
        document.getElementById('mb-add').onclick = async () => {
          if (state.members.length >= MAX_MEMBERS) return;
          const name = document.getElementById('mb-name').value.trim();
          const nickname = (document.getElementById('mb-nickname').value || '').trim().slice(0, 35);
          const username = normUsername(document.getElementById('mb-username').value);
          const email = normEmail(document.getElementById('mb-email').value);
          if (!name || !username || !email) { alert('Nhập đầy đủ họ tên, username và email.'); return; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Địa chỉ email không đúng định dạng.'); return; }
          if (!/^[a-z0-9_.]+$/.test(username)) { alert('Username chỉ gồm chữ thường, số, dấu chấm và gạch dưới.'); return; }
          const level = document.getElementById('mb-level').value;
          const gender = document.getElementById('mb-gender').value;
          const phone = document.getElementById('mb-phone').value.trim();
          const tempPw = Math.random().toString(36).slice(2,8);
          const passwordHash = await hashPassword(tempPw, username);
          let err = '';
          const ok = await mutateMembers(latest => {
            if (latest.some(m => normUsername(m.username) === username)) { err = 'Username đã tồn tại.'; return null; }
            if (latest.some(m => normEmail(m.email) === email)) { err = 'Email đã tồn tại.'; return null; }
            if (latest.length >= MAX_MEMBERS) { err = 'Đã đạt giới hạn ' + MAX_MEMBERS + ' thành viên.'; return null; }
            return latest.concat([{ id: uid(), name, nickname, username, email, phone, level, gender, password: passwordHash, status: 'active', role: 'r2', monthlyType: {}, avatarUrl: '' }]);
          });
          if (!ok) { alert(err || 'Thêm thất bại, thử lại.'); return; }
          render();
          alert(`Đã thêm ${name}${nickname ? ` (${nickname})` : ''}. Mật khẩu tạm: ${tempPw} — báo cho họ để đăng nhập rồi đổi qua Admin reset nếu cần.`);
        };
      }, 0);
    }

    const lockBtn = `<button class="bc-btn small ${locked ? 'outline' : 'danger'}" id="mb-lock-btn" style="padding:5px 12px; font-size:13px;">${locked ? '🔓 Mở đăng ký' : '🔒 Chốt đăng ký'}</button>`;
    const statusTabs = [
      ['all', 'Tất cả'],
      ['active', 'Hoạt động'],
      ['pending', `Chờ duyệt ${pendingCount > 0 ? `<span style="background:#993C1D; color:#FFF; border-radius:50%; padding:1px 5px; font-size:10px; margin-left:3px;">${pendingCount}</span>` : ''}`],
      ['inactive', 'Ngưng hoạt động']
    ];

    const filterBar = el(`<div style="display:flex; gap:6px; margin-bottom:0.75rem; flex-wrap:wrap; align-items:center;">
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        ${statusTabs.map(([k,l]) =>
          `<div class="bc-tab ${state.memberFilter===k?'active':''}" data-filter="${k}" style="font-size:13px; padding:5px 12px;">${l}</div>`).join('')}
      </div>
      <div style="margin-left:auto; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span style="font-size:13px; color:#8a877d;">Tháng xem:</span>
        <input class="bc-input" type="month" id="mb-view-month" value="${state.viewMonth}" style="width:140px; padding:4px 8px;" />
        ${lockBtn}
      </div>
    </div>`);
    wrap.appendChild(filterBar);

    // Search thành viên theo tên — dùng nút bấm thay vì live search
    const searchBar = el(`<div style="display:flex; gap:8px; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap;">
      <input class="bc-input" id="mb-search" placeholder="Nhập tên hoặc username..." value="${escapeHtml(state.memberSearch)}" style="max-width:280px;" />
      <button class="bc-btn small" id="mb-search-btn">🔍 Tìm</button>
      ${state.memberSearch ? `<button class="bc-btn outline small" id="mb-search-clear">✕ Xoá</button>` : ''}
    </div>`);
    wrap.appendChild(searchBar);

    let filtered = state.members.filter(m => state.memberFilter === 'all' ? true : m.status === state.memberFilter);
    if (state.memberSearch) {
      const kw = state.memberSearch.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(kw) || (m.username||'').toLowerCase().includes(kw));
    }

    const MPAGE = 12;
    const totalPages = Math.max(1, Math.ceil(filtered.length / MPAGE));
    if (state.memberVisibleCount > totalPages) state.memberVisibleCount = totalPages;
    const page = Math.max(0, Math.min((state.memberVisibleCount||0), totalPages - 1));
    const pageItems = filtered.slice().reverse().slice(page * MPAGE, (page + 1) * MPAGE);

    if (filtered.length === 0) {
      wrap.appendChild(el(`<div class="bc-empty">${state.memberSearch ? 'Không tìm thấy thành viên nào.' : 'Không có thành viên nào trong nhóm này.'}</div>`));
    } else {
      pageItems.forEach(m => wrap.appendChild(renderMemberRow(m)));
      if (totalPages > 1) {
        const paginator = el(`<div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:0.5rem; font-size:13px; color:#6b7a73;"></div>`);
        if (page > 0) {
          const prev = el(`<button class="bc-btn outline small">◀ Trước</button>`);
          prev.onclick = () => { state.memberVisibleCount = page - 1; render(); };
          paginator.appendChild(prev);
        }
        paginator.appendChild(el(`<span>Trang ${page+1} / ${totalPages} (${filtered.length} thành viên)</span>`));
        if (page < totalPages - 1) {
          const next = el(`<button class="bc-btn outline small">Tiếp ▶</button>`);
          next.onclick = () => { state.memberVisibleCount = page + 1; render(); };
          paginator.appendChild(next);
        }
        wrap.appendChild(paginator);
      }
    }

    setTimeout(() => {
      document.getElementById('mb-view-month').onchange = (e) => { state.viewMonth = e.target.value || monthKey(); render(); };
      filterBar.querySelectorAll('[data-filter]').forEach(n => n.onclick = () => { state.memberFilter = n.dataset.filter; state.memberVisibleCount = 0; render(); });
      const mbLockBtn = document.getElementById('mb-lock-btn');
      if (mbLockBtn) {
        mbLockBtn.onclick = async () => {
          const isLocked = isMonthLocked(state.viewMonth);
          if (confirm(`${isLocked ? 'Mở chốt' : 'Chốt'} đăng ký cho tháng ${monthLabel(state.viewMonth)}?`)) {
            await toggleMonthLock(state.viewMonth);
          }
        };
      }
      const mbSearch = document.getElementById('mb-search');
      const mbSearchBtn = document.getElementById('mb-search-btn');
      const doSearch = () => { state.memberSearch = document.getElementById('mb-search').value; state.memberVisibleCount = 0; render(); };
      if (mbSearchBtn) mbSearchBtn.onclick = doSearch;
      if (mbSearch) mbSearch.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
      const mbClear = document.getElementById('mb-search-clear');
      if (mbClear) mbClear.onclick = () => { state.memberSearch = ''; state.memberVisibleCount = 0; render(); };
    }, 0);

    return wrap;
  }

  function avatarHtml(m, size, customXP){
    size = size || 36;
    const xp = customXP !== undefined ? customXP : calculateMemberXP(m.id, state.sessions);
    const rank = getXPRank(xp);
    const isLegendary = rank.key === 'legendary';


    // Single unified border style based on XP rank
    let borderStyle = `border: 2px solid ${rank.ringColor};`;
    if (isLegendary) {
      borderStyle = `border: 2px solid #FFD700; box-shadow: 0 0 8px rgba(255,215,0,0.6);`;
    }

    // Role overlay (top-left) if owner/admin/r1
    let roleOverlay = '';
    if (isOwner(m)) {
      roleOverlay = `<span style="position:absolute; top:-4px; left:-4px; font-size:${Math.max(10, Math.round(size*0.3))}px; line-height:1; z-index:3;" title="Owner">👑</span>`;
    } else if (m.role === 'admin') {
      roleOverlay = `<span style="position:absolute; top:-4px; left:-4px; font-size:${Math.max(10, Math.round(size*0.3))}px; line-height:1; z-index:3;" title="Admin">⭐</span>`;
    } else if (m.role === 'r1') {
      roleOverlay = `<span style="position:absolute; top:-4px; left:-4px; font-size:${Math.max(10, Math.round(size*0.3))}px; line-height:1; z-index:3;" title="R1">🏸</span>`;
    }

    // XP Rank emoji overlay (bottom-right) - ALWAYS present
    const rankOverlay = `<span style="position:absolute; bottom:-4px; right:-4px; font-size:${Math.max(10, Math.round(size*0.32))}px; line-height:1; z-index:3; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));" title="${rank.label} (${xp} XP)">${rank.emoji}</span>`;
    
    let imgHtml = '';
    if (m.avatarUrl) {
      imgHtml = `<img src="${m.avatarUrl}" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; flex-shrink:0; ${borderStyle}" />`;
    } else {
      const initial = (m.name||'?').trim().charAt(0).toUpperCase();
      const shimmerStyle = isLegendary
        ? `background: ${rank.avatarBg}; background-size: 200% auto; animation: xpRankShimmer 2.5s linear infinite;`
        : `background: ${rank.avatarBg};`;
      imgHtml = `<div style="width:${size}px; height:${size}px; border-radius:50%; ${shimmerStyle} color:${rank.avatarFg}; display:flex; align-items:center; justify-content:center; font-size:${Math.round(size*0.42)}px; font-weight:700; flex-shrink:0; ${borderStyle}">${initial}</div>`;
    }
    
    const glowWrap = isLegendary ? `class="xp-rank-legendary"` : '';
    return `<div ${glowWrap} style="position:relative; display:inline-block; width:${size}px; height:${size}px; flex-shrink:0;">
      ${imgHtml}
      ${roleOverlay}
      ${rankOverlay}
    </div>`;
  }


  function memberDisplayName(m) {
    if (!m) return '';
    const nickname = (m.nickname || '').trim();
    const fullName = (m.name || '').trim();
    if (nickname && fullName && nickname.toLowerCase() !== fullName.toLowerCase()) {
      return `${nickname} (${fullName})`;
    }
    return nickname || fullName || '';
  }

  function memberDisplayNameHtml(m, options = {}) {
    if (!m) return '';
    const nickname = (m.nickname || '').trim();
    const fullName = (m.name || '').trim();
    const isDeleted = m.isDeleted;
    const isSelf = options.isSelf;
    const mainSize = options.mainSize || '13px';
    const subSize = options.subSize || '8px';
    const carrotColor = '#E76F51'; // Màu cam cà rốt chuẩn thể thao, rõ nét

    const selfBadge = isSelf ? ` <span style="font-size:11px; color:#D8973C; font-weight:700;">(Bạn)</span>` : '';
    const deletedBadge = isDeleted ? ` <span style="font-size:11px; color:#993C1D; font-style:italic;">(Đã xoá)</span>` : '';

    if (nickname) {
      return `<div style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:left; line-height:1.2;">
        <span style="font-size:${mainSize}; font-weight:${options.fontWeight || '500'}; color:inherit;">${escapeHtml(nickname)}${selfBadge}${deletedBadge}</span>
        <span style="font-size:${subSize}; color:${carrotColor}; font-weight:500; margin-top:1px; line-height:1.1;">${escapeHtml(fullName)}</span>
      </div>`;
    } else {
      return `<div style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:left; line-height:1.25;">
        <span style="font-size:${mainSize}; font-weight:${options.fontWeight || '500'}; color:inherit;">${escapeHtml(fullName)}${selfBadge}${deletedBadge}</span>
      </div>`;
    }
  }

  function renderMemberRow(m){
    const [lbg, lfg, llabel, lborder] = LEVEL_COLOR[m.level] || ["#F1EFE8","#444441", m.level, "none"];
    const [rbg, rfg] = ROLE_COLOR[m.role] || ["#F1EFE8","#444441"];
    const isSelf = state.me && state.me.id === m.id;
    const locked = isMonthLocked(state.viewMonth);
    const editable = canManage() || (isSelf && !locked); // ai sửa được loại đăng ký tháng của dòng này
    const curType = (m.monthlyType||{})[state.viewMonth] || '';
    const statusBg = m.status === 'active' ? '#EAF3DE' : (m.status === 'pending' ? '#FAEEDA' : '#FAECE7');
    const statusFg = m.status === 'active' ? '#27500A' : (m.status === 'pending' ? '#854F0B' : '#993C1D');
    const statusLabel = m.status === 'active' ? 'Hoạt động' : (m.status === 'pending' ? 'Chờ duyệt' : 'Ngưng hoạt động');
    const isEditing = state.editingMemberId === m.id;

    const mXP = calculateMemberXP(m.id, state.sessions);
    const mRank = getXPRank(mXP);
    const mBadges = getMemberBadges(m.id, state.sessions);

    const row = el(`<div class="bc-card" style="padding:0.7rem 1rem;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:6px;">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <div id="avatar-box-${m.id}"></div>
          <div>
            ${isEditing 
              ? `<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:6px;">
                  <input class="bc-input" id="edit-name-${m.id}" value="${escapeHtml(m.name)}" placeholder="Họ tên (bắt buộc)" style="width:140px; padding:4px 6px; font-size:13px; font-weight:500; height: 28px;" />
                  <input class="bc-input" id="edit-nickname-${m.id}" value="${escapeHtml(m.nickname || '')}" placeholder="Biệt danh (tối đa 35 ký tự)" maxlength="35" style="width:150px; padding:4px 6px; font-size:13px; height: 28px;" />
                  <select class="bc-select" id="edit-gender-${m.id}" style="width:80px; padding:4px 6px; font-size:12px; height: 28px;">
                    <option value="Nam" ${m.gender !== 'Nữ' ? 'selected' : ''}>Nam</option>
                    <option value="Nữ" ${m.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
                  </select>
                  <select class="bc-select" id="edit-level-${m.id}" style="width:110px; padding:4px 6px; font-size:12px; height: 28px;">
                    ${LEVELS.map(l => `<option value="${l}" ${l===m.level?'selected':''}>${l}</option>`).join('')}
                  </select>
                </div>`
              : `<div style="display:inline-block; vertical-align:middle;">
                  ${memberDisplayNameHtml(m, { isSelf: false, mainSize: '14px', subSize: '11px', fontWeight: '600' })}
                </div>`
            }
            ${isSelf && !isEditing ? `<span class="bc-badge" style="background:#E6F1FB; color:#0C447C; margin-left:6px;">Bạn</span>` : ''}
            ${!isEditing ? `<span class="bc-badge" style="background:${lbg}; color:${lfg}; border:${lborder}; margin-left:6px;">${llabel}</span>` : ''}
            <span class="bc-badge" style="background:#E3E0D6; color:#444441; margin-left:6px;">${m.gender === 'Nữ' ? 'Nữ 👩' : 'Nam 👨'}</span>
            <span class="bc-badge" style="background:${rbg}; color:${rfg}; margin-left:6px;">${ROLE_LABEL[m.role]}</span>
            <span class="bc-badge" style="background:${statusBg}; color:${statusFg}; margin-left:6px;">${statusLabel}</span>
            <span class="bc-badge" style="background:${mRank.avatarBg}; color:${mRank.avatarFg}; margin-left:6px; font-weight:700;">${mRank.emoji} ${mRank.label} (${mXP} XP)</span>
            ${mBadges.map(b => `<span title="${b.label}: ${b.desc}" class="bc-badge" style="background:${b.bg}; color:${b.color}; border:1px solid ${b.color}40; margin-left:4px;">${b.emoji} ${b.label}</span>`).join('')}

            ${isEditing
              ? `<div style="font-size:12px; color:#8a877d; margin-top:3px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                  <input class="bc-input" id="edit-username-${m.id}" value="${escapeHtml(m.username || '')}" placeholder="Username" style="width:110px; padding:2px 6px; font-size:12px; height: 24px;" ${isOwner(m)?'disabled title="Không thể đổi username của Owner"':''} /> · 
                  <input class="bc-input" id="edit-email-${m.id}" type="email" value="${escapeHtml(m.email)}" placeholder="Email" style="width:170px; padding:2px 6px; font-size:12px; height: 24px;" /> · 
                  <input class="bc-input" id="edit-phone-${m.id}" value="${escapeHtml(m.phone || '')}" placeholder="SĐT" style="width:100px; padding:2px 6px; font-size:12px; height: 24px;" />
                 </div>`
              : `<div style="font-size:12px; color:#8a877d; margin-top:3px;">@${escapeHtml(m.username || '')} · ${escapeHtml(m.email)}${m.phone ? ' · ' + escapeHtml(m.phone) : ''}</div>`
            }
            ${isSelf && !isEditing ? `<div style="margin-top:6px;"><input type="file" accept="image/*" id="avatar-input-${m.id}" style="font-size:12px;" /></div>` : ''}
            ${isSelf && !isEditing ? `<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              <input class="bc-input" type="password" id="pw-old-${m.id}" placeholder="Mật khẩu hiện tại" style="width:140px; padding:5px 8px;" />
              <input class="bc-input" type="password" id="pw-new-${m.id}" placeholder="Mật khẩu mới" style="width:140px; padding:5px 8px;" />
              <input class="bc-input" type="password" id="pw-new2-${m.id}" placeholder="Nhập lại" style="width:120px; padding:5px 8px;" />
              <button class="bc-btn outline small" id="pw-change-${m.id}">Đổi mật khẩu</button>
              <span id="pw-msg-${m.id}" style="font-size:12px;"></span>
            </div>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;" id="row-actions-${m.id}"></div>
      </div>
      <div style="margin-top:8px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:12px; color:#8a877d;">Đăng ký ${monthLabel(state.viewMonth)}:</span>
        <select class="bc-select" id="type-${m.id}" style="width:170px; padding:5px 8px;" ${editable?'':'disabled'}>
          <option value="" ${curType===''?'selected':''}>Chưa đăng ký</option>
          <option value="fixed" ${curType==='fixed'?'selected':''}>Cố định</option>
          <option value="casual" ${curType==='casual'?'selected':''}>Vãng lai</option>
        </select>
      </div>
    </div>`);

    row.querySelector(`#avatar-box-${m.id}`).innerHTML = avatarHtml(m, 36);

    const actions = row.querySelector(`#row-actions-${m.id}`);
    if (isEditing) {
      const saveEditBtn = el(`<button class="bc-btn small" style="background:#27500A; border-color:#27500A; color:#FFF; font-weight:500;">Xác nhận</button>`);
      saveEditBtn.onclick = async () => {
        const newName = document.getElementById(`edit-name-${m.id}`).value.trim();
        const newNickname = (document.getElementById(`edit-nickname-${m.id}`).value || '').trim().slice(0, 35);
        const newUsernameInput = document.getElementById(`edit-username-${m.id}`);
        const newUsername = newUsernameInput ? normUsername(newUsernameInput.value) : m.username;
        const newEmail = normEmail(document.getElementById(`edit-email-${m.id}`).value);
        const newPhone = document.getElementById(`edit-phone-${m.id}`).value.trim();
        const levelEl = document.getElementById(`edit-level-${m.id}`);
        const newLevel = levelEl ? levelEl.value : m.level;
        const genderEl = document.getElementById(`edit-gender-${m.id}`);
        const newGender = genderEl ? genderEl.value : (m.gender || 'Nam');
        
        if (!newName || !newEmail || !newUsername) { alert('Họ tên, username và email không được bỏ trống.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { alert('Địa chỉ email không đúng định dạng.'); return; }
        if (!/^[a-z0-9_.]+$/.test(newUsername)) { alert('Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm và gạch dưới, không dấu cách.'); return; }

        if (isOwner(m) && newUsername !== 'kietdmt') {
          alert('Không thể thay đổi username của tài khoản Owner.');
          return;
        }

        let newPasswordHash = undefined;
        if (newUsername !== m.username) {
          const pwPrompt = prompt(`Bạn đang đổi tên đăng nhập sang "${newUsername}".\nVui lòng nhập mật khẩu tài khoản để cập nhật đăng nhập cho username mới:`);
          if (!pwPrompt) {
            alert('Đã hủy thao tác đổi tên đăng nhập vì chưa nhập mật khẩu xác nhận.');
            return;
          }
          newPasswordHash = await hashPassword(pwPrompt, newUsername);
        }
        
        let err = '';
        const ok = await mutateMembers(latest => {
          if (latest.some(x => x.id !== m.id && normUsername(x.username) === newUsername)) {
            err = 'Tên đăng nhập này đã được sử dụng bởi thành viên khác.';
            return null;
          }
          if (latest.some(x => x.id !== m.id && normEmail(x.email) === newEmail)) {
            err = 'Email này đã được sử dụng bởi thành viên khác.';
            return null;
          }
          return latest.map(x => x.id === m.id ? Object.assign({}, x, {
            name: newName,
            nickname: newNickname,
            username: newUsername,
            email: newEmail,
            phone: newPhone,
            level: newLevel,
            gender: newGender,
            ...(newPasswordHash ? { password: newPasswordHash } : {})
          }) : x);
        });
        
        if (!ok) {
          alert(err || 'Chỉnh sửa thất bại.');
          return;
        }

        if (isSelf && newUsername !== m.username) {
          state.myUsername = newUsername;
          if (newPasswordHash) {
            state.myPasswordHash = newPasswordHash;
            if (state.rememberData) {
              state.rememberData = { username: newUsername, password: newPasswordHash };
              saveRemember(state.rememberData);
            }
          }
          saveMyUsername();
          resolveMe();
        }
        
        state.editingMemberId = null;
        render();
      };
      actions.appendChild(saveEditBtn);

      const cancelEditBtn = el(`<button class="bc-btn outline small">Hủy</button>`);
      cancelEditBtn.onclick = () => {
        state.editingMemberId = null;
        render();
      };
      actions.appendChild(cancelEditBtn);
    } else {
      if (canManage()) {
        if (m.status === 'pending') {
          const approveBtn = el(`<button class="bc-btn small" style="background:#27500A; border-color:#27500A; color:#FFF; font-weight:500;">Chấp nhận</button>`);
          approveBtn.onclick = async () => {
            showLoading('Đang duyệt tài khoản...');
            const ok = await mutateMembers(latest => latest.map(x => x.id === m.id ? Object.assign({}, x, { status: 'active' }) : x));
            hideLoading();
            if (ok && m.email) {
              const emailSubject = `[CLB ARON] Tài khoản của bạn đã được phê duyệt`;
              const emailBody = `<h3>Chào ${m.name},</h3>
                <p>Chúc mừng! Yêu cầu đăng ký tài khoản của bạn tại CLB Cầu lông ARON đã được Ban quản trị phê duyệt thành công.</p>
                <p>Bây giờ bạn đã có thể đăng nhập vào ứng dụng và bắt đầu tham gia hoạt động cùng CLB.</p>
                <p><strong>Tên đăng nhập của bạn:</strong> ${m.username}</p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
              sendSystemEmail(m.email, emailSubject, emailBody);
            }
            render();
          };
          actions.appendChild(approveBtn);
          
          const rejectBtn = el(`<button class="bc-btn danger small">Xoá</button>`);
          rejectBtn.onclick = async () => {
            if (!confirm(`Từ chối và xoá đăng ký của ${m.name}?`)) return;
            showLoading('Đang từ chối đăng ký...');
            const ok = await mutateMembers(latest => latest.filter(x => x.id !== m.id));
            hideLoading();
            if (ok && m.email) {
              const emailSubject = `[CLB ARON] Yêu cầu đăng ký tài khoản bị từ chối`;
              const emailBody = `<h3>Chào ${m.name},</h3>
                <p>Yêu cầu đăng ký tài khoản của bạn tại CLB Cầu lông ARON đã không được Ban quản trị phê duyệt.</p>
                <p>Nếu có bất kỳ thắc mắc nào hoặc muốn đăng ký lại, vui lòng liên hệ trực tiếp với Ban quản trị.</p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
              sendSystemEmail(m.email, emailSubject, emailBody);
            }
            render();
          };
          actions.appendChild(rejectBtn);
        } else {
          const statusBtn = el(`<button class="bc-btn outline small">${m.status==='active' ? 'Ngưng hoạt động' : 'Mở lại hoạt động'}</button>`);
          statusBtn.onclick = async () => {
            await mutateMembers(latest => latest.map(x => x.id === m.id ? Object.assign({}, x, { status: x.status === 'active' ? 'inactive' : 'active' }) : x));
            render();
          };
          actions.appendChild(statusBtn);
        }
      }

      if (!isSelf && m.status === 'active' && !isEditing) {
        const challengeBtn = el(`<button class="bc-btn small" style="background:linear-gradient(135deg,#F26419,#E76F51); color:#FFF; border:none; padding:4px 9px; font-size:11px; font-weight:700; border-radius:8px; box-shadow:0 2px 6px rgba(242,100,25,0.3); cursor:pointer;">⚡ Thách đấu</button>`);
        challengeBtn.onclick = () => openQuickChallengeModal(m);
        actions.appendChild(challengeBtn);
      }

      // Nút Sửa: Hiển thị cho chính mình (kể cả R2) HOẶC Admin/R1 có thẩm quyền
      const isOwnerRow = isOwner(m);
      const isCurrentUserOwner = isOwner();
      const canEditThisMember = isSelf || (isAdmin() && (!isOwnerRow || isCurrentUserOwner)) || (role() === 'r1' && m.role !== 'admin' && !isOwnerRow);
      if (canEditThisMember && m.status !== 'pending') {
        const editBtn = el(`<button class="bc-btn outline small" id="edit-btn-${m.id}">Sửa</button>`);
        editBtn.onclick = () => {
          state.editingMemberId = m.id;
          render();
        };
        actions.appendChild(editBtn);
      }

      if ((isAdmin() || role() === 'r1') && m.status !== 'pending') {
        // Chỉ cho phép đổi nhóm thành viên/quyền nếu là Admin/Owner (R1 không được đổi quyền)
        if (isAdmin()) {
          const roleSel = el(`<select class="bc-select" style="width:90px; padding:5px 6px;" ${isOwnerRow && !isCurrentUserOwner ? 'disabled' : ''}>
            <option value="r2" ${m.role==='r2'?'selected':''}>R2</option>
            <option value="r1" ${m.role==='r1'?'selected':''}>R1</option>
            <option value="admin" ${m.role==='admin'?'selected':''}>Admin</option>
          </select>`);
          roleSel.onchange = async (e) => {
            if (isOwnerRow && !isCurrentUserOwner) {
              alert('Không thể thay đổi nhóm thành viên của tài khoản Owner.');
              render();
              return;
            }
            const newRole = e.target.value;
            const ok = await mutateMembers(latest => {
              const target = latest.find(x => x.id === m.id);
              if (!target) return null;
              if (target.role === 'admin' && newRole !== 'admin') {
                const otherAdmins = latest.filter(x => x.role === 'admin' && x.id !== m.id).length;
                if (otherAdmins === 0) return null;
              }
              return latest.map(x => x.id === m.id ? Object.assign({}, x, { role: newRole }) : x);
            });
            if (!ok) alert('Không thể chuyển quyền: cần giữ ít nhất 1 thành viên Admin trong nhóm.');
            render();
          };
          actions.appendChild(roleSel);
        }

        // Reset mật khẩu: R1 được đổi mật khẩu thành viên nhưng không được đổi mật khẩu admin và owner
        const canReset = isCurrentUserOwner || (!isOwnerRow && m.role !== 'admin' && (isAdmin() || role() === 'r1'));
        if (canReset) {
          const resetBtn = el(`<button class="bc-btn outline small">Reset mật khẩu</button>`);
          resetBtn.onclick = async () => {
            const newPw = prompt(`Đặt mật khẩu mới cho ${m.name}:`);
            if (!newPw) return;
            if (newPw.length < 4) { alert('Mật khẩu cần ít nhất 4 ký tự.'); return; }
            const passwordHash = await hashPassword(newPw, m.username);
            await mutateMembers(latest => latest.map(x => x.id === m.id ? Object.assign({}, x, { password: passwordHash }) : x));
            alert(`Đã đặt lại mật khẩu cho ${m.name}. Hãy báo mật khẩu mới cho họ.`);
          };
          actions.appendChild(resetBtn);
        }

        // 4. Xóa thành viên: Chỉ Admin/Owner được phép xóa thành viên (R1 không được xóa)
        if (isAdmin() && (!isOwnerRow || isCurrentUserOwner)) {
          const delBtn = el(`<button class="bc-btn danger small">Xoá</button>`);
          delBtn.onclick = async () => {
            if (isOwnerRow && !isCurrentUserOwner) {
              alert('Không thể xoá tài khoản Owner.');
              return;
            }
            if (!confirm(`Xoá thành viên ${m.name}?`)) return;
            let blocked = false;
            const ok = await mutateMembers(latest => {
              const target = latest.find(x => x.id === m.id);
              if (target && target.role === 'admin' && latest.filter(x => x.role === 'admin').length === 1) { blocked = true; return null; }
              return latest.filter(x => x.id !== m.id);
            });
            if (blocked) { alert('Không thể xoá: đây là Admin duy nhất của nhóm.'); return; }
            if (ok && state.me && state.me.id === m.id) { state.myUsername = null; state.me = null; saveMyUsername(); }
            render();
          };
          actions.appendChild(delBtn);
        }
      }
    }

    setTimeout(() => {
      const typeSel = document.getElementById(`type-${m.id}`);
      if (typeSel && editable) typeSel.onchange = async (e) => {
        const val = e.target.value;
        await mutateMembers(latest => latest.map(x => {
          if (x.id !== m.id) return x;
          const mt = Object.assign({}, x.monthlyType || {});
          if (val) mt[state.viewMonth] = val; else delete mt[state.viewMonth];
          return Object.assign({}, x, { monthlyType: mt });
        }));
        render();
      };
      const avatarInput = document.getElementById(`avatar-input-${m.id}`);
      if (avatarInput) avatarInput.onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        compressImage(f, 120, 0.7, async (url) => {
          await mutateMembers(latest => latest.map(x => x.id === m.id ? Object.assign({}, x, { avatarUrl: url }) : x));
          render();
        });
      };
      const pwBtn = document.getElementById(`pw-change-${m.id}`);
      if (pwBtn) pwBtn.onclick = async () => {
        const msg = document.getElementById(`pw-msg-${m.id}`);
        const oldPw = document.getElementById(`pw-old-${m.id}`).value;
        const newPw = document.getElementById(`pw-new-${m.id}`).value;
        const newPw2 = document.getElementById(`pw-new2-${m.id}`).value;
        if (!oldPw || !newPw) { msg.style.color = '#993C1D'; msg.textContent = 'Nhập đủ thông tin.'; return; }
        if (newPw.length < 4) { msg.style.color = '#993C1D'; msg.textContent = 'Mật khẩu mới cần ≥4 ký tự.'; return; }
        if (newPw !== newPw2) { msg.style.color = '#993C1D'; msg.textContent = 'Mật khẩu mới không khớp.'; return; }
        
        const oldPwHash = await hashPassword(oldPw, m.username);
        const newPwHash = await hashPassword(newPw, m.username);
        let err = '';
        const ok = await mutateMembers(latest => {
          const target = latest.find(x => x.id === m.id);
          if (!target || target.password !== oldPwHash) { err = 'Sai mật khẩu hiện tại.'; return null; }
          return latest.map(x => x.id === m.id ? Object.assign({}, x, { password: newPwHash }) : x);
        });
        if (!ok) { msg.style.color = '#993C1D'; msg.textContent = err || 'Đổi thất bại.'; return; }
        
        if (state.rememberData && normUsername(state.rememberData.username) === normUsername(m.username)) {
          state.rememberData = { username: m.username, password: newPwHash }; saveRemember(state.rememberData);
        }
        msg.style.color = '#27500A'; msg.textContent = 'Đã đổi mật khẩu thành công.';
      };
    }, 0);

    return row;
  }



  // ---------- QUỸ & CHI PHÍ ----------
  function computeMemberMonthSummary(month){
    const result = {};
    state.members.forEach(m => result[m.id] = { count: 0, owed: 0 });
    state.sessions.filter(s => sessionMonthKey(s) === month).forEach(s => {
      const shares = computeShares(s);
      shares.fixedNames.forEach(name => {
        const mem = state.members.find(x => x.name === name);
        if (mem) { result[mem.id].count++; result[mem.id].owed += shares.fixedShare; }
      });
      shares.casualNames.forEach(name => {
        const mem = state.members.find(x => x.name === name);
        if (mem) { result[mem.id].count++; result[mem.id].owed += shares.casualShare; }
      });
    });
    return result;
  }

  function prevMonthKey(month){
    const [y,m] = month.split('-').map(Number);
    const d = new Date(y, m-2, 1);
    return monthKey(d);
  }

  function nextMonthKey(month) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    return monthKey(d);
  }

  function getEarliestActiveMonth() {
    const months = new Set();
    const rx = /^\d{4}-\d{2}$/;
    Object.keys(state.fund).forEach(m => { if (rx.test(m)) months.add(m); });
    state.members.forEach(m => {
      const pObj = state.payments[m.id];
      if (pObj) {
        Object.keys(pObj).forEach(m => { if (rx.test(m)) months.add(m); });
      }
    });
    state.sessions.forEach(s => {
      const m = sessionMonthKey(s);
      if (rx.test(m)) months.add(m);
    });
    if (months.size === 0) return null;
    const sorted = Array.from(months).sort();
    return sorted[0];
  }

  function getOpeningBalance(month) {
    const rx = /^\d{4}-\d{2}$/;
    if (!rx.test(month)) return 0;

    const earliest = getEarliestActiveMonth();
    if (!earliest || month <= earliest) {
      const f = state.fund[month];
      return (f && f.opening !== undefined) ? f.opening : 0;
    }

    let currentMonth = earliest;
    let runningBalance = 0;
    const firstFund = state.fund[earliest];
    if (firstFund && firstFund.opening !== undefined) {
      runningBalance = firstFund.opening;
    }

    while (currentMonth < month) {
      const fObj = state.fund[currentMonth] || { expenses: [] };
      let incomePaid = 0, incomePrepaid = 0;
      state.members.forEach(m => {
        const p = (state.payments[m.id] || {})[currentMonth] || {};
        incomePaid += (p.paid || 0);
        incomePrepaid += (p.prepaid || 0);
      });
      const incomeDonate = (state.donations||[]).filter(d => d.month === currentMonth).reduce((a,d) => a + (d.amount||0), 0);
      const income = incomePaid + incomePrepaid + incomeDonate;
      const expenseTotal = (fObj.expenses || []).reduce((a,e) => a + (e.amount||0), 0);

      runningBalance = runningBalance + income - expenseTotal;
      currentMonth = nextMonthKey(currentMonth);

      if (currentMonth > '2100-01' || !rx.test(currentMonth)) break;
    }

    return runningBalance;
  }

  function fundClosing(month) {
    const f = state.fund[month] || { expenses: [] };
    let incomePaid = 0, incomePrepaid = 0;
    state.members.forEach(m => {
      const p = (state.payments[m.id] || {})[month] || {};
      incomePaid += (p.paid || 0);
      incomePrepaid += (p.prepaid || 0);
    });
    const incomeDonate = (state.donations||[]).filter(d => d.month === month).reduce((a,d) => a + (d.amount||0), 0);
    const income = incomePaid + incomePrepaid + incomeDonate;
    const expenseTotal = (f.expenses || []).reduce((a,e) => a + (e.amount||0), 0);
    const sessionsCostTotal = state.sessions
      .filter(s => sessionMonthKey(s) === month)
      .reduce((a,s) => {
        const c = s.costs || {};
        return a + (c.court||0) + (c.water||0) + (c.shuttle||0) + (c.other||0);
      }, 0);

    const opening = getOpeningBalance(month);
    return {
      opening, incomePaid, incomePrepaid, incomeDonate,
      income, expenseTotal, sessionsCostTotal,
      diff: expenseTotal - sessionsCostTotal,
      closing: opening + income - expenseTotal
    };
  }

  function renderFund(){
    const wrap = el(`<div></div>`);
    const month = state.viewMonth;
    const today = new Date().toISOString().slice(0,10);

    wrap.appendChild(el(`<div style="display:flex; align-items:center; gap:6px; margin-bottom:1rem;">
      <span style="font-size:13px; color:#8a877d;">Tháng xem:</span>
      <input class="bc-input" type="month" id="fund-month" value="${month}" style="width:140px; padding:5px 8px;" />
    </div>`));

    const summary = computeMemberMonthSummary(month);

    let totalOwed = 0;
    let totalPaid = 0;
    state.members.forEach(m => {
      const s = summary[m.id] || { count: 0, owed: 0 };
      const p = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };
      totalOwed += s.owed;
      totalPaid += (p.paid || 0) + (p.prepaid || 0);
    });
    const realPercent = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
    const progressPercent = Math.min(100, realPercent);
    
    const progressCard = el(`<div class="bc-card" style="background: linear-gradient(to right, rgba(250, 248, 245, 0.9), #FFF); border: 1px solid rgba(64,145,108,0.2); margin-bottom: 1.25rem; padding: 1rem 1.25rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:13px;">
        <span style="font-weight:600; color:#1B4332; font-family:'Oswald', sans-serif; letter-spacing:0.5px;">📈 TIẾN ĐỘ THU PHÍ THÁNG ${monthLabel(month)}</span>
        <span style="font-weight:700; color:#1B4332; font-size:14px;">${realPercent}% (Phải nộp: ${formatVND(totalOwed)} / Đã nộp: ${formatVND(totalPaid)})</span>
      </div>
      <div style="position:relative; width:100%; height:8px; background:#EFEDE3; border-radius:999px; margin:8px 0 4px;">
        <div style="width:${progressPercent}% !important; height:100%; background:linear-gradient(to right, #2D6A4F, #40916C); border-radius:999px;"></div>
        <span style="position:absolute; left:calc(${progressPercent}% - 8px) !important; top:-6px; font-size:12px; pointer-events:none;">🏸</span>
      </div>
    </div>`);
    wrap.appendChild(progressCard);

    const rowsMembers = canManage() ? state.members : state.members.filter(m => state.me && m.id === state.me.id);
    const isCollapsed = !!state.memberFundCollapsed;
    const remindAllBtnHtml = (isAdmin() && !isCollapsed)
      ? `<button class="bc-btn danger small" id="remind-all-debt-btn" style="padding:2px 8px; font-size:11px; background:#993C1D; border-color:#993C1D; color:#FFF; display:flex; align-items:center; gap:4px;">📢 Nhắc nợ tất cả</button>`
      : '';
    const headerEl = el(`<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
      <h3 style="font-size:15px; color:#1B4332; margin:0; font-family:'Oswald', sans-serif; letter-spacing:0.5px;">👥 TỔNG HỢP CHI PHÍ THÀNH VIÊN</h3>
      <div style="display:flex; gap:8px; align-items:center;">
        ${remindAllBtnHtml}
        <button class="bc-btn outline small" id="toggle-member-fund-btn" style="padding:2px 8px; font-size:11px; display:flex; align-items:center; gap:4px;">
          ${isCollapsed ? '➕ Hiện bảng chi phí' : '➖ Ẩn bảng chi phí'}
        </button>
      </div>
    </div>`);
    wrap.appendChild(headerEl);

    if (!isCollapsed) {
      if (rowsMembers.length === 0) {
        wrap.appendChild(el(`<div class="bc-empty">Không có dữ liệu.</div>`));
      } else {
        const tbl = el(`<div class="bc-card" style="overflow-x:auto;"><table style="width:100%; font-size:13px; border-collapse:collapse; min-width:640px;">
          <tr style="color:#8a877d; text-align:left;">
            <th style="padding:6px 4px;">Thành viên</th><th style="padding:6px 4px;">Buổi</th>
            <th style="padding:6px 4px; text-align:right;">Nợ kỳ trước</th>
            <th style="padding:6px 4px; text-align:right;">Phải trả</th><th style="padding:6px 4px; text-align:right;">Đã nộp</th>
            <th style="padding:6px 4px; text-align:right;">Điều chỉnh</th><th style="padding:6px 4px; text-align:right;">Còn lại</th>
            ${isAdmin() ? `<th style="padding:6px 4px; text-align:center;">Nhắc nợ</th>` : ''}
          </tr>
        </table></div>`);
        const table = tbl.querySelector('table');
        const prevDebts = computeAllMembersPreviousDebt(month);
        rowsMembers.forEach(m => {
          const s = summary[m.id] || { count: 0, owed: 0 };
          const p = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };
          const prevDebt = prevDebts[m.id] || 0;
          const remaining = prevDebt + s.owed - (p.paid||0) - (p.prepaid||0);
          const editable = canManage();
          const canEditPaid = isOwner();
          
          let actionTdHtml = '';
          if (isAdmin()) {
            if (remaining > 0 && m.email) {
              actionTdHtml = `<td style="padding:6px 4px; text-align:center;">
                <button class="bc-btn outline small" id="remind-mail-${m.id}-${month}" style="padding:2px 6px; font-size:11px; border-color:#993C1D; color:#993C1D;">📧 Email</button>
              </td>`;
            } else if (remaining > 0 && !m.email) {
              actionTdHtml = `<td style="padding:6px 4px; text-align:center; color:#8a877d; font-size:11px; font-style:italic;">Thiếu Email</td>`;
            } else {
              actionTdHtml = `<td style="padding:6px 4px; text-align:center; color:#27500A; font-weight:600; font-size:11px;">Đã xong</td>`;
            }
          }

          const tr = el(`<tr style="border-top:1px solid #F1EFE8;">
            <td style="padding:6px 4px;">${memberDisplayNameHtml(m, { isSelf: state.me && state.me.id === m.id, mainSize: '13px', subSize: '11px', fontWeight: '500' })}</td>
            <td style="padding:6px 4px;">${s.count}</td>
            <td style="padding:6px 4px; text-align:right; color:#8a877d;">${prevDebt ? formatVND(prevDebt) : '0đ'}</td>
            <td style="padding:6px 4px; text-align:right;">${formatVND(s.owed)}</td>
            <td style="padding:6px 4px; text-align:right;">${canEditPaid ? `<input class="bc-input" type="number" min="0" id="paid-${m.id}" value="${p.paid||0}" style="width:90px; padding:4px 6px; text-align:right;" />` : formatVND(p.paid||0)}</td>
            <td style="padding:6px 4px; text-align:right;">${isAdmin() ? `<input class="bc-input" type="number" id="prepaid-${m.id}" value="${p.prepaid||0}" style="width:90px; padding:4px 6px; text-align:right;" />` : (p.prepaid ? formatVND(p.prepaid, true) : '0đ')}</td>
            <td style="padding:6px 4px; text-align:right; font-weight:500; color:${remaining>0?'#993C1D':'#27500A'};">${formatVND(remaining)}</td>
            ${actionTdHtml}
          </tr>`);

          if (isAdmin() && remaining > 0 && m.email) {
            const btn = tr.querySelector(`#remind-mail-${m.id}-${month}`);
            if (btn) {
              btn.onclick = async () => {
                if (!confirm(`Gửi email nhắc nợ tháng ${monthLabel(month)} cho thành viên ${m.name}?`)) return;
                
                btn.disabled = true;
                btn.textContent = 'Đang gửi...';
                
                let origin = window.location.origin + window.location.pathname;
                if (window.location.protocol === 'file:' || origin.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('null')) {
                  origin = 'https://kietdmt.github.io/ARON-Badmintion-Club/';
                }
                const payUrl = `${origin}?action=pay&month=${month}&user=${m.username}`;
                
                const emailSubject = `[CLB ARON] Thông báo hoàn thành phí chơi cầu - Tháng ${monthLabel(month)}`;
                const emailBody = `<h3>Chào ${m.name},</h3>
                  <p>Ban quản trị CLB ARON gửi thông báo nhắc nhở về khoản phí chơi cầu chưa hoàn thành của bạn trong tháng <strong>${monthLabel(month)}</strong>:</p>
                  <table style="border-collapse:collapse; font-size:13px; width:100%; max-width:400px; margin-bottom:15px;">
                    <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Số buổi tham gia:</td><td style="padding:6px 0; font-weight:600; text-align:right;">${s.count} buổi</td></tr>
                    ${prevDebt > 0 ? `<tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Nợ kỳ trước:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#993C1D;">${formatVND(prevDebt)}</td></tr>` : ''}
                    <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Tổng phí phải trả:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#993C1D;">${formatVND(s.owed)}</td></tr>
                    <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Đã nộp + Điều chỉnh:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#27500A;">${formatVND((p.paid||0) + (p.prepaid||0))}</td></tr>
                    <tr style="border-bottom:1px solid #E3E0D6; font-size:14px;"><td style="padding:6px 0; font-weight:700; color:#1B4332;">Còn lại cần đóng:</td><td style="padding:6px 0; font-weight:700; text-align:right; color:#993C1D;">${formatVND(remaining)}</td></tr>
                  </table>
                  
                  <p>Bạn vui lòng thanh toán khoản phí còn lại bằng cách bấm vào liên kết dưới đây để mở giao diện nộp tiền qua mã QR tự động của câu lạc bộ:</p>
                  <p style="margin:20px 0;">
                    <a href="${payUrl}" style="background:#27500A; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px;">👉 Nộp Tiền Qua QR Ngay</a>
                  </p>
                  <p style="font-size:11px; color:#8a877d;">(Sau khi chuyển khoản thành công, vui lòng nhập số tiền đã đóng trên giao diện để gửi yêu cầu phê duyệt cho Thủ quỹ).</p>
                  <br/>
                  <p>Trân trọng,</p>
                  <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
                
                sendSystemEmail(m.email, emailSubject, emailBody).then(sent => {
                  btn.disabled = false;
                  if (sent) {
                    btn.textContent = 'Đã nhắc';
                    btn.style.borderColor = '#27500A';
                    btn.style.color = '#27500A';
                    showToast(`Đã gửi email nhắc nợ thành công cho ${m.name}!`);
                  } else {
                    btn.textContent = 'Lỗi gửi';
                    showToast(`Lỗi gửi email nhắc nợ cho ${m.name}. Vui lòng kiểm tra lại cấu hình Mail Server.`, 'error');
                  }
                }).catch(e => {
                  btn.disabled = false;
                  btn.textContent = 'Lỗi gửi';
                  showToast(`Lỗi gửi email nhắc nợ cho ${m.name}.`, 'error');
                  console.error(e);
                });
                
                // Cập nhật trạng thái UI lập tức
                btn.textContent = 'Đang gửi...';
                showToast(`Đang gửi email nhắc nợ cho ${m.name}...`, 'warning');
              };
            }
          }

          table.appendChild(tr);
        });
        wrap.appendChild(tbl);
        if (canManage()) {
          const saveBtn = el(`<button class="bc-btn small" id="pay-save" style="margin-bottom:1rem;">Lưu số tiền đã nộp</button>`);
          wrap.appendChild(saveBtn);
          setTimeout(() => {
            saveBtn.onclick = async () => {
              const entries = {};
              rowsMembers.forEach(m => {
                const paidEl = document.getElementById(`paid-${m.id}`);
                const prepaidEl = document.getElementById(`prepaid-${m.id}`);
                if (paidEl || prepaidEl) {
                  const existingPayment = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };
                  const paidVal = paidEl ? (parseFloat(paidEl.value) || 0) : (existingPayment.paid || 0);
                  const prepaidVal = prepaidEl ? (parseFloat(prepaidEl.value) || 0) : (existingPayment.prepaid || 0);
                  const today = new Date().toISOString().slice(0, 10);
                  let payDate = existingPayment.date || today;
                  if (paidVal !== (existingPayment.paid || 0) || prepaidVal !== (existingPayment.prepaid || 0)) {
                    payDate = today;
                  }
                  entries[m.id] = { paid: paidVal, prepaid: prepaidVal, date: payDate };
                }
              });
              await mutatePayments(latest => {
                const updated = Object.assign({}, latest);
                Object.keys(entries).forEach(mid => {
                  updated[mid] = Object.assign({}, updated[mid] || {});
                  updated[mid][month] = entries[mid];
                });
                return updated;
              });
              render();
            };
          }, 0);
        }
      }
    }

    if (state.me) {
      // Giao diện nộp tiền QR của thành viên
      const myMember = state.me;
      const s = summary[myMember.id] || { count: 0, owed: 0 };
      const p = (state.payments[myMember.id] || {})[month] || { paid: 0, prepaid: 0 };
      const remaining = s.owed - (p.paid||0) - (p.prepaid||0);
      
      const paymentSection = el(`<div class="bc-card" style="margin-top: 1rem;">
        <h3 style="font-size:15px; color:#1B4332; margin-bottom:8px;">Nộp phí - Tháng ${monthLabel(month).replace(/^Th/, '')}</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div>Bạn còn cần thanh toán: <strong style="color: ${remaining > 0 ? '#993C1D' : '#27500A'}; font-size:16px;">${formatVND(remaining)}</strong></div>
          <button class="bc-btn" id="r2-pay-qr-btn">Nộp tiền qua QR</button>
          <div id="r2-qr-panel" style="display:none; border-top:1px dashed #E3E0D6; padding-top:10px; margin-top:10px;">
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Tổng tiền đã chuyển khoản (đóng cho tháng này):</label>
                <input class="bc-input" type="number" id="r2-paid" value="${p.paid||0}" min="${p.paid||0}" placeholder="Số tiền đã nộp" />
              </div>
              <div>
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Số tiền nộp trước (quỹ dự phòng/tháng sau):</label>
                <input class="bc-input" type="number" id="r2-prepaid" value="${p.prepaid||0}" min="${p.prepaid||0}" placeholder="Số tiền nộp trước" />
              </div>
              <div>
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Ghi chú chuyển khoản:</label>
                <input class="bc-input" id="r2-note" placeholder="Nhập ghi chú chuyển khoản..." />
              </div>
              <button class="bc-btn" id="r2-submit-request-btn">Gửi yêu cầu xác nhận chuyển tiền</button>
              <div id="r2-submit-msg" style="font-size:12px; margin-top:4px;"></div>
            </div>
          </div>
        </div>
      </div>`);
      
      const myRequests = (state.paymentRequests || []).filter(r => (canManage() || r.memberId === myMember.id) && r.month === month);
      if (myRequests.length > 0) {
        const histCard = el(`<div class="bc-card" style="margin-top:0.75rem;">
          <h4 style="font-size:14px; color:#1B4332; margin-bottom:8px;">Lịch sử yêu cầu thanh toán ${monthLabel(month)}</h4>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr style="color:#8a877d; text-align:left;">
              <th style="padding:4px;">Ngày</th>
              <th style="padding:4px;">Người gửi</th>
              <th style="padding:4px; text-align:right;">Đã nộp</th>
              <th style="padding:4px; padding-left:8px;">Người xác nhận</th>
              <th style="padding:4px; text-align:right;">Trạng thái</th>
            </tr>
          </table>
        </div>`);
        const histTable = histCard.querySelector('table');
        myRequests.slice().reverse().forEach(r => {
          const statusColors = { pending: ['#FAEEDA','#854F0B', 'Chờ duyệt'], approved: ['#EAF3DE','#27500A', 'Đã duyệt'], rejected: ['#FAECE7','#993C1D', 'Từ chối'] };
          const [bg, fg, label] = statusColors[r.status] || ['#F1EFE8','#444441', r.status];
          histTable.appendChild(el(`<tr style="border-top:1px solid #F1EFE8;">
            <td style="padding:5px 4px; color:#8a877d; white-space:nowrap;">${formatDate(r.date)}</td>
            <td style="padding:5px 4px; font-weight:500;">${escapeHtml(r.memberName)}</td>
            <td style="padding:5px 4px; text-align:right; font-weight:600;">${formatVND(r.paid)}</td>
            <td style="padding:5px 4px; padding-left:8px; color:#6b7a73;">${escapeHtml(r.approvedBy || '—')}</td>
            <td style="padding:5px 4px; text-align:right;"><span class="bc-badge" style="background:${bg}; color:${fg};">${label}</span></td>
          </tr>`));
        });
        paymentSection.appendChild(histCard);
      }
      
      wrap.appendChild(paymentSection);
      
      setTimeout(() => {
        const btnQr = document.getElementById('r2-pay-qr-btn');
        const panelQr = document.getElementById('r2-qr-panel');

        if (state.autoOpenPaymentQr && btnQr && panelQr) {
          state.autoOpenPaymentQr = false; // consume flag
          if (panelQr.style.display === 'none') {
            panelQr.style.display = 'block';
            btnQr.textContent = 'Ẩn thông tin nộp tiền';
            const r2PaidInput = document.getElementById('r2-paid');
            if (r2PaidInput) {
              r2PaidInput.value = (p.paid || 0) + Math.max(0, remaining);
            }
            const r2NoteInput = document.getElementById('r2-note');
            if (r2NoteInput) {
              r2NoteInput.value = [myMember.name, myMember.phone || '', monthLabel(month).replace(/^Th/, '')].filter(Boolean).join(' - ');
            }
            setTimeout(() => {
              panelQr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }

        if (btnQr) btnQr.onclick = () => {
          const isHidden = panelQr.style.display === 'none';
          panelQr.style.display = isHidden ? 'block' : 'none';
          btnQr.textContent = isHidden ? 'Ẩn thông tin nộp tiền' : 'Nộp tiền & Lấy mã QR';
          if (isHidden) {
            const r2PaidInput = document.getElementById('r2-paid');
            if (r2PaidInput) {
              r2PaidInput.value = (p.paid || 0) + Math.max(0, remaining);
            }
            const r2NoteInput = document.getElementById('r2-note');
            if (r2NoteInput) {
              r2NoteInput.value = [myMember.name, myMember.phone || '', monthLabel(month).replace(/^Th/, '')].filter(Boolean).join(' - ');
            }
          }
        };
        
        const submitBtn = document.getElementById('r2-submit-request-btn');
        if (submitBtn) submitBtn.onclick = async () => {
          const r2Paid = parseFloat(document.getElementById('r2-paid').value) || 0;
          const r2Prepaid = parseFloat(document.getElementById('r2-prepaid').value) || 0;
          const note = document.getElementById('r2-note').value.trim();
          const msg = document.getElementById('r2-submit-msg');
          
          if (r2Paid < (p.paid || 0)) {
            msg.style.color = '#993C1D';
            msg.textContent = `Số tiền nộp không được nhỏ hơn số tiền đã xác nhận hiện tại (${formatVND(p.paid)}).`;
            return;
          }
          if (r2Prepaid < (p.prepaid || 0)) {
            msg.style.color = '#993C1D';
            msg.textContent = `Số tiền nộp trước không được nhỏ hơn số tiền đã xác nhận hiện tại (${formatVND(p.prepaid)}).`;
            return;
          }
          
          const transferAmount = Math.max(0, (r2Paid - (p.paid || 0)) + (r2Prepaid - (p.prepaid || 0)));
          if (transferAmount === 0) {
            msg.style.color = '#993C1D';
            msg.textContent = 'Số tiền cần chuyển khoản là 0đ.';
            return;
          }
          
          msg.style.color = '#6b7a73';
          msg.textContent = 'Đang tạo mã QR thanh toán...';
          
          setTimeout(() => {
            msg.textContent = '';
            showPaymentQrDialog(transferAmount, note, async () => {
              showLoading();
              const ok = await mutatePaymentRequests(latest => {
                const list = Array.isArray(latest) ? latest : [];
                const newRequest = {
                  id: uid(),
                  memberId: myMember.id,
                  memberName: myMember.name,
                  month,
                  paid: r2Paid,
                  prepaid: r2Prepaid,
                  status: 'pending',
                  note,
                  date: today
                };
                return list.concat([newRequest]);
              });
              hideLoading();
              if (ok) {
                alert('Gửi yêu cầu xác nhận chuyển tiền thành công! Vui lòng chờ Admin duyệt.');

                // Gửi email thông báo cho Admin
                const adminEmails = state.members.filter(m => m.role === 'admin' && m.status === 'active' && m.email && normUsername(m.username) !== 'kietdmt').map(m => m.email);
                if (adminEmails.length > 0) {
                  let origin = window.location.origin + window.location.pathname;
                  if (window.location.protocol === 'file:' || origin.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('null')) {
                    origin = 'https://kietdmt.github.io/ARON-Badmintion-Club/';
                  }
                  const approveUrl = `${origin}?action=approve_payment&user=${myMember.username}&month=${month}`;
                  const rejectUrl = `${origin}?action=reject_payment&user=${myMember.username}&month=${month}`;

                  const emailSubject = `[CLB ARON] Yêu cầu duyệt đóng phí mới từ: ${myMember.name}`;
                  const emailBody = `<h3>Chào Ban quản trị CLB ARON,</h3>
                    <p>Hệ thống nhận được một yêu cầu duyệt đóng phí mới từ thành viên <strong>${myMember.name}</strong>:</p>
                    <ul>
                      <li><strong>Tháng đóng phí:</strong> ${monthLabel(month)}</li>
                      <li><strong>Số tiền thực nộp (paid):</strong> ${formatVND(r2Paid)}</li>
                      <li><strong>Số tiền nộp trước (prepaid):</strong> ${formatVND(r2Prepaid)}</li>
                      <li><strong>Ghi chú chuyển khoản:</strong> ${note || 'Không có'}</li>
                      <li><strong>Ngày gửi:</strong> ${formatDate(today)}</li>
                    </ul>
                    <p>Vui lòng nhấp vào một trong các liên kết dưới đây để phê duyệt hoặc từ chối nhanh yêu cầu đóng phí này:</p>
                    <p style="margin:20px 0; display:flex; gap:12px;">
                      <a href="${approveUrl}" style="background:#27500A; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px; margin-right:8px;">👉 Duyệt Đóng Phí</a>
                      <a href="${rejectUrl}" style="background:#993C1D; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px;">❌ Từ Chối</a>
                    </p>
                    <p style="font-size:11px; color:#8a877d;">(Sau khi nhấp liên kết, nếu bạn chưa đăng nhập bằng tài khoản Admin, hệ thống sẽ yêu cầu đăng nhập trước khi tự động xử lý).</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p><strong>Hệ thống CLB Cầu lông ARON</strong></p>`;
                  
                  adminEmails.forEach(adminEmail => {
                    sendSystemEmail(adminEmail, emailSubject, emailBody);
                  });
                }
                render();
              } else {
                alert('Có lỗi xảy ra khi gửi yêu cầu xác nhận chuyển tiền.');
              }
            });
          }, 600);
        };
      }, 0);
    }

    // --- Donate ---
    wrap.appendChild(el(`<h3 style="font-size:15px; color:#1B4332; margin:1.25rem 0 8px;">Donate công khai · ${monthLabel(month)}</h3>`));
    const monthDonations = (state.donations||[]).filter(d => d.month === month);
    if (canManage()) {
      const donateForm = el(`<div class="bc-card">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <select class="bc-select" id="don-member" style="flex:2; min-width:140px;">
            <option value="">Chọn thành viên donate...</option>
            ${state.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
          </select>
          <input class="bc-input" type="number" min="0" id="don-amount" placeholder="Số tiền donate" style="flex:1; min-width:110px;" />
          <input class="bc-input" type="date" id="don-date" value="${today}" style="flex:1; min-width:130px;" />
          <input class="bc-input" id="don-note" placeholder="Ghi chú (tuỳ chọn)" style="flex:2; min-width:130px;" />
          <button class="bc-btn" id="don-add">Thêm</button>
        </div>
      </div>`);
      wrap.appendChild(donateForm);
      setTimeout(() => {
        document.getElementById('don-add').onclick = async () => {
          const mid = document.getElementById('don-member').value;
          const amount = parseFloat(document.getElementById('don-amount').value) || 0;
          const date = document.getElementById('don-date').value || today;
          const note = document.getElementById('don-note').value.trim();
          if (!mid || !amount) return;
          const mem = state.members.find(x => x.id === mid);
          await mutateDonations(latest => latest.concat([{ id: uid(), memberId: mid, memberName: mem ? mem.name : '?', amount, date, note, month }]));
          render();
        };
      }, 0);
    }
    if (monthDonations.length === 0) {
      wrap.appendChild(el(`<div style="font-size:13px; color:#8a877d; margin-bottom:1rem;">Chưa có ai donate tháng này.</div>`));
    } else {
      const donList = el(`<div class="bc-card" style="margin-bottom:1rem;"></div>`);
      monthDonations.forEach(d => {
        const row = el(`<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-top:1px solid #F1EFE8; font-size:13px;">
          <span>🎁 <strong>${escapeHtml(d.memberName)}</strong>${d.note ? ' · ' + escapeHtml(d.note) : ''} <span style="color:#8a877d;">(${d.date||''})</span></span>
          <span style="display:flex; align-items:center; gap:8px;">
            <strong style="color:#27500A;">+${formatVND(d.amount)}</strong>
            ${canDelete() ? `<button class="bc-btn danger small" data-did="${d.id}">Xoá</button>` : ''}
          </span>
        </div>`);
        if (canDelete()) row.querySelector('button').onclick = async () => {
          if (!confirm(`Bạn có chắc chắn muốn xóa khoản donate của ${d.memberName} số tiền ${formatVND(d.amount)}?`)) return;
          await mutateDonations(latest => latest.filter(x => x.id !== d.id));
          render();
        };
        donList.appendChild(row);
      });
      wrap.appendChild(donList);
    }

    // --- Quỹ nhóm ---
    wrap.appendChild(el(`<h3 style="font-size:15px; color:#1B4332; margin:1.25rem 0 8px;">Quỹ nhóm · ${monthLabel(month)}</h3>`));
    const f = state.fund[month] || { opening: 0, expenses: [] };
    const closing = fundClosing(month);
    if (canManage()) {
      const earliest = getEarliestActiveMonth();
      const isEarliest = !earliest || month <= earliest;
      const currentOpening = closing.opening;

      const openingCard = el(`<div class="bc-card" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:13px; color:#6b7a73;">Tồn đầu tháng:</span>
        <input class="bc-input" type="number" id="fund-opening" value="${Math.round(currentOpening)}" style="width:140px; padding:5px 8px;" ${!isEarliest ? 'disabled' : ''} />
        ${isEarliest ? `
          <button class="bc-btn outline small" id="fund-carry">Lấy tồn cuối tháng trước</button>
          <button class="bc-btn small" id="fund-opening-save">Lưu</button>
        ` : `
          <span style="font-size:12px; color:#40916C; font-weight:600;">(Tự động kết chuyển từ tồn cuối tháng trước)</span>
        `}
      </div>`);
      wrap.appendChild(openingCard);
      const expForm = el(`<div class="bc-card">
        <h4 style="font-size:14px; margin-bottom:8px; color:#1B4332;">Thêm khoản chi</h4>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <select class="bc-select" id="exp-cat" style="flex:1; min-width:120px;">
            <option>Tiền sân</option><option>Tiền nước</option><option>Tiền cầu</option><option>Liên hoan</option><option>Khác</option>
          </select>
          <input class="bc-input" id="exp-label" placeholder="Ghi chú" style="flex:2; min-width:140px;" />
          <input class="bc-input" type="number" min="0" id="exp-amount" placeholder="Số tiền" style="flex:1; min-width:100px;" />
          <input class="bc-input" type="date" id="exp-date" value="${today}" style="flex:1; min-width:130px;" />
          <button class="bc-btn" id="exp-add">Thêm</button>
        </div>
      </div>`);
      wrap.appendChild(expForm);
      setTimeout(() => {
        if (isEarliest) {
          const carryBtn = document.getElementById('fund-carry');
          if (carryBtn) carryBtn.onclick = () => {
            document.getElementById('fund-opening').value = Math.round(fundClosing(prevMonthKey(month)).closing);
          };
          const saveBtn = document.getElementById('fund-opening-save');
          if (saveBtn) saveBtn.onclick = async () => {
            const val = parseFloat(document.getElementById('fund-opening').value) || 0;
            await mutateFund(latest => {
              const updated = Object.assign({}, latest);
              updated[month] = Object.assign({}, updated[month] || { expenses: [] }, { opening: val });
              return updated;
            });
            render();
          };
        }
      }, 0);
      setTimeout(() => {
        document.getElementById('exp-add').onclick = async () => {
          const category = document.getElementById('exp-cat').value;
          const label = document.getElementById('exp-label').value.trim();
          const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
          const date = document.getElementById('exp-date').value || today;
          if (!amount) return;
          await mutateFund(latest => {
            const updated = Object.assign({}, latest);
            const cur = updated[month] || { opening: 0, expenses: [] };
            updated[month] = Object.assign({}, cur, { expenses: (cur.expenses||[]).concat([{ id: uid(), category, label, amount, date }]) });
            return updated;
          });
          render();
        };
      }, 0);
    }

    // --- Sổ thu/chi ---
    const ledgerEntries = [];
    state.members.forEach(m => {
      const p = (state.payments[m.id] || {})[month] || {};
      let payDate = p.date;
      if (!payDate) {
        const approvedReq = (state.paymentRequests || []).find(r => r.memberId === m.id && r.month === month && r.status === 'approved');
        payDate = approvedReq ? approvedReq.date : (month + '-01');
      }
      
      if (p.paid) ledgerEntries.push({ date: payDate, type: 'income', label: 'Thu tiền nộp: ' + m.name, amount: p.paid });
      if (p.prepaid) {
        const label = p.prepaid > 0 ? ('Điều chỉnh tăng: ' + m.name) : ('Điều chỉnh giảm: ' + m.name);
        ledgerEntries.push({ date: payDate, type: 'income', label: label, amount: p.prepaid });
      }
    });
    monthDonations.forEach(d => ledgerEntries.push({ date: d.date||month+'-01', type: 'income', label: 'Donate: ' + d.memberName + (d.note?' ('+d.note+')':''), amount: d.amount }));
    (f.expenses||[]).forEach(e => ledgerEntries.push({ date: e.date||month+'-01', type: 'expense', label: e.category + (e.label?' · '+e.label:''), amount: e.amount }));
    ledgerEntries.sort((a,b) => a.date.localeCompare(b.date));

    if (ledgerEntries.length) {
      const ledger = el(`<div class="bc-card"><div style="font-size:13px; font-weight:500; color:#1B4332; margin-bottom:6px;">Sổ thu/chi tháng ${monthLabel(month)}</div></div>`);
      const ltbl = el(`<table style="width:100%; font-size:13px; border-collapse:collapse;"><tr style="color:#8a877d; font-size:12px;"><th style="padding:4px; text-align:left;">Ngày</th><th style="padding:4px; text-align:left;">Nội dung</th><th style="padding:4px; text-align:right;">Số tiền</th></tr></table>`);
      ledgerEntries.forEach(e => {
        const inc = e.type === 'income';
        const displayAmt = inc ? formatVND(e.amount, true) : ('-' + formatVND(e.amount));
        const color = inc ? (e.amount >= 0 ? '#222' : '#993C1D') : '#993C1D';
        
        ltbl.appendChild(el(`<tr style="border-top:1px solid #F1EFE8;">
          <td style="padding:5px 4px; color:#8a877d; white-space:nowrap;">${formatDate(e.date)}</td>
          <td style="padding:5px 4px;">${escapeHtml(e.label)}</td>
          <td style="padding:5px 4px; text-align:right; font-weight:500; color:${color};">${displayAmt}</td>
        </tr>`));
      });
      ledger.appendChild(ltbl);
      wrap.appendChild(ledger);
    }

    if ((f.expenses||[]).length) {
      const expList = el(`<div class="bc-card"><div style="font-size:13px; font-weight:500; color:#1B4332; margin-bottom:6px;">Khoản chi trong tháng</div></div>`);
      (f.expenses||[]).forEach(e => {
        const row = el(`<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-top:1px solid #F1EFE8; font-size:13px;">
          <span>${e.date?`<span style="color:#8a877d;">${formatDate(e.date)} · </span>`:''}${escapeHtml(e.category)}${e.label?' · '+escapeHtml(e.label):''}</span>
          <span style="display:flex; align-items:center; gap:8px;">
            <strong style="color:#993C1D;">-${formatVND(e.amount)}</strong>
            ${canDelete()?`<button class="bc-btn danger small" data-id="${e.id}">Xoá</button>`:''}
          </span>
        </div>`);
        if (canDelete()) row.querySelector('button').onclick = async () => {
          const expenseDesc = e.category + (e.label ? ' - ' + e.label : '');
          if (!confirm(`Bạn có chắc chắn muốn xóa khoản chi "${expenseDesc}" số tiền ${formatVND(e.amount)}?`)) return;
          await mutateFund(latest => {
            const updated = Object.assign({}, latest);
            const cur = updated[month] || { opening: 0, expenses: [] };
            updated[month] = Object.assign({}, cur, { expenses: (cur.expenses||[]).filter(x => x.id !== e.id) });
            return updated;
          });
          render();
        };
        expList.appendChild(row);
      });
      wrap.appendChild(expList);
    }

    if (role() !== 'r2') {
      wrap.appendChild(el(`<div class="bc-card" style="background:#F4F1EA; font-size:13px;">
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:baseline;">
          <span style="color:#6b7a73;">Tồn đầu: <strong style="color:#1B4332;">${formatVND(closing.opening)}</strong></span>
          <span style="color:#6b7a73;">Thu nộp: <strong style="color:#222;">${formatVND(closing.incomePaid, true)}</strong></span>
          <span style="color:#6b7a73;">Nộp trước/ĐC: <strong style="color:#222;">${formatVND(closing.incomePrepaid, true)}</strong></span>
          <span style="color:#6b7a73;">Donate: <strong style="color:#222;">${formatVND(closing.incomeDonate, true)}</strong></span>
          <span style="color:#6b7a73;">Chi: <strong style="color:#993C1D;">-${formatVND(closing.expenseTotal)}</strong></span>
          <span style="color:#6b7a73; font-size:14px;">Tồn cuối: <strong style="color:#1B4332; font-size:15px;">${formatVND(closing.closing)}</strong></span>
        </div>
      </div>`));

      const diffOk = Math.abs(closing.diff) < 1;
      wrap.appendChild(el(`<div class="bc-card" style="background:${diffOk?'#EAF3DE':'#FAECE7'}; font-size:13px; color:${diffOk?'#27500A':'#993C1D'};">
        <div style="font-weight:500; margin-bottom:6px;">📊 Đối chiếu chi phí buổi tập vs quỹ · ${monthLabel(month)}</div>
        <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:4px;">
          <span>Chi phí ghi trong quỹ: <strong>-${formatVND(closing.expenseTotal)}</strong></span>
          <span>Chi phí tính từ buổi tập: <strong>-${formatVND(closing.sessionsCostTotal)}</strong></span>
          <span>Chênh lệch: <strong>${closing.diff>=0?'+':''}${formatVND(closing.diff)}</strong></span>
        </div>
        <div>${diffOk ? '✅ Khớp — chi phí quỹ đúng với tổng buổi tập.' : '⚠️ Lệch ' + formatVND(Math.abs(closing.diff)) + ' — kiểm tra lại khoản chi trong quỹ và chi phí từng buổi tập. Lệch do liên hoan/mua đồ riêng là bình thường.'}</div>
      </div>`));
    }

    setTimeout(() => {
      document.getElementById('fund-month').onchange = (e) => { state.viewMonth = e.target.value || monthKey(); render(); };
      const toggleBtn = document.getElementById('toggle-member-fund-btn');
      if (toggleBtn) {
        toggleBtn.onclick = () => {
          state.memberFundCollapsed = !state.memberFundCollapsed;
          render();
        };
      }

      const remindAllBtn = document.getElementById('remind-all-debt-btn');
      if (remindAllBtn) {
        remindAllBtn.onclick = async () => {
          if (!isAdmin()) return;
          const prevDebts = computeAllMembersPreviousDebt(month);
          const debtors = rowsMembers.filter(m => {
            const s = summary[m.id] || { count: 0, owed: 0 };
            const p = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };
            const prevDebt = prevDebts[m.id] || 0;
            const remaining = prevDebt + s.owed - (p.paid||0) - (p.prepaid||0);
            return remaining > 0 && m.email;
          });

          if (debtors.length === 0) {
            showToast('Không có thành viên nào cần nhắc nợ hoặc thiếu email.', 'warning');
            return;
          }

          if (!confirm(`Bạn có chắc chắn muốn gửi email nhắc nợ tự động song song cho tất cả ${debtors.length} thành viên còn nợ trong tháng ${monthLabel(month)} này không?`)) {
            return;
          }

          remindAllBtn.disabled = true;
          remindAllBtn.textContent = 'Đang gửi...';

          let origin = window.location.origin + window.location.pathname;
          if (window.location.protocol === 'file:' || origin.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('null')) {
            origin = 'https://kietdmt.github.io/ARON-Badmintion-Club/';
          }

          showToast(`Bắt đầu gửi email nhắc nợ song song cho ${debtors.length} thành viên...`, 'warning');

          const promises = debtors.map(async (m) => {
            const s = summary[m.id] || { count: 0, owed: 0 };
            const p = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };
            const prevDebt = prevDebts[m.id] || 0;
            const remaining = prevDebt + s.owed - (p.paid||0) - (p.prepaid||0);
            const payUrl = `${origin}?action=pay&month=${month}&user=${m.username}`;
            
            const emailSubject = `[CLB ARON] Thông báo hoàn thành phí chơi cầu - Tháng ${monthLabel(month)}`;
            const emailBody = `<h3>Chào ${m.name},</h3>
              <p>Ban quản trị CLB ARON gửi thông báo nhắc nhở về khoản phí chơi cầu chưa hoàn thành của bạn trong tháng <strong>${monthLabel(month)}</strong>:</p>
              <table style="border-collapse:collapse; font-size:13px; width:100%; max-width:400px; margin-bottom:15px;">
                <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Số buổi tham gia:</td><td style="padding:6px 0; font-weight:600; text-align:right;">${s.count} buổi</td></tr>
                ${prevDebt > 0 ? `<tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Nợ kỳ trước:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#993C1D;">${formatVND(prevDebt)}</td></tr>` : ''}
                <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Tổng phí phải trả:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#993C1D;">${formatVND(s.owed)}</td></tr>
                <tr style="border-bottom:1px solid #E3E0D6;"><td style="padding:6px 0; color:#8a877d;">Đã nộp + Điều chỉnh:</td><td style="padding:6px 0; font-weight:600; text-align:right; color:#27500A;">${formatVND((p.paid||0) + (p.prepaid||0))}</td></tr>
                <tr style="border-bottom:1px solid #E3E0D6; font-size:14px;"><td style="padding:6px 0; font-weight:700; color:#1B4332;">Còn lại cần đóng:</td><td style="padding:6px 0; font-weight:700; text-align:right; color:#993C1D;">${formatVND(remaining)}</td></tr>
              </table>
              <p>Bạn vui lòng thanh toán khoản phí còn lại bằng cách bấm vào liên kết dưới đây để mở giao diện nộp tiền qua mã QR tự động của câu lạc bộ:</p>
              <p style="margin:20px 0;">
                <a href="${payUrl}" style="background:#27500A; color:#FFFFFF; text-decoration:none; padding:10px 20px; font-weight:600; border-radius:8px; display:inline-block; font-size:14px;">👉 Nộp Tiền Qua QR Ngay</a>
              </p>
              <p style="font-size:11px; color:#8a877d;">(Sau khi chuyển khoản thành công, vui lòng nhập số tiền đã đóng trên giao diện để gửi yêu cầu phê duyệt cho Thủ quỹ).</p>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;

            const singleBtn = document.getElementById(`remind-mail-${m.id}-${month}`);
            if (singleBtn) {
              singleBtn.disabled = true;
              singleBtn.textContent = 'Đang gửi...';
            }

            try {
              const sent = await sendSystemEmail(m.email, emailSubject, emailBody);
              if (singleBtn) {
                singleBtn.disabled = false;
                if (sent) {
                  singleBtn.textContent = 'Đã nhắc';
                  singleBtn.style.borderColor = '#27500A';
                  singleBtn.style.color = '#27500A';
                } else {
                  singleBtn.textContent = 'Lỗi gửi';
                }
              }
              return sent;
            } catch (ex) {
              if (singleBtn) {
                singleBtn.disabled = false;
                singleBtn.textContent = 'Lỗi gửi';
              }
              return false;
            }
          });

          const results = await Promise.all(promises);
          const successCount = results.filter(Boolean).length;
          
          remindAllBtn.disabled = false;
          remindAllBtn.textContent = '📢 Nhắc nợ tất cả';
          showToast(`Đã gửi thành công email nhắc nợ cho ${successCount}/${debtors.length} thành viên!`);
        };
      }
    }, 0);
    return wrap;
  }

  // ---------- BÁO CÁO THÁNG ----------
  function exportReportToExcel(month, reportData, totalLocked, totalOwed, totalPaid, totalPrepaid, totalRemaining, totalPrevDebt = 0) {
    let csvContent = "\uFEFF"; // UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
    
    csvContent += `BÁO CÁO CHI TIẾT CHUYÊN CẦN & CÔNG NỢ - THÁNG ${month}\n`;
    csvContent += `Số buổi đã chốt,${totalLocked} buổi\n`;
    csvContent += `Công nợ tồn kỳ trước,${totalPrevDebt}\n`;
    csvContent += `Phải thu tháng,${totalOwed}\n`;
    csvContent += `Đã thu (gồm nộp trước),${totalPaid + totalPrepaid}\n`;
    csvContent += `Công nợ còn lại,${totalRemaining}\n\n`;
    
    csvContent += "Thành viên,Loại,Tham gia (buổi),Vắng (buổi),Cảnh báo chuyên cần,Nợ kỳ trước (đ),Phải trả (đ),Đã nộp (đ),Điều chỉnh (đ),Còn lại (đ)\n";
    
    reportData.forEach(row => {
      const name = `"${row.member.name.replace(/"/g, '""')}"`;
      const type = row.type === 'fixed' ? "Cố định" : "Vãng lai";
      const played = row.playedCount;
      const absent = row.type === 'fixed' ? row.absentCount : "-";
      const warning = row.showWarning ? "Vắng >= 75%" : "";
      
      csvContent += `${name},${type},${played},${absent},${warning},${row.prevDebt || 0},${row.owed},${row.paid},${row.prepaid},${row.remaining}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_hoi_cau_long_${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function computeAllMembersPreviousDebt(currentMonth) {
    const prevDebts = {};
    state.members.forEach(m => prevDebts[m.id] = 0);
    
    const rx = /^\d{4}-\d{2}$/;
    if (!rx.test(currentMonth)) return prevDebts;
    
    const months = new Set();
    Object.keys(state.payments || {}).forEach(mId => {
      Object.keys(state.payments[mId] || {}).forEach(m => {
        if (rx.test(m) && m < currentMonth) months.add(m);
      });
    });
    state.sessions.forEach(s => {
      const m = sessionMonthKey(s);
      if (rx.test(m) && m < currentMonth) months.add(m);
    });
    
    Array.from(months).forEach(m => {
       const summary = computeMemberMonthSummary(m);
       state.members.forEach(mem => {
          const sObj = summary[mem.id] || { owed: 0 };
          const pObj = (state.payments[mem.id] || {})[m] || { paid: 0, prepaid: 0 };
          prevDebts[mem.id] += (sObj.owed - pObj.paid - pObj.prepaid);
       });
    });
    
    return prevDebts;
  }

  function renderReport(){
    const wrap = el(`<div></div>`);
    const month = state.viewMonth;

    state.reportSearch = state.reportSearch || '';
    state.reportTypeFilter = state.reportTypeFilter || 'all';

    // 1. Bộ chọn tháng báo cáo & Nút xuất file Excel
    const headerRow = el(`<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:0.75rem; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:13px; color:#8a877d;">Tháng báo cáo:</span>
        <input class="bc-input" type="month" id="report-month" value="${month}" style="width:140px; padding:5px 8px;" />
      </div>
      <button class="bc-btn" id="export-excel-btn" style="background:#2D6A4F; color:#FFF; font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; border:none; box-shadow:0 2px 4px rgba(45,106,79,0.2);">
        📥 Xuất Excel
      </button>
    </div>`);
    wrap.appendChild(headerRow);

    // 2. Hàng bộ lọc: Tìm kiếm theo tên & Lọc theo loại thành viên
    const filterRow = el(`<div style="display:flex; gap:12px; margin-bottom:1rem; flex-wrap:wrap; background:#F4F1EA; padding:8px 12px; border-radius:8px; align-items:center;">
      <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
        <span style="font-size:13px; color:#6b7a73; white-space:nowrap; font-weight:500;">Tìm kiếm:</span>
        <input class="bc-input" id="report-search" placeholder="Nhập tên thành viên..." value="${escapeHtml(state.reportSearch)}" style="padding:4px 8px; font-size:13px; width:100%;" />
      </div>
      <div style="display:flex; align-items:center; gap:6px; min-width:160px;">
        <span style="font-size:13px; color:#6b7a73; white-space:nowrap; font-weight:500;">Phân loại:</span>
        <select class="bc-select" id="report-type-filter" style="padding:4px 8px; font-size:13px; width:130px;">
          <option value="all" ${state.reportTypeFilter === 'all' ? 'selected' : ''}>Tất cả</option>
          <option value="fixed" ${state.reportTypeFilter === 'fixed' ? 'selected' : ''}>Cố định</option>
          <option value="casual" ${state.reportTypeFilter === 'casual' ? 'selected' : ''}>Vãng lai</option>
          <option value="unpaid" ${state.reportTypeFilter === 'unpaid' ? 'selected' : ''}>Chưa nộp tiền</option>
        </select>
      </div>
    </div>`);
    wrap.appendChild(filterRow);

    // Lọc các buổi tập đã chốt của tháng
    const lockedSessions = state.sessions.filter(s => sessionMonthKey(s) === month && s.locked);
    const totalLocked = lockedSessions.length;

    // Thành viên hoạt động trong tháng này (Nếu là R2, chỉ lấy chính mình)
    const activeMembers = state.members.filter(m => {
      const t = (m.monthlyType || {})[month];
      const isSelf = state.me && state.me.id === m.id;
      if (role() === 'r2') {
        return isSelf && (t === 'fixed' || t === 'casual');
      }
      return t === 'fixed' || t === 'casual';
    });

    const summary = computeMemberMonthSummary(month);
    const prevDebts = computeAllMembersPreviousDebt(month);

    // Chuẩn bị dữ liệu tổng hợp ban đầu
    const allReportData = activeMembers.map(m => {
      const type = (m.monthlyType || {})[month] || '';
      const s = summary[m.id] || { count: 0, owed: 0 };
      const p = (state.payments[m.id] || {})[month] || { paid: 0, prepaid: 0 };

      // Tính số buổi tham gia thực tế từ các buổi đã chốt
      let playedCount = 0;
      lockedSessions.forEach(session => {
        const passes = session.passes || {};
        const v = session.votes[m.name];
        const hasPassed = type === 'fixed' && passes[m.id];
        const isReceiver = Object.values(passes).includes(m.id);

        if (type === 'fixed') {
          if (v === 'yes' && !hasPassed) {
            playedCount++;
          }
        } else if (type === 'casual') {
          if (v === 'yes' || isReceiver) {
            playedCount++;
          }
        }
      });

      // Tính số buổi vắng (chỉ áp dụng với cố định)
      let absentCount = 0;
      let absentRate = 0;
      let showWarning = false;
      if (type === 'fixed') {
        absentCount = totalLocked - playedCount;
        if (totalLocked > 0) {
          absentRate = absentCount / totalLocked;
          if (absentRate >= 0.75) {
            showWarning = true;
          }
        }
      }

      const prevDebt = prevDebts[m.id] || 0;
      const owed = s.owed;
      const paid = p.paid || 0;
      const prepaid = p.prepaid || 0;
      const remaining = prevDebt + owed - paid - prepaid;

      return {
        member: m,
        type,
        playedCount,
        absentCount,
        absentRate,
        showWarning,
        prevDebt,
        owed,
        paid,
        prepaid,
        remaining
      };
    });

    // Tính toán tổng số lượng tài chính dựa trên dữ liệu lọc hiện tại để hiển thị ban đầu
    let totalPrevDebt = 0;
    let totalOwed = 0;
    let totalPaid = 0;
    let totalPrepaid = 0;
    let totalRemaining = 0;
    let initialVisibleCount = 0;
    allReportData.forEach(row => {
      const matchSearch = row.member.name.toLowerCase().includes(state.reportSearch.toLowerCase());
      const matchType = state.reportTypeFilter === 'all' || 
                        (state.reportTypeFilter === 'unpaid' ? row.remaining > 0 : row.type === state.reportTypeFilter);
      if (matchSearch && matchType) {
        totalPrevDebt += row.prevDebt;
        totalOwed += row.owed;
        totalPaid += row.paid;
        totalPrepaid += row.prepaid;
        totalRemaining += row.remaining;
        initialVisibleCount++;
      }
    });

    // Thẻ tổng hợp nhanh (chỉ số động theo kết quả lọc)
    const summaryCards = el(`<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:1.25rem;">
      <div class="bc-card" style="padding:12px 16px; display:flex; flex-direction:column; gap:4px; margin:0;">
        <span style="font-size:11px; color:#6b7a73; font-weight:600; text-transform:uppercase;">${role() === 'r2' ? '📅 Số buổi tham gia' : '📅 Số buổi đã chốt'}</span>
        <strong id="report-sessions-sum" style="font-size:18px; color:#1B4332; font-family:'Outfit', sans-serif;">${role() === 'r2' ? (allReportData[0] ? allReportData[0].playedCount : 0) : totalLocked} buổi</strong>
      </div>
      <div class="bc-card" style="padding:12px 16px; display:flex; flex-direction:column; gap:4px; margin:0;">
        <span style="font-size:11px; color:#6b7a73; font-weight:600; text-transform:uppercase;">${role() === 'r2' ? '💰 Tiền cần đóng' : '💰 Phải thu lọc'}</span>
        <strong id="report-owed-sum" style="font-size:18px; color:#1B4332; font-family:'Outfit', sans-serif;">${formatVND(totalOwed)}</strong>
      </div>
      <div class="bc-card" style="padding:12px 16px; display:flex; flex-direction:column; gap:4px; margin:0;">
        <span style="font-size:11px; color:#6b7a73; font-weight:600; text-transform:uppercase;">${role() === 'r2' ? '💵 Đã đóng' : '💵 Đã thu lọc'}</span>
        <strong id="report-paid-sum" style="font-size:18px; color:#27500A; font-family:'Outfit', sans-serif;">${formatVND(totalPaid + totalPrepaid)}</strong>
      </div>
      <div class="bc-card" style="padding:12px 16px; display:flex; flex-direction:column; gap:4px; margin:0;">
        <span style="font-size:11px; color:#6b7a73; font-weight:600; text-transform:uppercase;">${role() === 'r2' ? '⚠️ Còn lại' : '⚠️ Công nợ lọc'}</span>
        <strong id="report-remaining-sum" style="font-size:18px; color:${totalRemaining > 0 ? '#993C1D' : '#1B4332'}; font-family:'Outfit', sans-serif;">${formatVND(totalRemaining)}</strong>
      </div>
    </div>`);
    wrap.appendChild(summaryCards);

    // Bảng chi tiết kết quả lọc
    wrap.appendChild(el(`<h3 style="font-size:15px; color:#1B4332; margin-bottom:8px;">Bảng tổng hợp chi tiết chuyên cần & công nợ · ${monthLabel(month)}</h3>`));
    
    let tblDiv;
    if (allReportData.length === 0) {
      tblDiv = el(`<div class="bc-empty">Không có dữ liệu thành viên hoạt động trong tháng này.</div>`);
      wrap.appendChild(tblDiv);
    } else {
      tblDiv = el(`<div class="bc-card" style="overflow-x:auto; margin:0; padding:10px;"><table id="report-table-el" style="width:100%; font-size:13px; border-collapse:collapse; min-width:850px;">
        <tr style="color:#8a877d; text-align:left; border-bottom:1px solid #E3E0D6;">
          <th style="padding:8px 6px;">Thành viên</th>
          <th style="padding:8px 6px;">Loại</th>
          <th style="padding:8px 6px; text-align:center;">Tham gia</th>
          <th style="padding:8px 6px; text-align:center;">Vắng (cố định)</th>
          <th style="padding:8px 6px; text-align:right;">Nợ kỳ trước</th>
          <th style="padding:8px 6px; text-align:right;">Phải trả</th>
          <th style="padding:8px 6px; text-align:right;">Đã nộp</th>
          <th style="padding:8px 6px; text-align:right;">Điều chỉnh</th>
          <th style="padding:8px 6px; text-align:right;">Còn lại</th>
        </tr>
      </table></div>`);
      const table = tblDiv.querySelector('table');

      allReportData.forEach(row => {
        const matchSearch = row.member.name.toLowerCase().includes(state.reportSearch.toLowerCase());
        const matchType = state.reportTypeFilter === 'all' || 
                          (state.reportTypeFilter === 'unpaid' ? row.remaining > 0 : row.type === state.reportTypeFilter);
        const displayStyle = (matchSearch && matchType) ? '' : 'display: none;';

        let warningHtml = '';
        let rowStyle = '';
        if (row.showWarning) {
          warningHtml = `<span class="bc-badge" style="background:#FAECE7; color:#993C1D; font-size:10px; margin-left:4px; border:1px solid rgba(153,60,29,0.3); font-weight:600;">⚠️ Vắng ≥75%</span>`;
          rowStyle = 'background: rgba(242,100,25,0.03);'; 
        }

        const tr = el(`<tr class="report-row" style="border-top:1px solid #F1EFE8; ${rowStyle} ${displayStyle}"
          data-name="${escapeHtml(row.member.name.toLowerCase())}"
          data-type="${row.type}"
          data-prevdebt="${row.prevDebt}"
          data-owed="${row.owed}"
          data-paid="${row.paid}"
          data-prepaid="${row.prepaid}"
          data-remaining="${row.remaining}"
          data-played="${row.playedCount}">
          <td style="padding:8px 6px; font-weight:500;">
            ${escapeHtml(row.member.name)}
          </td>
          <td style="padding:8px 6px;">
            <span class="bc-badge" style="background:${row.type==='fixed'?'#E6F1FB':'#FFF2E6'}; color:${row.type==='fixed'?'#0C447C':'#B25E00'}; font-size:11px; font-weight:600;">
              ${row.type==='fixed'?'Cố định':'Vãng lai'}
            </span>
          </td>
          <td style="padding:8px 6px; text-align:center; font-weight:500;">${row.playedCount} buổi</td>
          <td style="padding:8px 6px; text-align:center;">
            ${row.type==='fixed' ? `<span style="font-weight:500;">${row.absentCount} buổi${warningHtml}</span>` : '<span style="color:#8a877d; font-style:italic;">-</span>'}
          </td>
          <td style="padding:8px 6px; text-align:right; color:#8a877d;">${row.prevDebt ? formatVND(row.prevDebt) : '0đ'}</td>
          <td style="padding:8px 6px; text-align:right;">${formatVND(row.owed)}</td>
          <td style="padding:8px 6px; text-align:right; color:#27500A; font-weight:500;">${formatVND(row.paid)}</td>
          <td style="padding:8px 6px; text-align:right; color:#8a877d;">${row.prepaid ? formatVND(row.prepaid, true) : '0đ'}</td>
          <td style="padding:8px 6px; text-align:right; font-weight:600; color:${row.remaining>0?'#993C1D':'#27500A'};">${formatVND(row.remaining)}</td>
        </tr>`);
        table.appendChild(tr);
      });
      wrap.appendChild(tblDiv);
    }

    // Phần tử thông báo trống
    const emptyEl = el(`<div id="report-empty-msg" class="bc-empty" style="display: ${initialVisibleCount === 0 ? '' : 'none'};">Không tìm thấy thành viên phù hợp với bộ lọc hiện tại.</div>`);
    wrap.appendChild(emptyEl);

    setTimeout(() => {
      // 1. Đổi tháng
      const mInput = document.getElementById('report-month');
      if (mInput) mInput.onchange = (e) => {
        state.viewMonth = e.target.value || monthKey();
        render();
      };

      // 2. Hàm lọc động trực tiếp trong DOM (Không re-render, bảo toàn gõ tiếng Việt)
      const applyFiltersDOM = () => {
        const searchInput = document.getElementById('report-search');
        const typeFilter = document.getElementById('report-type-filter');
        if (!searchInput || !typeFilter) return;

        const query = searchInput.value.trim().toLowerCase();
        const typeSel = typeFilter.value;

        // Lưu vào state
        state.reportSearch = searchInput.value;
        state.reportTypeFilter = typeSel;

        let filteredPrevDebt = 0;
        let filteredOwed = 0;
        let filteredPaid = 0;
        let filteredPrepaid = 0;
        let filteredRemaining = 0;
        let filteredSessions = 0;
        let visibleCount = 0;

        const rows = wrap.querySelectorAll('.report-row');
        rows.forEach(tr => {
          const name = tr.getAttribute('data-name');
          const type = tr.getAttribute('data-type');
          const prevDebt = parseFloat(tr.getAttribute('data-prevdebt')) || 0;
          const owed = parseFloat(tr.getAttribute('data-owed')) || 0;
          const paid = parseFloat(tr.getAttribute('data-paid')) || 0;
          const prepaid = parseFloat(tr.getAttribute('data-prepaid')) || 0;
          const remaining = parseFloat(tr.getAttribute('data-remaining')) || 0;
          const played = parseFloat(tr.getAttribute('data-played')) || 0;

          const matchSearch = name.includes(query);
          const matchType = typeSel === 'all' || 
                            (typeSel === 'unpaid' ? remaining > 0 : type === typeSel);

          if (matchSearch && matchType) {
            tr.style.display = '';
            filteredPrevDebt += prevDebt;
            filteredOwed += owed;
            filteredPaid += paid;
            filteredPrepaid += prepaid;
            filteredRemaining += remaining;
            filteredSessions += played;
            visibleCount++;
          } else {
            tr.style.display = 'none';
          }
        });

        // Cập nhật thẻ chỉ số nhanh
        const sessionsSumEl = document.getElementById('report-sessions-sum');
        const owedSumEl = document.getElementById('report-owed-sum');
        const paidSumEl = document.getElementById('report-paid-sum');
        const remainingSumEl = document.getElementById('report-remaining-sum');
        
        if (sessionsSumEl) {
          if (role() === 'r2') {
            sessionsSumEl.textContent = `${filteredSessions} buổi`;
          } else {
            sessionsSumEl.textContent = `${totalLocked} buổi`;
          }
        }
        if (owedSumEl) owedSumEl.textContent = formatVND(filteredOwed);
        if (paidSumEl) paidSumEl.textContent = formatVND(filteredPaid + filteredPrepaid);
        if (remainingSumEl) {
          remainingSumEl.textContent = formatVND(filteredRemaining);
          remainingSumEl.style.color = filteredRemaining > 0 ? '#993C1D' : '#1B4332';
        }

        // Hiện/Ẩn thông báo rỗng
        const emptyMsg = document.getElementById('report-empty-msg');
        if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? '' : 'none';
      };

      // Gắn sự kiện lắng nghe bộ lọc
      const searchInput = document.getElementById('report-search');
      if (searchInput) searchInput.oninput = applyFiltersDOM;

      const typeFilter = document.getElementById('report-type-filter');
      if (typeFilter) typeFilter.onchange = applyFiltersDOM;

      // 4. Nút xuất Excel (re-calculate danh sách thực tế theo DOM khi click)
      const exportBtn = document.getElementById('export-excel-btn');
      if (exportBtn) exportBtn.onclick = () => {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const typeSel = typeFilter ? typeFilter.value : 'all';

        const currentFilteredData = allReportData.filter(row => {
          const matchSearch = row.member.name.toLowerCase().includes(query);
          const matchType = typeSel === 'all' || 
                            (typeSel === 'unpaid' ? row.remaining > 0 : row.type === typeSel);
          return matchSearch && matchType;
        });

        let csvPrevDebt = 0, csvOwed = 0, csvPaid = 0, csvPrepaid = 0, csvRemaining = 0;
        currentFilteredData.forEach(r => {
          csvPrevDebt += r.prevDebt;
          csvOwed += r.owed;
          csvPaid += r.paid;
          csvPrepaid += r.prepaid;
          csvRemaining += r.remaining;
        });

        exportReportToExcel(month, currentFilteredData, totalLocked, csvOwed, csvPaid + csvPrepaid, 0, csvRemaining, csvPrevDebt);
      };
    }, 0);

    return wrap;
  }


  // ---------- PAYMENTS MANAGER (ADMIN/R1 ONLY) ----------
  function renderPaymentsMgr(){
    const wrap = el(`<div></div>`);
    if (!canManage()) {
      wrap.appendChild(el(`<div class="bc-card" style="background:#FAECE7; color:#993C1D; font-size:13px; text-align:center;">Bạn không có quyền truy cập tab này.</div>`));
      return wrap;
    }

    const payment = state.settings.payment || {};
    const receiveType = payment.receiveType || 'bank';
    const bankId = payment.bankId || '';
    const accountNo = payment.accountNo || '';
    const accountName = payment.accountName || '';
    const qrUrl = payment.qrUrl || '';
    const treasurerPhone = payment.treasurerPhone || '';
    
    // 1. Phê duyệt trước
    const pendingReqs = (state.paymentRequests || []).filter(r => r.status === 'pending');
    if (pendingReqs.length > 0) {
      const approvalSection = el(`<div class="bc-card" style="margin-bottom: 1rem; border:1px solid #854F0B;">
        <h3 style="font-size:15px; color:#854F0B; margin-bottom:8px;">🔔 Yêu cầu thanh toán chờ duyệt (${pendingReqs.length})</h3>
        <div style="display:flex; flex-direction:column; gap:8px;"></div>
      </div>`);
      const reqListContainer = approvalSection.querySelector('div');
      
      pendingReqs.forEach(r => {
        const reqEl = el(`<div style="border-top:1px solid #F1EFE8; padding-top:8px; margin-top:4px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <strong>${escapeHtml(r.memberName)}</strong> nộp tiền tháng <strong>${monthLabel(r.month)}</strong>
              <div style="font-size:12px; color:#6b7a73; margin-top:2px;">
                Đã chuyển: <strong style="color:#27500A;">${formatVND(r.paid)}</strong> · 
                Nộp trước: <strong style="color:#27500A;">${formatVND(r.prepaid)}</strong>
              </div>
              ${r.note ? `<div style="font-size:12px; color:#8a877d; font-style:italic;">Ghi chú: ${escapeHtml(r.note)}</div>` : ''}
              <div style="font-size:11px; color:#8a877d;">Ngày gửi: ${formatDate(r.date)}</div>
            </div>
            <div style="display:flex; gap:6px;">
              ${isAdmin() 
                ? `<button class="bc-btn small" style="background:#27500A; border-color:#27500A;" id="approve-req-${r.id}">Duyệt</button>
                   <button class="bc-btn danger small" id="reject-req-${r.id}">Từ chối</button>`
                : `<button class="bc-btn small" disabled style="background:#8a877d; border-color:#8a877d; cursor:not-allowed; opacity:0.6;">Duyệt</button>
                   <button class="bc-btn danger small" disabled style="background:#8a877d; border-color:#8a877d; cursor:not-allowed; opacity:0.6;">Từ chối</button>`
              }
            </div>
          </div>
        </div>`);
        
        reqListContainer.appendChild(reqEl);
        
        setTimeout(() => {
          if (isAdmin()) {
            document.getElementById(`approve-req-${r.id}`).onclick = async () => {
              const reqOk = await mutatePaymentRequests(latest => {
                const list = Array.isArray(latest) ? latest : [];
                return list.map(x => x.id === r.id ? Object.assign({}, x, { status: 'approved', approvedBy: state.me ? state.me.name : 'Admin' }) : x);
              });
              if (!reqOk) { alert('Lỗi duyệt yêu cầu.'); return; }
              
              await mutatePayments(latest => {
                const updated = Object.assign({}, latest);
                updated[r.memberId] = Object.assign({}, updated[r.memberId] || {});
                updated[r.memberId][r.month] = { paid: r.paid + r.prepaid, prepaid: 0, date: r.date };
                return updated;
              });
              
              const memberObj = state.members.find(m => m.id === r.memberId);
              if (memberObj && memberObj.email) {
                const emailSubject = `[CLB ARON] Yêu cầu đóng phí của bạn đã được duyệt`;
                const emailBody = `<h3>Chào ${memberObj.name},</h3>
                  <p>Yêu cầu đóng phí tháng <strong>${monthLabel(r.month)}</strong> của bạn đã được Ban quản trị phê duyệt thành công.</p>
                  <ul>
                    <li><strong>Số tiền:</strong> ${formatVND(r.paid + r.prepaid)}</li>
                    <li><strong>Người duyệt:</strong> ${state.me ? state.me.name : 'Admin'}</li>
                    <li><strong>Ngày duyệt:</strong> ${new Date().toLocaleDateString('vi-VN')}</li>
                  </ul>
                  <p>Cảm ơn bạn đã hoàn thành nghĩa vụ đóng phí của mình!</p>
                  <br/>
                  <p>Trân trọng,</p>
                  <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
                sendSystemEmail(memberObj.email, emailSubject, emailBody);
              }

              if (memberObj && memberObj.phone) {
                if (confirm(`Đã duyệt yêu cầu thành công! Bạn có muốn mở Zalo để gửi thông báo xác nhận cho thành viên ${memberObj.name} không?`)) {
                  const notifyText = `Chào ${memberObj.name}, yêu cầu nộp phí tháng ${monthLabel(r.month)} của bạn đã được duyệt thành công. Cảm ơn bạn!`;
                  navigator.clipboard.writeText(notifyText).then(() => {
                    alert('Đã sao chép nội dung thông báo duyệt vào Clipboard. Hệ thống sẽ tự động mở chat Zalo với thành viên.');
                    window.open(`https://zalo.me/${memberObj.phone.trim().replace(/\s+/g, '')}`, '_blank');
                  }).catch(() => {
                    window.open(`https://zalo.me/${memberObj.phone.trim().replace(/\s+/g, '')}`, '_blank');
                  });
                }
              }
              
              render();
            };
            
            document.getElementById(`reject-req-${r.id}`).onclick = async () => {
              if (!confirm(`Từ chối yêu cầu chuyển khoản của ${r.memberName}?`)) return;
            const reqOk = await mutatePaymentRequests(latest => {
              const list = Array.isArray(latest) ? latest : [];
              return list.map(x => x.id === r.id ? Object.assign({}, x, { status: 'rejected', approvedBy: state.me ? state.me.name : 'Admin' }) : x);
            });
            if (!reqOk) { alert('Lỗi từ chối yêu cầu.'); return; }

            const memberObj = state.members.find(m => m.id === r.memberId);
            if (memberObj && memberObj.email) {
              const emailSubject = `[CLB ARON] Yêu cầu đóng phí bị từ chối`;
              const emailBody = `<h3>Chào ${memberObj.name},</h3>
                <p>Yêu cầu xác nhận đóng phí tháng <strong>${monthLabel(r.month)}</strong> của bạn chưa được phê duyệt.</p>
                <p><strong>Lý do:</strong> Thông tin chuyển khoản chưa khớp hoặc chưa nhận được tiền thực tế.</p>
                <p>Bạn vui lòng kiểm tra lại thông tin giao dịch hoặc liên hệ với Ban quản trị/Thủ quỹ để được hỗ trợ.</p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
              sendSystemEmail(memberObj.email, emailSubject, emailBody);
            }

            if (memberObj && memberObj.phone) {
              if (confirm(`Đã từ chối yêu cầu. Bạn có muốn mở Zalo để thông báo cho thành viên ${memberObj.name} kiểm tra lại không?`)) {
                const notifyText = `Chào ${memberObj.name}, yêu cầu nộp phí tháng ${monthLabel(r.month)} của bạn chưa được duyệt (thông tin chuyển khoản chưa khớp). Bạn vui lòng kiểm tra lại hoặc liên hệ Thủ quỹ nhé!`;
                navigator.clipboard.writeText(notifyText).then(() => {
                  alert('Đã sao chép nội dung thông báo từ chối vào Clipboard. Hệ thống sẽ tự động mở chat Zalo với thành viên.');
                  window.open(`https://zalo.me/${memberObj.phone.trim().replace(/\s+/g, '')}`, '_blank');
                }).catch(() => {
                  window.open(`https://zalo.me/${memberObj.phone.trim().replace(/\s+/g, '')}`, '_blank');
                });
              }
            }
            render();
          };
        }
      }, 0);
    });
      
      wrap.appendChild(approvalSection);
    } else {
      wrap.appendChild(el(`<div class="bc-card" style="margin-bottom: 1rem; color:#6b7a73; font-size:13px; text-align:center;">✨ Không có yêu cầu thanh toán nào chờ duyệt.</div>`));
    }

    // 2. Cấu hình tài khoản nhận tiền
    const isAdm = isAdmin();
    const configSection = el(`<div class="bc-card">
      <h3 style="font-size:15px; color:#1B4332; margin-bottom:8px;">Cấu hình tài khoản nhận tiền (VietQR / MoMo)</h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div>
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Loại tài khoản nhận tiền:</label>
          <select class="bc-select" id="cfg-receive-type" style="width:100%;" ${isAdm ? '' : 'disabled'}>
            <option value="bank" ${receiveType==='bank'?'selected':''}>Tài khoản ngân hàng (VietQR)</option>
            <option value="momo" ${receiveType==='momo'?'selected':''}>Ví điện tử MoMo</option>
          </select>
        </div>
        <div id="cfg-bank-id-container">
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Mã ngân hàng (VietQR - ví dụ: VCB, MB, TCB, ACB,...):</label>
          <input class="bc-input" id="cfg-bank-id" value="${escapeHtml(bankId)}" placeholder="Nhập mã ngân hàng (ví dụ: VCB)" ${isAdm ? '' : 'disabled'} />
        </div>
        <div>
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;" id="cfg-account-no-label">Số tài khoản ngân hàng:</label>
          <input class="bc-input" id="cfg-account-no" value="${escapeHtml(accountNo)}" placeholder="Nhập số tài khoản hoặc SĐT MoMo" ${isAdm ? '' : 'disabled'} />
        </div>
        <div>
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Họ và tên chủ tài khoản (không dấu):</label>
          <input class="bc-input" id="cfg-account-name" value="${escapeHtml(accountName)}" placeholder="Nhập tên chủ tài khoản" ${isAdm ? '' : 'disabled'} />
        </div>
        <div>
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Số điện thoại người quản lý quỹ (mở chat Zalo báo nộp tiền):</label>
          <input class="bc-input" id="cfg-treasurer-phone" value="${escapeHtml(treasurerPhone)}" placeholder="Ví dụ: 0912345678" ${isAdm ? '' : 'disabled'} />
        </div>
        <div style="border-top:1px dashed #E3E0D6; padding-top:8px; margin-top:4px;">
          <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Hoặc tải lên ảnh QR tĩnh (nếu không tạo VietQR động):</label>
          ${qrUrl ? `<img src="${qrUrl}" style="max-width:140px; border-radius:8px; display:block; margin-bottom:6px;" />` : ''}
          <input type="file" accept="image/*" id="cfg-qr-file" style="font-size:12px;" ${isAdm ? '' : 'disabled'} />
        </div>
        ${isAdm 
          ? `<button class="bc-btn small" id="cfg-save-btn" style="align-self:flex-start; margin-top:4px;">Lưu cấu hình nhận tiền</button>` 
          : `<div style="font-size:12px; color:#854F0B; font-weight:600; margin-top:6px;">🔒 Chỉ Admin và Owner mới được quyền thay đổi cấu hình tài khoản nhận tiền.</div>`
        }
        <span id="cfg-save-msg" style="font-size:12px; margin-top:2px;"></span>
      </div>
    </div>`);
    
    wrap.appendChild(configSection);

    // 3. Cấu hình tỉ lệ vãng lai
    const settingsCard = el(`<div class="bc-card" style="background:#F4F1EA; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:1rem;">
      <span style="font-size:13px; color:#6b7a73;">Thành viên vãng lai trả gấp</span>
      <input class="bc-input" id="cfg-ss-multiplier" type="number" step="0.1" min="1" value="${state.settings.casualMultiplier}" style="width:70px; padding:5px 8px;" />
      <span style="font-size:13px; color:#6b7a73;">lần so với cố định (áp dụng mọi buổi)</span>
    </div>`);
    wrap.appendChild(settingsCard);

    // 4. Cấu hình Logo & Banner
    const brandCard = el(`<div class="bc-card" style="margin-top:1rem;">
      <h3 style="font-size:15px; margin-bottom:10px; color:#1B4332;">Logo &amp; banner màn hình đăng nhập</h3>
      <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start;">
        <div>
          <div style="font-size:12px; color:#8a877d; margin-bottom:4px;">Logo (ảnh vuông nhỏ)</div>
          <img src="${state.settings.logoUrl || 'icon-192.jpg'}" style="width:56px; height:56px; object-fit:cover; border-radius:50%; margin-bottom:6px; display:block;" />
          <input type="file" accept="image/*" id="brand-logo-input" style="font-size:12px;" />
        </div>
        <div>
          <div style="font-size:12px; color:#8a877d; margin-bottom:4px;">Banner (ảnh ngang)</div>
          ${state.settings.bannerUrl ? `<img src="${state.settings.bannerUrl}" style="width:160px; height:50px; object-fit:cover; border-radius:8px; margin-bottom:6px; display:block;" />` : ''}
          <input type="file" accept="image/*" id="brand-banner-input" style="font-size:12px;" />
        </div>
      </div>
      <div style="font-size:12px; color:#8a877d; margin-top:8px;">Chọn ảnh nhẹ (dưới ~1MB) để tránh lưu trữ quá nặng.</div>
    </div>`);
    wrap.appendChild(brandCard);
               // 4.5 Cấu hình Mail Server (SMTP)
    if (isOwner()) {
      const mailConfig = state.settings.mailServer || { enabled: false, host: 'smtp.gmail.com', port: 465, username: '', password: '', senderEmail: '', senderName: '', useSecureToken: false, secureToken: '', useGoogleScript: true, googleScriptUrl: '' };
      if (mailConfig.useGoogleScript === undefined) mailConfig.useGoogleScript = true;
      
      let activeMode = 'gas';
      if (!mailConfig.useGoogleScript) {
        if (mailConfig.useSecureToken) activeMode = 'token';
        else activeMode = 'manual';
      }

      const mailServerSection = el(`<div class="bc-card" style="margin-top:1rem;">
        <h3 style="font-size:15px; margin-bottom:10px; color:#1B4332; font-family:'Oswald', sans-serif; letter-spacing:0.5px;">✉️ Cấu hình Mail Server (SMTP / Google Script)</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:#1B4332; font-weight:600;">
            <input type="checkbox" id="cfg-mail-enabled" ${mailConfig.enabled ? 'checked' : ''} ${isAdm ? '' : 'disabled'} /> Kích hoạt hệ thống Email thông báo
          </label>
          <div style="font-size:12px; color:#8a877d; margin-bottom:4px;">(Gửi email khôi phục mật khẩu, phê duyệt thành viên/đóng phí, và nhắc nợ)</div>
          
          <div style="margin-bottom:4px;">
            <label style="font-size:12px; font-weight:600; color:#8a877d; display:block; margin-bottom:4px;">Phương thức kết nối:</label>
            <div style="display:flex; gap:16px; font-size:13px; flex-wrap:wrap; margin-top:2px;">
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input type="radio" name="cfg-mail-mode" value="gas" ${activeMode === 'gas' ? 'checked' : ''} ${isAdm ? '' : 'disabled'} /> 
                Google Apps Script (Khuyên dùng - Miễn phí & Bảo mật 100%)
              </label>
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer; opacity:0.6;">
                <input type="radio" name="cfg-mail-mode" value="token" ${activeMode === 'token' ? 'checked' : ''} ${isAdm ? '' : 'disabled'} /> 
                SecureToken (SMTPJS - smtpjs.com đã dừng hoạt động)
              </label>
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input type="radio" name="cfg-mail-mode" value="manual" ${activeMode === 'manual' ? 'checked' : ''} ${isAdm ? '' : 'disabled'} /> 
                Tài khoản SMTP thủ công
              </label>
            </div>
          </div>

          <!-- Khung nhập Google Apps Script -->
          <div id="cfg-mail-gas-container" style="display:${activeMode === 'gas' ? 'block' : 'none'};">
            <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Google Web App URL (Script URL):</label>
            <input class="bc-input" id="cfg-mail-gas-url" value="${escapeHtml(mailConfig.googleScriptUrl || '')}" placeholder="https://script.google.com/macros/s/.../exec" ${isAdm ? '' : 'disabled'} />
            <div style="font-size:11px; color:#8a877d; margin-top:4px; line-height:1.4;">
              * Hướng dẫn tạo Google Script gửi mail:<br/>
              1. Truy cập <a href="https://script.google.com" target="_blank" style="color:#0C447C; font-weight:600;">script.google.com</a>, đăng nhập bằng Gmail của bạn, bấm <strong>Dự án mới</strong>.<br/>
              2. Xóa code cũ, dán đoạn mã sau vào:<br/>
              <code style="display:block; background:#F1EFE8; padding:6px; border-radius:4px; margin:4px 0; font-family:monospace; white-space:pre; overflow-x:auto; font-size:10px;">function doPost(e) {
    var data = JSON.parse(e.postData.contents);
    MailApp.sendEmail({ to: data.to, subject: data.subject, htmlBody: data.body });
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  }</code>
              3. Bấm nút <strong>Triển khai</strong> -> chọn <strong>Triển khai mới</strong> -> bấm icon bánh răng chọn: <strong>Ứng dụng web</strong>.<br/>
              4. Tại mục <i>Người có quyền truy cập</i>: Chọn <strong>Bất kỳ ai</strong> -> Bấm Triển khai và cấp quyền truy cập Gmail -> Copy đường dẫn URL ứng dụng web nhận được dán vào ô trên.
            </div>
          </div>

          <!-- Khung nhập SecureToken -->
          <div id="cfg-mail-token-container" style="display:${activeMode === 'token' ? 'block' : 'none'};">
            <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Mã bảo mật SecureToken:</label>
            <input class="bc-input" id="cfg-mail-token" value="${escapeHtml(mailConfig.secureToken || '')}" placeholder="Ví dụ: 12345678-abcd-1234-abcd-1234567890ab" ${isAdm ? '' : 'disabled'} style="font-family:monospace;" />
          </div>

          <!-- Khung nhập SMTP thủ công -->
          <div id="cfg-mail-manual-container" style="display:${activeMode === 'manual' ? 'block' : 'none'};">
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <div style="flex:2; min-width:180px;">
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">SMTP Host:</label>
                <input class="bc-input" id="cfg-mail-host" value="${escapeHtml(mailConfig.host || '')}" placeholder="smtp.gmail.com" ${isAdm ? '' : 'disabled'} />
              </div>
              <div style="flex:1; min-width:90px;">
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">SMTP Port:</label>
                <input class="bc-input" type="number" id="cfg-mail-port" value="${mailConfig.port || 465}" placeholder="465" ${isAdm ? '' : 'disabled'} />
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <div style="flex:1; min-width:180px;">
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">SMTP Username (Email tài khoản):</label>
                <input class="bc-input" id="cfg-mail-username" value="${escapeHtml(mailConfig.username || '')}" placeholder="example@gmail.com" ${isAdm ? '' : 'disabled'} />
              </div>
              <div style="flex:1; min-width:180px;">
                <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">SMTP Password (Mật khẩu ứng dụng):</label>
                <input class="bc-input" type="password" id="cfg-mail-password" value="${escapeHtml(mailConfig.password || '')}" placeholder="••••••••••••••••" ${isAdm ? '' : 'disabled'} />
              </div>
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px;">
              <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Email gửi đi (Sender Email):</label>
              <input class="bc-input" id="cfg-mail-sender-email" value="${escapeHtml(mailConfig.senderEmail || '')}" placeholder="Bỏ trống để giống SMTP Username hoặc email tạo token" ${isAdm ? '' : 'disabled'} />
            </div>
            <div style="flex:1; min-width:180px;">
              <label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Tên hiển thị người gửi (Sender Name):</label>
              <input class="bc-input" id="cfg-mail-sender-name" value="${escapeHtml(mailConfig.senderName || '')}" placeholder="CLB Cầu lông ARON" ${isAdm ? '' : 'disabled'} />
            </div>
          </div>

          ${isAdm ? `
            <div style="display:flex; gap:8px; align-items:flex-end; margin-top:6px; flex-wrap:wrap;">
              <button class="bc-btn small" id="cfg-mail-save-btn">Lưu cấu hình Mail Server</button>
              <div style="display:flex; gap:4px; align-items:center;">
                <input class="bc-input" id="cfg-mail-test-to" placeholder="Email nhận thử..." style="width:160px; padding:4px 8px; font-size:12px;" />
                <button class="bc-btn outline small" id="cfg-mail-test-btn" style="padding:4px 8px; font-size:12px;">Gửi thử</button>
              </div>
            </div>
          ` : ''}
          <span id="cfg-mail-msg" style="font-size:12px; margin-top:2px;"></span>
        </div>
      </div>`);
      wrap.appendChild(mailServerSection);
    }

    setTimeout(() => {
      const cfgMailSaveBtn = document.getElementById('cfg-mail-save-btn');
      if (cfgMailSaveBtn) cfgMailSaveBtn.onclick = async () => {
        const enabled = document.getElementById('cfg-mail-enabled').checked;
        const modeEl = document.querySelector('input[name="cfg-mail-mode"]:checked');
        const activeMode = modeEl ? modeEl.value : 'gas';
        
        const useGoogleScript = activeMode === 'gas';
        const googleScriptUrl = document.getElementById('cfg-mail-gas-url').value.trim();
        const useSecureToken = activeMode === 'token';
        const secureToken = document.getElementById('cfg-mail-token').value.trim();

        const host = document.getElementById('cfg-mail-host').value.trim();
        const port = parseInt(document.getElementById('cfg-mail-port').value) || 465;
        const username = document.getElementById('cfg-mail-username').value.trim();
        const password = document.getElementById('cfg-mail-password').value.trim();
        const senderEmail = document.getElementById('cfg-mail-sender-email').value.trim();
        const senderName = document.getElementById('cfg-mail-sender-name').value.trim();
        const msg = document.getElementById('cfg-mail-msg');

        cfgMailSaveBtn.disabled = true;
        msg.style.color = '#6b7a73';
        msg.textContent = 'Đang lưu cấu hình...';

        state.settings.mailServer = {
          enabled,
          useGoogleScript,
          googleScriptUrl,
          useSecureToken,
          secureToken,
          host,
          port,
          username,
          password,
          senderEmail,
          senderName
        };

        const ok = await saveSettings();
        if (ok) {
          msg.style.color = '#27500A';
          msg.textContent = 'Đã lưu cấu hình Mail Server!';
          setTimeout(() => { render(); }, 1200);
        } else {
          cfgMailSaveBtn.disabled = false;
          msg.style.color = '#993C1D';
          msg.textContent = 'Lưu cấu hình thất bại.';
        }
      };


      const cfgMailTestBtn = document.getElementById('cfg-mail-test-btn');
      if (cfgMailTestBtn) cfgMailTestBtn.onclick = async () => {
        const testTo = document.getElementById('cfg-mail-test-to').value.trim();
        const msg = document.getElementById('cfg-mail-msg');
        if (!testTo) {
          msg.style.color = '#993C1D';
          msg.textContent = 'Vui lòng nhập email nhận thử.';
          return;
        }

        cfgMailTestBtn.disabled = true;
        msg.style.color = '#6b7a73';
        msg.textContent = 'Đang gửi email thử...';

        const enabled = document.getElementById('cfg-mail-enabled').checked;
        const modeEl = document.querySelector('input[name="cfg-mail-mode"]:checked');
        const activeMode = modeEl ? modeEl.value : 'gas';
        
        const useGoogleScript = activeMode === 'gas';
        const googleScriptUrl = document.getElementById('cfg-mail-gas-url').value.trim();
        const useSecureToken = activeMode === 'token';
        const secureToken = document.getElementById('cfg-mail-token').value.trim();

        const host = document.getElementById('cfg-mail-host').value.trim();
        const port = parseInt(document.getElementById('cfg-mail-port').value) || 465;
        const username = document.getElementById('cfg-mail-username').value.trim();
        const password = document.getElementById('cfg-mail-password').value.trim();
        const senderEmail = document.getElementById('cfg-mail-sender-email').value.trim() || username;
        const senderName = document.getElementById('cfg-mail-sender-name').value.trim() || 'CLB ARON Badminton';

        const originalMailConfig = state.settings.mailServer;
        state.settings.mailServer = { 
          enabled: true, 
          useGoogleScript,
          googleScriptUrl,
          useSecureToken, 
          secureToken, 
          host, 
          port, 
          username, 
          password, 
          senderEmail, 
          senderName 
        };

        const testSubject = `[CLB ARON] Kiểm tra cấu hình Mail Server`;
        const testBody = `<h3>Cấu hình Mail Server của bạn hoạt động chính xác!</h3>
          <p>Email này được gửi lúc ${new Date().toLocaleString('vi-VN')} để kiểm tra cấu hình SMTP/GoogleScript.</p>
          <p>Chúc mừng! Hệ thống gửi email tự động đã sẵn sàng hoạt động.</p>`;

        const success = await sendSystemEmail(testTo, testSubject, testBody);
        state.settings.mailServer = originalMailConfig;

        cfgMailTestBtn.disabled = false;
        if (success) {
          msg.style.color = '#27500A';
          msg.textContent = `Gửi email thử thành công đến ${testTo}!`;
        } else {
          msg.style.color = '#993C1D';
          msg.textContent = 'Gửi email thử thất bại. Vui lòng kiểm tra lại cấu hình SMTP/GoogleScript.';
        }
      };

      const ctAddBtn = document.getElementById('ct-add');
      if (ctAddBtn) {
        ctAddBtn.onclick = () => {
          const name = document.getElementById('ct-name').value.trim();
          if (!name) return;
          state.courts.push({
            id: uid(), name,
            address: document.getElementById('ct-address').value.trim(),
            mapLink: document.getElementById('ct-maplink').value.trim(),
            price: document.getElementById('ct-price').value.trim(),
            phone: document.getElementById('ct-phone').value.trim()
          });
          saveCourts(); render();
        };
      }

      state.courts.forEach(c => {
        const delBtn = document.getElementById(`ct-del-${c.id}`);
        if (delBtn) {
          delBtn.onclick = () => {
            if (!confirm(`Bạn có chắc chắn muốn xóa sân "${c.name}"?`)) return;
            state.courts = state.courts.filter(x => x.id !== c.id);
            saveCourts(); render();
          };
        }
      });
      
      // Auto-Rules Handler
      const arSaveBtn = document.getElementById('ar-save-btn');
      if (arSaveBtn) {
        arSaveBtn.onclick = async () => {
          arSaveBtn.disabled = true;
          arSaveBtn.textContent = 'Đang lưu...';
          try {
            state.settings = state.settings || {};
            state.settings.autoRules = state.settings.autoRules || {};
            state.settings.autoRules.lockVote = state.settings.autoRules.lockVote || {};
            state.settings.autoRules.remindVote = state.settings.autoRules.remindVote || {};
            state.settings.autoRules.remindDebt = state.settings.autoRules.remindDebt || {};

            state.settings.autoRules.lockVote.enabled = document.getElementById('ar-lock-enable').checked;
            state.settings.autoRules.lockVote.days = document.getElementById('ar-lock-days').value;
            state.settings.autoRules.lockVote.time = document.getElementById('ar-lock-time').value;

            state.settings.autoRules.remindVote.enabled = document.getElementById('ar-remind-enable').checked;
            state.settings.autoRules.remindVote.days = document.getElementById('ar-remind-days').value;
            state.settings.autoRules.remindVote.time = document.getElementById('ar-remind-time').value;

            state.settings.autoRules.remindDebt.enabled = document.getElementById('ar-debt-enable').checked;
            state.settings.autoRules.remindDebt.days = document.getElementById('ar-debt-days').value;
            state.settings.autoRules.remindDebt.time = document.getElementById('ar-debt-time').value;

            await saveSettings();
            showToast('Đã lưu cấu hình tự động!', 'success');
          } finally {
            arSaveBtn.disabled = false;
            arSaveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu cấu hình';
          }
        };
      }
      
      // Test Button Handlers
      const arTestLock = document.getElementById('ar-test-lock');
      if (arTestLock) arTestLock.onclick = () => {
         let msgs = [];
         let total = 0;
         state.sessions.forEach(s => {
           if (!s || !s.date || s.locked) return;
           if (s.date < (new Date()).toLocaleDateString('sv-SE')) return;
           
           let affectedFixed = 0;
           let affectedCasual = 0;
           const mKey = sessionMonthKey(s);
           state.members.forEach(member => {
             if (member.status !== 'active') return;
             const curType = (member.monthlyType || {})[mKey] || '';
             if (curType === 'fixed' || curType === 'casual') {
               const hasVoted = !!(s.votes||{})[member.name];
               const hasPassed = !!(s.passes||{})[member.id];
               if (!hasVoted && !hasPassed) {
                 if (curType === 'fixed') affectedFixed++;
                 else affectedCasual++;
               }
             }
           });

           if (affectedFixed > 0 || affectedCasual > 0) {
             const parts = s.date.split('-');
             const fDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s.date;
             msgs.push(` - Buổi ${fDate}: ${affectedFixed} Cố định (thành Tham gia), ${affectedCasual} Vãng lai (thành Vắng)`);
             total += (affectedFixed + affectedCasual);
           }
         });
         
         if (total === 0) {
           alert("KẾT QUẢ CHẠY THỬ:\nTất cả các thành viên đều đã chốt danh sách trong các buổi sắp tới.");
         } else {
           alert(`KẾT QUẢ CHẠY THỬ (Mô phỏng đếm số người chưa vote):\nTổng cộng có ${total} lượt thành viên chưa vote trong các buổi đánh mở:\n${msgs.join('\n')}\n\n*Lưu ý: Việc khóa tự động chỉ diễn ra khi thời gian vượt qua deadline cấu hình (vd: 10:00 ngày trước buổi đánh).`);
         }
      };

      let isTestRemindRunning = false;
      const arTestRemind = document.getElementById('ar-test-remind');
      if (arTestRemind) arTestRemind.onclick = async () => {
         if (isTestRemindRunning) return;
         if (!state.me || !state.me.email) {
           alert('Tài khoản Admin của bạn chưa có email. Vui lòng cập nhật email trong tab Tài khoản của tôi để nhận mail test!');
           return;
         }
         isTestRemindRunning = true;
         arTestRemind.disabled = true;
         arTestRemind.textContent = 'Đang gửi...';
         const subject = `[THÔNG BÁO TEST] Nhắc nhở chốt danh sách đánh cầu`;
         const body = `<p>Chào bạn,</p>
         <p><strong>ĐÂY LÀ EMAIL TEST TỪ HỆ THỐNG AUTO-RULES.</strong></p>
         <p>Nhóm sẽ tự động chốt danh sách đánh cầu cho buổi sắp tới.</p>
         <p>Hiện tại bạn chưa chốt tham gia. Nếu bạn không vào vote trước giờ chốt, hệ thống sẽ tự động gán mặc định và khóa vote như sau:</p>
         <ul>
            <li><strong>Thành viên Cố định</strong>: Tự động chuyển thành <strong>THAM GIA</strong>.</li>
            <li><strong>Thành viên Vãng lai</strong>: Tự động chuyển thành <strong>VẮNG</strong>.</li>
         </ul>
         <p>Vui lòng vào ứng dụng để vote ngay nhé!</p>`;
         const ok = await sendSystemEmail(state.me.email, subject, body);
         arTestRemind.disabled = false;
         arTestRemind.innerHTML = '<i class="fas fa-play"></i> Gửi thử';
         isTestRemindRunning = false;
         if (ok) showToast('Đã gửi email nhắc vote mẫu tới email của bạn!', 'success');
         else alert('Lỗi khi gửi mail. Hãy kiểm tra cấu hình Mail Server.');
      };

      let isTestDebtRunning = false;
      const arTestDebt = document.getElementById('ar-test-debt');
      if (arTestDebt) arTestDebt.onclick = async () => {
         if (isTestDebtRunning) return;
         if (!state.me || !state.me.email) {
           alert('Tài khoản Admin của bạn chưa có email. Vui lòng cập nhật email trong tab Tài khoản của tôi để nhận mail test!');
           return;
         }
         isTestDebtRunning = true;
         arTestDebt.disabled = true;
         arTestDebt.textContent = 'Đang gửi...';
         
         const prevMonthKey = monthKey(); // Use current month for demo
         const paymentCfg = state.settings.payment || {};
         const bankId = paymentCfg.bankId || '';
         const accountNo = paymentCfg.accountNo || '';
         const accountName = paymentCfg.accountName || '';
         const qrUrl = paymentCfg.qrUrl || '';
         const treasurerPhone = paymentCfg.treasurerPhone || '';
         
         const subject = `[THÔNG BÁO TEST] Nhắc đóng quỹ cầu lông tháng ${monthLabel(prevMonthKey)}`;
         let body = `<p>Chào ${escapeHtml(state.me.name)},</p>
         <p><strong>ĐÂY LÀ EMAIL TEST TỪ HỆ THỐNG AUTO-RULES.</strong></p>
         <p>Tổng kết quỹ cầu lông tháng <strong>${monthLabel(prevMonthKey)}</strong> của bạn như sau:</p>
         <ul>
           <li>Tổng phí cần đóng: <strong>${formatVND(300000)}</strong></li>
           <li>Đã đóng: <strong>${formatVND(0)}</strong></li>
           <li>Đóng trước: <strong>${formatVND(0)}</strong></li>
           <li><strong>Số tiền còn nợ: <span style="color:red;">${formatVND(300000)}</span></strong></li>
         </ul>
         <p>Vui lòng chuyển khoản số tiền <strong>${formatVND(300000)}</strong> với nội dung: <strong>${escapeHtml(state.me.name)} nop tien thang ${monthLabel(prevMonthKey).replace('/','')}</strong>.</p>`;

         if (qrUrl) {
           body += `<p><img src="${qrUrl}" alt="QR Code" style="max-width:300px;"/></p>`;
         } else if (bankId && accountNo) {
           body += `<p><strong>Thông tin chuyển khoản:</strong><br/>Ngân hàng: ${bankId}<br/>Số tài khoản: ${accountNo}<br/>Chủ tài khoản: ${accountName}</p>`;
         }
         if (treasurerPhone) {
           body += `<p>Nếu có thắc mắc, vui lòng liên hệ thủ quỹ: ${treasurerPhone}.</p>`;
         }
         
         const ok = await sendSystemEmail(state.me.email, subject, body);
         arTestDebt.disabled = false;
         arTestDebt.innerHTML = '<i class="fas fa-play"></i> Gửi thử';
         isTestDebtRunning = false;
         if (ok) showToast('Đã gửi email nhắc nợ mẫu tới email của bạn!', 'success');
         else alert('Lỗi khi gửi mail. Hãy kiểm tra cấu hình Mail Server.');
      };

      const resetXpBtn = document.getElementById('ar-reset-xp-btn');
      if (resetXpBtn) resetXpBtn.onclick = async () => {
        const today = new Date();
        const minResetDate = new Date(today.getFullYear(), 5, 1); // 1/6 hàng năm
        if (today < minResetDate) {
          showToast('Chưa đến thời điểm chốt mùa giải! Chỉ có thể reset XP sau ngày 01/06.', 'error');
          return;
        }

        const pass = prompt('CẢNH BÁO: Bạn đang thực hiện CHỐT MÙA GIẢI và XÓA TOÀN BỘ XP hiện tại.\nHành động này KHÔNG THỂ HOÀN TÁC!\n\nGõ "XACNHAN" (viết hoa, không dấu) để tiếp tục:');
        if (pass !== 'XACNHAN') {
          if (pass !== null) showToast('Đã hủy thao tác reset XP.', 'warning');
          return;
        }

        state.settings = state.settings || {};
        state.settings.xpSeasonStartDate = today.toLocaleDateString('sv-SE');
        showToast('Đã khởi tạo mùa giải mới. Toàn bộ điểm XP đã được đặt lại về 0!', 'success');
        render();
      };
    }, 0);

    // Render Auto-Rules UI
    const autoRules = (state.settings && state.settings.autoRules) || {};
    const lockVote = autoRules.lockVote || {};
    const remindVote = autoRules.remindVote || {};
    const remindDebt = autoRules.remindDebt || {};

    wrap.appendChild(el(`<div class="bc-card" style="margin-top:1.5rem; border:1px solid var(--card-border);">
      <h3 style="font-size:15px; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <i class="fas fa-robot"></i> Cấu hình Tự động (Auto-Rules)
      </h3>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">
        Hệ thống sẽ chạy ngầm các tác vụ này khi có Admin/Owner truy cập ứng dụng. Cấu hình này giúp bạn rảnh tay trong việc quản lý nhóm.
      </p>

      <div style="background:var(--tab-bg); padding:12px; border-radius:8px; margin-bottom:12px; border: 1px solid var(--card-border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px; cursor:pointer;">
            <input type="checkbox" id="ar-lock-enable" ${lockVote.enabled ? 'checked' : ''} style="width:16px;height:16px;">
            Tự động chốt danh sách (Khóa Vote)
          </label>
          <button id="ar-test-lock" class="bc-btn small" style="font-size:11px; padding:4px 8px; background:transparent; color:var(--text-secondary); border:1px solid var(--input-border);"><i class="fas fa-play"></i> Chạy thử</button>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px; margin-left:24px;">Hành động: Tự động chốt những người chưa vote và bật cờ khóa. Cố định mặc định "Tham gia", Vãng lai mặc định "Vắng".</p>
        <div style="display:flex; gap:12px; margin-left:24px; align-items:center;">
          <span style="font-size:13px; color:var(--text-secondary);">Khóa trước buổi đánh:</span>
          <input type="number" id="ar-lock-days" value="${lockVote.days || 1}" min="0" max="7" style="width:60px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
          <span style="font-size:13px; color:var(--text-secondary);">ngày, vào lúc:</span>
          <input type="time" id="ar-lock-time" value="${lockVote.time || '10:00'}" style="width:90px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
        </div>
      </div>

      <div style="background:var(--tab-bg); padding:12px; border-radius:8px; margin-bottom:12px; border: 1px solid var(--card-border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px; cursor:pointer;">
            <input type="checkbox" id="ar-remind-enable" ${remindVote.enabled ? 'checked' : ''} style="width:16px;height:16px;">
            Tự động gửi Email nhắc Vote
          </label>
          <button id="ar-test-remind" class="bc-btn small" style="font-size:11px; padding:4px 8px; background:transparent; color:var(--text-secondary); border:1px solid var(--input-border);"><i class="fas fa-play"></i> Gửi thử</button>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px; margin-left:24px;">Hành động: Gửi mail nhắc nhở các thành viên Cố định/Vãng lai chưa vote.</p>
        <div style="display:flex; gap:12px; margin-left:24px; align-items:center;">
          <span style="font-size:13px; color:var(--text-secondary);">Gửi trước buổi đánh:</span>
          <input type="number" id="ar-remind-days" value="${remindVote.days || 1}" min="0" max="7" style="width:60px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
          <span style="font-size:13px; color:var(--text-secondary);">ngày, vào lúc:</span>
          <input type="time" id="ar-remind-time" value="${remindVote.time || '08:00'}" style="width:90px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
        </div>
      </div>

      <div style="background:var(--tab-bg); padding:12px; border-radius:8px; border: 1px solid var(--card-border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px; cursor:pointer;">
            <input type="checkbox" id="ar-debt-enable" ${remindDebt.enabled ? 'checked' : ''} style="width:16px;height:16px;">
            Tự động gửi Email nhắc Nợ phí
          </label>
          <button id="ar-test-debt" class="bc-btn small" style="font-size:11px; padding:4px 8px; background:transparent; color:var(--text-secondary); border:1px solid var(--input-border);"><i class="fas fa-play"></i> Gửi thử</button>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px; margin-left:24px;">Hành động: Gửi mail thông báo tiền quỹ cần đóng (nếu > 0) cho tháng vừa qua.</p>
        <div style="display:flex; gap:12px; margin-left:24px; align-items:center;">
          <span style="font-size:13px; color:var(--text-secondary);">Gửi vào ngày:</span>
          <input type="number" id="ar-debt-days" value="${remindDebt.days || 5}" min="1" max="28" style="width:60px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
          <span style="font-size:13px; color:var(--text-secondary);">hàng tháng, vào lúc:</span>
          <input type="time" id="ar-debt-time" value="${remindDebt.time || '09:00'}" style="width:90px; padding:4px; border:1px solid var(--input-border); background:var(--input-bg); color:var(--input-color); border-radius:4px; font-size:13px;">
        </div>
      </div>
      
      <div style="text-align:right; margin-top:12px;">
        <button id="ar-save-btn" class="bc-btn" style="background:#005A32; border-color:#005A32; font-size:13px; padding:8px 16px;">
          <i class="fas fa-save"></i> Lưu cấu hình
        </button>
      </div>
    </div>`));

    wrap.appendChild(el(`<div class="bc-card" style="margin-top:1.5rem; border:1px solid var(--card-border);">
      <h3 style="font-size:15px; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <i class="fas fa-sync-alt"></i> Khởi tạo Mùa giải mới (Reset XP)
      </h3>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">
        Hành động này sẽ đặt lại điểm XP của tất cả thành viên về 0, đồng thời reset chuỗi tham gia liên tiếp (streak) của mùa giải cũ. Nên thực hiện định kỳ (ví dụ: mỗi 6 tháng) để duy trì sự hấp dẫn và tính cạnh tranh cho Bảng Xếp Hạng. 
        <br><strong style="color:#993C1D;">Lưu ý: Hành động này không thể hoàn tác! Cân nhắc lưu danh sách "Huyền thoại" thủ công nếu cần thiết trước khi chốt.</strong>
      </p>
      <div style="text-align:right;">
        <button id="ar-reset-xp-btn" class="bc-btn" style="font-size:13px; padding:8px 16px;">
          <i class="fas fa-power-off"></i> Chốt Mùa Giải & Reset XP
        </button>
      </div>
    </div>`));

    return wrap;
  }

  // ---------- ROAST BOT & FEED XÃ HỘI ----------
  function renderRoastFeedCard(mode) {
    mode = mode || state.lbMode || 'month';
    const curMonth = state.viewMonth || monthKey();
    state.roastReactions = state.roastReactions || {};
    const activeMembers = state.members.filter(m => m.status === 'active');
    if (activeMembers.length === 0) return el(`<div></div>`);

    const seasonStart = (state.settings && state.settings.xpSeasonStartDate) || null;
    const targetSessions = (mode === 'all' && seasonStart) ? state.sessions.filter(s => (s.date || '') >= seasonStart) : state.sessions;

    const roasts = [];

    const sortedSessions = [...targetSessions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (sortedSessions.length > 0) {
      const absentCounts = {};
      activeMembers.forEach(m => {
        let absent = 0;
        sortedSessions.forEach(s => {
          const v = (s.votes || {})[m.name];
          const passes = s.passes || {};
          const isReceiver = Object.values(passes).includes(m.id);
          const hasPassed   = Object.keys(passes).includes(m.id);
          if (v === 'no' || hasPassed || (!v && !isReceiver && s.locked)) absent++;
        });
        if (absent >= 2) absentCounts[m.name] = absent;
      });
      const absentNames = Object.keys(absentCounts);
      if (absentNames.length > 0) {
        const targetName = absentNames[Math.floor(Math.random() * absentNames.length)];
        roasts.push({
          id: 'roast_absent_' + targetName.replace(/\s+/g, ''),
          tag: '👻 THÁNH VẮNG MẶT',
          content: `Cảnh báo: <strong>${escapeHtml(targetName)}</strong> đã vắng ${absentCounts[targetName]} buổi gần đây! Liệu bao vợt có đang đóng tơ chưa bác ơi? 😂`
        });
      }
    }

    const topMember = activeMembers.slice().map(m => ({
      m,
      xp: mode === 'month'
        ? calculateMemberMonthXP(m.id, state.sessions, curMonth)
        : calculateMemberXP(m.id, targetSessions),
      tieVotes: getMemberTieVotes(m.name, curMonth),
      attended: countAttended(m.id, targetSessions)
    })).sort((a, b) => b.xp - a.xp || b.tieVotes - a.tieVotes || b.attended - a.attended || a.m.name.localeCompare(b.m.name))[0];

    if (topMember && topMember.xp > 0) {
      const labelMode = mode === 'month' ? `tháng ${monthLabel(curMonth)}` : 'mùa giải hiện tại';
      roasts.push({
        id: 'roast_top1_' + topMember.m.name.replace(/\s+/g, ''),
        tag: '👑 THÁCH THỨC NGAI VÀNG',
        content: `<strong>${escapeHtml(topMember.m.nickname || topMember.m.name)}</strong> đang chễm chệ ở ngai vàng ${labelMode} với <strong>${topMember.xp.toLocaleString()} XP</strong>! Anh em ai đủ trình độ ra phát chiến thư kéo sập ngai đi nào! 🔥`
      });
    }

    const winCounts = activeMembers.map(m => ({ m, wins: getMemberChallengeWins(m.name, targetSessions) })).sort((a, b) => b.wins - a.wins)[0];
    if (winCounts && winCounts.wins > 0) {
      roasts.push({
        id: 'roast_wins_' + winCounts.m.name.replace(/\s+/g, ''),
        tag: '⚡ ĐỘC CÔ CẦU BẠI',
        content: `<strong>${escapeHtml(winCounts.m.nickname || winCounts.m.name)}</strong> vừa quét sạch đối thủ với ${winCounts.wins} trận thắng thách đấu! Tay vợt nào dám hạ gục chuỗi thắng này? 🏸`
      });
    }

    // 4. Vua Chuyển Nhượng (Thánh Hay Pass Slot)
    const passGivers = activeMembers.map(m => {
      let count = 0;
      targetSessions.forEach(s => {
        const passes = s.passes || {};
        if (passes[m.id] && passes[m.id] !== 'pending') count++;
      });
      return { m, count };
    }).sort((a, b) => b.count - a.count)[0];

    if (passGivers && passGivers.count > 0) {
      roasts.push({
        id: 'roast_giver_' + passGivers.m.name.replace(/\s+/g, ''),
        tag: '🕊️ VUA CHUYỂN NHƯỢNG (THÁNH PASS SLOT)',
        content: `Gương mặt đại diện hội "bận đột xuất": <strong>${escapeHtml(passGivers.m.nickname || passGivers.m.name)}</strong> đã nhường pass thành công ${passGivers.count} lần! Danh hiệu Tay Pass Vàng chắc chắn thuộc về bác! 💸`
      });
    }

    // 5. Vua Săn Pass (Thánh Nhận Pass Slot)
    const passReceivers = activeMembers.map(m => {
      let count = 0;
      targetSessions.forEach(s => {
        const passes = s.passes || {};
        if (Object.values(passes).includes(m.id)) count++;
      });
      return { m, count };
    }).sort((a, b) => b.count - a.count)[0];

    if (passReceivers && passReceivers.count > 0) {
      roasts.push({
        id: 'roast_receiver_' + passReceivers.m.name.replace(/\s+/g, ''),
        tag: '⚡ VUA SĂN PASS (THÁNH HỐT KÈO)',
        content: `Thần tài gõ cửa: <strong>${escapeHtml(passReceivers.m.nickname || passReceivers.m.name)}</strong> là "Thánh hốt pass" đỉnh nhất CLB với ${passReceivers.count} lần săn pass thành công! Đỉnh cao canh giờ cướp slot! 🎯`
      });
    }

    // 6. Vua Phát Chiến Thư (Thánh Tạo Thách Đấu)
    const challengeCreators = activeMembers.map(m => {
      let count = 0;
      targetSessions.forEach(s => {
        (s.challenges || []).forEach(c => {
          if (c.createdBy === m.name) count++;
        });
      });
      return { m, count };
    }).sort((a, b) => b.count - a.count)[0];

    if (challengeCreators && challengeCreators.count > 0) {
      roasts.push({
        id: 'roast_creator_' + challengeCreators.m.name.replace(/\s+/g, ''),
        tag: '🥊 VUA PHÁT CHIẾN THƯ',
        content: `Chúa tể tạo kèo: <strong>${escapeHtml(challengeCreators.m.nickname || challengeCreators.m.name)}</strong> đã mở màn ${challengeCreators.count} trận thách đấu nảy lửa! Tay vợt nào tiếp theo dám nhận kèo? ⚔️`
      });
    }

    
    // Tournament Roasts
    const activeTourForRoast = state.tournaments && state.tournaments.find(t => t.status !== 'finished');
    if (activeTourForRoast) {
        let msg = '';
        if (activeTourForRoast.status === 'registering') msg = `Đang mở cổng đăng ký! Các chiến thủ mau ghi danh nào!`;
        else if (activeTourForRoast.status === 'playing') msg = `Vòng bảng đang diễn ra vô cùng khốc liệt!`;
        else if (activeTourForRoast.status === 'knockout') msg = `Đã bước vào vòng Loại Trực Tiếp (Knockout) nghẹt thở!`;
        
        roasts.push({
            id: 'roast_tour_active_' + activeTourForRoast.id,
            tag: '🔥 GIẢI ĐẤU ĐANG DIỄN RA',
            content: `Giải đấu <strong>${escapeHtml(activeTourForRoast.name)}</strong>: ${msg}`
        });
    }

    const finishedTours = (state.tournaments || []).filter(t => t.status === 'finished').sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    if (finishedTours.length > 0) {
        const latestTour = finishedTours[0];
        // find champions
        let champs = [];
        Object.keys(latestTour.bracket || {}).forEach(cat => {
            const m = latestTour.bracket[cat].find(x => x.round === 'Chung kết' && x.status === 'finished');
            if (m) {
                const winnerId = m.score1 > m.score2 ? m.p1 : m.p2;
                const p = latestTour.pairs.find(x => x.id === winnerId);
                if (p) champs.push(`${cat}: ${p.name}`);
            }
        });
        if (champs.length > 0) {
            roasts.push({
                id: 'roast_tour_finished_' + latestTour.id,
                tag: '🏆 TÂN VƯƠNG XUẤT HIỆN',
                content: `Chúc mừng các nhà vô địch của giải <strong>${escapeHtml(latestTour.name)}</strong>: <br/><strong>${escapeHtml(champs.join(' | '))}</strong> 🎉🎉🎉`
            });
        }
    }

    if (roasts.length === 0) {
      roasts.push({
        id: 'roast_welcome',
        tag: '🔥 PHONG TRÀO CÂU LẠC BỘ',
        content: `Chào mừng anh em đến với hệ thống Gamification CLB! Hãy tham gia vote, giao lưu thách đấu để tích XP và mở khóa huy hiệu độc quyền nhé! 💪`
      });
    }


    const card = el(`<div class="bc-card" style="
        background: linear-gradient(135deg, rgba(242,100,25,0.08) 0%, rgba(255,183,3,0.06) 100%);
        border: 1.5px solid rgba(242,100,25,0.3); padding: 1.1rem 1.2rem; margin-bottom: 0.75rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
        <div style="font-size:14px; font-weight:800; color:#F26419; font-family:'Oswald',sans-serif; display:flex; align-items:center; gap:6px;">
          <span style="font-size:18px; animation:shuttleBounce 1.2s infinite; display:inline-block;">🔥</span>
          <span>GÓC CÀ KHỊA & BẢN TIN TƯƠNG TÁC</span>
        </div>
        <span style="font-size:10px; background:#F26419; color:#FFF; padding:2px 7px; border-radius:10px; font-weight:700;">BOT CÀ KHỊA 🤖</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${roasts.map(r => {
          const itemReactions = state.roastReactions[r.id] || { '😂':[], '🔥':[], '💪':[], '😤':[], '🏸':[] };
          return `<div style="background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; padding:10px 12px;">
            <div style="font-size:10px; font-weight:700; color:#F26419; margin-bottom:3px; letter-spacing:0.04em;">${r.tag}</div>
            <div style="font-size:13px; color:var(--text-primary); line-height:1.4;">${r.content}</div>
            <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;" id="roast-reacts-${r.id}">
              ${['😂','🔥','💪','😤','🏸'].map(emoji => {
                const users = itemReactions[emoji] || [];
                const hasReacted = state.me && users.includes(state.me.name);
                return `<button class="roast-emoji-btn" data-rid="${r.id}" data-emoji="${emoji}" style="
                  background:${hasReacted ? 'rgba(242,100,25,0.18)' : 'rgba(0,0,0,0.04)'};
                  border:1px solid ${hasReacted ? '#F26419' : 'transparent'};
                  border-radius:14px; padding:2px 8px; font-size:12px; cursor:pointer; transition:all 0.15s;">
                  ${emoji} <span style="font-size:11px; font-weight:600; color:${hasReacted ? '#F26419' : 'var(--text-muted)'};">${users.length || ''}</span>
                </button>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`);

    setTimeout(() => {
      card.querySelectorAll('.roast-emoji-btn').forEach(btn => {
        btn.onclick = () => {
          if (!state.me) { alert('Vui lòng đăng nhập để tương tác emoji.'); return; }
          const rId = btn.getAttribute('data-rid');
          const emoji = btn.getAttribute('data-emoji');
          const myName = state.me.name;
          state.roastReactions[rId] = state.roastReactions[rId] || { '😂':[], '🔥':[], '💪':[], '😤':[], '🏸':[] };
          const list = state.roastReactions[rId][emoji] || [];
          if (list.includes(myName)) {
            state.roastReactions[rId][emoji] = list.filter(n => n !== myName);
          } else {
            state.roastReactions[rId][emoji] = list.concat([myName]);
          }
          save('bc_roast_reactions', state.roastReactions);
          render();
        };
      });
    }, 0);

    return card;
  }

  // ---------- LEADERBOARD ----------
  function renderLeaderboard() {
    const wrap = el(`<div></div>`);

    // ---- Header ----
    const curMonth = state.viewMonth || monthKey();
    const headerCard = el(`<div class="bc-card" style="
        background: linear-gradient(135deg,#0A2540 0%,#1B4332 60%,#0A2540 100%);
        border: 1px solid rgba(255,215,0,0.3);
        padding: 1.5rem 1.4rem 1.1rem;
        position:relative; overflow:hidden; margin-bottom:0.75rem;">
      <div style="position:absolute;top:-20px;right:-10px;font-size:90px;opacity:0.08;line-height:1;pointer-events:none;">🏆</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.5rem;">
        <span style="font-size:28px; animation:crown-float 2.5s ease-in-out infinite; display:inline-block;">👑</span>
        <div>
          <h2 style="color:#FFD700; font-family:'Oswald',sans-serif; font-size:20px; margin:0; letter-spacing:0.05em;">BẢNG XẾP HẠNG</h2>
          <div style="color:rgba(255,255,255,0.65); font-size:12px; margin-top:2px;">Tích lũy XP từ việc tham gia & vote đúng giờ</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:0.6rem;" id="lb-month-bar">
        <button id="lb-tab-month" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,215,0,0.5); background:rgba(255,215,0,0.15); color:#FFD700; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">📅 Tháng này</button>
        <button id="lb-tab-all" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); font-size:13px; cursor:pointer; transition:all 0.2s;">🌐 Mùa giải hiện tại</button>
      </div>
    </div>`);
    wrap.appendChild(headerCard);

    // ---- Rank Legend ----
    const legendCard = el(`<div class="bc-card" style="padding:0.8rem 1.2rem; margin-bottom:0.75rem;">
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:0.5rem; font-weight:600; letter-spacing:0.04em;">CẤP ĐỘ TAY VỢT</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${XP_RANKS.map(r => `<div style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;
            background:${r.avatarBg}; color:${r.avatarFg};
            font-size:11px; font-weight:600; white-space:nowrap;
            ${r.shimmer ? 'background-size:200% auto;animation:xpRankShimmer 2.5s linear infinite;' : ''}
            border: 1px solid ${r.ringColor}40;">
          ${r.emoji} ${r.label} <span style="opacity:0.75;">(${r.min === 0 ? '0' : r.min}${r.max === Infinity ? '+' : '–'+r.max} XP)</span>
        </div>`).join('')}
      </div>
    </div>`);
    wrap.appendChild(legendCard);

    // ---- Roast Feed Container ----
    const roastBox = el(`<div id="roast-feed-box"></div>`);
    wrap.appendChild(roastBox);

    // ---- Main leaderboard container ----
    const lbContainer = el(`<div id="lb-main"></div>`);
    wrap.appendChild(lbContainer);


    // ---- My XP card (nếu đã đăng nhập) ----
    if (state.me) {
      const me = state.members.find(m => m.id === state.me.id);
      if (me) {
        const myXP = calculateMemberXP(me.id, state.sessions);
        const myRank = getXPRank(myXP);
        const myBadges = getMemberBadges(me.id, state.sessions);
        const nextRank = XP_RANKS.find(r => r.min > myXP);
        const progressPct = nextRank
          ? Math.min(100, Math.round((myXP - myRank.min) / (nextRank.min - myRank.min) * 100))
          : 100;
        const attended = countAttended(me.id, state.sessions);

        const myCard = el(`<div class="bc-card" style="
            border:2px solid ${myRank.ringColor}60;
            background: linear-gradient(135deg, ${myRank.avatarBg.replace('linear-gradient(135deg,','').replace(')','').split(',')[0].trim()}18 0%, transparent 100%);
            margin-bottom:0.75rem; padding:1rem 1.2rem;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.6rem;">THÀNH TÍCH CỦA BẠN</div>
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:0.75rem;">
            <div id="my-avatar-lb"></div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:700;color:var(--text-primary);">${escapeHtml(me.nickname || me.name)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
                <span style="font-size:18px;">${myRank.emoji}</span>
                <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">${myRank.label}</span>
                <span style="font-size:12px;color:var(--text-muted);margin-left:4px;">${myXP.toLocaleString()} XP</span>
              </div>
              <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
                ${myBadges.map(b => `<span title="${b.label}: ${b.desc}" style="background:${b.bg};color:${b.color};border:1px solid ${b.color}40;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600;">${b.emoji} ${b.label}</span>`).join('')}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:800;color:var(--text-primary);line-height:1;">${attended}</div>
              <div style="font-size:10px;color:var(--text-muted);">buổi tham gia</div>
            </div>
          </div>
          ${nextRank ? `
          <div style="margin-bottom:4px;display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">
            <span>Tiến độ lên ${nextRank.emoji} ${nextRank.label}</span>
            <span>${progressPct}%</span>
          </div>
          <div style="background:rgba(0,0,0,0.1);border-radius:99px;height:8px;overflow:hidden;">
            <div style="height:100%;border-radius:99px;background:${myRank.avatarBg};width:${progressPct}%;
              animation:xpBarFill 1s ease both; transition:width 0.5s ease;"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Cần thêm ${nextRank.min - myXP} XP để đạt ${nextRank.label}</div>` : `
          <div style="text-align:center;padding:6px;background:rgba(255,215,0,0.1);border-radius:8px;font-size:13px;font-weight:600;color:#D8973C;">
            🎉 Đã đạt cấp cao nhất — Huyền Thoại!
          </div>`}
        </div>`);
        myCard.querySelector('#my-avatar-lb').innerHTML = avatarHtml(me, 48, myXP);

        wrap.insertBefore(myCard, lbContainer);
      }
    }


    // ---- Build rankings ----
    const activeMembers = state.members.filter(m => m.status === 'active');
    let lbMode = state.lbMode || 'month'; // 'month' | 'all'

    function buildRankings(mode) {
      lbMode = mode;
      state.lbMode = mode;
      roastBox.innerHTML = '';
      roastBox.appendChild(renderRoastFeedCard(mode));

      state.tieVotes = state.tieVotes || {};
      const monthTieMap = state.tieVotes[curMonth] || {};
      const myTieVote = state.me ? monthTieMap[state.me.name] : null;


      const data = activeMembers.map(m => {
        const xp = mode === 'month'
          ? calculateMemberMonthXP(m.id, state.sessions, curMonth)
          : calculateMemberXP(m.id, state.sessions);
        const attended = countAttended(m.id, state.sessions);
        const tieVotes = getMemberTieVotes(m.name, curMonth);
        const monthAttended = (() => {
          const ms = state.sessions.filter(s => sessionMonthKey(s) === curMonth);
          return ms.filter(s => {
            const passes = s.passes || {};
            const v = (s.votes||{})[m.name];
            const ir = Object.values(passes).includes(m.id);
            const hp = Object.keys(passes).includes(m.id);
            if (!v && !ir) return false;
            return ir || (v==='yes' && !hp);
          }).length;
        })();
        return { m, xp, attended, tieVotes, monthAttended };
      }).sort((a, b) => b.xp - a.xp || b.tieVotes - a.tieVotes || b.attended - a.attended || a.m.name.localeCompare(b.m.name));

      lbContainer.innerHTML = '';

      // Check if there are ties among members with XP > 0
      const xpCounts = {};
      data.forEach(item => { if (item.xp > 0) xpCounts[item.xp] = (xpCounts[item.xp] || 0) + 1; });
      const hasTies = Object.values(xpCounts).some(cnt => cnt > 1);

      if (hasTies) {
        const tieBanner = el(`<div class="bc-card" style="
            background: linear-gradient(135deg, rgba(156,39,176,0.1) 0%, rgba(103,58,183,0.06) 100%);
            border: 1.5px dashed #9C27B0; border-radius:12px; padding:10px 14px; margin-bottom:0.75rem;">
          <div style="font-size:13px; font-weight:800; color:#9C27B0; display:flex; align-items:center; gap:6px; font-family:'Oswald',sans-serif;">
            <span style="font-size:16px;">🗳️</span>
            <span>KÈO BÌNH CHỌN PHÂN HẠNG ĐỒNG ĐIỂM (${monthLabel(curMonth)})</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:3px; line-height:1.35;">
            Có các thành viên đang <strong>bằng điểm XP</strong>! Mỗi người 1 phiếu vote để bình chọn tay vợt xứng đáng đứng vị trí cao hơn.
          </div>
        </div>`);
        lbContainer.appendChild(tieBanner);
      }

      // Update button styles
      const btnMonth = document.getElementById('lb-tab-month');
      const btnAll = document.getElementById('lb-tab-all');
      if (btnMonth && btnAll) {
        if (mode === 'month') {
          btnMonth.style.cssText = 'padding:5px 14px;border-radius:20px;border:1px solid rgba(255,215,0,0.5);background:rgba(255,215,0,0.2);color:#FFD700;font-size:13px;font-weight:700;cursor:pointer;';
          btnAll.style.cssText = 'padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:13px;cursor:pointer;';
        } else {
          btnAll.style.cssText = 'padding:5px 14px;border-radius:20px;border:1px solid rgba(255,215,0,0.5);background:rgba(255,215,0,0.2);color:#FFD700;font-size:13px;font-weight:700;cursor:pointer;';
          btnMonth.style.cssText = 'padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:13px;cursor:pointer;';
        }
      }

      if (data.length === 0) {
        lbContainer.appendChild(el(`<div class="bc-card" style="text-align:center;padding:30px;color:var(--text-muted);">Chưa có dữ liệu để xếp hạng.</div>`));
        return;
      }

      // Top 3 podium
      const podiumData = data.slice(0, 3);
      const podiumEl = el(`<div style="display:flex;gap:8px;align-items:flex-end;justify-content:center;margin-bottom:0.75rem;padding:0 4px;"></div>`);

      const podiumOrder = [1, 0, 2]; // visually: 2nd on left, 1st in middle, 3rd on right
      const podiumHeight = [100, 140, 80];
      const podiumMedals = ['👑', '🥈', '🥉']; // indexed by rank: 0=Top1, 1=Top2, 2=Top3
      const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      const podiumBgs = [
        'linear-gradient(180deg,rgba(255,215,0,0.25),rgba(255,215,0,0.08))',
        'linear-gradient(180deg,rgba(192,192,192,0.2),rgba(192,192,192,0.06))',
        'linear-gradient(180deg,rgba(205,127,50,0.2),rgba(205,127,50,0.06))'
      ];

      podiumOrder.forEach((dataIdx, visIdx) => {
        if (!podiumData[dataIdx]) return;
        const { m, xp, tieVotes } = podiumData[dataIdx];
        const isSelf = state.me && state.me.id === m.id;
        const hasVotedForM = myTieVote === m.name;
        const podItem = el(`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:${dataIdx===0?'24px':'18px'};animation:${dataIdx===0?'crown-float 2.5s ease-in-out infinite':'none'};display:inline-block;">${podiumMedals[dataIdx]}</div>
          <div id="pod-avatar-${m.id}" style="position:relative;"></div>
          <div style="text-align:center;">
            <div style="font-size:${dataIdx===0?'13px':'12px'};font-weight:700;color:var(--text-primary);line-height:1.2;">${escapeHtml(m.nickname||m.name)}${isSelf?' (Bạn)':''}</div>
            <div style="font-size:11px;color:${podiumColors[dataIdx]};font-weight:600;margin-top:2px;">${xp.toLocaleString()} XP</div>
            <button class="bc-btn small pod-tie-btn" id="pod-tie-${m.id}" style="
                background:${hasVotedForM ? '#9C27B0' : 'rgba(156,39,176,0.15)'};
                color:${hasVotedForM ? '#FFF' : '#9C27B0'};
                border:1px solid #9C27B0; padding:1px 6px; font-size:10px; font-weight:700; border-radius:10px; margin-top:2px; cursor:pointer;">
              ${hasVotedForM ? '✓ Đã vote' : '🗳️ Vote'} (${tieVotes})
            </button>
          </div>
          <div style="width:100%;height:${podiumHeight[visIdx]}px;background:${podiumBgs[dataIdx]};
            border-top:3px solid ${podiumColors[dataIdx]};border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:22px;font-weight:900;color:${podiumColors[dataIdx]};opacity:0.5;">${dataIdx+1}</span>
          </div>
        </div>`);
        podItem.querySelector(`#pod-avatar-${m.id}`).innerHTML = avatarHtml(m, dataIdx===0 ? 52 : 42, xp);

        
        const ptBtn = podItem.querySelector(`#pod-tie-${m.id}`);
        if (ptBtn) ptBtn.onclick = (e) => {
          e.stopPropagation();
          if (!state.me) { alert('Vui lòng đăng nhập để bình chọn phân hạng!'); return; }
          const myName = state.me.name;
          state.tieVotes = state.tieVotes || {};
          state.tieVotes[curMonth] = state.tieVotes[curMonth] || {};
          if (state.tieVotes[curMonth][myName] === m.name) {
            delete state.tieVotes[curMonth][myName];
          } else {
            state.tieVotes[curMonth][myName] = m.name;
          }
          saveTieVotes();
          render();
          showToast(`🗳️ Đã cập nhật phiếu bình chọn cho ${m.name}!`, 'success');
        };

        podiumEl.appendChild(podItem);
      });

      if (podiumData.length > 0) lbContainer.appendChild(podiumEl);

      // Top 10 list
      const listEl = el(`<div></div>`);
      const top10Data = data.slice(0, 10);
      top10Data.forEach(({ m, xp, attended, tieVotes, monthAttended }, idx) => {
        const rank = getXPRank(xp);
        const isSelf = state.me && state.me.id === m.id;
        const mBadges = getMemberBadges(m.id, state.sessions);
        const rankClass = idx === 0 ? 'lb-top1' : idx === 1 ? 'lb-top2' : idx === 2 ? 'lb-top3' : '';
        const topIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        const maxXP = data[0].xp || 1;
        const barPct = Math.max(2, Math.round((xp / maxXP) * 100));
        const hasVotedForM = myTieVote === m.name;

        const row = el(`<div class="bc-card lb-row ${rankClass}" style="padding:0.7rem 1rem;margin-bottom:0.5rem;animation-delay:${idx*0.04}s;transition:transform 0.15s,box-shadow 0.15s;cursor:default;"
          onmouseenter="this.style.transform='translateX(2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'"
          onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="min-width:26px;text-align:center;font-size:${idx<3?'18px':'14px'};font-weight:700;color:${idx<3?'var(--text-primary)':'var(--text-muted)'};">
              ${topIcon || (idx+1)}
            </div>
            <div id="lb-avatar-${m.id}-${idx}" style="flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-size:14px;font-weight:${isSelf?'700':'600'};color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.nickname||m.name)}</span>
                ${isSelf ? '<span style="font-size:10px;background:#E6F1FB;color:#0C447C;padding:1px 6px;border-radius:99px;font-weight:700;">Bạn</span>' : ''}
                <span style="font-size:11px;opacity:0.75;">${rank.emoji} ${rank.label}</span>
                ${mBadges.map(b => `<span title="${b.label}: ${b.desc}" style="font-size:12px;">${b.emoji}</span>`).join('')}
              </div>
              <div style="margin-top:4px;background:rgba(0,0,0,0.07);border-radius:99px;height:5px;overflow:hidden;">
                <div style="height:100%;border-radius:99px;background:${rank.avatarBg};width:${barPct}%;
                  animation:xpBarFill 0.8s ease both;animation-delay:${0.1+idx*0.03}s;"></div>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;">
              <div style="font-size:15px;font-weight:800;color:var(--text-primary);line-height:1;">${xp.toLocaleString()}</div>
              <div style="font-size:10px;color:var(--text-muted);">XP</div>
              
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="bc-btn small tie-vote-btn" id="list-tie-${m.id}" style="
                    background:${hasVotedForM ? '#9C27B0' : 'rgba(156,39,176,0.1)'};
                    color:${hasVotedForM ? '#FFF' : '#9C27B0'};
                    border:1px solid #9C27B0; padding:2px 7px; font-size:10px; font-weight:700; border-radius:6px; cursor:pointer;">
                  ${hasVotedForM ? '✓ Đã vote' : '🗳️ Vote'} (${tieVotes})
                </button>
                ${!isSelf ? `<button class="bc-btn small lb-ch-btn" id="lb-ch-${m.id}" style="background:linear-gradient(135deg,#F26419,#E76F51);color:#FFF;border:none;padding:2px 7px;font-size:10px;font-weight:700;border-radius:6px;cursor:pointer;">⚡ Thách đấu</button>` : ''}
              </div>
            </div>
          </div>
        </div>`);

        row.querySelector(`#lb-avatar-${m.id}-${idx}`).innerHTML = avatarHtml(m, 34, xp);

        
        const chBtn = row.querySelector(`#lb-ch-${m.id}`);
        if (chBtn) chBtn.onclick = (e) => { e.stopPropagation(); openQuickChallengeModal(m); };

        const ltBtn = row.querySelector(`#list-tie-${m.id}`);
        if (ltBtn) ltBtn.onclick = (e) => {
          e.stopPropagation();
          if (!state.me) { alert('Vui lòng đăng nhập để bình chọn phân hạng!'); return; }
          const myName = state.me.name;
          state.tieVotes = state.tieVotes || {};
          state.tieVotes[curMonth] = state.tieVotes[curMonth] || {};
          if (state.tieVotes[curMonth][myName] === m.name) {
            delete state.tieVotes[curMonth][myName];
          } else {
            state.tieVotes[curMonth][myName] = m.name;
          }
          saveTieVotes();
          render();
          showToast(`🗳️ Đã cập nhật phiếu bình chọn cho ${m.name}!`, 'success');
        };

        listEl.appendChild(row);
      });
      lbContainer.appendChild(listEl);

      // XP explainer card
      const explainer = el(`<div class="bc-card" style="padding:0.9rem 1.2rem;margin-top:0.5rem;background:rgba(0,0,0,0.03);">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:0.5rem;">📖 CÁCH TÍNH XP, HUY HIỆU & ĐỒNG ĐIỂM (Chuẩn 4 buổi/tháng)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;color:var(--text-secondary);">
          <div>🏸 Tham gia buổi đánh <strong>+50 XP</strong></div>
          <div>⏰ Vote đúng giờ <strong>+15 XP</strong></div>
          <div>🔥 Chuỗi 2 buổi <strong>+30 XP</strong> | 4 buổi <strong>+50 XP</strong></div>
          <div>⚡ Thắng thách đấu <strong>+40 XP</strong></div>
          <div>⚔️ Thua thách đấu <strong>+15 XP</strong></div>
          <div>✍️ Tạo kèo thách đấu <strong>+15 XP</strong></div>
        </div>
        <div style="font-size:11.5px;color:#9C27B0;font-weight:600;margin-top:8px;padding-top:6px;border-top:1px dashed rgba(156,39,176,0.3);">
          🗳️ <strong>Quy tắc Đồng Điểm XP:</strong> Khi 2 hoặc nhiều thành viên bằng điểm XP, các thành viên khác trong CLB được bấm <strong>"🗳️ Vote"</strong> bình chọn. Người có nhiều lượt vote từ cộng đồng hơn sẽ được ưu tiên xếp trên!
        </div>
        ${canManage() ? `
        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(0,0,0,0.1); display:flex; justify-content:flex-end;">
          <button class="bc-btn danger small" id="reset-all-challenges-btn" style="padding:4px 10px; font-size:11px; font-weight:600;">
            🧹 Dọn dẹp & Reset tất cả kèo Thách đấu (${monthLabel(curMonth)})
          </button>
        </div>` : ''}
      </div>`);

      if (canManage()) {
        setTimeout(() => {
          const btn = explainer.querySelector('#reset-all-challenges-btn');
          if (btn) {
            btn.onclick = async () => {
              if (!confirm(`Bạn có chắc chắn muốn XÓA TẤT CẢ KÈO THÁCH ĐẤU THÁNG ${monthLabel(curMonth)} để trả lại điểm XP chuẩn (160 XP) cho tất cả thành viên?`)) return;
              const ok = await mutateSessions(latest => {
                latest.forEach(s => {
                  if (sessionMonthKey(s) === curMonth) {
                    s.challenges = [];
                  }
                });
                return latest;
              });

              if (ok) {
                state.announcements = (state.announcements || []).filter(a => !a.isChallengeResult);
                saveAnnouncements();
                render();
                showToast('Đã xóa tất cả kèo thách đấu và cập nhật lại điểm XP chuẩn cho mọi người!', 'success');
              }
            };
          }
        }, 0);
      }

      lbContainer.appendChild(explainer);
    }


    // Initial render
    buildRankings(state.lbMode || 'month');

    // Events
    setTimeout(() => {
      const btnMonth = document.getElementById('lb-tab-month');
      const btnAll = document.getElementById('lb-tab-all');
      if (btnMonth) btnMonth.onclick = () => buildRankings('month');
      if (btnAll) btnAll.onclick = () => buildRankings('all');
    }, 0);

    return wrap;
  }

  // ---------- TOURNAMENT ----------

function renderTournament(){
    const wrap = el(`<div></div>`);
    
    const banner = el(`<div class="bc-card" style="
        background: linear-gradient(135deg, #FF3D00 0%, #FF8F00 100%);
        border: 1px solid rgba(255,255,255,0.3);
        padding: 1.5rem 1.4rem;
        position:relative; overflow:hidden; margin-bottom:1rem; box-shadow: 0 4px 15px rgba(255,61,0,0.3);">
      <div style="position:absolute;top:-20px;right:-10px;font-size:100px;opacity:0.15;line-height:1;pointer-events:none;">🏸</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:32px; animation:crown-float 2.5s ease-in-out infinite; display:inline-block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🔥</span>
        <div>
          <h2 style="color:#FFF; font-family:'Oswald',sans-serif; font-size:22px; margin:0; letter-spacing:0.05em; text-transform:uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">HỆ THỐNG GIẢI ĐẤU CLB</h2>
          <div style="color:rgba(255,255,255,0.9); font-size:12px; margin-top:2px;">Nơi tôn vinh những tay vợt xuất sắc nhất</div>
        </div>
      </div>
    </div>`);
    wrap.appendChild(banner);

    const activeTour = state.tournaments.find(t => t.status !== 'finished');
    const finishedTours = state.tournaments.filter(t => t.status === 'finished').sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    // CREATE NEW TOURNAMENT UI
    if (!activeTour) {
      if (canManage()) {
        state.tourSetup = state.tourSetup || {
          name: 'Giải Cầu Lông Mùa Hè',
          categories: ['Đôi Nam'],
          courtsCount: 4,
          selectedCourts: state.courts.slice(0, 4).map(c => c.id)
        };

        const setupCard = el(`<div class="bc-card" style="border: 2px dashed #FF8F00; margin-bottom:20px;">
          <h3 style="font-size:16px; color:#D84315; margin-bottom:15px; font-family:'Oswald', sans-serif;">🛠️ KHỞI TẠO GIẢI ĐẤU MỚI</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Tên giải đấu</label>
              <input class="bc-input" id="ts-name" value="${escapeHtml(state.tourSetup.name)}" placeholder="VD: Giải Cầu Lông Aron Smash 2026" />
            </div>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Số lượng sân</label>
                <select class="bc-select" id="ts-courts-count">
                  <option value="2" ${state.tourSetup.courtsCount===2?'selected':''}>2 Sân</option>
                  <option value="3" ${state.tourSetup.courtsCount===3?'selected':''}>3 Sân</option>
                  <option value="4" ${state.tourSetup.courtsCount===4?'selected':''}>4 Sân</option>
                </select>
              </div>
              <div style="flex:2; min-width:200px;">
                <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Chọn sân thi đấu</label>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
                  ${state.courts.map(c => {
                    const checked = state.tourSetup.selectedCourts.includes(c.id) ? 'checked' : '';
                    return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                      <input type="checkbox" class="ts-court-chk" value="${c.id}" ${checked} /> ${escapeHtml(c.name)}
                    </label>`;
                  }).join(' ')}
                </div>
              </div>
            </div>
            <div style="border-top:1px dashed #E3E0D6; padding-top:12px;">
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Hạng mục thi đấu</label>
              <div style="display:flex; gap:16px; flex-wrap:wrap;">
                ${['Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ'].map(cat => {
                  const checked = state.tourSetup.categories.includes(cat) ? 'checked' : '';
                  return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600;">
                    <input type="checkbox" class="ts-cat-chk" value="${cat}" ${checked} /> 🏸 ${cat}
                  </label>`;
                }).join(' ')}
              </div>
            </div>
            <div style="text-align:right; margin-top:10px;">
              <button class="bc-btn" id="ts-start-btn" style="background:#FF3D00; border-color:#FF3D00; font-size:14px; padding:10px 20px;">
                Mở Cổng Đăng Ký 🚀
              </button>
            </div>
          </div>
        </div>`);
        wrap.appendChild(setupCard);

        setTimeout(() => {
          document.getElementById('ts-start-btn').onclick = async () => {
            const name = document.getElementById('ts-name').value.trim();
            const count = parseInt(document.getElementById('ts-courts-count').value, 10);
            const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
            const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
            
            if (!name) return alert('Vui lòng nhập tên giải đấu!');
            if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 sân!');
            if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
            
            const newTour = {
              id: uid(),
              name,
              categories: selCats,
              courtsCount: count,
              selectedCourts: selCourts,
              status: 'registering',
              registrations: [],
              pairs: [],
              groups: [],
              matches: [],
              bracket: null,
              createdAt: new Date().toISOString()
            };
            
            await mutateTournaments(tours => {
               tours.push(newTour);
               return tours;
            });
            state.tourSetup = null;
            render();
          };
        }, 0);
      }
    }

    // ACTIVE TOURNAMENT TABS
    if (activeTour) {
       // Set default tab based on status if not set
       if (!state.tourActiveTab) {
          if (activeTour.status === 'registering') state.tourActiveTab = 'reg';
          else if (activeTour.status === 'playing') state.tourActiveTab = 'group';
          else if (activeTour.status === 'knockout') state.tourActiveTab = 'knockout';
       }

       const isRegTab = state.tourActiveTab === 'reg';
       const isGroupTab = state.tourActiveTab === 'group';
       const isKnockoutTab = state.tourActiveTab === 'knockout';

       const tabsUI = el(`<div style="display:flex; border-bottom:2px solid #E0E0E0; margin-bottom:20px; position:sticky; top:0; background:#FAFAFA; z-index:10;">
         <div class="bc-tab ${isRegTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isRegTab?'#E65100':'#666'}; border-bottom:${isRegTab?'3px solid #E65100':'none'};" id="tt-reg">📝 Ghi Danh</div>
         ${activeTour.status === 'playing' || activeTour.status === 'knockout' ? `<div class="bc-tab ${isGroupTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isGroupTab?'#2E7D32':'#666'}; border-bottom:${isGroupTab?'3px solid #2E7D32':'none'};" id="tt-group">⚔️ Vòng Bảng</div>` : ''}
         ${activeTour.status === 'knockout' ? `<div class="bc-tab ${isKnockoutTab ? 'active' : ''}" style="flex:1; text-align:center; padding:12px; font-weight:bold; cursor:pointer; color:${isKnockoutTab?'#3F51B5':'#666'}; border-bottom:${isKnockoutTab?'3px solid #3F51B5':'none'};" id="tt-knockout">🏆 Nhánh Đấu (Knockout)</div>` : ''}
       </div>`);
       wrap.appendChild(tabsUI);

       setTimeout(() => {
          document.getElementById('tt-reg').onclick = () => { state.tourActiveTab = 'reg'; render(); };
          if(document.getElementById('tt-group')) document.getElementById('tt-group').onclick = () => { state.tourActiveTab = 'group'; render(); };
          if(document.getElementById('tt-knockout')) document.getElementById('tt-knockout').onclick = () => { state.tourActiveTab = 'knockout'; render(); };
       }, 0);

       // Active Tour Header
       wrap.appendChild(el(`<div class="bc-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:#FFF3E0; border:1px solid #FFB74D; margin-bottom:1rem;">
          <div>
             <h3 style="font-size:20px; color:#E65100; font-family:'Oswald',sans-serif; margin-bottom:5px;">${escapeHtml(activeTour.name)}</h3>
             <div style="font-size:12px; color:#F57C00; font-weight:600;">Tình trạng: ${activeTour.status.toUpperCase()}</div>
          </div>
          ${canManage() || state.me?.role === 'owner' ? `<div>
             <button class="bc-btn danger small" id="delete-tour-btn">🗑️ Xóa</button>
          </div>` : ''}
       </div>`));

       setTimeout(() => {
          const delBtn = document.getElementById('delete-tour-btn');
          if (delBtn) delBtn.onclick = async () => {
             if(!confirm('Bạn có chắc chắn muốn xóa Giải đấu này? Toàn bộ đăng ký và kết quả sẽ biến mất vĩnh viễn!')) return;
             await mutateTournaments(tours => {
                return tours.filter(t => t.id !== activeTour.id);
             });
             state.tourActiveTab = null;
             showToast('Đã xóa giải đấu', 'success');
             render();
          };
       }, 0);

       // TAB 1: REGISTRATION
       if (isRegTab) {
          const activeMembers = state.members.filter(m => m.status === 'active');
          activeTour.registrations = activeTour.registrations || [];
          const myRegs = activeTour.registrations.filter(r => r.m1 === state.me?.id || r.m2 === state.me?.id);
          const isManager = canManage();

          if (activeTour.status === 'registering') {
              if (state.me) {
                if (myRegs.length > 0) {
                  wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; text-align:center; padding:15px; color:#27500A; background:#EAF3DE; font-weight:600; font-size:14px; border:1px solid #27500A;">
                    🎉 Bạn đã ghi danh các hạng mục: ${myRegs.map(r => r.cat).join(', ')}. Chúc bạn thi đấu tốt! 💪
                  </div>`));
                }
                const regCard = el(`<div class="bc-card" style="margin-bottom:1rem; border:2px solid #27500A;">
                  <h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
                  <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                    ${isManager ? `
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#E65100;">VĐV Ghi danh (Admin)</label>
                      <select class="bc-select" id="reg-m1" style="border-color:#E65100;">
                        <option value="${state.me.id}">-- Chính bạn --</option>
                        ${activeMembers.filter(m => m.id !== state.me.id).map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    ` : ''}
                    <div style="flex:1; min-width:140px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn hạng mục</label>
                      <select class="bc-select" id="reg-cat">
                        ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px;">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Hình thức đăng ký</label>
                      <select class="bc-select" id="reg-type">
                        <option value="solo">Cá nhân (Tìm đồng đội)</option>
                        <option value="pair">Nguyên cặp (Đã có partner)</option>
                      </select>
                    </div>
                    <div style="flex:1.5; min-width:180px; display:none;" id="reg-partner-box">
                      <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn Partner</label>
                      <select class="bc-select" id="reg-partner">
                        <option value="">-- Chọn thành viên --</option>
                        ${activeMembers.map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
                      </select>
                    </div>
                    <button class="bc-btn" id="reg-submit-btn" style="background:#27500A; border-color:#27500A;">Ghi danh ngay!</button>
                  </div>
                </div>`);
                wrap.appendChild(regCard);
                
                setTimeout(() => {
                  const typeSel = document.getElementById('reg-type');
                  const pBox = document.getElementById('reg-partner-box');
                  if(typeSel) typeSel.onchange = () => { pBox.style.display = typeSel.value==='pair'?'block':'none'; };
                  
                  document.getElementById('reg-submit-btn').onclick = async () => {
                    const cat = document.getElementById('reg-cat').value;
                    const type = document.getElementById('reg-type').value;
                    let m2 = null;
                    const m1_id = isManager ? (document.getElementById('reg-m1') ? document.getElementById('reg-m1').value : state.me.id) : state.me.id;
                    if (!m1_id) return alert('Vui lòng chọn VĐV cần đăng ký hộ!');
                    const me = state.members.find(m => m.id === m1_id);
                    if (!me) return;
                    if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === m1_id || r.m2 === m1_id))) return alert(`VĐV này đã đăng ký hạng mục ${cat} rồi!`);
                    
                    if (type === 'pair') {
                      m2 = document.getElementById('reg-partner').value;
                      if (!m2) return alert('Vui lòng chọn Partner!');
                      if (m2 === m1_id) return alert('Không thể chọn chính mình làm Partner!');
                      const p2 = state.members.find(m => m.id === m2);
                      if (!p2) return;
                      if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === p2.id || r.m2 === p2.id))) return alert(`Partner này đã đăng ký hạng mục ${cat} rồi!`);
                      
                      if (cat === 'Đôi Nam' && (me.gender === 'Nữ' || p2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
                      if (cat === 'Đôi Nữ' && ((me.gender||'Nam') === 'Nam' || (p2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
                      if (cat === 'Đôi Nam Nữ') {
                        const g1 = me.gender || 'Nam';
                        const g2 = p2.gender || 'Nam';
                        if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
                      }
                    } else {
                      if (cat === 'Đôi Nam' && me.gender === 'Nữ') return alert('Bạn là Nữ, không thể đăng ký Đôi Nam!');
                      if (cat === 'Đôi Nữ' && (me.gender||'Nam') === 'Nam') return alert('Bạn là Nam, không thể đăng ký Đôi Nữ!');
                    }
                    
                    await mutateTournaments(tours => {
                      const tour = tours.find(t => t.id === activeTour.id);
                      if (tour) {
                         tour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, createdAt: Date.now() });
                      }
                      return tours;
                    });
                    showToast('Đăng ký thành công!', 'success');
                    render();
                  };
                }, 0);
              }
          } else {
              wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; padding:15px; color:#5D4037; background:#EFEBE9; text-align:center;">🔒 Giai đoạn đăng ký đã khép lại. Dưới đây là danh sách VĐV.</div>`));
          }

          const listCard = el(`<div class="bc-card" style="margin-bottom:1rem;">
            <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">📋 Danh sách VĐV Ghi Danh (${activeTour.registrations.length} lượt)</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${activeTour.registrations.length === 0 ? '<div class="bc-empty" style="padding:10px;">Chưa có ai đăng ký.</div>' : ''}
              ${activeTour.registrations.map(r => {
                const p1 = state.members.find(m => m.id === r.m1);
                const p2 = r.m2 ? state.members.find(m => m.id === r.m2) : null;
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8F9FA; border:1px solid #E9ECEF; border-radius:6px;">
                  <div>
                    <span class="bc-badge" style="background:#E3F2FD; color:#1565C0; margin-right:8px;">${r.cat}</span>
                    <strong style="font-size:13px; color:#333;">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                    ${r.type === 'pair' && p2 ? `<span style="color:#888; font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:#333;">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'}` : `<span style="font-size:11px; color:#E65100; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
                  </div>
                  ${canManage() && activeTour.status === 'registering' ? `<button class="bc-btn danger small" id="del-reg-${r.id}">Xóa</button>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>`);
          wrap.appendChild(listCard);
          
          if (canManage() && activeTour.status === 'registering') {
            const pairingCard = el(`<div class="bc-card" style="border: 2px solid #1B4332;">
              <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">👥 BTC Cáp Kèo (Cho các VĐV đăng ký Solo)</h4>
              <div style="font-size:12px; color:#666; margin-bottom:10px;">Chọn 2 VĐV từ danh sách đăng ký lẻ để ghép thành 1 cặp chính thức. Các cặp đã "Đăng ký nguyên cặp" sẽ được gom tự động khi chốt.</div>
              
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
                <div style="flex:1; min-width:140px;">
                  <select class="bc-select" id="pair-m1">
                    <option value="">- VĐV 1 -</option>
                    ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                      const m = state.members.find(x => x.id === r.m1);
                      return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                    }).join('')}
                  </select>
                </div>
                <div style="flex:1; min-width:140px;">
                  <select class="bc-select" id="pair-m2">
                    <option value="">- VĐV 2 -</option>
                    ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                      const m = state.members.find(x => x.id === r.m1);
                      return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                    }).join('')}
                  </select>
                </div>
                <div style="flex:1; min-width:120px;">
                  <select class="bc-select" id="pair-target-cat">
                    ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <button class="bc-btn" id="pair-merge-btn">Ghép cặp</button>
              </div>

              <div style="margin-top:20px; text-align:right; border-top:1px dashed #CCC; padding-top:15px;">
                <button class="bc-btn danger" id="tour-lock-reg-btn" style="font-size:14px; padding:10px 20px;">
                  🔒 CHỐT DANH SÁCH & BẮT ĐẦU CHIA BẢNG
                </button>
              </div>
            </div>`);
            wrap.appendChild(pairingCard);
            
            setTimeout(() => {
              activeTour.registrations.forEach(r => {
                const btn = document.getElementById(`del-reg-${r.id}`);
                if(btn) btn.onclick = async () => {
                  await mutateTournaments(tours => {
                     const tour = tours.find(t => t.id === activeTour.id);
                     if (tour) tour.registrations = tour.registrations.filter(x => x.id !== r.id);
                     return tours;
                  });
                  render();
                };
              });

              document.getElementById('pair-merge-btn').onclick = async () => {
                const r1Id = document.getElementById('pair-m1').value;
                const r2Id = document.getElementById('pair-m2').value;
                const tCat = document.getElementById('pair-target-cat').value;
                if (!r1Id || !r2Id || r1Id === r2Id) return alert('Vui lòng chọn 2 VĐV hợp lệ!');
                
                const r1 = activeTour.registrations.find(x => x.id === r1Id);
                const r2 = activeTour.registrations.find(x => x.id === r2Id);
                const m1 = state.members.find(x => x.id === r1.m1);
                const m2 = state.members.find(x => x.id === r2.m1);
                
                if (tCat === 'Đôi Nam' && (m1.gender === 'Nữ' || m2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
                if (tCat === 'Đôi Nữ' && ((m1.gender||'Nam') === 'Nam' || (m2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
                if (tCat === 'Đôi Nam Nữ') {
                  const g1 = m1.gender || 'Nam';
                  const g2 = m2.gender || 'Nam';
                  if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
                }
                
                await mutateTournaments(tours => {
                    const tour = tours.find(t => t.id === activeTour.id);
                    if (tour) {
                       const tr1 = tour.registrations.find(x => x.id === r1Id);
                       if (tr1) {
                          tr1.type = 'pair';
                          tr1.m2 = m2.id;
                          tr1.cat = tCat;
                       }
                       tour.registrations = tour.registrations.filter(x => x.id !== r2Id);
                    }
                    return tours;
                });
                showToast('Ghép cặp thành công!', 'success');
                render();
              };
              
              document.getElementById('tour-lock-reg-btn').onclick = async () => {
                if(!confirm('Xác nhận chốt danh sách đăng ký? Hệ thống sẽ chuyển sang giai đoạn thi đấu!')) return;
                
                const pairs = activeTour.registrations.filter(r => r.type === 'pair').map((r, i) => {
                  const p1 = state.members.find(x => x.id === r.m1);
                  const p2 = state.members.find(x => x.id === r.m2);
                  return {
                    id: 'P' + Date.now() + i,
                    m1: r.m1,
                    m2: r.m2,
                    cat: r.cat,
                    name: `${p1.nickname||p1.name} & ${p2.nickname||p2.name}`
                  };
                });

                const groups = [];
                const matches = [];
                for (const cat of activeTour.categories) {
                   const catPairs = pairs.filter(p => p.cat === cat);
                   if (catPairs.length === 0) continue;
                   
                   const numGroups = Math.max(1, Math.floor(catPairs.length / 4));
                   const shuffled = [...catPairs].sort(() => Math.random() - 0.5);
                   for (let i = 0; i < numGroups; i++) {
                       const gId = 'G' + Date.now() + i + cat.replace(/\s/g,'');
                       const groupName = `Bảng ${String.fromCharCode(65 + i)} - ${cat}`;
                       const groupPairs = shuffled.filter((_, idx) => idx % numGroups === i);
                       groups.push({ id: gId, cat, name: groupName, pairs: groupPairs.map(p => p.id) });
                       
                       for (let a = 0; a < groupPairs.length; a++) {
                          for (let b = a + 1; b < groupPairs.length; b++) {
                             matches.push({
                                id: 'M' + Date.now() + a + b + gId,
                                groupId: gId,
                                cat: cat,
                                p1: groupPairs[a].id,
                                p2: groupPairs[b].id,
                                score1: null,
                                score2: null,
                                status: 'pending'
                             });
                          }
                       }
                   }
                }

                const remainingSolo = activeTour.registrations.filter(r => r.type === 'solo').length;
                if (remainingSolo > 0) alert(`Lưu ý: Có ${remainingSolo} VĐV đăng ký lẻ chưa được ghép cặp và sẽ KHÔNG được đưa vào danh sách thi đấu.`);
                
                await mutateTournaments(tours => {
                   const tour = tours.find(t => t.id === activeTour.id);
                   if (tour) {
                      tour.pairs = pairs;
                      tour.groups = groups;
                      tour.matches = matches;
                      tour.status = 'playing';
                   }
                   return tours;
                });
                state.tourActiveTab = 'group';
                showToast('Đã chốt danh sách thi đấu và chia bảng!', 'success');
                render();
              };
            }, 0);
          }
       }

       // TAB 2: GROUP STAGE
       if (isGroupTab) {
          const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
          
          (activeTour.groups || []).forEach(g => {
             const gMatches = (activeTour.matches || []).filter(m => m.groupId === g.id);
             
             const standings = (g.pairs || []).map(pId => {
                const pair = activeTour.pairs.find(p => p.id === pId);
                let played = 0, won = 0, lost = 0, diff = 0;
                gMatches.forEach(m => {
                   if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                      played++;
                      const isP1 = m.p1 === pId;
                      const myScore = isP1 ? m.score1 : m.score2;
                      const oppScore = isP1 ? m.score2 : m.score1;
                      if (myScore > oppScore) won++; else if (myScore < oppScore) lost++;
                      diff += (myScore - oppScore);
                   }
                });
                return { pId, name: pair?.name, played, won, lost, diff, points: won * 3 };
             }).sort((a, b) => b.points - a.points || b.diff - a.diff);

             const groupCard = el(`<div class="bc-card" style="border-left: 4px solid #FF8F00;">
               <h4 style="color:#FF6F00; font-size:16px; margin-bottom:10px;">🏆 ${escapeHtml(g.name)}</h4>
               <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
                 
                 <div style="flex:1; min-width:300px;">
                   <table class="bc-table" style="font-size:12px; width:100%; border-collapse:collapse;">
                     <thead><tr style="background:#F5F5F5; text-align:left;">
                       <th style="padding:8px;">VT</th><th style="padding:8px;">Cặp đấu</th><th style="padding:8px;">Trận</th><th style="padding:8px;">T/B</th><th style="padding:8px;">HS</th><th style="padding:8px;">Điểm</th>
                     </tr></thead>
                     <tbody>
                       ${standings.map((s, i) => `<tr style="border-bottom:1px solid #EEE;">
                         <td style="padding:8px; font-weight:bold; color:${i<2?'#2E7D32':'#666'}">${i+1}</td>
                         <td style="padding:8px;">${escapeHtml(s.name)}</td>
                         <td style="padding:8px;">${s.played}</td>
                         <td style="padding:8px;">${s.won}/${s.lost}</td>
                         <td style="padding:8px;">${s.diff > 0 ? '+'+s.diff : s.diff}</td>
                         <td style="padding:8px; font-weight:bold;">${s.points}</td>
                       </tr>`).join('')}
                     </tbody>
                   </table>
                 </div>

                 <div style="flex:1.5; min-width:320px; display:flex; flex-direction:column; gap:10px;">
                   ${gMatches.map(m => {
                     const p1 = activeTour.pairs.find(x => x.id === m.p1);
                     const p2 = activeTour.pairs.find(x => x.id === m.p2);
                     return `<div style="border:1px solid #E0E0E0; border-radius:8px; padding:10px; background:${m.status==='finished'?'#F5F5F5':'#FFF'}; position:relative;">
                       ${m.status === 'live' ? `<span style="position:absolute; top:-8px; left:10px; background:#D32F2F; color:#FFF; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; animation: pulse 1.5s infinite;">LIVE</span>` : ''}
                       <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div style="flex:1; font-size:13px; font-weight:${m.score1 > m.score2 ? 'bold':'normal'};">${escapeHtml(p1?.name)}</div>
                         <div style="padding:0 10px; white-space:nowrap;">
                            ${canManage() ? 
                              `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" /> - 
                               <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" />` 
                              : `<span style="font-size:16px; font-weight:bold; color:#1565C0;">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                            }
                         </div>
                         <div style="flex:1; font-size:13px; text-align:right; font-weight:${m.score2 > m.score1 ? 'bold':'normal'};">${escapeHtml(p2?.name)}</div>
                       </div>
                       ${canManage() ? `
                         <div style="text-align:center; margin-top:8px;">
                           <button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:#0288D1; color:#FFF; font-size:11px; padding:4px 10px;">Lưu Tỷ số</button>
                         </div>
                       ` : ''}
                     </div>`;
                   }).join('')}
                 </div>

               </div>
             </div>`);
             groupsContainer.appendChild(groupCard);

             setTimeout(() => {
                gMatches.forEach(m => {
                   const btn = document.getElementById(`update-match-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`s1-${m.id}`).value;
                         const s2Str = document.getElementById(`s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         
                         let status = m.status;
                         if (s1 !== null && s2 !== null) status = 'finished';
                         else if (s1 !== null || s2 !== null) status = 'live';
                         else status = 'pending';

                         await mutateTournaments(tours => {
                            const t = tours.find(x => x.id === activeTour.id);
                            if (t) {
                               const match = t.matches.find(x => x.id === m.id);
                               if (match) {
                                  match.score1 = s1;
                                  match.score2 = s2;
                                  match.status = status;
                               }
                            }
                            return tours;
                         });
                         render();
                      };
                   }
                });
             }, 0);
          });
          wrap.appendChild(groupsContainer);

          if (canManage() && activeTour.status === 'playing') {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #4CAF50;">
                <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT</button>
             </div>`));

             setTimeout(() => {
                const btn = document.getElementById('tour-to-knockout-btn');
                if (btn) btn.onclick = async () => {
                   if (!confirm('Chốt vòng bảng? Hệ thống sẽ tạo sơ đồ thi đấu loại trực tiếp.')) return;
                   
                   const bracket = {}; 
                   for (const cat of activeTour.categories) {
                      const catGroups = activeTour.groups.filter(g => g.cat === cat);
                      if (catGroups.length === 0) continue;
                      
                      let advancingPairs = [];
                      catGroups.forEach(g => {
                         const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                         const standings = g.pairs.map(pId => {
                            let won = 0, diff = 0;
                            gMatches.forEach(m => {
                               if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                                  const isP1 = m.p1 === pId;
                                  const myScore = isP1 ? m.score1 : m.score2;
                                  const oppScore = isP1 ? m.score2 : m.score1;
                                  if (myScore > oppScore) won++;
                                  diff += (myScore - oppScore);
                               }
                            });
                            return { pId, points: won * 3, diff };
                         }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                         
                         advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                      });
                      
                      if (catGroups.length === 1) {
                         const g = catGroups[0];
                         const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                         const standings = g.pairs.map(pId => {
                            let won = 0, diff = 0;
                            gMatches.forEach(m => {
                               if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                                  const isP1 = m.p1 === pId;
                                  const myScore = isP1 ? m.score1 : m.score2;
                                  const oppScore = isP1 ? m.score2 : m.score1;
                                  if (myScore > oppScore) won++;
                                  diff += (myScore - oppScore);
                               }
                            });
                            return { pId, points: won * 3, diff };
                         }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                         advancingPairs = standings.slice(0, 4).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id }));
                      }
                      
                      advancingPairs.sort((a, b) => a.groupRank - b.groupRank);
                      let final4 = advancingPairs.slice(0, 4).map(x => x.pId);
                      if (final4.length === 3) final4.push(null); 
                      
                      if (final4.length >= 2) {
                         bracket[cat] = [
                            { id: 'K1'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 1', p1: final4[0], p2: final4[3] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                            { id: 'K2'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 2', p1: final4[1], p2: final4[2] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                            { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: null, p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                         ];
                         if (!final4[3]) {
                            bracket[cat][0].status = 'finished';
                            bracket[cat][0].score1 = 21; bracket[cat][0].score2 = 0;
                            bracket[cat][2].p1 = final4[0];
                         }
                      } else if (final4.length === 1) {
                         bracket[cat] = [
                            { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: final4[0], p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                         ];
                      }
                   }

                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) {
                         t.bracket = bracket;
                         t.status = 'knockout';
                      }
                      return tours;
                   });
                   state.tourActiveTab = 'knockout';
                   showToast('Tạo nhánh đấu thành công!', 'success');
                   render();
                };
             }, 0);
          }
       }

       // TAB 3: KNOCKOUT
       if (isKnockoutTab) {
          const bracketContainer = el(`<div style="display:flex; flex-direction:column; gap:30px;"></div>`);
          Object.keys(activeTour.bracket || {}).forEach(cat => {
             const matches = activeTour.bracket[cat];
             const semis = matches.filter(m => m.round === 'Bán kết');
             const finals = matches.filter(m => m.round === 'Chung kết');
             
             const catCard = el(`<div class="bc-card" style="border: 2px solid #3F51B5; border-radius:12px; overflow:hidden; padding:0;">
                <div style="background:#3F51B5; color:#FFF; padding:10px 15px; font-weight:bold; font-size:16px;">🏸 ${cat}</div>
                <div style="padding:20px; display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:30px; background:linear-gradient(to right, #FAFAFA, #FFF);">
                   
                   ${semis.length > 0 ? `<div style="display:flex; flex-direction:column; gap:40px; flex:1; min-width:280px;">
                     ${semis.map(m => {
                        const p1 = activeTour.pairs.find(x => x.id === m.p1);
                        const p2 = activeTour.pairs.find(x => x.id === m.p2);
                        return `<div style="border:1px solid #CCC; border-radius:8px; padding:12px; background:${m.status==='finished'?'#F5F5F5':'#FFF'}; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
                          <div style="font-size:12px; color:#666; margin-bottom:8px; text-transform:uppercase; font-weight:bold; border-bottom:1px solid #EEE; padding-bottom:5px;">${m.name}</div>
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                             <span style="font-size:14px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#2E7D32':'#333'}">${p1 ? escapeHtml(p1.name) : '---'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score1!==null?m.score1:'-'}</strong>`}
                          </div>
                          <div style="display:flex; justify-content:space-between; align-items:center;">
                             <span style="font-size:14px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#2E7D32':'#333'}">${p2 ? escapeHtml(p2.name) : '---'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score2!==null?m.score2:'-'}</strong>`}
                          </div>
                          ${canManage() && p1 && p2 ? `<div style="text-align:center; margin-top:12px;"><button class="bc-btn small" id="k-update-${m.id}" style="background:#3F51B5; border-color:#3F51B5;">Lưu</button></div>` : ''}
                        </div>`;
                     }).join('')}
                   </div>` : ''}

                   <div style="display:flex; flex-direction:column; gap:40px; flex:1.2; min-width:300px;">
                     ${finals.map(m => {
                        const p1 = activeTour.pairs.find(x => x.id === m.p1);
                        const p2 = activeTour.pairs.find(x => x.id === m.p2);
                        return `<div style="border:2px solid #FFD700; border-radius:10px; padding:20px; background:#FFFDE7; box-shadow:0 6px 15px rgba(255,215,0,0.3); transform: scale(1.05);">
                          <div style="font-size:16px; color:#F57F17; margin-bottom:12px; text-transform:uppercase; font-weight:bold; text-align:center; border-bottom:1px dashed #FBC02D; padding-bottom:8px;">🏆 ${m.name}</div>
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                             <span style="font-size:15px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#D84315':'#333'}">${p1 ? escapeHtml(p1.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score1!==null?m.score1:'-'}</strong>`}
                          </div>
                          <div style="display:flex; justify-content:space-between; align-items:center;">
                             <span style="font-size:15px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#D84315':'#333'}">${p2 ? escapeHtml(p2.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                             ${canManage() && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score2!==null?m.score2:'-'}</strong>`}
                          </div>
                          ${canManage() && p1 && p2 ? `<div style="text-align:center; margin-top:15px;"><button class="bc-btn" id="k-update-${m.id}" style="background:#F57F17; border-color:#F57F17; padding:8px 20px; font-size:14px;">Lưu Chung Kết</button></div>` : ''}
                        </div>`;
                     }).join('')}
                   </div>

                </div>
             </div>`);
             bracketContainer.appendChild(catCard);

             setTimeout(() => {
                matches.forEach(m => {
                   const btn = document.getElementById(`k-update-${m.id}`);
                   if (btn) {
                      btn.onclick = async () => {
                         const s1Str = document.getElementById(`k-s1-${m.id}`).value;
                         const s2Str = document.getElementById(`k-s2-${m.id}`).value;
                         let s1 = s1Str === '' ? null : parseInt(s1Str, 10);
                         let s2 = s2Str === '' ? null : parseInt(s2Str, 10);
                         let status = (s1 !== null && s2 !== null) ? 'finished' : 'pending';

                         await mutateTournaments(tours => {
                            const t = tours.find(x => x.id === activeTour.id);
                            if (t) {
                               const tCatMatches = t.bracket[cat];
                               const tMatch = tCatMatches.find(x => x.id === m.id);
                               tMatch.score1 = s1;
                               tMatch.score2 = s2;
                               tMatch.status = status;
                               
                               if (tMatch.winnerTo) {
                                  const nextMatch = tCatMatches.find(x => x.id === tMatch.winnerTo);
                                  if (nextMatch) {
                                     // if changed score, recalculate winner
                                     if (s1 !== null && s2 !== null && s1 !== s2) {
                                        const winnerId = s1 > s2 ? tMatch.p1 : tMatch.p2;
                                        if (nextMatch.p1 === tMatch.p1 || nextMatch.p1 === tMatch.p2) nextMatch.p1 = winnerId;
                                        else if (nextMatch.p2 === tMatch.p1 || nextMatch.p2 === tMatch.p2) nextMatch.p2 = winnerId;
                                        else if (!nextMatch.p1) nextMatch.p1 = winnerId;
                                        else if (!nextMatch.p2) nextMatch.p2 = winnerId;
                                     }
                                  }
                               }
                            }
                            return tours;
                         });
                         render();
                      };
                   }
                });
             }, 0);
          });
          wrap.appendChild(bracketContainer);

          if (canManage() && activeTour.status !== 'finished') {
             wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #3F51B5;">
                <button class="bc-btn" id="tour-finish-btn" style="background:#FFD700; border:2px solid #F57F17; color:#D84315; font-size:18px; padding:15px 30px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2);">🎉 BẾ MẠC & TRAO THƯỞNG XP</button>
             </div>`));

             setTimeout(() => {
                const fbtn = document.getElementById('tour-finish-btn');
                if(fbtn) fbtn.onclick = async () => {
                   let allDone = true;
                   Object.keys(activeTour.bracket || {}).forEach(cat => {
                      const m = activeTour.bracket[cat].find(x => x.round === 'Chung kết');
                      if (!m || m.status !== 'finished') allDone = false;
                   });
                   if (!allDone) {
                      if(!confirm('Cảnh báo: Có hạng mục chưa đấu xong Chung kết. Bạn vẫn muốn Bế mạc sớm?')) return;
                   } else {
                      if(!confirm('Xác nhận bế mạc giải đấu? Hệ thống sẽ cộng XP thưởng cho các VĐV chiến thắng!')) return;
                   }
                   
                   const updates = {}; 
                   Object.keys(activeTour.bracket || {}).forEach(cat => {
                      const matches = activeTour.bracket[cat];
                      const finalMatch = matches.find(m => m.round === 'Chung kết');
                      if (finalMatch && finalMatch.status === 'finished') {
                         const winnerPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                         const runnerUpPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
                         const wPair = activeTour.pairs.find(p => p.id === winnerPairId);
                         const rPair = activeTour.pairs.find(p => p.id === runnerUpPairId);
                         if (wPair) {
                            updates[wPair.m1] = (updates[wPair.m1] || 0) + 500;
                            if (wPair.m2) updates[wPair.m2] = (updates[wPair.m2] || 0) + 500;
                         }
                         if (rPair) {
                            updates[rPair.m1] = (updates[rPair.m1] || 0) + 300;
                            if (rPair.m2) updates[rPair.m2] = (updates[rPair.m2] || 0) + 300;
                         }
                      }
                   });

                   await mutateTournaments(tours => {
                      const t = tours.find(x => x.id === activeTour.id);
                      if (t) t.status = 'finished';
                      return tours;
                   });

                   for (const mId in updates) {
                      const bonus = updates[mId];
                      await mutateKey('bc_members', mems => {
                         const idx = mems.findIndex(m => m.id === mId);
                         if (idx > -1) {
                            mems[idx].xp = (mems[idx].xp || 0) + bonus;
                            mems[idx].xpHistory = mems[idx].xpHistory || [];
                            mems[idx].xpHistory.push({
                               date: new Date().toISOString(),
                               amount: bonus,
                               reason: 'Thưởng Thành tích Giải đấu: ' + activeTour.name,
                               by: state.me.username
                            });
                         }
                         return mems;
                      });
                   }
                   showToast('Đã bế mạc và cộng thưởng XP thành công!', 'success');
                   render();
                };
             }, 0);
          }
       }
    }

    // TOURNAMENT HISTORY
    if (finishedTours.length > 0) {
      wrap.appendChild(el(`<div class="bc-card" style="margin-top:2rem; background:#E3F2FD; border:2px solid #90CAF9; padding:20px;">
        <h3 style="font-size:18px; color:#1565C0; margin-bottom:15px; font-family:'Oswald',sans-serif; text-transform:uppercase;">📚 Lịch sử Giải đấu (Hall of Fame)</h3>
        <div style="display:flex; flex-direction:column; gap:15px;">
           ${finishedTours.map(t => {
              const isViewing = state.viewingTourId === t.id;
              
              // Generate Podium for this tour
              let podiumHtml = '';
              if (isViewing) {
                 let catPodiums = [];
                 Object.keys(t.bracket || {}).forEach(cat => {
                    const matches = t.bracket[cat];
                    const finalMatch = matches.find(m => m.round === 'Chung kết');
                    if (!finalMatch || finalMatch.status !== 'finished') return;

                    const winnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                    const runnerId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
                    const wPair = t.pairs.find(p => p.id === winnerId);
                    const rPair = t.pairs.find(p => p.id === runnerId);

                    catPodiums.push(`<div style="margin-bottom:15px; text-align:center;">
                       <strong style="color:#D84315; font-size:14px;">${cat}</strong>
                       <div style="font-size:13px; margin-top:5px;">🥇 Vô địch: <strong>${escapeHtml(wPair?.name||'')}</strong></div>
                       <div style="font-size:13px;">🥈 Á quân: <strong>${escapeHtml(rPair?.name||'')}</strong></div>
                    </div>`);
                 });
                 podiumHtml = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed #90CAF9;">
                    <h4 style="text-align:center; margin-bottom:10px; color:#1565C0;">🎉 BẢNG VÀNG THÀNH TÍCH</h4>
                    ${catPodiums.join('')}
                 </div>`;
              }

              return `<div style="background:#FFF; border:1px solid #BBDEFB; border-radius:8px; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                       <strong style="font-size:15px; color:#0D47A1;">${escapeHtml(t.name)}</strong>
                       <div style="font-size:11px; color:#666;">Bế mạc: ${new Date(t.createdAt).toLocaleDateString()} | ${t.pairs?.length||0} cặp VĐV</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                       <button class="bc-btn small" id="view-tour-${t.id}" style="background:#1976D2; border-color:#1976D2;">${isViewing ? 'Đóng' : 'Xem kết quả'}</button>
                       ${state.me?.role === 'owner' ? `<button class="bc-btn small danger" id="del-tour-${t.id}">Xóa</button>` : ''}
                    </div>
                 </div>
                 ${podiumHtml}
              </div>`;
           }).join('')}
        </div>
      </div>`));

      setTimeout(() => {
         finishedTours.forEach(t => {
            const vbtn = document.getElementById(`view-tour-${t.id}`);
            if (vbtn) vbtn.onclick = () => {
               if (state.viewingTourId === t.id) state.viewingTourId = null;
               else state.viewingTourId = t.id;
               render();
            };
            const dbtn = document.getElementById(`del-tour-${t.id}`);
            if (dbtn) dbtn.onclick = async () => {
               if(!confirm(`Bạn là Owner và có quyền xóa giải đấu. Xác nhận xóa VĨNH VIỄN giải [${t.name}] khỏi Lịch sử?`)) return;
               await mutateTournaments(tours => tours.filter(x => x.id !== t.id));
               render();
            };
         });
      }, 0);
    }

    return wrap;
}


      state.tourSetup = state.tourSetup || {
        name: 'Giải Cầu Lông Mùa Hè',
        categories: ['Đôi Nam'],
        courtsCount: 4,
        selectedCourts: state.courts.slice(0, 4).map(c => c.id)
      };

      const setupCard = el(`<div class="bc-card" style="border: 2px dashed #FF8F00;">
        <h3 style="font-size:16px; color:#D84315; margin-bottom:15px; font-family:'Oswald', sans-serif;">🛠️ KHỞI TẠO GIẢI ĐẤU MỚI</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Tên giải đấu</label>
            <input class="bc-input" id="ts-name" value="${escapeHtml(state.tourSetup.name)}" placeholder="VD: Giải Cầu Lông Aron Smash 2026" />
          </div>
          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <div style="flex:1; min-width:140px;">
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Số lượng sân</label>
              <select class="bc-select" id="ts-courts-count">
                <option value="2" ${state.tourSetup.courtsCount===2?'selected':''}>2 Sân</option>
                <option value="3" ${state.tourSetup.courtsCount===3?'selected':''}>3 Sân</option>
                <option value="4" ${state.tourSetup.courtsCount===4?'selected':''}>4 Sân</option>
              </select>
            </div>
            <div style="flex:2; min-width:200px;">
              <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Chọn sân thi đấu</label>
              <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
                ${state.courts.map(c => {
                  const checked = state.tourSetup.selectedCourts.includes(c.id) ? 'checked' : '';
                  return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                    <input type="checkbox" class="ts-court-chk" value="${c.id}" ${checked} /> ${escapeHtml(c.name)}
                  </label>`;
                }).join(' ')}
              </div>
            </div>
          </div>
          <div style="border-top:1px dashed #E3E0D6; padding-top:12px;">
            <label style="font-size:13px; font-weight:600; color:#4E342E; display:block; margin-bottom:4px;">Hạng mục thi đấu</label>
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
              ${['Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ'].map(cat => {
                const checked = state.tourSetup.categories.includes(cat) ? 'checked' : '';
                return `<label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600;">
                  <input type="checkbox" class="ts-cat-chk" value="${cat}" ${checked} /> 🏸 ${cat}
                </label>`;
              }).join(' ')}
            </div>
          </div>
          <div style="text-align:right; margin-top:10px;">
            <button class="bc-btn" id="ts-start-btn" style="background:#FF3D00; border-color:#FF3D00; font-size:14px; padding:10px 20px;">
              Mở Cổng Đăng Ký 🚀
            </button>
          </div>
        </div>
      </div>`);
      
      wrap.appendChild(setupCard);
      setTimeout(() => {
        document.getElementById('ts-start-btn').onclick = async () => {
          const name = document.getElementById('ts-name').value.trim();
          const count = parseInt(document.getElementById('ts-courts-count').value, 10);
          const selCourts = Array.from(document.querySelectorAll('.ts-court-chk:checked')).map(x => x.value);
          const selCats = Array.from(document.querySelectorAll('.ts-cat-chk:checked')).map(x => x.value);
          
          if (!name) return alert('Vui lòng nhập tên giải đấu!');
          if (selCourts.length === 0) return alert('Vui lòng chọn ít nhất 1 sân!');
          if (selCats.length === 0) return alert('Vui lòng chọn ít nhất 1 hạng mục thi đấu!');
          
          const newTour = {
            id: uid(),
            name,
            categories: selCats,
            courtsCount: count,
            selectedCourts: selCourts,
            status: 'registering',
            registrations: [],
            pairs: [],
            groups: [],
            matches: [],
            bracket: null,
            createdAt: new Date().toISOString()
          };
          
          await mutateTournaments(tours => {
             tours.push(newTour);
             return tours;
          });
          state.tourSetup = null;
          render();
        };
      }, 0);
      return wrap;
    }

    if (activeTour.status === 'registering') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:20px; background:#FFF3E0; border:1px solid #FFB74D; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#E65100; font-family:'Oswald',sans-serif; margin-bottom:5px;">${escapeHtml(activeTour.name)}</h3>
        <div style="font-size:14px; color:#F57C00; font-weight:600;">CỔNG ĐĂNG KÝ ĐANG MỞ! Nhanh tay ghi danh nào các chiến thủ!</div>
      </div>`));

      const activeMembers = state.members.filter(m => m.status === 'active');
      activeTour.registrations = activeTour.registrations || [];
      const myRegs = activeTour.registrations.filter(r => r.m1 === state.me?.id || r.m2 === state.me?.id);

      const isManager = canManage();
      if (state.me) {
        if (myRegs.length > 0) {
          wrap.appendChild(el(`<div class="bc-card" style="margin-bottom:1rem; text-align:center; padding:15px; color:#27500A; background:#EAF3DE; font-weight:600; font-size:14px; border:1px solid #27500A;">
            🎉 Bạn đã ghi danh các hạng mục: ${myRegs.map(r => r.cat).join(', ')}. Chúc bạn thi đấu tốt! 💪
          </div>`));
        }

        const regCard = el(`<div class="bc-card" style="margin-bottom:1rem; border:2px solid #27500A;">
          <h4 style="font-size:16px; color:#27500A; margin-bottom:12px; font-family:'Oswald',sans-serif;">TẠO PHIẾU ĐĂNG KÝ THAM GIA</h4>
          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
            ${isManager ? `
            <div style="flex:1; min-width:140px;">
              <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#E65100;">VĐV Ghi danh (Admin)</label>
              <select class="bc-select" id="reg-m1" style="border-color:#E65100;">
                <option value="${state.me.id}">-- Chính bạn --</option>
                ${activeMembers.filter(m => m.id !== state.me.id).map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
              </select>
            </div>
            ` : ''}
            <div style="flex:1; min-width:140px;">
              <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn hạng mục</label>
              <select class="bc-select" id="reg-cat">
                ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div style="flex:1.5; min-width:180px;">
              <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Hình thức đăng ký</label>
              <select class="bc-select" id="reg-type">
                <option value="solo">Cá nhân (Tìm đồng đội)</option>
                <option value="pair">Nguyên cặp (Đã có partner)</option>
              </select>
            </div>
            <div style="flex:1.5; min-width:180px; display:none;" id="reg-partner-box">
              <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Chọn Partner</label>
              <select class="bc-select" id="reg-partner">
                <option value="">-- Chọn thành viên --</option>
                ${activeMembers.map(m => `<option value="${m.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'})</option>`).join('')}
              </select>
            </div>
            <button class="bc-btn" id="reg-submit-btn" style="background:#27500A; border-color:#27500A;">Ghi danh ngay!</button>
          </div>
        </div>`);
        wrap.appendChild(regCard);
        
        setTimeout(() => {
          const typeSel = document.getElementById('reg-type');
          const pBox = document.getElementById('reg-partner-box');
          if(typeSel) typeSel.onchange = () => { pBox.style.display = typeSel.value==='pair'?'block':'none'; };
          
          document.getElementById('reg-submit-btn').onclick = async () => {
            const cat = document.getElementById('reg-cat').value;
            const type = document.getElementById('reg-type').value;
            let m2 = null;
            const m1_id = isManager ? (document.getElementById('reg-m1') ? document.getElementById('reg-m1').value : state.me.id) : state.me.id;
            if (!m1_id) return alert('Vui lòng chọn VĐV cần đăng ký hộ!');
            const me = state.members.find(m => m.id === m1_id);
            if (!me) return;
            if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === m1_id || r.m2 === m1_id))) return alert(`VĐV này đã đăng ký hạng mục ${cat} rồi!`);
            
            if (type === 'pair') {
              m2 = document.getElementById('reg-partner').value;
              if (!m2) return alert('Vui lòng chọn Partner!');
              if (m2 === m1_id) return alert('Không thể chọn chính mình làm Partner!');
              const p2 = state.members.find(m => m.id === m2);
              if (!p2) return;
              if (activeTour.registrations.some(r => r.cat === cat && (r.m1 === p2.id || r.m2 === p2.id))) return alert(`Partner này đã đăng ký hạng mục ${cat} rồi!`);
              
              if (cat === 'Đôi Nam' && (me.gender === 'Nữ' || p2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
              if (cat === 'Đôi Nữ' && ((me.gender||'Nam') === 'Nam' || (p2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
              if (cat === 'Đôi Nam Nữ') {
                const g1 = me.gender || 'Nam';
                const g2 = p2.gender || 'Nam';
                if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
              }
            } else {
              if (cat === 'Đôi Nam' && me.gender === 'Nữ') return alert('Bạn là Nữ, không thể đăng ký Đôi Nam!');
              if (cat === 'Đôi Nữ' && (me.gender||'Nam') === 'Nam') return alert('Bạn là Nam, không thể đăng ký Đôi Nữ!');
            }
            
            await mutateTournaments(tours => {
              const tour = tours.find(t => t.id === activeTour.id);
              if (tour) {
                 tour.registrations.push({ id: uid(), cat, type, m1: me.id, m2, createdAt: Date.now() });
              }
              return tours;
            });
            showToast('Đăng ký thành công!', 'success');
            render();
          };
        }, 0);
      }

      const listCard = el(`<div class="bc-card" style="margin-bottom:1rem;">
        <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">📋 Danh sách VĐV Ghi Danh (${activeTour.registrations.length} lượt)</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${activeTour.registrations.length === 0 ? '<div class="bc-empty" style="padding:10px;">Chưa có ai đăng ký.</div>' : ''}
          ${activeTour.registrations.map(r => {
            const p1 = state.members.find(m => m.id === r.m1);
            const p2 = r.m2 ? state.members.find(m => m.id === r.m2) : null;
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#F8F9FA; border:1px solid #E9ECEF; border-radius:6px;">
              <div>
                <span class="bc-badge" style="background:#E3F2FD; color:#1565C0; margin-right:8px;">${r.cat}</span>
                <strong style="font-size:13px; color:#333;">${escapeHtml(p1?memberDisplayName(p1):'')}</strong> ${p1?.gender==='Nữ'?'👩':'👨'}
                ${r.type === 'pair' && p2 ? `<span style="color:#888; font-size:12px; margin:0 6px;">+</span> <strong style="font-size:13px; color:#333;">${escapeHtml(memberDisplayName(p2))}</strong> ${p2.gender==='Nữ'?'👩':'👨'}` : `<span style="font-size:11px; color:#E65100; margin-left:8px; font-style:italic;">(Đang tìm partner 🤝)</span>`}
              </div>
              ${canManage() ? `<button class="bc-btn danger small" id="del-reg-${r.id}">Xóa</button>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`);
      wrap.appendChild(listCard);
      
      if (canManage()) {
        const pairingCard = el(`<div class="bc-card" style="border: 2px solid #1B4332;">
          <h4 style="font-size:15px; color:#1B4332; margin-bottom:10px;">👥 BTC Cáp Kèo (Cho các VĐV đăng ký Solo)</h4>
          <div style="font-size:12px; color:#666; margin-bottom:10px;">Chọn 2 VĐV từ danh sách đăng ký lẻ để ghép thành 1 cặp chính thức. Các cặp đã "Đăng ký nguyên cặp" sẽ được gom tự động khi chốt.</div>
          
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
            <div style="flex:1; min-width:140px;">
              <select class="bc-select" id="pair-m1">
                <option value="">- VĐV 1 -</option>
                ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                  const m = state.members.find(x => x.id === r.m1);
                  return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                }).join('')}
              </select>
            </div>
            <div style="flex:1; min-width:140px;">
              <select class="bc-select" id="pair-m2">
                <option value="">- VĐV 2 -</option>
                ${activeTour.registrations.filter(r => r.type==='solo').map(r => {
                  const m = state.members.find(x => x.id === r.m1);
                  return m ? `<option value="${r.id}">${escapeHtml(memberDisplayName(m))} (${m.gender||'Nam'} - ${r.cat})</option>` : '';
                }).join('')}
              </select>
            </div>
            <div style="flex:1; min-width:120px;">
              <select class="bc-select" id="pair-target-cat">
                ${activeTour.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <button class="bc-btn" id="pair-merge-btn">Ghép cặp</button>
          </div>

          <div style="margin-top:20px; text-align:right; border-top:1px dashed #CCC; padding-top:15px;">
            <button class="bc-btn danger" id="tour-lock-reg-btn" style="font-size:14px; padding:10px 20px;">
              🔒 CHỐT DANH SÁCH & BẮT ĐẦU CHIA BẢNG
            </button>
          </div>
        </div>`);
        wrap.appendChild(pairingCard);
        
        setTimeout(() => {
          activeTour.registrations.forEach(r => {
            const btn = document.getElementById(`del-reg-${r.id}`);
            if(btn) btn.onclick = async () => {
              await mutateTournaments(tours => {
                 const tour = tours.find(t => t.id === activeTour.id);
                 if (tour) tour.registrations = tour.registrations.filter(x => x.id !== r.id);
                 return tours;
              });
              render();
            };
          });

          document.getElementById('pair-merge-btn').onclick = async () => {
            const r1Id = document.getElementById('pair-m1').value;
            const r2Id = document.getElementById('pair-m2').value;
            const tCat = document.getElementById('pair-target-cat').value;
            if (!r1Id || !r2Id || r1Id === r2Id) return alert('Vui lòng chọn 2 VĐV hợp lệ!');
            
            const r1 = activeTour.registrations.find(x => x.id === r1Id);
            const r2 = activeTour.registrations.find(x => x.id === r2Id);
            const m1 = state.members.find(x => x.id === r1.m1);
            const m2 = state.members.find(x => x.id === r2.m1);
            
            if (tCat === 'Đôi Nam' && (m1.gender === 'Nữ' || m2.gender === 'Nữ')) return alert('Đôi Nam yêu cầu 2 VĐV Nam!');
            if (tCat === 'Đôi Nữ' && ((m1.gender||'Nam') === 'Nam' || (m2.gender||'Nam') === 'Nam')) return alert('Đôi Nữ yêu cầu 2 VĐV Nữ!');
            if (tCat === 'Đôi Nam Nữ') {
              const g1 = m1.gender || 'Nam';
              const g2 = m2.gender || 'Nam';
              if (g1 === g2) return alert('Đôi Nam Nữ yêu cầu 1 Nam và 1 Nữ!');
            }
            
            await mutateTournaments(tours => {
                const tour = tours.find(t => t.id === activeTour.id);
                if (tour) {
                   const tr1 = tour.registrations.find(x => x.id === r1Id);
                   if (tr1) {
                      tr1.type = 'pair';
                      tr1.m2 = m2.id;
                      tr1.cat = tCat;
                   }
                   tour.registrations = tour.registrations.filter(x => x.id !== r2Id);
                }
                return tours;
            });
            showToast('Ghép cặp thành công!', 'success');
            render();
          };
          
          document.getElementById('tour-lock-reg-btn').onclick = async () => {
            if(!confirm('Xác nhận chốt danh sách đăng ký? Hệ thống sẽ chuyển sang giai đoạn thi đấu!')) return;
            
            const pairs = activeTour.registrations.filter(r => r.type === 'pair').map((r, i) => {
              const p1 = state.members.find(x => x.id === r.m1);
              const p2 = state.members.find(x => x.id === r.m2);
              return {
                id: 'P' + Date.now() + i,
                m1: r.m1,
                m2: r.m2,
                cat: r.cat,
                name: `${p1.nickname||p1.name} & ${p2.nickname||p2.name}`
              };
            });

            // Randomize and divide into groups
            const groups = [];
            const matches = [];
            for (const cat of activeTour.categories) {
               const catPairs = pairs.filter(p => p.cat === cat);
               if (catPairs.length === 0) continue;
               
               const numGroups = Math.max(1, Math.floor(catPairs.length / 4)); // ~4 pairs per group
               const shuffled = [...catPairs].sort(() => Math.random() - 0.5);
               for (let i = 0; i < numGroups; i++) {
                   const gId = 'G' + Date.now() + i + cat.replace(/\s/g,'');
                   const groupName = `Bảng ${String.fromCharCode(65 + i)} - ${cat}`;
                   const groupPairs = shuffled.filter((_, idx) => idx % numGroups === i);
                   groups.push({ id: gId, cat, name: groupName, pairs: groupPairs.map(p => p.id) });
                   
                   // Generate Round Robin Matches
                   for (let a = 0; a < groupPairs.length; a++) {
                      for (let b = a + 1; b < groupPairs.length; b++) {
                         matches.push({
                            id: 'M' + Date.now() + a + b + gId,
                            groupId: gId,
                            cat: cat,
                            p1: groupPairs[a].id,
                            p2: groupPairs[b].id,
                            score1: null,
                            score2: null,
                            status: 'pending' // pending, live, finished
                         });
                      }
                   }
               }
            }

            const remainingSolo = activeTour.registrations.filter(r => r.type === 'solo').length;
            if (remainingSolo > 0) alert(`Lưu ý: Có ${remainingSolo} VĐV đăng ký lẻ chưa được ghép cặp và sẽ KHÔNG được đưa vào danh sách thi đấu.`);
            
            await mutateTournaments(tours => {
               const tour = tours.find(t => t.id === activeTour.id);
               if (tour) {
                  tour.pairs = pairs;
                  tour.groups = groups;
                  tour.matches = matches;
                  tour.status = 'playing';
               }
               return tours;
            });
            showToast('Đã chốt danh sách thi đấu và tự động chia bảng!', 'success');
            render();
          };
        }, 0);
      }
      return wrap;
    }

    if (activeTour.status === 'playing') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:15px; background:#E8F5E9; border:1px solid #4CAF50; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#2E7D32; font-family:'Oswald',sans-serif; margin-bottom:5px;">VÒNG BẢNG - ${escapeHtml(activeTour.name)}</h3>
      </div>`));

      const groupsContainer = el(`<div style="display:flex; flex-direction:column; gap:20px;"></div>`);
      
      (activeTour.groups || []).forEach(g => {
         const gMatches = (activeTour.matches || []).filter(m => m.groupId === g.id);
         
         const standings = (g.pairs || []).map(pId => {
            const pair = activeTour.pairs.find(p => p.id === pId);
            let played = 0, won = 0, lost = 0, diff = 0;
            gMatches.forEach(m => {
               if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                  played++;
                  const isP1 = m.p1 === pId;
                  const myScore = isP1 ? m.score1 : m.score2;
                  const oppScore = isP1 ? m.score2 : m.score1;
                  if (myScore > oppScore) won++; else if (myScore < oppScore) lost++;
                  diff += (myScore - oppScore);
               }
            });
            return { pId, name: pair?.name, played, won, lost, diff, points: won * 3 };
         }).sort((a, b) => b.points - a.points || b.diff - a.diff);

         const groupCard = el(`<div class="bc-card" style="border-left: 4px solid #FF8F00;">
           <h4 style="color:#FF6F00; font-size:16px; margin-bottom:10px;">🏆 ${escapeHtml(g.name)}</h4>
           <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
             
             <!-- Bảng Xếp Hạng -->
             <div style="flex:1; min-width:300px;">
               <table class="bc-table" style="font-size:12px; width:100%; border-collapse:collapse;">
                 <thead><tr style="background:#F5F5F5; text-align:left;">
                   <th style="padding:8px;">VT</th><th style="padding:8px;">Cặp đấu</th><th style="padding:8px;">Trận</th><th style="padding:8px;">T/B</th><th style="padding:8px;">HS</th><th style="padding:8px;">Điểm</th>
                 </tr></thead>
                 <tbody>
                   ${standings.map((s, i) => `<tr style="border-bottom:1px solid #EEE;">
                     <td style="padding:8px; font-weight:bold; color:${i<2?'#2E7D32':'#666'}">${i+1}</td>
                     <td style="padding:8px;">${escapeHtml(s.name)}</td>
                     <td style="padding:8px;">${s.played}</td>
                     <td style="padding:8px;">${s.won}/${s.lost}</td>
                     <td style="padding:8px;">${s.diff > 0 ? '+'+s.diff : s.diff}</td>
                     <td style="padding:8px; font-weight:bold;">${s.points}</td>
                   </tr>`).join('')}
                 </tbody>
               </table>
             </div>

             <!-- Trận Đấu -->
             <div style="flex:1.5; min-width:320px; display:flex; flex-direction:column; gap:10px;">
               ${gMatches.map(m => {
                 const p1 = activeTour.pairs.find(x => x.id === m.p1);
                 const p2 = activeTour.pairs.find(x => x.id === m.p2);
                 const isFinished = m.status === 'finished';
                 return `<div style="border:1px solid #E0E0E0; border-radius:8px; padding:10px; background:${isFinished?'#F5F5F5':'#FFF'}; position:relative;">
                   ${m.status === 'live' ? `<span style="position:absolute; top:-8px; left:10px; background:#D32F2F; color:#FFF; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; animation: pulse 1.5s infinite;">LIVE</span>` : ''}
                   <div style="display:flex; justify-content:space-between; align-items:center;">
                     <div style="flex:1; font-size:13px; font-weight:${m.score1 > m.score2 ? 'bold':'normal'};">${escapeHtml(p1?.name)}</div>
                     <div style="padding:0 10px; white-space:nowrap;">
                        ${canManage() && !isFinished ? 
                          `<input type="number" id="s1-${m.id}" value="${m.score1!==null?m.score1:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" /> - 
                           <input type="number" id="s2-${m.id}" value="${m.score2!==null?m.score2:''}" style="width:40px; text-align:center; border:1px solid #CCC; border-radius:4px; padding:4px;" />` 
                          : `<span style="font-size:16px; font-weight:bold; color:#1565C0;">${m.score1!==null?m.score1:'-'} : ${m.score2!==null?m.score2:'-'}</span>`
                        }
                     </div>
                     <div style="flex:1; font-size:13px; text-align:right; font-weight:${m.score2 > m.score1 ? 'bold':'normal'};">${escapeHtml(p2?.name)}</div>
                   </div>
                   ${canManage() && !isFinished ? `
                     <div style="text-align:center; margin-top:8px;">
                       <button class="bc-btn small" id="update-match-${m.id}" style="background:#0288D1; border-color:#0288D1; color:#FFF; font-size:11px; padding:4px 10px;">Cập nhật Tỷ số</button>
                     </div>
                   ` : ''}
                 </div>`;
               }).join('')}
             </div>

           </div>
         </div>`);
         groupsContainer.appendChild(groupCard);

         setTimeout(() => {
            gMatches.forEach(m => {
               const btn = document.getElementById(`update-match-${m.id}`);
               if (btn) {
                  btn.onclick = async () => {
                     const s1 = document.getElementById(`s1-${m.id}`).value;
                     const s2 = document.getElementById(`s2-${m.id}`).value;
                     if (s1 === '' || s2 === '') return alert('Vui lòng nhập tỷ số!');
                     
                     const isDone = confirm(`Chốt tỷ số trận đấu: ${s1} - ${s2}? Nhấn OK để chốt kết quả.`);
                     await mutateTournaments(tours => {
                        const t = tours.find(x => x.id === activeTour.id);
                        if (t) {
                           const match = t.matches.find(x => x.id === m.id);
                           if (match) {
                              match.score1 = parseInt(s1, 10);
                              match.score2 = parseInt(s2, 10);
                              match.status = isDone ? 'finished' : 'live';
                           }
                        }
                        return tours;
                     });
                     render();
                  };
               }
            });
         }, 0);
      });
      wrap.appendChild(groupsContainer);

      if (canManage()) {
         wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #4CAF50;">
            <button class="bc-btn danger" id="tour-to-knockout-btn" style="padding:12px 25px; font-size:16px; background:#D32F2F; border-color:#D32F2F; box-shadow:0 4px 10px rgba(211,47,47,0.3);">🏆 CHỐT VÒNG BẢNG & TẠO NHÁNH ĐẤU KNOCKOUT</button>
         </div>`));

         setTimeout(() => {
            const btn = document.getElementById('tour-to-knockout-btn');
            if (btn) btn.onclick = async () => {
               if (!confirm('Bạn có chắc chắn muốn chốt vòng bảng? Hệ thống sẽ chọn ra các đội đứng đầu mỗi bảng để bốc thăm thi đấu loại trực tiếp.')) return;
               
               const bracket = {}; 
               for (const cat of activeTour.categories) {
                  const catGroups = activeTour.groups.filter(g => g.cat === cat);
                  if (catGroups.length === 0) continue;
                  
                  let advancingPairs = [];
                  catGroups.forEach(g => {
                     const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                     const standings = g.pairs.map(pId => {
                        let won = 0, diff = 0;
                        gMatches.forEach(m => {
                           if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                              const isP1 = m.p1 === pId;
                              const myScore = isP1 ? m.score1 : m.score2;
                              const oppScore = isP1 ? m.score2 : m.score1;
                              if (myScore > oppScore) won++;
                              diff += (myScore - oppScore);
                           }
                        });
                        return { pId, points: won * 3, diff };
                     }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                     
                     advancingPairs.push(...standings.slice(0, 2).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id })));
                  });
                  
                  if (catGroups.length === 1) {
                     const g = catGroups[0];
                     const gMatches = activeTour.matches.filter(m => m.groupId === g.id);
                     const standings = g.pairs.map(pId => {
                        let won = 0, diff = 0;
                        gMatches.forEach(m => {
                           if (m.status === 'finished' && (m.p1 === pId || m.p2 === pId)) {
                              const isP1 = m.p1 === pId;
                              const myScore = isP1 ? m.score1 : m.score2;
                              const oppScore = isP1 ? m.score2 : m.score1;
                              if (myScore > oppScore) won++;
                              diff += (myScore - oppScore);
                           }
                        });
                        return { pId, points: won * 3, diff };
                     }).sort((a, b) => b.points - a.points || b.diff - a.diff);
                     advancingPairs = standings.slice(0, 4).map((s, idx) => ({ pId: s.pId, groupRank: idx + 1, gId: g.id }));
                  }
                  
                  advancingPairs.sort((a, b) => a.groupRank - b.groupRank);
                  let final4 = advancingPairs.slice(0, 4).map(x => x.pId);
                  if (final4.length === 3) final4.push(null); 
                  
                  if (final4.length >= 2) {
                     bracket[cat] = [
                        { id: 'K1'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 1', p1: final4[0], p2: final4[3] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                        { id: 'K2'+cat.replace(/\s/g,''), round: 'Bán kết', name: 'Bán kết 2', p1: final4[1], p2: final4[2] || null, score1: null, score2: null, status: 'pending', winnerTo: 'KF'+cat.replace(/\s/g,'') },
                        { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: null, p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                     ];
                     if (!final4[3]) {
                        bracket[cat][0].status = 'finished';
                        bracket[cat][0].score1 = 21; bracket[cat][0].score2 = 0;
                        bracket[cat][2].p1 = final4[0];
                     }
                  } else if (final4.length === 1) {
                     // Not enough teams, dummy final
                     bracket[cat] = [
                        { id: 'KF'+cat.replace(/\s/g,''), round: 'Chung kết', name: 'Chung kết', p1: final4[0], p2: null, score1: null, score2: null, status: 'pending', winnerTo: null }
                     ];
                  }
               }

               await mutateTournaments(tours => {
                  const t = tours.find(x => x.id === activeTour.id);
                  if (t) {
                     t.bracket = bracket;
                     t.status = 'knockout';
                  }
                  return tours;
               });
               showToast('Tạo nhánh đấu thành công!', 'success');
               render();
            };
         }, 0);
      }
    }

    if (activeTour.status === 'knockout') {
      wrap.appendChild(el(`<div class="bc-card" style="text-align:center; padding:15px; background:#E8EAF6; border:1px solid #3F51B5; margin-bottom:1rem;">
        <h3 style="font-size:20px; color:#1A237E; font-family:'Oswald',sans-serif; margin-bottom:5px;">VÒNG LOẠI TRỰC TIẾP - ${escapeHtml(activeTour.name)}</h3>
      </div>`));

      const bracketContainer = el(`<div style="display:flex; flex-direction:column; gap:30px;"></div>`);
      
      Object.keys(activeTour.bracket || {}).forEach(cat => {
         const matches = activeTour.bracket[cat];
         const semis = matches.filter(m => m.round === 'Bán kết');
         const finals = matches.filter(m => m.round === 'Chung kết');
         
         const catCard = el(`<div class="bc-card" style="border: 2px solid #3F51B5; border-radius:12px; overflow:hidden; padding:0;">
            <div style="background:#3F51B5; color:#FFF; padding:10px 15px; font-weight:bold; font-size:16px;">🏸 ${cat}</div>
            <div style="padding:20px; display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:30px; background:linear-gradient(to right, #FAFAFA, #FFF);">
               
               ${semis.length > 0 ? `<div style="display:flex; flex-direction:column; gap:40px; flex:1; min-width:280px;">
                 ${semis.map(m => {
                    const p1 = activeTour.pairs.find(x => x.id === m.p1);
                    const p2 = activeTour.pairs.find(x => x.id === m.p2);
                    const isFinished = m.status === 'finished';
                    return `<div style="border:1px solid #CCC; border-radius:8px; padding:12px; background:${isFinished?'#F5F5F5':'#FFF'}; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
                      <div style="font-size:12px; color:#666; margin-bottom:8px; text-transform:uppercase; font-weight:bold; border-bottom:1px solid #EEE; padding-bottom:5px;">${m.name}</div>
                      
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                         <span style="font-size:14px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#2E7D32':'#333'}">${p1 ? escapeHtml(p1.name) : '---'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1||''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score1!==null?m.score1:'-'}</strong>`}
                      </div>
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span style="font-size:14px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#2E7D32':'#333'}">${p2 ? escapeHtml(p2.name) : '---'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2||''}" style="width:45px;text-align:center;border:1px solid #999;border-radius:4px;padding:4px;"/>` : `<strong style="font-size:16px;">${m.score2!==null?m.score2:'-'}</strong>`}
                      </div>
                      ${canManage() && !isFinished && p1 && p2 ? `<div style="text-align:center; margin-top:12px;"><button class="bc-btn small" id="k-update-${m.id}" style="background:#3F51B5; border-color:#3F51B5;">Chốt Tỷ số</button></div>` : ''}
                    </div>`;
                 }).join('')}
               </div>
               
               <div style="flex:0.1; display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:40px;">
                  <div style="width:40px; height:3px; background:#3F51B5;"></div>
               </div>` : ''}

               <div style="display:flex; flex-direction:column; gap:40px; flex:1.2; min-width:300px;">
                 ${finals.map(m => {
                    const p1 = activeTour.pairs.find(x => x.id === m.p1);
                    const p2 = activeTour.pairs.find(x => x.id === m.p2);
                    const isFinished = m.status === 'finished';
                    return `<div style="border:2px solid #FFD700; border-radius:10px; padding:20px; background:#FFFDE7; box-shadow:0 6px 15px rgba(255,215,0,0.3); transform: scale(1.05);">
                      <div style="font-size:16px; color:#F57F17; margin-bottom:12px; text-transform:uppercase; font-weight:bold; text-align:center; border-bottom:1px dashed #FBC02D; padding-bottom:8px;">🏆 ${m.name}</div>
                      
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                         <span style="font-size:15px; font-weight:${m.score1>m.score2?'bold':'normal'}; color:${m.score1>m.score2?'#D84315':'#333'}">${p1 ? escapeHtml(p1.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s1-${m.id}" value="${m.score1||''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score1!==null?m.score1:'-'}</strong>`}
                      </div>
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span style="font-size:15px; font-weight:${m.score2>m.score1?'bold':'normal'}; color:${m.score2>m.score1?'#D84315':'#333'}">${p2 ? escapeHtml(p2.name) : '<span style="color:#999;font-style:italic;">Đang chờ nhánh dưới...</span>'}</span>
                         ${canManage() && !isFinished && p1 && p2 ? `<input type="number" id="k-s2-${m.id}" value="${m.score2||''}" style="width:50px;text-align:center;border:1px solid #FBC02D;border-radius:4px;padding:6px;font-size:16px;"/>` : `<strong style="font-size:20px; color:#D84315;">${m.score2!==null?m.score2:'-'}</strong>`}
                      </div>
                      ${canManage() && !isFinished && p1 && p2 ? `<div style="text-align:center; margin-top:15px;"><button class="bc-btn" id="k-update-${m.id}" style="background:#F57F17; border-color:#F57F17; padding:8px 20px; font-size:14px; box-shadow:0 2px 5px rgba(245,127,23,0.3);">Chốt Vô Địch</button></div>` : ''}
                      ${isFinished ? `<div style="text-align:center; margin-top:15px; font-weight:bold; color:#2E7D32; font-size:16px; animation:crown-float 2s infinite;">👑 ĐỘI VÔ ĐỊCH: ${m.score1>m.score2?escapeHtml(p1.name):escapeHtml(p2.name)}</div>` : ''}
                    </div>`;
                 }).join('')}
               </div>

            </div>
         </div>`);
         bracketContainer.appendChild(catCard);

         setTimeout(() => {
            matches.forEach(m => {
               const btn = document.getElementById(`k-update-${m.id}`);
               if (btn) {
                  btn.onclick = async () => {
                     const s1 = parseInt(document.getElementById(`k-s1-${m.id}`).value, 10);
                     const s2 = parseInt(document.getElementById(`k-s2-${m.id}`).value, 10);
                     if (isNaN(s1) || isNaN(s2) || s1 === s2) return alert('Vui lòng nhập tỷ số hợp lệ (không hòa)!');
                     
                     if (!confirm(`Xác nhận tỷ số ${s1} - ${s2}?`)) return;

                     await mutateTournaments(tours => {
                        const t = tours.find(x => x.id === activeTour.id);
                        if (t) {
                           const tCatMatches = t.bracket[cat];
                           const tMatch = tCatMatches.find(x => x.id === m.id);
                           tMatch.score1 = s1;
                           tMatch.score2 = s2;
                           tMatch.status = 'finished';
                           
                           if (tMatch.winnerTo) {
                              const nextMatch = tCatMatches.find(x => x.id === tMatch.winnerTo);
                              if (nextMatch) {
                                 const winnerId = s1 > s2 ? tMatch.p1 : tMatch.p2;
                                 if (!nextMatch.p1) nextMatch.p1 = winnerId;
                                 else if (!nextMatch.p2) nextMatch.p2 = winnerId;
                              }
                           }
                        }
                        return tours;
                     });
                     render();
                  };
               }
            });
         }, 0);

      });
      wrap.appendChild(bracketContainer);

      if (canManage()) {
         wrap.appendChild(el(`<div style="text-align:center; margin-top:30px; padding-top:20px; border-top:2px dashed #3F51B5;">
            <button class="bc-btn" id="tour-finish-btn" style="background:#FFD700; border:2px solid #F57F17; color:#D84315; font-size:18px; padding:15px 30px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2);">🎉 BẾ MẠC & TRAO THƯỞNG XP</button>
         </div>`));

         setTimeout(() => {
            const fbtn = document.getElementById('tour-finish-btn');
            if(fbtn) fbtn.onclick = async () => {
               let allDone = true;
               Object.keys(activeTour.bracket || {}).forEach(cat => {
                  const m = activeTour.bracket[cat].find(x => x.round === 'Chung kết');
                  if (!m || m.status !== 'finished') allDone = false;
               });
               if (!allDone) {
                  if(!confirm('Cảnh báo: Có hạng mục chưa đấu xong Chung kết. Bạn vẫn muốn Bế mạc sớm?')) return;
               } else {
                  if(!confirm('Xác nhận bế mạc giải đấu? Hệ thống sẽ cộng XP thưởng cho các VĐV chiến thắng!')) return;
               }
               
               const updates = {}; 
               Object.keys(activeTour.bracket || {}).forEach(cat => {
                  const matches = activeTour.bracket[cat];
                  const finalMatch = matches.find(m => m.round === 'Chung kết');
                  if (finalMatch && finalMatch.status === 'finished') {
                     const winnerPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p1 : finalMatch.p2;
                     const runnerUpPairId = finalMatch.score1 > finalMatch.score2 ? finalMatch.p2 : finalMatch.p1;
                     
                     const wPair = activeTour.pairs.find(p => p.id === winnerPairId);
                     const rPair = activeTour.pairs.find(p => p.id === runnerUpPairId);
                     
                     if (wPair) {
                        updates[wPair.m1] = (updates[wPair.m1] || 0) + 500;
                        if (wPair.m2) updates[wPair.m2] = (updates[wPair.m2] || 0) + 500;
                     }
                     if (rPair) {
                        updates[rPair.m1] = (updates[rPair.m1] || 0) + 300;
                        if (rPair.m2) updates[rPair.m2] = (updates[rPair.m2] || 0) + 300;
                     }
                  }
               });

               await mutateTournaments(tours => {
                  const t = tours.find(x => x.id === activeTour.id);
                  if (t) t.status = 'finished';
                  return tours;
               });

               for (const mId in updates) {
                  const bonus = updates[mId];
                  await mutateKey('bc_members', mems => {
                     const idx = mems.findIndex(m => m.id === mId);
                     if (idx > -1) {
                        mems[idx].xp = (mems[idx].xp || 0) + bonus;
                        mems[idx].xpHistory = mems[idx].xpHistory || [];
                        mems[idx].xpHistory.push({
                           date: new Date().toISOString(),
                           amount: bonus,
                           reason: 'Thưởng Thành tích Giải đấu: ' + activeTour.name,
                           by: state.me.username
                        });
                     }
                     return mems;
                  });
               }

               showToast('Đã bế mạc và cộng thưởng XP thành công!', 'success');
               render();
            };
         }, 0);
      }
    }
    
    return wrap;
}



  // ---------- SESSIONS ----------
  function renderSessions(){
    // Tự động kiểm tra và áp dụng quy tắc Khóa Vote (Rule 1)
    if (applyAutoLockVote(state.sessions)) {
      saveSessions();
    }
    const wrap = el(`<div></div>`);
    const nowStamp = (new Date()).toISOString().slice(0,16).replace('T','');

    // 1. Tự động xóa thông báo hết hạn và kết quả thách đấu cũ khi hoạt động tiếp theo bắt đầu
    const todayStr = (new Date()).toISOString().slice(0, 10);
    state.announcements = state.announcements || [];
    const validAnnouncements = state.announcements.filter(a => {
      // Kiểm tra hạn ngày của thông báo thường
      if (a.expireDate && a.expireDate < todayStr) return false;
      
      // Kiểm tra kết quả thách đấu của buổi tập cũ
      if (a.isChallengeResult) {
        const sOfAnn = state.sessions.find(x => x.id === a.sessionId);
        if (!sOfAnn) return false; // Buổi tập gốc đã xóa -> xóa tin
        
        const annSessionStart = sOfAnn.date + (sOfAnn.time || '00:00');
        const hasNewerSessionStarted = state.sessions.some(otherS => {
          const otherStart = otherS.date + (otherS.time || '00:00');
          return otherStart > annSessionStart && otherStart <= nowStamp;
        });
        
        if (hasNewerSessionStarted) return false;
      }
      return true;
    });

    if (validAnnouncements.length !== state.announcements.length) {
      state.announcements = validAnnouncements;
      saveAnnouncements();
    }

    // --- RENDER BẢNG TIN THÔNG BÁO ---
    const showAnnounceFormKey = 'show_announce_form';
    const announceFormVisible = !!state[showAnnounceFormKey];
    
    const bulletinCard = el(`<div class="bc-card" style="border: 2px solid rgba(242, 100, 25, 0.4); background: linear-gradient(135deg, rgba(255, 253, 245, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h2 style="font-size:16px; color:#1B4332; font-weight:600; display:flex; align-items:center; gap:6px; font-family:'Oswald', sans-serif;">
          📢 BẢNG TIN CÂU LẠC BỘ
        </h2>
        ${canManage() ? `<button class="bc-btn small" id="ann-toggle-btn" style="padding:3px 8px; font-size:11px; font-weight:600;">
          ${announceFormVisible ? 'Đóng form' : '➕ Đăng tin'}
        </button>` : ''}
      </div>
      <div id="ann-form-container"></div>
      <div id="ann-list-container" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
    </div>`);

    // Form đăng thông báo dành cho Admin/R1
    if (canManage() && announceFormVisible) {
      const annForm = el(`<div style="background:var(--input-bg); border:1px solid var(--card-border); padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:8px; margin-bottom:10px;">
        <div style="font-weight:600; font-size:13px; color:#1B4332;">✍️ ĐĂNG THÔNG BÁO MỚI</div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; flex-wrap:wrap;">
          <div>
            <label style="font-size:11px; color:#8a877d; display:block; margin-bottom:2px;">Phân loại tin:</label>
            <select class="bc-select" id="ann-category" style="width:100%; padding:5px 8px; font-size:12px;">
              <option value="general">📢 Thông báo chung</option>
              <option value="alert">🚨 Cảnh báo quan trọng</option>
              <option value="match">🔥 Kèo giao lưu</option>
              <option value="party">🎉 Tin vui / Ăn chơi</option>
              <option value="tournament">🏆 Giải đấu / Sự kiện</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px; color:#8a877d; display:block; margin-bottom:2px;">Ngày hết hạn (tự xóa):</label>
            <input class="bc-input" type="date" id="ann-expire" style="width:100%; padding:4px 6px; font-size:12px;" />
          </div>
        </div>

        <div>
          <label style="font-size:11px; color:#8a877d; display:block; margin-bottom:2px;">Tiêu đề:</label>
          <input class="bc-input" id="ann-title" placeholder="Ví dụ: Lịch đóng tiền quỹ tháng này" style="width:100%; padding:6px 8px; font-size:13px;" />
        </div>

        <div>
          <label style="font-size:11px; color:#8a877d; display:block; margin-bottom:2px;">Nội dung chi tiết:</label>
          <textarea class="bc-input" id="ann-content" placeholder="Nội dung thông báo chi tiết..." rows="3" style="width:100%; padding:6px 8px; font-family:inherit; font-size:13px; resize:vertical;"></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:4px;">
          <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; color:#B25E00;">
            <input type="checkbox" id="ann-pin" style="transform: scale(1.1);" />
            📌 Ghim tin lên đầu bảng
          </label>
          <button class="bc-btn small" id="ann-submit" style="padding:6px 16px; font-weight:600;">⚡ Đăng tin!</button>
        </div>
      </div>`);
      bulletinCard.querySelector('#ann-form-container').appendChild(annForm);
    }

    const CATEGORIES = {
      general: { label: 'Thông báo chung', icon: '📢', color: '#134074', bg: '#E6F1FB' },
      alert: { label: 'Cảnh báo quan trọng', icon: '🚨', color: '#993C1D', bg: '#FAECE7' },
      match: { label: 'Kèo giao lưu', icon: '🔥', color: '#B25E00', bg: '#FFF2E6' },
      party: { label: 'Tin vui / Ăn chơi', icon: '🎉', color: '#6A2A80', bg: '#F8EEFC' },
      tournament: { label: 'Giải đấu / Sự kiện', icon: '🏆', color: '#27500A', bg: '#EAF3DE' }
    };

    const formatDateTime = (ts) => {
      if (!ts) return 'N/A';
      const d = new Date(ts);
      const hrs = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      return `${hrs}:${mins} ngày ${day}/${mon}/${yr}`;
    };

    // Danh sách thông báo
    const annListContainer = bulletinCard.querySelector('#ann-list-container');
    if (state.announcements.length === 0) {
      annListContainer.appendChild(el(`<div style="font-size:12px; color:#8a877d; text-align:center; padding:12px; font-style:italic;">Hôm nay chưa có thông báo mới nào từ Ban chủ nhiệm. 🌸</div>`));
    } else {
      const sortedAnnouncements = state.announcements.slice().sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      sortedAnnouncements.forEach(a => {
        const cat = CATEGORIES[a.category || 'general'] || CATEGORIES.general;
        
        let borderStyle = '1px solid #E3E0D6';
        let cardBg = '#FAF8F5';
        let pinBadge = '';
        
        if (a.pinned) {
          borderStyle = '2px solid #D8973C';
          cardBg = 'linear-gradient(135deg, #FFFDF5 0%, #FFF9E6 100%)';
          pinBadge = `<span style="background:#FFF3D6; color:#B25E00; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; border:1px solid #F3D29B; display:inline-flex; align-items:center; gap:2px;">📌 GHIM</span>`;
        }

        const heartList = (a.reactions && a.reactions.heart) || [];
        const thumbsList = (a.reactions && a.reactions.thumbs) || [];
        const fireList = (a.reactions && a.reactions.fire) || [];
        
        const myName = state.me ? state.me.name : 'Khách';
        const myReactedHeart = heartList.includes(myName);
        const myReactedThumbs = thumbsList.includes(myName);
        const myReactedFire = fireList.includes(myName);

        const item = el(`<div class="bc-card" style="background:${cardBg}; border:${borderStyle}; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:6px; position:relative; box-shadow: ${a.pinned ? '0 4px 10px rgba(216,151,60,0.1)' : 'none'};">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="bc-badge" style="background:${cat.bg}; color:${cat.color}; font-weight:700; font-size:10px; padding:2px 8px; border:1px solid rgba(0,0,0,0.05);">
                ${cat.icon} ${cat.label}
              </span>
              ${pinBadge}
            </div>
            <span style="font-size:11px; color:#8a877d; font-style:italic;">📅 Đăng: ${formatDateTime(a.createdAt)}</span>
          </div>

          <div style="font-weight:700; font-size:14px; color:#1B4332; margin-top:2px;">
            ${escapeHtml(a.title)}
          </div>
          
          <div style="font-size:13px; color:#2C2C2A; line-height:1.45; white-space:pre-line;">
            ${escapeHtml(a.content)}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #E3E0D6; padding-top:8px; margin-top:4px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="bc-btn outline small" id="react-thumbs-${a.id}" style="padding:2px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px; background:${myReactedThumbs ? 'rgba(19,64,116,0.1)' : 'transparent'}; border-color:${myReactedThumbs ? '#134074' : '#C4C2B7'}; color:${myReactedThumbs ? '#134074' : '#6b7a73'}; font-weight:${myReactedThumbs ? 'bold' : 'normal'};">
                👍 <span>${thumbsList.length}</span>
              </button>
              <button class="bc-btn outline small" id="react-heart-${a.id}" style="padding:2px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px; background:${myReactedHeart ? 'rgba(230,10,10,0.08)' : 'transparent'}; border-color:${myReactedHeart ? '#E60A0A' : '#C4C2B7'}; color:${myReactedHeart ? '#E60A0A' : '#6b7a73'}; font-weight:${myReactedHeart ? 'bold' : 'normal'};">
                ❤️ <span>${heartList.length}</span>
              </button>
              <button class="bc-btn outline small" id="react-fire-${a.id}" style="padding:2px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px; background:${myReactedFire ? 'rgba(242,100,25,0.08)' : 'transparent'}; border-color:${myReactedFire ? '#F26419' : '#C4C2B7'}; color:${myReactedFire ? '#F26419' : '#6b7a73'}; font-weight:${myReactedFire ? 'bold' : 'normal'};">
                🔥 <span>${fireList.length}</span>
              </button>
            </div>
            
            <div style="font-size:11px; color:#8a877d; text-align:right;">
              ✍️ Bởi: <strong>${escapeHtml(a.author)}</strong> · 📞 <a href="tel:${escapeHtml(a.phone)}" style="color:#0C447C; font-weight:500;">${escapeHtml(a.phone)}</a>
              ${a.expireDate ? ` · ⏳ Hạn: ${formatDate(a.expireDate)}` : ''}
            </div>
          </div>
          
          ${canManage() ? `<button class="bc-btn danger small" id="ann-del-${a.id}" style="position:absolute; top:8px; right:8px; padding:2px 6px; font-size:10px;">Xóa</button>` : ''}
        </div>`);
        annListContainer.appendChild(item);
      });
    }
    wrap.appendChild(bulletinCard);


    // --- RENDER LỊCH HOẠT ĐỘNG SẮP TỚI (SPOTLIGHT HERO CARD) ---
    const upcomingSessions = state.sessions
      .filter(s => (s.date + (s.time||'00:00')) >= nowStamp)
      .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

    if (upcomingSessions.length > 0) {
      const nearest = upcomingSessions[0];
      const nearestCourt = state.courts.find(c => c.id === nearest.courtId);
      const courtName = nearestCourt ? nearestCourt.name : 'Chưa xếp sân';
      const weekday = weekdayLabel(nearest.date);
      const formattedDate = formatDate(nearest.date);
      const timeRange = formatTimeRange(nearest.time, nearest.timeEnd);
      const mKey = sessionMonthKey(nearest);
      const passes = nearest.passes || {};

      // Thống kê thành viên tham gia / chưa vote
      const activeMembers = state.members.filter(m => {
        const curType = (m.monthlyType || {})[mKey] || '';
        return m.status === 'active' && (curType === 'fixed' || curType === 'casual');
      });

      let yesCount = 0;
      let noCount = 0;
      let unvotedCount = 0;

      activeMembers.forEach(m => {
        const v = nearest.votes[m.name];
        const t = (m.monthlyType || {})[mKey] || '';
        const isReceiver = Object.values(passes).includes(m.id);
        const hasPassed = t === 'fixed' && passes[m.id];
        
        if (isReceiver || (v === 'yes' && !hasPassed)) {
          yesCount++;
        } else if (hasPassed || v === 'no') {
          noCount++;
        } else {
          unvotedCount++;
        }
      });

      // Bổ sung các phiếu yes từ người ngoài hoặc tài khoản cũ (nếu có)
      const currentNames = state.members.map(m => m.name);
      Object.entries(nearest.votes).forEach(([name, v]) => {
        if (!currentNames.includes(name) && v === 'yes') {
          yesCount++;
        }
      });

      const isShortOfPlayers = yesCount < 4;
      const targetPlayers = nearest.max || 24;
      const progressPercent = Math.min(100, Math.round((yesCount / targetPlayers) * 100));

      let alertBoxHtml = '';
      if (isShortOfPlayers) {
        alertBoxHtml = `
          <div style="background: rgba(242, 100, 25, 0.15); border: 1.5px dashed #F26419; border-radius: 10px; padding: 10px 12px; margin-top: 12px;">
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <span style="font-size: 20px; line-height:1; animation: shuttleBounce 1.2s infinite; display:inline-block;">⚠️</span>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:700; color:#FF9F68; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                  <span>ĐANG THIẾU TAY VỢT THAM GIA!</span>
                  <span style="font-size:11px; background:#F26419; color:#FFF; padding:2px 7px; border-radius:10px; font-weight:600;">Cần thêm người</span>
                </div>
                <div style="font-size:12px; color:#E3E0D6; margin-top:3px; line-height:1.35;">
                  Hiện mới có <strong style="color:#FFF;">${yesCount}</strong> người tham gia · Còn <strong style="color:#FF9F68; font-size:13px;">${unvotedCount}</strong> thành viên chưa biểu quyết!
                </div>
              </div>
            </div>
            <!-- Progress Bar based on max capacity -->
            <div style="margin-top:8px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#FF9F68; margin-bottom:3px;">
                <span>Tiến độ ghi danh:</span>
                <span><strong>${yesCount}/${targetPlayers}</strong> tay vợt (${progressPercent}%)</span>
              </div>
              <div style="width:100%; height:7px; background:rgba(255,255,255,0.12); border-radius:10px; overflow:hidden;">
                <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #F26419, #FF7F50); border-radius:10px; transition: width 0.4s ease;"></div>
              </div>
            </div>
            <div style="font-size:11.5px; color:#FF9F68; font-weight:600; text-align:center; margin-top:6px;">
              👉 Hãy biểu quyết (vote) ngay ở thẻ bên dưới để chốt danh sách!
            </div>
          </div>`;
      } else {
        alertBoxHtml = `
          <div style="background: rgba(45, 106, 79, 0.25); border: 1px solid rgba(64, 145, 108, 0.4); border-radius: 10px; padding: 10px 12px; margin-top: 12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px; animation: shuttleBounce 1.5s infinite; display:inline-block;">🏸</span>
                <span style="font-size:12.5px; font-weight:700; color:#52B788;">Đã sẵn sàng ${yesCount} tay vợt tham gia!</span>
              </div>
              ${unvotedCount > 0 ? `<span style="font-size:11px; color:#FFB703; font-weight:600;">Còn ${unvotedCount} người chưa vote</span>` : `<span style="font-size:11px; color:#52B788; font-weight:600;">✓ Đã đủ quân số</span>`}
            </div>
            <!-- Progress Bar based on max capacity -->
            <div style="margin-top:8px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#52B788; margin-bottom:3px;">
                <span>Tiến độ ghi danh:</span>
                <span><strong>${yesCount}/${targetPlayers}</strong> tay vợt (${progressPercent}%)</span>
              </div>
              <div style="width:100%; height:7px; background:rgba(255,255,255,0.12); border-radius:10px; overflow:hidden;">
                <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #52B788, #2D6A4F); border-radius:10px; transition: width 0.4s ease;"></div>
              </div>
            </div>
          </div>`;
      }
      
      const summaryCard = el(`<div class="bc-card" style="background:#1E1E24; border:1.5px solid #F26419; border-left:6px solid #F26419; border-radius:14px; padding:16px; color:#FAF8F5; margin-bottom:1rem; box-shadow:0 4px 20px rgba(242,100,25,0.2); animation:spotlightPulse 3s infinite;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="font-size:12px; font-weight:700; color:#F26419; display:flex; align-items:center; gap:6px; font-family:'Oswald', sans-serif; text-transform:uppercase; letter-spacing:0.6px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#F26419; animation: beaconGlow 1.5s infinite;"></span>
            <span>⚡ TRẬN ĐÁNH TIẾP THEO (GẦN NHẤT)</span>
          </div>
          <span class="bc-badge" style="background:#F26419; color:#FFF; font-size:11px; font-weight:700; padding:3px 9px; border-radius:12px; box-shadow:0 2px 8px rgba(242,100,25,0.4);">
            🔥 ${yesCount} tham gia
          </span>
        </div>
        <div style="font-size:17px; font-weight:700; color:#FFF; font-family:'Outfit', sans-serif; margin-bottom:8px; animation: titleGlowPulse 2.2s infinite ease-in-out; display:inline-block;">
          ${escapeHtml(nearest.note || 'Buổi sinh hoạt thường kỳ')}
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:6px; font-size:13px; color:#CCD2E3;">
          <div>📅 <strong>${weekday}, ${formattedDate}</strong></div>
          <div>⏰ Giờ: <strong>${timeRange}</strong></div>
          <div style="grid-column: 1 / -1;">📍 Sân: <strong>${escapeHtml(courtName)}</strong></div>
        </div>
        ${alertBoxHtml}
      </div>`);
      wrap.appendChild(summaryCard);
    }

    if (canManage()) {
      const courtOptions = state.courts.length
        ? state.courts.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
        : `<option value="">(chưa có sân, thêm ở tab cấu hình)</option>`;
      const form = el(`<div class="bc-card">
        <h3 style="font-size:15px; margin-bottom:10px; color:#1B4332;">Tạo buổi đánh mới</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input class="bc-input" type="date" id="ss-date" style="flex:1.2; min-width:140px;" />
          <input class="bc-input" type="time" id="ss-time" value="18:00" style="flex:1; min-width:100px;" />
          <span style="align-self:center; color:#8a877d; font-size:13px;">đến</span>
          <input class="bc-input" type="time" id="ss-time-end" value="20:00" style="flex:1; min-width:100px;" />
          <select class="bc-select" id="ss-court" style="flex:1.4; min-width:160px;">${courtOptions}</select>
        </div>
        <div id="ss-date-preview" style="font-size:12px; color:#8a877d; margin-top:4px;"></div>
        <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
          <input class="bc-input" id="ss-max" type="number" min="2" value="24" placeholder="Số người tối đa" style="flex:1; min-width:110px;" />
          <input class="bc-input" id="ss-max-casual" type="number" min="0" placeholder="Số vãng lai tối đa" style="flex:1.2; min-width:140px;" />
          <input class="bc-input" id="ss-note" placeholder="Ghi chú (tuỳ chọn)" style="flex:2; min-width:180px;" />
        </div>
        <button class="bc-btn" id="ss-add" style="margin-top:10px;">Tạo buổi</button>
      </div>`);
      wrap.appendChild(form);

      setTimeout(() => {
        const updatePreview = () => {
          const d = document.getElementById('ss-date').value;
          const prev = document.getElementById('ss-date-preview');
          prev.textContent = d ? weekdayLabel(d) + ', ngày ' + formatDate(d) : '';
        };
        document.getElementById('ss-date').oninput = updatePreview;
        updatePreview();
        document.getElementById('ss-add').onclick = () => {
          const date = document.getElementById('ss-date').value;
          const time = document.getElementById('ss-time').value;
          const timeEnd = document.getElementById('ss-time-end').value;
          if (!date || !time) { alert('Chọn ngày và giờ bắt đầu.'); return; }
          if (timeEnd && timeEnd <= time) { alert('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
          const courtId = document.getElementById('ss-court').value;
          const max = parseInt(document.getElementById('ss-max').value, 10) || null;
          const maxCasualVal = document.getElementById('ss-max-casual').value;
          const maxCasual = maxCasualVal ? parseInt(maxCasualVal, 10) : null;
          const note = document.getElementById('ss-note').value.trim();
          state.sessions.push({
            id: uid(), date, time, timeEnd, courtId, max, maxCasual, note,
            votes: {}, costs: { court: 0, water: 0, shuttle: 0, other: 0 },
            flatRate: { enabled: false, fixed: 30000, casual: 45000 }
          });
          saveSessions(); render();
        };
      }, 0);
    }

    let all = state.sessions.slice();

    // --- Thanh lọc ---
    const searchCard = el(`<div class="bc-card" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <span style="font-size:13px; color:#8a877d; white-space:nowrap;">Lọc buổi:</span>
      <input class="bc-input" type="month" id="search-month" value="${state.sessionSearchDate}" placeholder="Tháng" style="width:145px; padding:5px 8px;" />
      <select class="bc-select" id="search-court" style="flex:1; min-width:150px; padding:5px 8px;">
        <option value="">Tất cả sân</option>
        ${state.courts.map(c => `<option value="${c.id}" ${state.sessionSearchCourt===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <button class="bc-btn small" id="search-btn">🔍 Tìm</button>
      ${(state.sessionSearchDate || state.sessionSearchCourt) ? `<button class="bc-btn outline small" id="search-clear">✕ Xoá lọc</button>` : ''}
      <span style="font-size:12px; color:#8a877d; margin-left:auto;">${all.length} buổi tổng cộng</span>
    </div>`);
    wrap.appendChild(searchCard);
    setTimeout(() => {
      document.getElementById('search-btn').onclick = () => {
        state.sessionSearchDate = document.getElementById('search-month').value;
        state.sessionSearchCourt = document.getElementById('search-court').value;
        state.upcomingPage = 0;
        render();
      };
      // Cho phép nhấn Enter trong ô tháng để tìm luôn
      document.getElementById('search-month').onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('search-btn').click(); };
      const clearBtn = document.getElementById('search-clear');
      if (clearBtn) clearBtn.onclick = () => { state.sessionSearchDate = ''; state.sessionSearchCourt = ''; state.upcomingPage = 0; render(); };

      // --- Sự kiện bảng tin ---
      const annToggleBtn = document.getElementById('ann-toggle-btn');
      if (annToggleBtn) {
        annToggleBtn.onclick = () => {
          state['show_announce_form'] = !state['show_announce_form'];
          render();
        };
      }

      const annSubmitBtn = document.getElementById('ann-submit');
      if (annSubmitBtn) {
        annSubmitBtn.onclick = () => {
          const category = document.getElementById('ann-category').value;
          const title = document.getElementById('ann-title').value.trim();
          const content = document.getElementById('ann-content').value.trim();
          const expireDate = document.getElementById('ann-expire').value;
          const pinned = document.getElementById('ann-pin').checked;
          
          if (!title || !content) {
            alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.');
            return;
          }
          
          state.announcements = state.announcements || [];
          state.announcements.push({
            id: uid(),
            category,
            title,
            content,
            expireDate: expireDate || null,
            pinned: !!pinned,
            author: state.me ? state.me.name : 'Khách',
            phone: state.me ? state.me.phone || 'N/A' : 'N/A',
            createdAt: Date.now(),
            reactions: { thumbs: [], heart: [], fire: [] }
          });
          
          state['show_announce_form'] = false;
          saveAnnouncements();
          render();
        };
      }

      (state.announcements || []).forEach(a => {
        const delBtn = document.getElementById(`ann-del-${a.id}`);
        if (delBtn) {
          delBtn.onclick = () => {
            if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
            state.announcements = state.announcements.filter(x => x.id !== a.id);
            saveAnnouncements();
            render();
          };
        }

        const toggleReact = (type) => {
          const myName = state.me ? state.me.name : 'Khách';
          a.reactions = a.reactions || { thumbs: [], heart: [], fire: [] };
          const list = a.reactions[type] || [];
          if (list.includes(myName)) {
            a.reactions[type] = list.filter(n => n !== myName);
          } else {
            list.push(myName);
            a.reactions[type] = list;
          }
          saveAnnouncements();
          render();
        };

        const thumbsBtn = document.getElementById(`react-thumbs-${a.id}`);
        if (thumbsBtn) thumbsBtn.onclick = () => toggleReact('thumbs');

        const heartBtn = document.getElementById(`react-heart-${a.id}`);
        if (heartBtn) heartBtn.onclick = () => toggleReact('heart');

        const fireBtn = document.getElementById(`react-fire-${a.id}`);
        if (fireBtn) fireBtn.onclick = () => toggleReact('fire');
      });
    }, 0);

    if (state.sessionSearchDate) all = all.filter(s => s.date && s.date.slice(0,7) === state.sessionSearchDate);
    if (state.sessionSearchCourt) all = all.filter(s => s.courtId === state.sessionSearchCourt);
    const isFiltering = !!(state.sessionSearchDate || state.sessionSearchCourt);

    const upcoming = all.filter(s => (s.date + (s.time||'00:00')) >= nowStamp).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
    const past = all.filter(s => (s.date + (s.time||'00:00')) < nowStamp).sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));

    const SPAGE = 4; // buổi sắp tới mỗi trang

    if (all.length === 0) {
      wrap.appendChild(el(`<div class="bc-empty">${isFiltering ? 'Không tìm thấy buổi đánh phù hợp.' : 'Chưa có buổi đánh nào.' + (canManage() ? ' Tạo buổi đầu tiên ở trên.' : ' Hãy đợi Admin/R1 tạo buổi.')}</div>`));
    } else {
      // --- UPCOMING: phân trang ---
      if (upcoming.length === 0 && !isFiltering) {
        wrap.appendChild(el(`<div class="bc-empty">Không có buổi sắp tới. Các buổi cũ bên dưới.</div>`));
      } else if (upcoming.length > 0) {
        const uPage = state.upcomingPage || 0;
        const uTotal = Math.ceil(upcoming.length / SPAGE);
        const uSlice = upcoming.slice(uPage * SPAGE, (uPage + 1) * SPAGE);
        if (upcoming.length > SPAGE) {
          wrap.appendChild(el(`<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:500; color:#1B4332;">Buổi sắp tới (${upcoming.length})</span>
            <div style="display:flex; gap:6px; align-items:center; font-size:13px; color:#6b7a73;">
              ${uPage > 0 ? `<button class="bc-btn outline small" id="up-prev">◀</button>` : '<span></span>'}
              <span>Trang ${uPage+1}/${uTotal}</span>
              ${uPage < uTotal-1 ? `<button class="bc-btn outline small" id="up-next">▶</button>` : '<span></span>'}
            </div>
          </div>`));
          setTimeout(() => {
            const prev = document.getElementById('up-prev');
            const next = document.getElementById('up-next');
            if (prev) prev.onclick = () => { state.upcomingPage = uPage - 1; render(); };
            if (next) next.onclick = () => { state.upcomingPage = uPage + 1; render(); };
          }, 0);
        }
        uSlice.forEach(s => wrap.appendChild(renderSessionCard(s)));
      }

      // --- PAST: thu gọn mặc định, bấm để mở ---
      if (past.length > 0) {
        const pastExpanded = state.pastExpanded || isFiltering;
        const pastVisible = pastExpanded ? past : past.slice(0, 2);
        const header = el(`<div style="display:flex; align-items:center; justify-content:space-between; margin:1rem 0 0.5rem; cursor:pointer;" id="past-header">
          <span style="font-size:13px; font-weight:500; color:#8a877d;">Buổi đã qua (${past.length})</span>
          ${!isFiltering ? `<button class="bc-btn outline small">${pastExpanded ? '▲ Thu gọn' : '▼ Xem tất cả'}</button>` : ''}
        </div>`);
        wrap.appendChild(header);
        pastVisible.forEach(s => wrap.appendChild(renderSessionCard(s)));
        if (!isFiltering && !pastExpanded && past.length > 2) {
          wrap.appendChild(el(`<div style="font-size:13px; color:#8a877d; text-align:center; margin-top:4px;">... và ${past.length - 2} buổi cũ hơn</div>`));
        }
        setTimeout(() => {
          const ph = document.getElementById('past-header');
          if (ph) ph.onclick = () => { state.pastExpanded = !state.pastExpanded; state.pastPage = 0; render(); };
        }, 0);
      }
    }
    return wrap;
  }

  function renderSessionCard(s){
    const mKey = sessionMonthKey(s);
    const court = state.courts.find(c => c.id === s.courtId);
    const passes = s.passes || {};

    // Tính số lượng cố định và vãng lai tham gia thực tế
    let fixedPlaying = 0;
    let casualPlaying = 0;
    let totalFixed = 0;
    let totalCasual = 0;
    
    // Thống kê danh sách tham gia (yes) và vắng (no) thực tế
    const yes = [];
    const no = [];

    state.members.forEach(m => {
      const t = (m.monthlyType || {})[mKey] || '';
      const v = s.votes[m.name];
      const hasPassed = t === 'fixed' && passes[m.id];
      const isReceiver = Object.values(passes).includes(m.id);
      
      if (m.status === 'active') {
        if (t === 'fixed') {
          totalFixed++;
          if (v === 'yes' && !hasPassed) {
            fixedPlaying++;
            if (!yes.includes(m.name)) yes.push(m.name);
          } else if (hasPassed || v === 'no') {
            if (!no.includes(m.name)) no.push(m.name);
          }
        } else if (t === 'casual') {
          totalCasual++;
          if (v === 'yes' || isReceiver) {
            casualPlaying++;
            if (!yes.includes(m.name)) yes.push(m.name);
          } else if (v === 'no') {
            if (!no.includes(m.name)) no.push(m.name);
          }
        }
      }
    });

    // Bổ sung phiếu bầu của các tài khoản đã bị xóa hoặc thành viên cũ ngoài danh sách hiện tại
    const currentNames = state.members.map(m => m.name);
    Object.entries(s.votes).forEach(([name, v]) => {
      if (!currentNames.includes(name)) {
        if (v === 'yes') {
          if (!yes.includes(name)) yes.push(name);
        } else if (v === 'no') {
          if (!no.includes(name)) no.push(name);
        }
      }
    });

    const full = s.max && yes.length >= s.max;
    s.costs = s.costs || { court: 0, water: 0, shuttle: 0, other: 0 };
    const shares = computeShares(s);

    const yesVoters = Object.entries(s.votes)
      .filter(([,v]) => v === 'yes')
      .map(([name]) => state.members.find(m => m.name === name))
      .filter(Boolean);

    // Xây dựng danh sách hiển thị gồm thành viên hiện tại đã đăng ký + thành viên đã xoá có lịch sử vote
    const displayMembers = state.members.filter(m => {
      const curType = (m.monthlyType || {})[mKey] || '';
      return curType === 'fixed' || curType === 'casual';
    });
    Object.keys(s.votes).forEach(name => {
      if (!currentNames.includes(name) && s.votes[name] === 'yes') {
        displayMembers.push({
          id: 'deleted-' + name,
          name: name,
          isDeleted: true,
          status: 'deleted',
          level: 'Mới chơi',
          role: 'r2'
        });
      }
    });

    s.challenges = s.challenges || [];
    
    // Tạo danh sách người chọn tham gia thách đấu (những người vote yes hoặc nhận pass)
    const activePlayers = displayMembers.filter(m => {
      const v = s.votes[m.name];
      const isReceiver = Object.values(passes).includes(m.id);
      return v === 'yes' || isReceiver;
    });

    const playerOptions = activePlayers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');

    let challengesListHtml = '';
    if (s.challenges.length === 0) {
      challengesListHtml = `<div style="font-size:12px; color:#8a877d; text-align:center; padding:16px; font-style:italic; grid-column: 1 / -1; width: 100%;">Chưa có kèo thách đấu nào được tạo. Hãy là người đầu tiên tạo chiến thư! 🏸</div>`;
    } else {
      challengesListHtml = s.challenges.map(c => {
        const myName = state.me ? state.me.name : 'Khách';
        const team1Names = c.team1.filter(Boolean);
        const team2Names = c.team2.filter(Boolean);
        
        let statusBadge = '';
        let cardBg = 'var(--card-bg)';
        let cardBorder = '1px solid var(--card-border)';
        
        if (c.status === 'pending') {
          statusBadge = `<span class="bc-badge" style="background:#E6F1FB; color:#0C447C; font-weight:600;">🔵 Đang thách đấu</span>`;
        } else if (c.status === 'accepted') {
          statusBadge = `<span class="bc-badge" style="background:#FFF2E6; color:#B25E00; font-weight:600; animation: pulse 2s infinite;">🔥 Đã nhận kèo</span>`;
          cardBg = 'rgba(242, 100, 25, 0.05)';
          cardBorder = '1px solid #F26419';
        } else if (c.status === 'done') {
          statusBadge = `<span class="bc-badge" style="background:#EAF3DE; color:#27500A; font-weight:600;">✅ Hoàn thành</span>`;
          cardBg = 'rgba(45, 106, 79, 0.03)';
        }

        const isDone = c.status === 'done';
        const team1Won = isDone && (c.score1 > c.score2);
        const team2Won = isDone && (c.score2 > c.score1);

        const sMonth = sessionMonthKey(s);
        const team1Html = team1Names.map(name => {
          const m = state.members.find(x => x.name === name);
          const mMonthXP = m ? calculateMemberMonthXP(m.id, state.sessions, sMonth) : 0;
          let textStyle = `font-weight:600; font-size:12px;`;
          if (isDone) {
            textStyle += team1Won ? ' color:#27500A; font-weight:bold;' : ' color:#8a877d; font-weight:normal;';
          }
          return `<div style="display:flex; align-items:center; gap:6px; ${textStyle}">
            ${avatarHtml(m || { name }, 22, mMonthXP)}
            <span style="max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(name)}</span>
          </div>`;
        }).join('');

        const team2Html = team2Names.map(name => {
          const m = state.members.find(x => x.name === name);
          const mMonthXP = m ? calculateMemberMonthXP(m.id, state.sessions, sMonth) : 0;
          let textStyle = `font-weight:600; font-size:12px; justify-content:flex-end;`;
          if (isDone) {
            textStyle += team2Won ? ' color:#27500A; font-weight:bold;' : ' color:#8a877d; font-weight:normal;';
          }
          return `<div style="display:flex; align-items:center; gap:6px; ${textStyle}">
            <span style="max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(name)}</span>
            ${avatarHtml(m || { name }, 22, mMonthXP)}
          </div>`;
        }).join('');


        const isTeamMember = c.team1.includes(myName) || c.team2.includes(myName);
        const isManager = canManage();
        const canOperate = isTeamMember || isManager;
        const canDelete = (c.status === 'pending' && canOperate) || (c.status !== 'pending' && isManager);

        let actionsHtml = '';
        if (canOperate) {
          if (c.status === 'pending') {
            actionsHtml = `
              <button class="bc-btn small" id="accept-c-${s.id}-${c.id}" style="padding:2px 8px; font-size:11px;">Nhận kèo 🤝</button>
              ${canDelete ? `<button class="bc-btn danger small" id="del-c-${s.id}-${c.id}" style="padding:2px 6px; font-size:11px; margin-left:4px;">Xóa</button>` : ''}
            `;
          } else if (c.status === 'accepted') {
            actionsHtml = `
              <button class="bc-btn small" id="score-c-${s.id}-${c.id}" style="background:#D8973C; border-color:#D8973C; padding:2px 8px; font-size:11px; color:#FFF;">Ghi tỉ số 🏆</button>
              <button class="bc-btn outline small" id="revert-c-${s.id}-${c.id}" style="padding:2px 6px; font-size:11px; margin-left:4px;">Huỷ nhận</button>
              ${canDelete ? `<button class="bc-btn danger small" id="del-c-${s.id}-${c.id}" style="padding:2px 6px; font-size:11px; margin-left:4px;">Xóa</button>` : ''}
            `;
          } else if (c.status === 'done') {
            actionsHtml = `
              <span style="font-weight:700; font-size:14px; color:#1B4332; font-family:'Oswald',sans-serif; margin-right:8px;">${c.score1} - ${c.score2}</span>
              <button class="bc-btn outline small" id="reopen-c-${s.id}-${c.id}" style="padding:2px 6px; font-size:11px;">Mở lại 🔓</button>
              ${canDelete ? `<button class="bc-btn danger small" id="del-c-${s.id}-${c.id}" style="padding:2px 6px; font-size:11px; margin-left:4px;">Xóa</button>` : ''}
            `;
          }
        } else {
          if (c.status === 'done') {
            actionsHtml = `<span style="font-weight:700; font-size:14px; color:#1B4332; font-family:'Oswald',sans-serif; margin-right:8px;">${c.score1} - ${c.score2}</span>`;
          }
        }


        const team1WinnerLabel = team1Won 
          ? `<span style="font-size:9px; background:#EAF3DE; color:#27500A; padding:1px 4px; border-radius:3px; font-weight:700; vertical-align:middle;">👑 Thắng</span>` 
          : '';
        const team2WinnerLabel = team2Won 
          ? `<span style="font-size:9px; background:#EAF3DE; color:#27500A; padding:1px 4px; border-radius:3px; font-weight:700; vertical-align:middle;">👑 Thắng</span>` 
          : '';

        const team1HandicapBadge = c.handicapTeam === 'team1' 
          ? `<span style="font-size:9px; background:#FFEBEB; color:#C53030; padding:1px 4px; border-radius:3px; font-weight:700; vertical-align:middle;">Chấp</span>` 
          : '';
        const team2HandicapBadge = c.handicapTeam === 'team2' 
          ? `<span style="font-size:9px; background:#FFEBEB; color:#C53030; padding:1px 4px; border-radius:3px; font-weight:700; vertical-align:middle;">Chấp</span>` 
          : '';

        // --- Xử lý hiển thị bet (dự đoán kèo) ---
        c.bets = c.bets || { team1: [], team2: [] };
        const b1 = c.bets.team1 || [];
        const b2 = c.bets.team2 || [];
        const totalBets = b1.length + b2.length;
        
        let p1Percent = 50;
        let p2Percent = 50;
        if (totalBets > 0) {
          p1Percent = Math.round((b1.length / totalBets) * 100);
          p2Percent = 100 - p1Percent;
        }

        const myBetT1 = b1.includes(myName);
        const myBetT2 = b2.includes(myName);

        let betSectionHtml = '';
        if (c.status !== 'done') {
          // Trận đấu chưa kết thúc -> cho phép vote/bet
          betSectionHtml = `<div style="background:rgba(0,0,0,0.02); border-radius:8px; padding:8px; margin-top:6px; display:flex; flex-direction:column; gap:6px; border:1px solid var(--card-border);">
            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:var(--text-secondary);">
              <span>📊 Dự đoán: Cặp 1 (${p1Percent}%)</span>
              <span>Cặp 2 (${p2Percent}%)</span>
            </div>
            
            <div style="height:6px; background:var(--card-border); border-radius:3px; display:flex; overflow:hidden; width:100%;">
              <div style="width:${p1Percent}%; background:#134074; transition: width 0.3s ease;"></div>
              <div style="width:${p2Percent}%; background:#F26419; transition: width 0.3s ease;"></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <button class="bc-btn ${myBetT1 ? '' : 'outline'} small" id="bet-t1-${s.id}-${c.id}" style="padding:2px 8px; font-size:10px; display:inline-flex; align-items:center; gap:2px; height:24px;">
                👍 Vote Cặp 1 ${b1.length > 0 ? `(${b1.length})` : ''}
              </button>
              <button class="bc-btn ${myBetT2 ? '' : 'outline'} small" id="bet-t2-${s.id}-${c.id}" style="padding:2px 8px; font-size:10px; display:inline-flex; align-items:center; gap:2px; height:24px;">
                Vote Cặp 2 👍 ${b2.length > 0 ? `(${b2.length})` : ''}
              </button>
            </div>

            ${totalBets > 0 ? `<div style="font-size:10px; color:#8a877d; line-height:1.25;">
              ${b1.length > 0 ? `👈 <strong>Cặp 1</strong>: ${b1.map(escapeHtml).join(', ')}<br/>` : ''}
              ${b2.length > 0 ? `👉 <strong>Cặp 2</strong>: ${b2.map(escapeHtml).join(', ')}` : ''}
            </div>` : ''}
          </div>`;
        } else {
          // Trận đấu đã hoàn thành -> hiển thị kết quả vote đúng/sai
          const winnerTeam = c.score1 > c.score2 ? 1 : (c.score2 > c.score1 ? 2 : 0);
          let correctBettors = [];
          if (winnerTeam === 1) correctBettors = b1;
          else if (winnerTeam === 2) correctBettors = b2;

          betSectionHtml = `<div style="background:rgba(45, 106, 79, 0.02); border-radius:8px; padding:8px; margin-top:6px; font-size:11px; display:flex; flex-direction:column; gap:4px; border: 1px dashed rgba(45, 106, 79, 0.15);">
            <div style="font-weight:700; color:#27500A; display:flex; align-items:center; gap:4px;">
              🎯 Dự đoán trận đấu:
            </div>
            <div style="color:#6b7a73; line-height:1.3;">
              • Cặp 1 được chọn bởi: ${b1.length > 0 ? b1.map(escapeHtml).join(', ') : 'không ai'}<br/>
              • Cặp 2 được chọn bởi: ${b2.length > 0 ? b2.map(escapeHtml).join(', ') : 'không ai'}
            </div>
            ${correctBettors.length > 0 ? `<div style="color:#27500A; font-weight:600; margin-top:2px;">
              🎉 Dự đoán chính xác: ${correctBettors.map(escapeHtml).join(', ')}! 🎯
            </div>` : ''}
          </div>`;
        }

        return `<div class="bc-card" style="margin:0; padding:10px; background:${cardBg}; border:${cardBorder}; display:flex; flex-direction:column; gap:8px; box-shadow:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--card-border); padding-bottom:6px;">
            ${statusBadge}
            <div style="font-size:11px; color:#8a877d;">Tạo bởi: ${escapeHtml(c.createdBy)}</div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:4px 0;">
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
              ${team1Html}
              <div style="display:flex; gap:4px; margin-top:2px;">
                ${team1HandicapBadge}
                ${team1WinnerLabel}
              </div>
            </div>
            
            <div style="display:flex; flex-direction:column; align-items:center; gap:2px; min-width:45px;">
              <span style="font-family:'Oswald',sans-serif; font-size:13px; font-weight:900; color:#993C1D; background:#FAECE7; padding:2px 6px; border-radius:12px;">VS</span>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; flex:1; align-items:flex-end;">
              ${team2Html}
              <div style="display:flex; gap:4px; margin-top:2px; justify-content:flex-end;">
                ${team2WinnerLabel}
                ${team2HandicapBadge}
              </div>
            </div>
          </div>
          ${betSectionHtml}
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--card-border); padding-top:6px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:12px; color:#27500A; font-weight:500; font-style:italic;">
              📌 Kèo: ${escapeHtml(c.handicap || 'Đánh đều (không chấp)')}
            </div>
            <div style="display:flex; align-items:center;">
              ${actionsHtml}
            </div>
          </div>
        </div>`;
      }).join('');
    }

    // Form tạo kèo thách đấu mới
    const showFormKey = `show_c_form_${s.id}`;
    const formVisible = !!state[showFormKey];

    const createFormHtml = formVisible ? `
      <div class="bc-card" style="margin: 8px 0 0 0; background: var(--input-bg); border: 1px solid var(--card-border); padding: 12px; box-shadow:none;">
        <h4 style="font-size: 13px; color: #1B4332; margin-bottom: 8px; font-weight: 600;">⚡ THIẾT LẬP KÈO THÁCH ĐẤU</h4>
        <div style="display: flex; flex-direction: column; gap:8px;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 130px;">
              <label style="font-size: 11px; color:#8a877d; display:block; margin-bottom:2px;">Cặp đấu 1 (Challenger):</label>
              <select class="bc-select" id="c-t1-p1-${s.id}" style="width: 100%; padding: 4px; font-size: 12px;">
                <option value="">-- Chọn người 1 --</option>
                ${playerOptions}
              </select>
              <select class="bc-select" id="c-t1-p2-${s.id}" style="width: 100%; padding: 4px; font-size: 12px; margin-top: 4px;">
                <option value="">-- Chọn người 2 (Đôi) --</option>
                ${playerOptions}
              </select>
            </div>
            
            <div style="font-weight: 700; color: #993C1D; font-size: 14px; text-align:center;">VS</div>
            
            <div style="flex: 1; min-width: 130px;">
              <label style="font-size: 11px; color:#8a877d; display:block; margin-bottom:2px;">Cặp đấu 2 (Challenged):</label>
              <select class="bc-select" id="c-t2-p1-${s.id}" style="width: 100%; padding: 4px; font-size: 12px;">
                <option value="">-- Chọn người 1 --</option>
                ${playerOptions}
              </select>
              <select class="bc-select" id="c-t2-p2-${s.id}" style="width: 100%; padding: 4px; font-size: 12px; margin-top: 4px;">
                <option value="">-- Chọn người 2 (Đôi) --</option>
                ${playerOptions}
              </select>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="font-size: 11px; color:#8a877d; display:block; margin-bottom:2px;">Chấp kèo / Điều kiện:</label>
              <input class="bc-input" id="c-handicap-${s.id}" placeholder="Ví dụ: Chấp 4 trái / bao nước" style="width: 100%; padding: 5px 8px; font-size: 12px;" />
            </div>
            <div>
              <label style="font-size: 11px; color:#8a877d; display:block; margin-bottom:2px;">Đội chấp kèo (nếu có):</label>
              <select class="bc-select" id="c-handicap-team-${s.id}" style="width: 100%; padding: 4px; font-size: 12px;">
                <option value="none">Không chấp (đánh đều)</option>
                <option value="team1">Cặp đấu 1 (Challenger)</option>
                <option value="team2">Cặp đấu 2 (Challenged)</option>
              </select>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button class="bc-btn small" id="c-submit-${s.id}" style="padding:5px 12px; font-size:12px; font-weight:600;">⚡ Đăng Kèo!</button>
            <button class="bc-btn outline small" id="c-cancel-${s.id}" style="padding:5px 12px; font-size:12px;">Đóng</button>
          </div>
        </div>
      </div>
    ` : '';

    const challengesBoardHtml = `<div style="margin-top:12px; border-top:1px dashed var(--card-border); padding-top:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-size:13px; font-weight:600; color:#1B4332; display:flex; align-items:center; gap:4px; font-family:'Oswald', sans-serif;">
          🔥 BẢNG THÁCH ĐẤU &amp; CHẤP KÈO
        </div>
        ${!formVisible ? `<button class="bc-btn small" id="c-toggle-btn-${s.id}" style="padding:3px 8px; font-size:11px; font-weight:600;">➕ Thách đấu</button>` : ''}
      </div>
      
      ${createFormHtml}
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:10px; margin-top:8px;">
        ${challengesListHtml}
      </div>
    </div>`;

    const card = el(`<div class="bc-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-weight:500; font-size:15px; color:#1B4332;">${weekdayLabel(s.date)}, ngày ${formatDate(s.date)} · ${formatTimeRange(s.time, s.timeEnd)}</div>
          <div style="font-size:13px; color:#6b7a73; margin-top:2px;">${court ? escapeHtml(court.name) : 'Chưa chọn sân'}${court && court.address ? ' · ' + escapeHtml(court.address) : ''}${court && court.mapLink ? ` · <a href="${escapeHtml(court.mapLink)}" target="_blank" style="color:#0C447C;">📍 Google Maps</a>` : ''}</div>
          ${s.note ? `<div style="font-size:13px; color:#8a877d; margin-top:2px;">${escapeHtml(s.note)}</div>` : ''}
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${(canManage() && !s.locked) ? `<button class="bc-btn outline small" id="remind-vote-${s.id}" style="border-color:#F26419; color:#F26419; padding:2px 8px; font-size:11px;">📢 Nhắc vote</button>` : ''}
          ${canManage() ? `<button class="bc-btn ${s.locked?'danger':'outline'} small" id="lock-${s.id}">${s.locked ? 'Mở chốt' : 'Chốt buổi'}</button>` : ''}
          ${canDelete() ? `<button class="bc-btn danger small" id="del-${s.id}">Xoá</button>` : ''}
        </div>
      </div>
      <div style="display:flex; gap:14px; margin-top:10px; font-size:13px; color:#6b7a73; flex-wrap:wrap;">
        <span><span class="bc-badge" style="background:#EAF3DE; color:#27500A;">${yes.length}${s.max ? '/'+s.max : ''} tham gia</span></span>
        <span><span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">${s.locked ? 'Cố định thực tế: ' + fixedPlaying : 'Cố định hiện có: ' + totalFixed}</span></span>
        <span><span class="bc-badge" style="background:#FFF2E6; color:#B25E00;">${s.locked ? 'Vãng lai thực tế: ' + casualPlaying : 'Vãng lai hiện có: ' + totalCasual}${!s.locked && s.maxCasual ? ' (Nhận tối đa ' + s.maxCasual + ')' : ''}</span></span>
        <span><span class="bc-badge" style="background:#FAECE7; color:#993C1D;">${no.length} vắng</span></span>
        ${full ? `<span class="bc-badge" style="background:#FAEEDA; color:#854F0B;">Đủ người</span>` : ''}
        ${!s.locked && s.maxCasual && casualPlaying >= s.maxCasual ? `<span class="bc-badge" style="background:#FAECE7; color:#993C1D;">Hết chỗ vãng lai</span>` : ''}
        ${s.locked ? `<span class="bc-badge" style="background:#FAEEDA; color:#854F0B;">🔒 Đã chốt</span>` : ''}
      </div>
      <div style="margin-top:10px; display:flex; gap:8px;" id="vote-${s.id}"></div>
      <div id="challenges-board-${s.id}"></div>
      <div style="margin-top:12px; border-top:1px dashed #E3E0D6; padding-top:10px;" id="vote-table-${s.id}"></div>
      <div style="margin-top:12px; border-top:1px dashed #E3E0D6; padding-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:600; color:#1B4332; display:flex; align-items:center; gap:4px; font-family:'Oswald', sans-serif;">
            💰 CHI PHÍ &amp; PHẠT TRỄ
          </span>
          <button class="bc-btn outline small" id="toggle-cost-${s.id}" style="padding:2px 8px; font-size:11px;">
            ${(state.showCost && state.showCost[s.id]) ? 'Ẩn chi phí ✖' : 'Xem chi phí 👁'}
          </button>
        </div>
        <div id="cost-${s.id}" style="display:${(state.showCost && state.showCost[s.id]) ? 'block' : 'none'}; margin-top:8px;"></div>
      </div>
    </div>`);

    const challengesBoardContainer = card.querySelector(`#challenges-board-${s.id}`);
    if (challengesBoardContainer && challengesBoardHtml) {
      challengesBoardContainer.innerHTML = challengesBoardHtml;
    }

    if (canManage()) {
      const lockBtn = card.querySelector(`#lock-${s.id}`);
      lockBtn.onclick = () => { s.locked = !s.locked; saveSessions(); render(); };
      const remindBtn = card.querySelector(`#remind-vote-${s.id}`);
      if (remindBtn) {
        remindBtn.onclick = () => showRemindVoteDialog(s);
      }
    }

    const voteRow = card.querySelector(`#vote-${s.id}`);
    const lockedForMe = s.locked && role() === 'r2';
    if (state.me.status !== 'active') {
      voteRow.appendChild(el(`<div style="font-size:13px; color:#8a877d;">Tài khoản của bạn đang Ngưng hoạt động, liên hệ Admin để vote lại.</div>`));
    } else if (lockedForMe) {
      voteRow.appendChild(el(`<div style="font-size:13px; color:#854F0B;">🔒 Buổi đã được chốt, không thể thay đổi vote. Liên hệ Admin/R1 nếu cần sửa.</div>`));
    } else {
      const myType = (state.me.monthlyType || {})[mKey] || '';
      if (myType !== 'fixed' && myType !== 'casual') {
        voteRow.appendChild(el(`<div style="font-size:13px; color:#8a877d;">Bạn chưa đăng ký hoạt động tháng này (Cố định/Vãng lai) nên không thể vote.</div>`));
      } else {
        const myVote = s.votes[state.me.name];
        const yesBtn = el(`<button class="bc-btn small ${myVote==='yes'?'':'outline'}">Tham gia</button>`);
        const noBtn = el(`<button class="bc-btn small ${myVote==='no'?'':'outline'}">Không tham gia</button>`);
        
        if (myType === 'casual' && myVote !== 'yes' && s.maxCasual && casualPlaying >= s.maxCasual) {
          yesBtn.disabled = true;
          yesBtn.style.opacity = '0.5';
          yesBtn.style.cursor = 'not-allowed';
          yesBtn.textContent = 'Tham gia (Hết chỗ)';
        } else {
          yesBtn.onclick = () => { s.votes[state.me.name] = 'yes'; saveSessions(); render(); };
        }
        noBtn.onclick = () => { s.votes[state.me.name] = 'no'; saveSessions(); render(); };
        voteRow.appendChild(yesBtn); voteRow.appendChild(noBtn);
      }
    }

    const voteTable = card.querySelector(`#vote-table-${s.id}`);
    state.showAllVoters = state.showAllVoters || {};
    state.showCost = state.showCost || {};
    const showAll = !!state.showAllVoters[s.id];
    let toggleBtnHtml = '';
    if (s.locked) {
      toggleBtnHtml = `<button class="bc-btn outline small" id="toggle-voters-${s.id}" style="padding:2px 8px; font-size:11px; margin-left:auto; border-color:#8a877d; color:#8a877d; background:transparent;">
        ${showAll ? '🙈 Ẩn vắng/chưa vote' : '👁️ Hiện vắng/chưa vote'}
      </button>`;
    }
    voteTable.appendChild(el(`<div style="display:flex; align-items:center; margin-bottom:6px; width:100%;">
      <div style="font-size:13px; font-weight:500; color:#1B4332;">Bảng vote</div>
      ${toggleBtnHtml}
    </div>`));
    if (state.members.length === 0) {
      voteTable.appendChild(el(`<div style="font-size:13px; color:#8a877d;">Chưa có thành viên nào.</div>`));
    } else {
      s.passes = s.passes || {};
      const passes = s.passes;
      const casualList = state.members.filter(x => {
        const curType = (x.monthlyType || {})[mKey] || '';
        return curType === 'casual' && x.status === 'active' && s.votes[x.name] !== 'no';
      });
      const lockedForOthers = s.locked && role() === 'r2';

      // Xây dựng danh sách hiển thị gồm thành viên hiện tại đã đăng ký + thành viên đã xoá có lịch sử vote
      const currentNames = state.members.map(m => m.name);
      const displayMembers = state.members.filter(m => {
        const curType = (m.monthlyType || {})[mKey] || '';
        return curType === 'fixed' || curType === 'casual';
      });
      Object.keys(s.votes).forEach(name => {
        if (!currentNames.includes(name) && s.votes[name] === 'yes') {
          displayMembers.push({
            id: 'deleted-' + name,
            name: name,
            isDeleted: true,
            status: 'deleted',
            level: 'Mới chơi',
            role: 'r2'
          });
        }
      });

      const tbl = el(`<table style="width:100%; font-size:13px; border-collapse:collapse;"></table>`);
      let hiddenCount = 0;
      displayMembers.forEach(m => {
        const v = s.votes[m.name];
        const t = memberType(m.name, mKey);
        const isReceiver = Object.values(passes).includes(m.id);
        const hasPassed = t === 'fixed' && passes[m.id];
        const notVoted = !v;
        const isAbsent = v === 'no';

        // Khi buổi đã chốt: ẩn thành viên chưa vote hoặc vắng (và không pass) trừ khi nhận pass hoặc bật showAll
        if (s.locked && !showAll && (notVoted || isAbsent) && !hasPassed && !isReceiver) { hiddenCount++; return; }
        let statusBadge = '';
        const canVoteOnBehalf = canManage() && m.role === 'r2' && !hasPassed && !isReceiver && !m.isDeleted;
        if (canVoteOnBehalf) {
          const isCasualFull = t === 'casual' && v !== 'yes' && s.maxCasual && casualPlaying >= s.maxCasual;
          let selectStyle = `width:110px; padding:4px 6px; font-size:12px; font-weight:600; text-align-last:right; border-radius:6px;`;
          if (!v) {
            selectStyle += ` background:#F1EFE8; color:#8a877d; border:1px solid #C4C2B7;`;
          } else if (v === 'yes') {
            selectStyle += ` background:#EAF3DE; color:#27500A; border:1px solid rgba(39,80,10,0.25);`;
          } else if (v === 'no') {
            selectStyle += ` background:#FAECE7; color:#993C1D; border:1px solid rgba(153,60,29,0.25);`;
          }
          statusBadge = `<select class="bc-select" id="vote-select-${s.id}-${m.id}" style="${selectStyle}">
            <option value="" ${!v ? 'selected' : ''} style="background:#F1EFE8; color:#8a877d;">Chưa vote</option>
            <option value="yes" ${v === 'yes' ? 'selected' : ''} style="background:#EAF3DE; color:#27500A;" ${isCasualFull ? 'disabled' : ''}>Tham gia${isCasualFull ? ' (Hết chỗ)' : ''}</option>
            <option value="no" ${v === 'no' ? 'selected' : ''} style="background:#FAECE7; color:#993C1D;">Vắng</option>
          </select>`;
        } else {
          statusBadge = hasPassed
            ? `<span class="bc-badge" style="background:#FAEEDA; color:#854F0B;">Đã pass (tính vắng)</span>`
            : isReceiver
            ? `<span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">Tham gia (Nhận pass)</span>`
            : v === 'yes'
            ? `<span class="bc-badge" style="background:#EAF3DE; color:#27500A;">Tham gia</span>`
            : v === 'no'
              ? `<span class="bc-badge" style="background:#FAECE7; color:#993C1D;">Vắng</span>`
              : `<span class="bc-badge" style="background:#F1EFE8; color:#888780;">Chưa vote</span>`;
        }

        let passCell = '';
        if (m.isDeleted) {
          passCell = `<span style="font-size:12px; color:#993C1D; font-style:italic;">Tài khoản đã xoá</span>`;
        } else if (t === 'fixed') {
          const isSelfRow = state.me && state.me.id === m.id;
          const editable = canManage() || (isSelfRow && !lockedForOthers);
          if (editable) {
            // Lọc loại trừ vãng lai đã nhận pass từ cố định khác
            const otherPasses = Object.entries(passes)
              .filter(([fid]) => fid !== m.id)
              .map(([,cid]) => cid);
            const availableCasuals = casualList.filter(c => !otherPasses.includes(c.id));

            passCell = `<select class="bc-select" id="pass-${s.id}-${m.id}" style="width:150px; padding:4px 6px; font-size:12px;">
              <option value="" ${passes[m.id] === 'pending' ? 'selected' : ''}>${passes[m.id] === 'pending' ? '🔍 Chờ người nhận...' : 'Không pass'}</option>
              ${availableCasuals.map(c => `<option value="${c.id}" ${passes[m.id]===c.id?'selected':''}>Pass cho ${escapeHtml(memberDisplayName(c))}</option>`).join('')}
            </select>`;
          } else if (passes[m.id]) {
            const target = state.members.find(x => x.id === passes[m.id]);
            passCell = passes[m.id] === 'pending'
              ? `<span style="font-size:12px; color:#854F0B; font-weight:500;">🔍 Chờ người nhận...</span>`
              : (target ? `<span style="font-size:12px; color:#8a877d;">Đã pass cho ${escapeHtml(memberDisplayName(target))}</span>` : '');
          }
        } else {
          const fromId = Object.keys(passes).find(fid => passes[fid] === m.id);
          if (fromId) {
            const fromMember = state.members.find(x => x.id === fromId);
            passCell = `<span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">Nhận pass từ ${fromMember ? escapeHtml(memberDisplayName(fromMember)) : '?'}</span>`;
          }
        }

        const isSelfRow = state.me && state.me.id === m.id;
        const nameLabel = memberDisplayNameHtml(m, { isSelf: isSelfRow, isDeleted: m.isDeleted, mainSize: '13px', subSize: '11px', fontWeight: '500' });

        let trStyle = `border-top:1px solid #F1EFE8;`;
        if (isSelfRow) {
          trStyle += ` background-color: rgba(216, 151, 60, 0.08); font-weight: 600;`;
        } else if (v === 'yes' || isReceiver) {
          trStyle += ` background-color: rgba(45, 106, 79, 0.04);`;
        }
        const mMonthXP = calculateMemberMonthXP(m.id, state.sessions, sessionMonthKey(s));
        tbl.appendChild(el(`<tr style="${trStyle}">
          <td style="padding:5px 4px; width:30px;">${avatarHtml(m, 26, mMonthXP)}</td>
          <td style="padding:5px 4px;">${nameLabel}</td>
          <td style="padding:5px 4px; color:#8a877d;">${t === 'fixed' ? 'Cố định' : 'Vãng lai'}</td>
          <td style="padding:5px 4px;">${passCell}</td>
          <td style="padding:5px 4px; text-align:right;">${statusBadge}</td>
        </tr>`));

      });
      voteTable.appendChild(tbl);
      if (s.locked && hiddenCount > 0) {
        voteTable.appendChild(el(`<div style="font-size:12px; color:#8a877d; margin-top:6px; font-style:italic;">🔒 Đã ẩn ${hiddenCount} thành viên chưa vote hoặc vắng (buổi đã chốt). Nhấp "Hiện vắng/chưa vote" ở trên để xem.</div>`));
      }

      setTimeout(() => {
        const toggleCostBtn = document.getElementById(`toggle-cost-${s.id}`);
        if (toggleCostBtn) {
          toggleCostBtn.onclick = () => {
            state.showCost[s.id] = !state.showCost[s.id];
            render();
          };
        }

        const toggleBtn = document.getElementById(`toggle-voters-${s.id}`);
        if (toggleBtn) {
          toggleBtn.onclick = () => {
            state.showAllVoters[s.id] = !state.showAllVoters[s.id];
            render();
          };
        }
        
        displayMembers.forEach(m => {
          if (m.isDeleted) return;
          const sel = document.getElementById(`pass-${s.id}-${m.id}`);
          if (sel) sel.onchange = (e) => {
            const val = e.target.value;
            s.passes = s.passes || {};
            if (val) {
              // Kiểm tra xem đã nhận pass từ người khác chưa
              const alreadyTaken = Object.entries(s.passes).some(([fid, cid]) => fid !== m.id && cid === val);
              if (alreadyTaken) {
                alert('Thành viên vãng lai này đã nhận pass từ người khác!');
                e.target.value = s.passes[m.id] || '';
                return;
              }
              s.passes[m.id] = val;
            } else {
              delete s.passes[m.id];
            }
            saveSessions(); render();
          };

          const voteSel = document.getElementById(`vote-select-${s.id}-${m.id}`);
          if (voteSel) voteSel.onchange = (e) => {
            const val = e.target.value;
            s.votes = s.votes || {};
            s.voteTimestamps = s.voteTimestamps || {};
            if (val) {
              s.votes[m.name] = val;
              s.voteTimestamps[m.name] = Date.now();
            } else {
              delete s.votes[m.name];
              delete s.voteTimestamps[m.name];
            }
            saveSessions(); render();
          };
        });

        // --- Sự kiện thách đấu ---
        const cToggleBtn = document.getElementById(`c-toggle-btn-${s.id}`);
        if (cToggleBtn) {
          cToggleBtn.onclick = () => {
            state[showFormKey] = true;
            render();
          };
        }

        const cCancelBtn = document.getElementById(`c-cancel-${s.id}`);
        if (cCancelBtn) {
          cCancelBtn.onclick = () => {
            state[showFormKey] = false;
            render();
          };
        }

        const cSubmitBtn = document.getElementById(`c-submit-${s.id}`);
        if (cSubmitBtn) {
          cSubmitBtn.onclick = () => {
            const p1 = document.getElementById(`c-t1-p1-${s.id}`).value;
            const p2 = document.getElementById(`c-t1-p2-${s.id}`).value;
            const p3 = document.getElementById(`c-t2-p1-${s.id}`).value;
            const p4 = document.getElementById(`c-t2-p2-${s.id}`).value;
            const handicap = document.getElementById(`c-handicap-${s.id}`).value.trim();
            const handicapTeam = document.getElementById(`c-handicap-team-${s.id}`).value;
            
            if (!p1 || !p3) {
              alert('Vui lòng chọn ít nhất 1 người chơi cho mỗi đội.');
              return;
            }
            if (p1 === p3 || (p2 && p2 === p1) || (p4 && p4 === p3)) {
              alert('Người chơi trong một cặp hoặc giữa hai cặp không được trùng nhau.');
              return;
            }
            
            const creatorName = state.me ? state.me.name : 'Khách';
            if (creatorName === 'Khách') {
              alert('Vui lòng đăng nhập để tạo kèo thách đấu.');
              return;
            }
            const allPlayers = [p1, p2, p3, p4].filter(Boolean);
            if (!allPlayers.includes(creatorName)) {
              alert('Bạn bắt buộc phải là 1 trong các thành viên thi đấu để tạo kèo thách đấu này.');
              return;
            }
            
            s.challenges = s.challenges || [];
            s.challenges.push({
              id: uid(),
              team1: [p1, p2].filter(Boolean),
              team2: [p3, p4].filter(Boolean),
              handicap: handicap || 'Đánh đều (không chấp)',
              handicapTeam: handicapTeam,
              status: 'pending',
              score1: null,
              score2: null,
              createdBy: state.me ? state.me.name : 'Khách',
              createdAt: Date.now()
            });
            
            state[showFormKey] = false;
            saveSessions();
            render();
          };
        }

        (s.challenges || []).forEach(c => {
          const currentName = state.me ? state.me.name : 'Khách';
          const isAllowed = c.team1.includes(currentName) || c.team2.includes(currentName) || canManage();

          const acceptBtn = document.getElementById(`accept-c-${s.id}-${c.id}`);
          if (acceptBtn) {
            acceptBtn.onclick = async () => {
              if (!isAllowed) { alert('Bạn không có quyền thực hiện hành động này.'); return; }
              if (!confirm('Bạn có đồng ý nhận kèo thách đấu này?')) return;
              
              const ok = await mutateSessions(latest => {
                const targetSess = latest.find(x => x.id === s.id);
                if (targetSess) {
                  const ch = (targetSess.challenges || []).find(x => x.id === c.id);
                  if (ch) ch.status = 'accepted';
                }
                return latest;
              });

              if (ok) {
                // Tự động đăng tin nhận kèo thách đấu lên bảng tin!
                state.announcements = state.announcements || [];
                const t1Players = c.team1.join(' & ');
                const t2Players = c.team2.join(' & ');
                
                state.announcements.push({
                  id: uid(),
                  category: 'match',
                  title: `🏸 KÈO GIAO LƯU THÁCH ĐẤU: ${t1Players} VS ${t2Players}`,
                  content: `🔥 Trận thách đấu đã chính thức được nhận kèo!\n\n🏸 Cặp 1: ${t1Players}\n🏸 Cặp 2: ${t2Players}\n\n📌 Chấp kèo: ${c.handicap || 'Đánh đều (không chấp)'}\n\nTrận đấu sẽ sớm được diễn ra trong buổi tập. Hãy cùng dự đoán và cổ vũ cho hai đội nhé! 🏸⚡`,
                  expireDate: null,
                  pinned: false,
                  author: 'Trọng tài thách đấu',
                  phone: 'Hệ thống',
                  createdAt: Date.now(),
                  reactions: { thumbs: [], heart: [], fire: [] },
                  isChallengeResult: true,
                  sessionId: s.id,
                  challengeId: c.id
                });

                saveAnnouncements();
                render();
              }
            };
          }
          
          const removeChallengeAnn = (cId) => {
            state.announcements = (state.announcements || []).filter(a => !(a.isChallengeResult && a.challengeId === cId));
            saveAnnouncements();
          };

          const delBtn = document.getElementById(`del-c-${s.id}-${c.id}`);
          if (delBtn) {
            delBtn.onclick = async () => {
              const canDel = (c.status === 'pending' && isAllowed) || (c.status !== 'pending' && canManage());
              if (!canDel) { 
                alert('Khi kèo đã được nhận hoặc đã đấu xong, R2 không có quyền xóa. Chỉ R1, Admin và Owner mới có quyền xóa!'); 
                return; 
              }
              if (!confirm('Bạn có chắc chắn muốn xóa kèo thách đấu này? Điểm XP của kèo này sẽ bị hủy hoàn toàn.')) return;
              
              const ok = await mutateSessions(latest => {
                const targetSess = latest.find(x => x.id === s.id);
                if (targetSess) {
                  targetSess.challenges = (targetSess.challenges || []).filter(x => x.id !== c.id);
                }
                return latest;
              });

              if (ok) {
                removeChallengeAnn(c.id);
                render();
                showToast('Đã xóa kèo thách đấu và cập nhật lại XP!', 'success');
              }
            };
          }
          
          const scoreBtn = document.getElementById(`score-c-${s.id}-${c.id}`);
          if (scoreBtn) {
            scoreBtn.onclick = async () => {
              if (!isAllowed) { alert('Bạn không có quyền thực hiện hành động này.'); return; }
              const scoreStr = prompt('Nhập tỉ số trận đấu (ví dụ: 21-18 hoặc 21 18):');
              if (!scoreStr) return;
              const parts = scoreStr.split(/[- ]+/);
              const s1 = parseInt(parts[0], 10);
              const s2 = parseInt(parts[1], 10);
              if (isNaN(s1) || isNaN(s2)) {
                alert('Tỉ số không hợp lệ. Vui lòng nhập đúng định dạng, ví dụ: 21-18');
                return;
              }
              
              const ok = await mutateSessions(latest => {
                const targetSess = latest.find(x => x.id === s.id);
                if (targetSess) {
                  const ch = (targetSess.challenges || []).find(x => x.id === c.id);
                  if (ch) {
                    ch.score1 = s1;
                    ch.score2 = s2;
                    ch.status = 'done';
                  }
                }
                return latest;
              });

              if (ok) {
                // Cập nhật thông báo đã có từ Nhận kèo thành Kết quả thách đấu!
                state.announcements = state.announcements || [];
                const t1Players = c.team1.join(' & ');
                const t2Players = c.team2.join(' & ');
                const winnerText = s1 > s2 ? `${t1Players} thắng` : (s2 > s1 ? `${t2Players} thắng` : 'Hòa nhau');
                
                const existingAnn = state.announcements.find(a => a.isChallengeResult && a.challengeId === c.id);
                if (existingAnn) {
                  existingAnn.category = 'tournament';
                  existingAnn.title = `🏆 KẾT QUẢ THÁCH ĐẤU: ${t1Players} VS ${t2Players}`;
                  existingAnn.content = `🔥 Trận thách đấu kịch tính của buổi tập đã kết thúc!\n\n🏸 Cặp 1: ${t1Players} (${s1} điểm)\n🏸 Cặp 2: ${t2Players} (${s2} điểm)\n\n📌 Chấp kèo: ${c.handicap || 'Đánh đều'}\n🏆 Kết quả: **${winnerText}**! Xin chúc mừng! 🎉`;
                  existingAnn.createdAt = Date.now();
                } else {
                  state.announcements.push({
                    id: uid(),
                    category: 'tournament',
                    title: `🏆 KẾT QUẢ THÁCH ĐẤU: ${t1Players} VS ${t2Players}`,
                    content: `🔥 Trận thách đấu kịch tính của buổi tập đã kết thúc!\n\n🏸 Cặp 1: ${t1Players} (${s1} điểm)\n🏸 Cặp 2: ${t2Players} (${s2} điểm)\n\n📌 Chấp kèo: ${c.handicap || 'Đánh đều'}\n🏆 Kết quả: **${winnerText}**! Xin chúc mừng! 🎉`,
                    expireDate: null,
                    pinned: false,
                    author: 'Trọng tài thách đấu',
                    phone: 'Hệ thống',
                    createdAt: Date.now(),
                    reactions: { thumbs: [], heart: [], fire: [] },
                    isChallengeResult: true,
                    sessionId: s.id,
                    challengeId: c.id
                  });
                }
                
                saveAnnouncements();
                render();
              }
            };
          }
          
          const revertBtn = document.getElementById(`revert-c-${s.id}-${c.id}`);
          if (revertBtn) {
            revertBtn.onclick = async () => {
              if (!isAllowed) { alert('Bạn không có quyền thực hiện hành động này.'); return; }
              const ok = await mutateSessions(latest => {
                const targetSess = latest.find(x => x.id === s.id);
                if (targetSess) {
                  const ch = (targetSess.challenges || []).find(x => x.id === c.id);
                  if (ch) ch.status = 'pending';
                }
                return latest;
              });

              if (ok) {
                removeChallengeAnn(c.id);
                render();
              }
            };
          }
          
          const reopenBtn = document.getElementById(`reopen-c-${s.id}-${c.id}`);
          if (reopenBtn) {
            reopenBtn.onclick = async () => {
              if (!isAllowed) { alert('Bạn không có quyền thực hiện hành động này.'); return; }
              const ok = await mutateSessions(latest => {
                const targetSess = latest.find(x => x.id === s.id);
                if (targetSess) {
                  const ch = (targetSess.challenges || []).find(x => x.id === c.id);
                  if (ch) {
                    ch.status = 'accepted';
                    ch.score1 = null;
                    ch.score2 = null;
                  }
                }
                return latest;
              });

              if (ok) {
                state.announcements = state.announcements || [];
                const t1Players = c.team1.join(' & ');
                const t2Players = c.team2.join(' & ');
                const existingAnn = state.announcements.find(a => a.isChallengeResult && a.challengeId === c.id);
                if (existingAnn) {
                  existingAnn.category = 'match';
                  existingAnn.title = `🏸 KÈO GIAO LƯU THÁCH ĐẤU: ${t1Players} VS ${t2Players}`;
                  existingAnn.content = `🔥 Trận thách đấu đã chính thức được nhận kèo!\n\n🏸 Cặp 1: ${t1Players}\n🏸 Cặp 2: ${t2Players}\n\n📌 Chấp kèo: ${c.handicap || 'Đánh đều (không chấp)'}\n\nTrận đấu sẽ sớm được diễn ra trong buổi tập. Hãy cùng dự đoán và cổ vũ cho hai đội nhé! 🏸⚡`;
                }
                
                saveAnnouncements();
                render();
              }
            };
          }


          // Sự kiện dự đoán kèo thách đấu cho các thành viên
          const toggleBet = (teamIndex) => {
            const currentName = state.me ? state.me.name : 'Khách';
            if (currentName === 'Khách') {
              alert('Vui lòng đăng nhập để bình chọn dự đoán! 😊');
              return;
            }
            if (c.team1.includes(currentName) || c.team2.includes(currentName)) {
              alert('Bạn là người tham gia cặp đấu này, không thể tự bình chọn! 😉');
              return;
            }
            
            c.bets = c.bets || { team1: [], team2: [] };
            c.bets.team1 = c.bets.team1 || [];
            c.bets.team2 = c.bets.team2 || [];
            
            const inT1 = c.bets.team1.includes(currentName);
            const inT2 = c.bets.team2.includes(currentName);
            
            if (teamIndex === 1) {
              if (inT1) {
                c.bets.team1 = c.bets.team1.filter(n => n !== currentName);
              } else {
                c.bets.team1.push(currentName);
                c.bets.team2 = c.bets.team2.filter(n => n !== currentName);
              }
            } else {
              if (inT2) {
                c.bets.team2 = c.bets.team2.filter(n => n !== currentName);
              } else {
                c.bets.team2.push(currentName);
                c.bets.team1 = c.bets.team1.filter(n => n !== currentName);
              }
            }
            saveSessions();
            render();
          };

          const betT1Btn = document.getElementById(`bet-t1-${s.id}-${c.id}`);
          if (betT1Btn) betT1Btn.onclick = () => toggleBet(1);

          const betT2Btn = document.getElementById(`bet-t2-${s.id}-${c.id}`);
          if (betT2Btn) betT2Btn.onclick = () => toggleBet(2);
        });
      }, 0);
    }

    const costBox = card.querySelector(`#cost-${s.id}`);
    s.costs = s.costs || { court: 0, water: 0, shuttle: 0, other: 0 };
    s.flatRate = s.flatRate || { enabled: false, fixed: 30000, casual: 45000 };
    s.penalties = s.penalties || {};

    // --- Tiêu đề + nút chuyển chế độ (R1/Admin) ---
    const costModeBar = el(`<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
      <span style="font-size:13px; font-weight:500; color:#1B4332;">Chi phí buổi này</span>
      ${canManage() ? `<div style="display:flex; gap:6px;">
        <button class="bc-btn ${!s.flatRate.enabled?'':'outline'} small" id="mode-split-${s.id}">Chia chi phí</button>
        <button class="bc-btn ${s.flatRate.enabled?'':'outline'} small" id="mode-flat-${s.id}">Áp mức cố định</button>
      </div>` : `<span class="bc-badge" style="background:#E6F1FB; color:#0C447C;">${s.flatRate.enabled ? 'Áp mức cố định' : 'Chia chi phí'}</span>`}
    </div>`);
    costBox.appendChild(costModeBar);

    if (canManage()) setTimeout(() => {
      const btnSplit = document.getElementById(`mode-split-${s.id}`);
      const btnFlat = document.getElementById(`mode-flat-${s.id}`);
      if (btnSplit) btnSplit.onclick = () => { s.flatRate.enabled = false; saveSessions(); render(); };
      if (btnFlat) btnFlat.onclick = () => { s.flatRate.enabled = true; saveSessions(); render(); };
    }, 0);

    if (canManage()) {
      if (s.flatRate.enabled) {
        // --- Form áp mức cố định ---
        const flatForm = el(`<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px; padding:10px; background:#F4F1EA; border-radius:8px;">
          <div><label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Mức phí · Thành viên cố định</label>
            <input class="bc-input" type="number" min="0" id="flat-fixed-${s.id}" value="${s.flatRate.fixed||0}" style="width:130px;" /></div>
          <div><label style="font-size:12px; color:#8a877d; display:block; margin-bottom:4px;">Mức phí · Thành viên vãng lai</label>
            <input class="bc-input" type="number" min="0" id="flat-casual-${s.id}" value="${s.flatRate.casual||0}" style="width:130px;" /></div>
          <button class="bc-btn small" id="flat-save-${s.id}" style="align-self:flex-end;">Lưu mức phí</button>
        </div>`);
        costBox.appendChild(flatForm);
        setTimeout(() => {
          document.getElementById(`flat-save-${s.id}`).onclick = () => {
            s.flatRate.fixed = parseFloat(document.getElementById(`flat-fixed-${s.id}`).value) || 0;
            s.flatRate.casual = parseFloat(document.getElementById(`flat-casual-${s.id}`).value) || 0;
            saveSessions(); render();
          };
        }, 0);
      } else {
        // --- Form chia chi phí ---
        const costForm = el(`<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap:8px; margin-bottom:8px;">
          <div><label style="font-size:12px; color:#8a877d;">Tiền sân</label><input class="bc-input" type="number" min="0" id="cost-court-${s.id}" value="${s.costs.court}" /></div>
          <div><label style="font-size:12px; color:#8a877d;">Tiền nước</label><input class="bc-input" type="number" min="0" id="cost-water-${s.id}" value="${s.costs.water}" /></div>
          <div><label style="font-size:12px; color:#8a877d;">Tiền cầu</label><input class="bc-input" type="number" min="0" id="cost-shuttle-${s.id}" value="${s.costs.shuttle}" /></div>
          <div><label style="font-size:12px; color:#8a877d;">Phát sinh khác</label><input class="bc-input" type="number" min="0" id="cost-other-${s.id}" value="${s.costs.other}" /></div>
        </div>`);
        costBox.appendChild(costForm);
        costBox.appendChild(el(`<button class="bc-btn outline small" id="cost-save-${s.id}" style="margin-bottom:10px;">Lưu chi phí</button>`));
        setTimeout(() => {
          document.getElementById(`cost-save-${s.id}`).onclick = () => {
            s.costs = {
              court: parseFloat(document.getElementById(`cost-court-${s.id}`).value) || 0,
              water: parseFloat(document.getElementById(`cost-water-${s.id}`).value) || 0,
              shuttle: parseFloat(document.getElementById(`cost-shuttle-${s.id}`).value) || 0,
              other: parseFloat(document.getElementById(`cost-other-${s.id}`).value) || 0
            };
            saveSessions(); render();
          };
        }, 0);
      }

      // --- Phạt đi trễ (chung cho cả 2 chế độ) ---
      const penaltySection = el(`<div style="margin-top:6px; border-top:1px dashed #E3E0D6; padding-top:8px;">
        <div style="font-size:13px; font-weight:500; color:#854F0B; margin-bottom:6px;">Phạt đi trễ</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
          <select class="bc-select" id="pen-member-${s.id}" style="flex:2; min-width:140px;">
            <option value="">Chọn thành viên...</option>
            ${state.members.filter(m => s.votes[m.name]==='yes').map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
          </select>
          <input class="bc-input" type="number" min="0" id="pen-amount-${s.id}" placeholder="Số tiền phạt" style="flex:1; min-width:100px;" />
          <button class="bc-btn small" id="pen-add-${s.id}">Thêm phạt</button>
        </div>
        <div id="pen-list-${s.id}"></div>
      </div>`);
      costBox.appendChild(penaltySection);
      const penList = penaltySection.querySelector(`#pen-list-${s.id}`);
      Object.entries(s.penalties).forEach(([mid, penAmt]) => {
        if (!penAmt) return;
        const mem = state.members.find(x => x.id === mid);
        if (!mem) return;
        const row = el(`<div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-top:1px solid #F1EFE8; padding:4px 0;">
          <span style="color:#854F0B;">⚠ ${escapeHtml(mem.name)} đi trễ</span>
          <span style="display:flex; align-items:center; gap:8px;">
            <strong style="color:#993C1D;">${formatVND(penAmt)}</strong>
            <button class="bc-btn danger small" data-penid="${mid}">Xoá</button>
          </span>
        </div>`);
        row.querySelector('button').onclick = () => {
          if (!confirm(`Bạn có chắc chắn muốn xóa khoản phạt đi trễ ${formatVND(penAmt)} của ${mem.name}?`)) return;
          delete s.penalties[mid];
          saveSessions();
          render();
        };
        penList.appendChild(row);
      });
      setTimeout(() => {
        const penAddBtn = document.getElementById(`pen-add-${s.id}`);
        if (penAddBtn) penAddBtn.onclick = () => {
          const mid = document.getElementById(`pen-member-${s.id}`).value;
          const amt = parseFloat(document.getElementById(`pen-amount-${s.id}`).value) || 0;
          if (!mid || !amt) return;
          s.penalties[mid] = (s.penalties[mid] || 0) + amt;
          saveSessions(); render();
        };
      }, 0);
    }

    // --- Tổng phạt ---
    const penaltyMap = {};
    Object.entries(s.penalties||{}).forEach(([mid, amt]) => { penaltyMap[mid] = amt || 0; });

    // --- Bảng chi tiết chi phí (chung cho cả 2 chế độ) ---
    const hasData = shares.mode === 'flat' ? (shares.fixedShare > 0 || shares.casualShare > 0) : shares.total > 0;
    if (hasData || shares.fixedNames.length || shares.casualNames.length) {
      if (shares.mode === 'flat') {
        costBox.appendChild(el(`<div style="margin-top:10px; font-size:13px; color:#6b7a73;">
          Mức áp: Cố định <strong style="color:#1B4332;">${formatVND(shares.fixedShare)}</strong>
          · Vãng lai <strong style="color:#1B4332;">${formatVND(shares.casualShare)}</strong>
          · Tổng thu: <strong style="color:#1B4332;">${formatVND(shares.total)}</strong>
        </div>`));
      } else if (shares.total > 0) {
        costBox.appendChild(el(`<div style="margin-top:10px; font-size:13px; color:#6b7a73;">
          Tổng chia: <strong style="color:#1B4332;">${formatVND(shares.total)}</strong>
          · Cố định: <strong style="color:#1B4332;">${formatVND(shares.fixedShare)}</strong>
          · Vãng lai (×${shares.multiplier}): <strong style="color:#1B4332;">${formatVND(shares.casualShare)}</strong>
        </div>`));
      }

      const allPayers = [
        ...shares.fixedNames.map(n => ({ name: n, type: 'fixed', base: shares.fixedShare })),
        ...shares.casualNames.map(n => ({ name: n, type: 'casual', base: shares.casualShare })),
        ...shares.freeNames.map(n => ({ name: n, type: 'free', base: 0 }))
      ];
      if (allPayers.length) {
        const detail = el(`<table style="width:100%; font-size:13px; border-collapse:collapse; margin-top:8px;"></table>`);
        detail.appendChild(el(`<tr style="color:#8a877d; font-size:12px;">
          <th style="padding:4px; text-align:left;">Thành viên</th>
          <th style="padding:4px; text-align:left;">Loại</th>
          <th style="padding:4px; text-align:right;">Chi phí</th>
          <th style="padding:4px; text-align:right;">Phạt trễ</th>
          <th style="padding:4px; text-align:right;">Tổng phải trả</th>
        </tr>`));
        allPayers.forEach(p => {
          const mem = state.members.find(x => x.name === p.name);
          const pen = mem ? (penaltyMap[mem.id] || 0) : 0;
          const typeLabel = p.type === 'fixed' ? 'Cố định' : p.type === 'free' ? '<span style="color:#27500A">Miễn phí (nhận pass)</span>' : 'Vãng lai';
          
          const isSelfRow = state.me && state.me.name === p.name;
          const nameLabel = mem ? memberDisplayNameHtml(mem, { isSelf: isSelfRow, mainSize: '13px', subSize: '11px', fontWeight: '500' }) : escapeHtml(p.name);
          const trStyle = `border-top:1px solid #F1EFE8; ${isSelfRow ? 'background-color: rgba(216, 151, 60, 0.08); font-weight: 600;' : ''}`;
          
          detail.appendChild(el(`<tr style="${trStyle}">
            <td style="padding:5px 4px;">${nameLabel}</td>
            <td style="padding:5px 4px; color:#8a877d;">${typeLabel}</td>
            <td style="padding:5px 4px; text-align:right;">${formatVND(p.base)}</td>
            <td style="padding:5px 4px; text-align:right; color:#854F0B;">${pen ? formatVND(pen) : '—'}</td>
            <td style="padding:5px 4px; text-align:right; font-weight:600; color:#1B4332;">${formatVND(p.base + pen)}</td>
          </tr>`));
        });
        costBox.appendChild(detail);
      }
    } else if (canManage()) {
      const hint = s.flatRate.enabled
        ? `<div style="font-size:13px; color:#8a877d; margin-top:8px;">Nhập mức phí cố định và vãng lai rồi lưu để xem bảng chi tiết.</div>`
        : `<div style="font-size:13px; color:#8a877d; margin-top:8px;">Nhập chi phí và lưu để tính tiền chia cho từng người đã tham gia.</div>`;
      costBox.appendChild(el(hint));
    }

    if (canDelete()) {
      const delBtn = card.querySelector(`#del-${s.id}`);
      if (delBtn) delBtn.onclick = () => {
        if (!confirm('Xoá buổi đánh này?')) return;
        state.sessions = state.sessions.filter(x => x.id !== s.id);
        saveSessions(); render();
      };
    }

    return card;
  }

  function showRemindVoteDialog(s) {
    if (!canManage()) {
      showToast('Bạn không có quyền thực hiện chức năng này!', 'error');
      return;
    }
    if (s.locked) {
      showToast('Buổi tập này đã chốt danh sách, không thể nhắc biểu quyết!', 'error');
      return;
    }

    state.lastRemindVoteTime = state.lastRemindVoteTime || {};
    const lastSent = state.lastRemindVoteTime[s.id] || 0;
    const cooldown = 5 * 60 * 1000;
    const now = Date.now();
    if (now - lastSent < cooldown) {
      const remainingSecs = Math.ceil((cooldown - (now - lastSent)) / 1000);
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      showToast(`Bạn vừa gửi nhắc nhở cho buổi tập này. Vui lòng đợi ${mins} phút ${secs} giây nữa để tránh spam email!`, 'warning');
      return;
    }

    const mKey = sessionMonthKey(s);
    const court = state.courts.find(c => c.id === s.courtId);
    const courtName = court ? court.name : 'Chưa chọn sân';
    
    const unvotedMembers = state.members.filter(m => {
      const t = (m.monthlyType || {})[mKey] || '';
      const v = s.votes ? s.votes[m.name] : undefined;
      const hasPassed = t === 'fixed' && s.passes && s.passes[m.id];
      const isReceiver = s.passes && Object.values(s.passes).includes(m.id);
      const notVoted = !v && !hasPassed && !isReceiver;
      return m.status === 'active' && (t === 'fixed' || t === 'casual') && notVoted;
    });

    if (unvotedMembers.length === 0) {
      showToast('Tất cả thành viên đã hoàn thành biểu quyết (vote) cho buổi tập này!', 'success');
      return;
    }

    const backdrop = el(`<div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:center; justify-content:center; padding:15px;"></div>`);
    const dialog = el(`<div class="bc-card" style="width:100%; max-width:450px; background:#FFF; padding:20px; box-shadow:0 8px 30px rgba(0,0,0,0.3); border-radius:12px;">
      <h3 style="font-size:16px; color:#1B4332; margin-top:0; margin-bottom:12px; font-family:'Oswald', sans-serif; display:flex; align-items:center; gap:6px;">
        📢 NHẮC NHỞ BIỂU QUYẾT (CHƯA VOTE: ${unvotedMembers.length})
      </h3>
      <p style="font-size:13px; color:#6b7a73; margin-bottom:20px; line-height:1.5;">Gửi email nhắc nhở biểu quyết cho các thành viên chưa vote trong buổi tập ngày <strong>${formatDate(s.date)}</strong> (${formatTimeRange(s.time, s.timeEnd)}):</p>
      
      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
        <button class="bc-btn" id="remind-email-unvoted-btn" style="width:100%; justify-content:center; display:flex; align-items:center; gap:8px;">
          📧 Gửi Email nhắc nhở hàng loạt
        </button>
      </div>

      <div style="display:flex; justify-content:flex-end;">
        <button class="bc-btn outline small" id="remind-close-btn" style="padding:4px 12px; font-size:12px;">Đóng</button>
      </div>
    </div>`);
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const closeBtn = dialog.querySelector('#remind-close-btn');
    const closeDialog = () => { backdrop.remove(); };
    closeBtn.onclick = closeDialog;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeDialog(); };

    const emailBtn = dialog.querySelector('#remind-email-unvoted-btn');
    emailBtn.onclick = async () => {
      const emailable = unvotedMembers.filter(m => m.email);
      if (emailable.length === 0) {
        showToast('Không có thành viên nào chưa vote có cấu hình địa chỉ email!', 'warning');
        return;
      }

      if (!confirm(`Bạn có chắc chắn muốn gửi email nhắc nhở biểu quyết cho ${emailable.length} thành viên chưa vote không?`)) {
        return;
      }

      emailBtn.disabled = true;
      emailBtn.textContent = 'Đang gửi...';

      let origin = window.location.origin + window.location.pathname;
      if (window.location.protocol === 'file:' || origin.includes('127.0.0.1') || origin.includes('localhost') || origin.includes('null')) {
        origin = 'https://kietdmt.github.io/ARON-Badmintion-Club/';
      }

      showToast(`Đang gửi email nhắc nhở cho ${emailable.length} thành viên...`, 'warning');

      const promises = emailable.map(async (m) => {
        const t = (m.monthlyType || {})[mKey] || '';
        const quickVoteUrl = `${origin}?action=quick_vote&session=${s.id}&user=${m.username}`;

        const emailSubject = `[CLB ARON] Nhắc nhở biểu quyết tham gia buổi tập ngày ${formatDate(s.date)}`;
        const emailBody = `<h3>Chào ${m.name},</h3>
          <p>Để chuẩn bị tốt nhất cho buổi tập sắp tới, Ban quản trị CLB ARON gửi tin nhắc nhở bạn tham gia biểu quyết (vote) lịch chơi cầu:</p>
          <div style="background:#FAF8F5; border:1px solid #E3E0D6; border-radius:8px; padding:15px; margin:15px 0; font-family:'Outfit', sans-serif;">
            <strong>🏸 Thông tin buổi tập:</strong><br/>
            - 📅 <strong>Thời gian:</strong> ${weekdayLabel(s.date)}, ngày ${formatDate(s.date)} (${formatTimeRange(s.time, s.timeEnd)})<br/>
            - 📍 <strong>Sân tập:</strong> ${courtName}<br/>
            - 👤 <strong>Loại hình của bạn:</strong> ${t === 'fixed' ? 'Cố định' : 'Vãng lai'}
          </div>
          <p>Vui lòng nhấp vào nút dưới đây để chọn trạng thái tham gia (Đi chơi, Báo vắng, Nhường lịch):</p>
          <div style="margin:25px 0;">
            <a href="${quickVoteUrl}" style="background:#2D6A4F; color:#FFFFFF; text-decoration:none; padding:12px 24px; font-weight:600; border-radius:10px; display:inline-block; font-size:15px; box-shadow:0 4px 12px rgba(45,106,79,0.2);">👉 Biểu Quyết Một Chạm</a>
          </div>
          <p style="font-size:12px; color:#8a877d; margin-top:20px;">
            Nếu không bấm được nút trên, bạn có thể truy cập trực tiếp đường link sau:<br/>
            <a href="${quickVoteUrl}" style="color:#0C447C; word-break:break-all;">${quickVoteUrl}</a>
          </p>
          <hr style="border:none; border-top:1px dashed #E3E0D6; margin:20px 0;"/>
          <p style="font-size:11px; color:#8a877d; line-height:1.4;">
            * Lưu ý: Để tránh việc thư thông báo từ CLB tiếp tục rơi vào hòm thư rác, bạn vui lòng nhấn vào nút <strong>"Không phải thư rác" (Not Spam)</strong> hoặc thêm địa chỉ email này vào danh sách người liên hệ tin cậy.<br/>
            * Sau khi nhấp link, hệ thống sẽ tự động chuyển đến màn hình biểu quyết. Nếu chưa đăng nhập tài khoản của mình, bạn hãy đăng nhập trước để hoàn tất.
          </p>
          <br/>
          <p>Thân ái,</p>
          <p><strong>Ban quản trị CLB Cầu lông ARON</strong></p>`;
        
        return await sendSystemEmail(m.email, emailSubject, emailBody);
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        state.lastRemindVoteTime[s.id] = Date.now();
      }
      
      emailBtn.disabled = false;
      emailBtn.textContent = '📧 Gửi Email nhắc nhở hàng loạt';
      showToast(`Đã gửi thành công email nhắc nhở cho ${successCount}/${emailable.length} thành viên!`);
      closeDialog();
    };
  }

  // ---------- LÀM MỚI DỮ LIỆU ----------
  let refreshing = false;
  let pendingRefreshTimer = null;

  async function refreshAll(){
    if (!state.me || refreshing) return;
    const ae = document.activeElement;
    if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) {
      // Đang nhập — hủy timer cũ rồi đặt delay 5 giây sau khi blur
      clearTimeout(pendingRefreshTimer);
      const deferRefresh = () => { clearTimeout(pendingRefreshTimer); pendingRefreshTimer = setTimeout(refreshAll, 5000); };
      ae.removeEventListener('blur', deferRefresh);
      ae.addEventListener('blur', deferRefresh, { once: true });
      return;
    }
    refreshing = true;
    try {
      // 1. Chỉ lấy key và updated_at để kiểm tra xem có thay đổi hay không
      const { data: dbKeys, error: keyError } = await sb.from('bc_data').select('key, updated_at');
      if (keyError) throw keyError;
      
      const modifiedKeys = [];
      const currentTimestamps = {};
      if (dbKeys) {
        dbKeys.forEach(row => {
          currentTimestamps[row.key] = row.updated_at;
          if (row.updated_at !== state.lastUpdated[row.key]) {
            modifiedKeys.push(row.key);
          }
        });
      }
      
      // 2. Chỉ tải các key thực sự đã thay đổi
      if (modifiedKeys.length > 0) {
        const { data: updatedData, error: valError } = await sb.from('bc_data')
          .select('key, value, updated_at')
          .in('key', modifiedKeys);
        if (valError) throw valError;
        
        const dbMap = {};
        if (updatedData) {
          updatedData.forEach(row => {
            dbMap[row.key] = row.value;
            state.lastUpdated[row.key] = row.updated_at;
          });
        }
        
        if (modifiedKeys.includes('bc_members')) state.members = dbMap['bc_members'] || [];
        if (modifiedKeys.includes('bc_courts')) state.courts = dbMap['bc_courts'] || [];
        if (modifiedKeys.includes('bc_sessions')) state.sessions = dbMap['bc_sessions'] || [];
        if (modifiedKeys.includes('bc_settings')) {
          const settingsRaw = dbMap['bc_settings'] || {};
          state.settings = Object.assign({ casualMultiplier: 1.5, logoUrl: '', bannerUrl: '', lockedMonths: [] }, settingsRaw);
          state.settings.payment = Object.assign({
            bankId: settingsRaw.bankId || (settingsRaw.payment && settingsRaw.payment.bankId) || '',
            accountNo: settingsRaw.accountNo || (settingsRaw.payment && settingsRaw.payment.accountNo) || '',
            accountName: settingsRaw.accountName || (settingsRaw.payment && settingsRaw.payment.accountName) || '',
            qrUrl: settingsRaw.qrUrl || (settingsRaw.payment && settingsRaw.payment.qrUrl) || ''
          }, settingsRaw.payment || {});
        }
        if (modifiedKeys.includes('bc_payments')) {
          state.payments = dbMap['bc_payments'] || {};
          state.paymentRequests = state.payments.paymentRequests || [];
        }
        if (modifiedKeys.includes('bc_fund')) state.fund = dbMap['bc_fund'] || {};
        if (modifiedKeys.includes('bc_donations')) state.donations = dbMap['bc_donations'] || [];
        if (modifiedKeys.includes('bc_announcements')) state.announcements = dbMap['bc_announcements'] || [];
        
        resolveMe();
        render();
      } else {
        // Cập nhật lại cache timestamp nếu cần
        Object.assign(state.lastUpdated, currentTimestamps);
      }
    } catch(e) {
      console.error('Làm mới thất bại', e);
    } finally {
      refreshing = false;
    }
  }
  let lastActiveTime = Date.now();
  let isIdle = false;
  
  function recordActivity() {
    lastActiveTime = Date.now();
    if (isIdle) {
      isIdle = false;
      console.log('User active again, resuming refresh...');
      refreshAll();
    }
  }
  
  window.addEventListener('mousemove', recordActivity);
  window.addEventListener('keydown', recordActivity);
  window.addEventListener('click', recordActivity);
  window.addEventListener('scroll', recordActivity);

  let autoRefreshTimer = null;
  function startAutoRefresh(){
    if (autoRefreshTimer) return;
    
    const refreshIfActive = () => {
      if (document.hidden) return;
      
      // Nếu người dùng không hoạt động > 3 phút (180000 ms), tạm dừng polling
      if (Date.now() - lastActiveTime > 180000) {
        if (!isIdle) {
          isIdle = true;
          console.log('User is idle. Polling paused.');
        }
        return;
      }
      refreshAll();
    };
    
    autoRefreshTimer = setInterval(refreshIfActive, 300000); // 5 phút kiểm tra 1 lần để giảm tải kết nối và băng thông
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (autoRefreshTimer) {
          clearInterval(autoRefreshTimer);
          autoRefreshTimer = null;
        }
      } else {
        recordActivity();
        refreshAll(); // Tải lại ngay khi quay lại tab để xem dữ liệu mới nhất
        if (!autoRefreshTimer) {
          autoRefreshTimer = setInterval(refreshIfActive, 300000);
        }
      }
    });
    window.addEventListener('focus', () => {
      recordActivity();
      refreshAll(); // Tải lại ngay khi focus tab
    });
  }

  // Đăng nhập ẩn danh vào Supabase để lấy JWT hợp lệ
  // RLS sẽ yêu cầu JWT này cho các thao tác ghi, ngăn hacker dùng anon key thô
  // Đăng nhập ẩn danh vào Supabase để lấy JWT hợp lệ (có timeout chống treo khi mất mạng)
  async function ensureAuth(){
    if (!sb || !sb.auth) return;
    try {
      const authPromise = (async () => {
        const { data: { session } } = await sb.auth.getSession();
        if (session) return;
        await sb.auth.signInAnonymously();
      })();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 2500));
      await Promise.race([authPromise, timeoutPromise]);
    } catch(e) {
      console.warn('Auth warning (non-critical):', e ? e.message : e);
    }
  }

  // ===================== LAZY ADMIN CRON (BACKGROUND TASKS) =====================
  async function loadAutoLogs() {
    try {
      const { data, error } = await sb.from('bc_data').select('value').eq('key', 'bc_auto_logs').maybeSingle();
      if (!error && data) return data.value || {};
    } catch(e) {}
    return {};
  }
  
  async function saveAutoLog(logKey) {
    await mutateKey('bc_auto_logs', (latest) => {
      const updated = latest || {};
      updated[logKey] = new Date().toISOString();
      return updated;
    }, {});
  }

  async function checkBackgroundTasks() {
    if (!canManage()) return;
    if (!state.settings || !state.settings.autoRules) return;
    
    const rules = state.settings.autoRules;
    const now = new Date();
    const nowStamp = now.toLocaleDateString('sv-SE') + 'T' + now.toTimeString().slice(0, 8);
    const curMonthKey = monthKey();
    
    const autoLogs = await loadAutoLogs();
    
    // --- Rule 2: Tự động gửi Email nhắc Vote ---
    if (rules.remindVote && rules.remindVote.enabled) {
      for (const s of state.sessions) {
        if (!s || !s.date || s.locked) continue;
        
        const logKey = `remind_vote_${s.id}`;
        if (autoLogs[logKey]) continue;

        const parts = s.date.split('-').map(Number);
        if (parts.length < 3) continue;
        const [y, m, d] = parts;
        const cutoffDate = new Date(y, m - 1, d);
        
        const daysBefore = parseInt(rules.remindVote.days) || 1;
        cutoffDate.setDate(cutoffDate.getDate() - daysBefore);
        const [timeH, timeM] = (rules.remindVote.time || '08:00').split(':');
        cutoffDate.setHours(timeH, timeM, 0, 0);
        
        const cY = cutoffDate.getFullYear();
        const cM = String(cutoffDate.getMonth() + 1).padStart(2, '0');
        const cD = String(cutoffDate.getDate()).padStart(2, '0');
        const cutoffTimeStr = `${cY}-${cM}-${cD}T${String(timeH).padStart(2, '0')}:${String(timeM).padStart(2, '0')}:00`;
        
        if (nowStamp >= cutoffTimeStr) {
          const sMonthKey = sessionMonthKey(s);
          const targets = state.members.filter(mem => {
             if (mem.status !== 'active') return false;
             const mType = (mem.monthlyType || {})[sMonthKey] || '';
             if (mType !== 'fixed' && mType !== 'casual') return false;
             const hasVoted = !!(s.votes || {})[mem.name];
             const hasPassed = !!(s.passes || {})[mem.id];
             return !hasVoted && !hasPassed;
          });
          
          if (targets.length > 0) {
             const toEmails = targets.map(m => m.email).filter(Boolean);
             if (toEmails.length > 0) {
               const subject = `[THÔNG BÁO] Nhắc nhở chốt danh sách đánh cầu ngày ${formatDate(s.date)}`;
               const body = `<p>Chào bạn,</p>
               <p>Nhóm sẽ tự động chốt danh sách đánh cầu cho buổi <strong>${formatDate(s.date)}</strong> vào lúc <strong>${rules.lockVote?.time || '10:00'} ngày mai</strong>.</p>
               <p>Hiện tại bạn chưa chốt tham gia. Nếu bạn không vào vote trước giờ chốt, hệ thống sẽ tự động gán mặc định và khóa vote như sau:</p>
               <ul>
                  <li><strong>Thành viên Cố định</strong>: Tự động chuyển thành <strong>THAM GIA</strong>.</li>
                  <li><strong>Thành viên Vãng lai</strong>: Tự động chuyển thành <strong>VẮNG</strong>.</li>
               </ul>
               <p>Vui lòng vào ứng dụng để vote ngay nhé!</p>`;
               
               for (const email of toEmails) {
                 await sendSystemEmail(email, subject, body);
                 await new Promise(r => setTimeout(r, 500));
               }
             }
          }
          await saveAutoLog(logKey);
          autoLogs[logKey] = true;
        }
      }
    }

    // --- Rule 3: Tự động gửi Email nhắc Nợ phí ---
    if (rules.remindDebt && rules.remindDebt.enabled) {
      const currentDay = now.getDate();
      const targetDay = parseInt(rules.remindDebt.days) || 5;
      
      if (currentDay >= targetDay) {
        const [timeH, timeM] = (rules.remindDebt.time || '09:00').split(':');
        const cTime = new Date(now);
        cTime.setHours(timeH, timeM, 0, 0);
        
        if (now >= cTime) {
          let [y, m] = curMonthKey.split('_').map(Number);
          m -= 1;
          if (m === 0) { m = 12; y -= 1; }
          const prevMonthKey = `${y}_${String(m).padStart(2, '0')}`;
          const logKey = `remind_debt_${prevMonthKey}`;
          
          if (!autoLogs[logKey]) {
            const summary = computeMemberMonthSummary(prevMonthKey);
            const targets = state.members.filter(mem => {
              if (mem.status !== 'active') return false;
              const type = (mem.monthlyType || {})[prevMonthKey] || '';
              if (type !== 'fixed' && type !== 'casual') return false;
              
              const sObj = summary[mem.id] || { owed: 0 };
              const pObj = (state.payments[mem.id] || {})[prevMonthKey] || { paid: 0, prepaid: 0 };
              const remaining = sObj.owed - pObj.paid - pObj.prepaid;
              return remaining > 0 && mem.email;
            });

            if (targets.length > 0) {
              const paymentCfg = state.settings.payment || {};
              const bankId = paymentCfg.bankId || '';
              const accountNo = paymentCfg.accountNo || '';
              const accountName = paymentCfg.accountName || '';
              const qrUrl = paymentCfg.qrUrl || '';
              const treasurerPhone = paymentCfg.treasurerPhone || '';

              for (const mem of targets) {
                const sObj = summary[mem.id] || { owed: 0 };
                const pObj = (state.payments[mem.id] || {})[prevMonthKey] || { paid: 0, prepaid: 0 };
                const remaining = sObj.owed - pObj.paid - pObj.prepaid;
                
                const subject = `[THÔNG BÁO] Nhắc đóng quỹ cầu lông tháng ${monthLabel(prevMonthKey)}`;
                let body = `<p>Chào ${escapeHtml(mem.name)},</p>
                <p>Tổng kết quỹ cầu lông tháng <strong>${monthLabel(prevMonthKey)}</strong> của bạn như sau:</p>
                <ul>
                  <li>Tổng phí cần đóng: <strong>${formatVND(sObj.owed)}</strong></li>
                  <li>Đã đóng: <strong>${formatVND(pObj.paid)}</strong></li>
                  <li>Đóng trước: <strong>${formatVND(pObj.prepaid)}</strong></li>
                  <li><strong>Số tiền còn nợ: <span style="color:red;">${formatVND(remaining)}</span></strong></li>
                </ul>
                <p>Vui lòng chuyển khoản số tiền <strong>${formatVND(remaining)}</strong> với nội dung: <strong>${escapeHtml(mem.name)} nop tien thang ${monthLabel(prevMonthKey).replace('/','')}</strong>.</p>`;

                if (qrUrl) {
                  body += `<p><img src="${qrUrl}" alt="QR Code" style="max-width:300px;"/></p>`;
                } else if (bankId && accountNo) {
                  body += `<p><strong>Thông tin chuyển khoản:</strong><br/>Ngân hàng: ${bankId}<br/>Số tài khoản: ${accountNo}<br/>Chủ tài khoản: ${accountName}</p>`;
                }
                if (treasurerPhone) {
                  body += `<p>Nếu có thắc mắc, vui lòng liên hệ thủ quỹ: ${treasurerPhone}.</p>`;
                }
                
                await sendSystemEmail(mem.email, subject, body);
                await new Promise(r => setTimeout(r, 500));
              }
            }
            await saveAutoLog(logKey);
            autoLogs[logKey] = true;
          }
        }
      }
    }
  }

  // Khởi động hệ thống: Đảm bảo ẩn loading màn hình ngay cả khi mất mạng hoặc Supabase lỗi
  async function initApp() {
    try {
      await ensureAuth();
    } catch(e) {
      console.warn('ensureAuth error:', e);
    }
    try {
      await loadAll();
    } catch(e) {
      console.error('loadAll error:', e);
    } finally {
      const loadingEl = document.getElementById('loading');
      const rootEl = document.getElementById('root');
      if (loadingEl) loadingEl.style.display = 'none';
      if (rootEl) rootEl.style.display = 'block';
      try { checkUrlRedirects(); } catch(e) {}
      try { render(); } catch(e) { console.error('Render error:', e); }
      try { startAutoRefresh(); } catch(e) {}
      
      // Chạy ngầm tiến trình gửi Mail tự động (Lazy Cron)
      try {
        if (canManage()) {
          setTimeout(checkBackgroundTasks, 5000); // Đợi 5s cho UI render xong rồi mới check mail background
        }
      } catch(e) {}

      // Đăng ký Service Worker hỗ trợ cài đặt ứng dụng ngoại tuyến (PWA)
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered successfully!', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
        });
      }
    }
  }

  initApp();
})();

