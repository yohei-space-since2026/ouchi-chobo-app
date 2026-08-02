'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'ログインに失敗しました');
        setLoading(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('通信エラーが発生しました');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7F3EA', fontFamily: "'Zen Kaku Gothic New', sans-serif"
    }}>
      <form onSubmit={submit} style={{
        background: '#FFFBF6', border: '1px solid #DBD1BC', borderRadius: 20,
        padding: '32px 28px', width: '100%', maxWidth: 320, boxShadow: '0 4px 16px rgba(63,59,52,0.08)'
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3F3B34', marginBottom: 4 }}>おうち帳簿</div>
        <div style={{ fontSize: 12, color: '#8C8577', marginBottom: 20 }}>合言葉を入力してください</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          style={{
            width: '100%', padding: '12px 14px', fontSize: 16, letterSpacing: '0.2em',
            border: '1px solid #DBD1BC', borderRadius: 10, marginBottom: 14, boxSizing: 'border-box'
          }}
        />
        {error && <div style={{ color: '#A8543D', fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 13, background: '#C1694F', color: '#fff', border: 'none',
          borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>
          {loading ? '確認中…' : '入る'}
        </button>
      </form>
    </div>
  );
}
