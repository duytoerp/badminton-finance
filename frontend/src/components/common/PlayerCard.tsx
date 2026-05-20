import { Player } from '../../api/endpoints';

export default function PlayerCard({ player, onClick }: { player: Player; onClick?: () => void }) {
  const debt = player.currentDebt || 0;
  return (
    <div className="card" onClick={onClick} role="button">
      <div className="card-row">
        <div>
          <div className="card-title">{player.fullName}</div>
          <div className="card-sub">
            {player.phoneNumber || 'Chưa có SĐT'} · {player.playerType === 'Member' ? 'Thành viên' : 'Vãng lai'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {debt > 0
            ? <span className="badge unpaid">Nợ {debt.toLocaleString('vi-VN')}đ</span>
            : <span className="badge paid">Sạch nợ</span>}
        </div>
      </div>
    </div>
  );
}
