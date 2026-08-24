import re

with open('/Users/kietdmt/Documents/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update renderRoastFeed to add tournament roasts
target_roast = "if (roasts.length === 0) {"
tour_roast_code = """
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

    """
if 'activeTourForRoast' not in html:
    html = html.replace(target_roast, tour_roast_code + target_roast)

with open('/Users/kietdmt/Documents/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Roast feed updated!")
