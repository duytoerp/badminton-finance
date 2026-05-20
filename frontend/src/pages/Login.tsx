import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/endpoints';
import { useAuth } from '../store/auth';

export default function Login() {
  const [u, setU] = useState('admin');
  const [p, setP] = useState('Admin@123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setAuth = useAuth(s => s.setAuth);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await login(u, p);
      setAuth(res.data.accessToken, res.data.userName, res.data.fullName, res.data.roles || []);
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Đăng nhập thất bại');
    } finally { setBusy(false); }
  }

  return (
    <div className="page" style={{ paddingTop: 60 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>🏸 Quỹ Cầu Lông</h2>
      <form onSubmit={submit}>
        <div className="form-field">
          <label>Tài khoản</label>
          <input value={u} onChange={e => setU(e.target.value)} autoComplete="username" />
        </div>
        <div className="form-field">
          <label>Mật khẩu</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" />
        </div>
        {err && <p style={{ color: 'var(--c-danger)' }}>{err}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}
