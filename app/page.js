'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const WHO = ['自分', '妻'];
const HEADER_CATEGORIES = ['食費', '外食費', '娯楽費'];

function monthKeyOf(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function monthLabelOf(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '年 ' + (d.getMonth() + 1) + '月';
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function yen(n) {
  return '¥' + Math.round(n || 0).toLocaleString('ja-JP');
}
async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'request failed');
  return data;
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [monthOffset, setMonthOffset] = useState(0);
  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncedAt, setSyncedAt] = useState(null);

  const [who, setWho] = useState(WHO[0]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');

  const [filterCat, setFilterCat] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetNote, setBudgetNote] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#7B98AC');
  const [newMethodName, setNewMethodName] = useState('');
  const [sampleNote, setSampleNote] = useState('');

  const [trend, setTrend] = useState([]);
  const donutRef = useRef(null);
  const trendRef = useRef(null);
  const donutChart = useRef(null);
  const trendChart = useRef(null);

  async function loadCore() {
    try {
      const [catRes, methodRes, budgetRes] = await Promise.all([
        api('/api/categories'),
        api('/api/methods'),
        api('/api/budgets')
      ]);
      setCategories(catRes.categories || []);
      setMethods((methodRes.methods || []).map((m) => m.name));
      setBudgets(budgetRes.budgets || {});
      setErrorMsg('');
      setSyncedAt(new Date());
    } catch (e) {
      setErrorMsg('データの読み込みに失敗しました。通信状況を確認してください。');
    }
  }
  async function loadExpenses(offset) {
    try {
      const res = await api('/api/expenses?month=' + monthKeyOf(offset));
      setExpenses(res.expenses || []);
      setErrorMsg('');
      setSyncedAt(new Date());
    } catch (e) {
      setErrorMsg('支出データの読み込みに失敗しました。');
    }
  }

  useEffect(() => {
    loadCore();
    loadExpenses(0);
    const interval = setInterval(() => {
      loadCore();
      loadExpenses(monthOffsetRef.current);
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthOffsetRef = useRef(0);
  useEffect(() => { monthOffsetRef.current = monthOffset; }, [monthOffset]);
  useEffect(() => { loadExpenses(monthOffset); }, [monthOffset]);

  useEffect(() => {
    if (categories.length && !categories.find((c) => c.name === selectedCat)) {
      setSelectedCat(categories[0].name);
    }
  }, [categories, selectedCat]);
  useEffect(() => {
    if (methods.length && !methods.includes(selectedMethod)) {
      setSelectedMethod(methods[0]);
    }
  }, [methods, selectedMethod]);

  useEffect(() => {
    if (tab === 'settings') {
      const draft = {};
      categories.forEach((c) => { draft[c.name] = budgets[c.name] || 0; });
      setBudgetDraft(draft);
    }
  }, [tab, categories, budgets]);

  useEffect(() => {
    if (tab === 'charts') {
      renderDonut();
      loadTrend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, categories, expenses]);

  useEffect(() => {
    if (tab === 'charts' && trend.length) renderTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend]);

  async function loadTrend() {
    try {
      const res = await api('/api/trend');
      setTrend(res.months || []);
    } catch {
      setTrend([]);
    }
  }

  async function renderDonut() {
    if (!donutRef.current) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    const labels = categories.map((c) => c.name);
    const data = categories.map((c) =>
      expenses.filter((e) => e.category === c.name).reduce((s, e) => s + Number(e.amount), 0)
    );
    const colors = categories.map((c) => c.color);
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#FFFBF6', borderWidth: 2 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.label + ': ' + yen(c.raw) } } }
      }
    });
  }
  async function renderTrend() {
    if (!trendRef.current) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    const totalBudget = categories.reduce((s, c) => s + (Number(budgets[c.name]) || 0), 0);
    if (trendChart.current) trendChart.current.destroy();
    trendChart.current = new Chart(trendRef.current.getContext('2d'), {
      data: {
        labels: trend.map((m) => m.label.replace('年', '/').replace('月', '')),
        datasets: [
          { type: 'bar', label: '実績', data: trend.map((m) => m.total), backgroundColor: '#C1694F', borderRadius: 6 },
          { type: 'line', label: '予算', data: trend.map(() => totalBudget), borderColor: '#8C8577', borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: { y: { ticks: { callback: (v) => yen(v) } } }
      }
    });
  }

  const totalBudget = useMemo(
    () => categories.reduce((s, c) => s + (Number(budgets[c.name]) || 0), 0),
    [categories, budgets]
  );
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const remain = totalBudget - totalSpent;

  async function submitExpense(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0 || !selectedCat || !selectedMethod) return;
    try {
      await api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ date, amount: amt, category: selectedCat, method: selectedMethod, who, memo })
      });
      setAmount('');
      setMemo('');
      setOcrStatus('');
      await loadExpenses(monthOffset);
      setTab('dashboard');
    } catch {
      setErrorMsg('支出の保存に失敗しました。もう一度お試しください。');
    }
  }
  async function deleteExpense(id) {
    try {
      await api('/api/expenses?id=' + id, { method: 'DELETE' });
      await loadExpenses(monthOffset);
    } catch {
      setErrorMsg('削除に失敗しました。');
    }
  }
  async function saveBudgets() {
    try {
      await api('/api/budgets', { method: 'PUT', body: JSON.stringify({ budgets: budgetDraft }) });
      setBudgets(budgetDraft);
      setBudgetNote('保存しました。');
      setTimeout(() => setBudgetNote(''), 2500);
    } catch {
      setBudgetNote('保存に失敗しました。');
    }
  }
  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }) });
      setNewCatName('');
      await loadCore();
    } catch {
      setErrorMsg('カテゴリの追加に失敗しました。');
    }
  }
  async function deleteCategory(name) {
    if (categories.length <= 1) return;
    try {
      await api('/api/categories?name=' + encodeURIComponent(name), { method: 'DELETE' });
      await loadCore();
    } catch {
      setErrorMsg('カテゴリの削除に失敗しました。');
    }
  }
  async function addMethod() {
    if (!newMethodName.trim()) return;
    try {
      await api('/api/methods', { method: 'POST', body: JSON.stringify({ name: newMethodName.trim() }) });
      setNewMethodName('');
      await loadCore();
    } catch {
      setErrorMsg('支払い方法の追加に失敗しました。');
    }
  }
  async function deleteMethod(name) {
    if (methods.length <= 1) return;
    try {
      await api('/api/methods?name=' + encodeURIComponent(name), { method: 'DELETE' });
      await loadCore();
    } catch {
      setErrorMsg('支払い方法の削除に失敗しました。');
    }
  }

  const SAMPLE_TAG = 'サンプル:';
  async function addSampleData() {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear(), m = d.getMonth();
    const cats = categories.length ? categories : [{ name: '食費' }];
    const meths = methods.length ? methods : ['現金'];
    const pick = (arr, i) => arr[i % arr.length];
    const samples = [
      { day: 2, amount: 3480, memo: 'スーパーで買い出し' },
      { day: 3, amount: 1200, memo: 'ランチ' },
      { day: 5, amount: 780, memo: 'ドラッグストア' },
      { day: 8, amount: 5600, memo: '週末の外食' },
      { day: 11, amount: 2150, memo: '日用品まとめ買い' },
      { day: 14, amount: 980, memo: 'カフェ' },
      { day: 18, amount: 4300, memo: '映画とごはん' },
      { day: 22, amount: 1650, memo: 'コンビニ' }
    ];
    try {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        await api('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            date: `${y}-${String(m + 1).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
            amount: s.amount,
            category: pick(cats, i).name,
            method: pick(meths, i),
            who: pick(WHO, i),
            memo: SAMPLE_TAG + s.memo
          })
        });
      }
      await loadExpenses(monthOffset);
      setSampleNote(samples.length + '件のサンプルを入れました。');
    } catch {
      setSampleNote('サンプルの追加に失敗しました。');
    }
    setTimeout(() => setSampleNote(''), 2500);
  }
  async function clearSampleData() {
    const targets = expenses.filter((e) => (e.memo || '').startsWith(SAMPLE_TAG));
    try {
      for (const t of targets) await api('/api/expenses?id=' + t.id, { method: 'DELETE' });
      await loadExpenses(monthOffset);
      setSampleNote(targets.length > 0 ? targets.length + '件のサンプルを消しました。' : '消せるサンプルはありませんでした。');
    } catch {
      setSampleNote('削除に失敗しました。');
    }
    setTimeout(() => setSampleNote(''), 2500);
  }

  async function handleOcr(file) {
    if (!file) return;
    setOcrStatus('画像を読み取っています…（数十秒かかることがあります）');
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(file, 'jpn+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setOcrStatus(`読み取り中… ${Math.round(m.progress * 100)}%`);
        }
      });
      const numbers = (data.text.match(/[0-9][0-9,]{2,}/g) || [])
        .map((s) => Number(s.replace(/,/g, '')))
        .filter((n) => n > 0 && n < 1000000);
      if (numbers.length) {
        const guess = Math.max(...numbers);
        setAmount(String(guess));
        setOcrStatus(`金額欄に ${yen(guess)} を自動入力しました。内容を確認して修正してください。`);
      } else {
        setOcrStatus('金額を自動で見つけられませんでした。手入力してください。');
      }
    } catch {
      setOcrStatus('読み取りに失敗しました。手入力してください。');
    }
  }

  function exportCsv() {
    let list = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    if (filterCat !== 'all') list = list.filter((e) => e.category === filterCat);
    if (filterMethod !== 'all') list = list.filter((e) => e.method === filterMethod);
    const header = ['日付', 'カテゴリ', '支払い方法', '金額', '入力者', 'メモ'];
    const rows = list.map((e) => [e.date, e.category, e.method, e.amount, e.who || '', (e.memo || '').replace(/"/g, '""')]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v)}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kakeibo_${monthKeyOf(monthOffset)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
  }

  let filteredHistory = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (filterCat !== 'all') filteredHistory = filteredHistory.filter((e) => e.category === filterCat);
  if (filterMethod !== 'all') filteredHistory = filteredHistory.filter((e) => e.method === filterMethod);

  const printRows = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      {errorMsg && <div id="storageError">⚠ {errorMsg}</div>}

      <header className="cover">
        <div className="cover-top">
          <div className="cover-title mincho">おうち帳簿</div>
        </div>
        <div className="month-nav">
          <button onClick={() => setMonthOffset((v) => v - 1)} aria-label="前の月">‹</button>
          <div className="month-label mincho">{monthLabelOf(monthOffset)}</div>
          <button onClick={() => monthOffset < 0 && setMonthOffset((v) => v + 1)} aria-label="次の月">›</button>
        </div>
        <div className="mini-dash-wrap">
          <div className="mini-dash-label mincho">今月、あと使える</div>
          <div className="mini-dash">
            {HEADER_CATEGORIES.filter((name) => categories.find((c) => c.name === name)).map((name) => {
              const cat = categories.find((c) => c.name === name);
              const budget = Number(budgets[name]) || 0;
              const spent = expenses.filter((e) => e.category === name).reduce((s, e) => s + Number(e.amount), 0);
              const remainCat = budget - spent;
              const over = remainCat < 0;
              return (
                <div key={name} className={'mini-card' + (over ? ' over' : '')}>
                  <span className="mini-card-dot" style={{ background: over ? '#B3A99A' : cat.color }} />
                  <div className="mini-card-name">{name}</div>
                  <div className="mini-card-amount">{yen(remainCat)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sync-row">
          <span className="sync-dot" />
          <button className="sync-text" onClick={logout}>
            {syncedAt ? '同期済み・' + syncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '同期中…'}　|　ログアウト
          </button>
        </div>
      </header>

      <nav className="tabs no-print">
        {[
          ['dashboard', '台帳'],
          ['add', '記入'],
          ['history', '履歴'],
          ['charts', 'グラフ'],
          ['settings', '設定']
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      <main className="no-print">
        {tab === 'dashboard' && (
          <>
            <div className="card">
              <div className="section-title">今月のカテゴリ別収支</div>
              {categories.map((c) => {
                const budget = Number(budgets[c.name]) || 0;
                const spent = expenses.filter((e) => e.category === c.name).reduce((s, e) => s + Number(e.amount), 0);
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : spent > 0 ? 100 : 0;
                const over = spent > budget;
                return (
                  <div className="cat-row" key={c.name}>
                    <div className="cat-row-top">
                      <div className="cat-name"><span className="cat-mark" style={{ background: c.color }} />{c.name}</div>
                      <div className="cat-figures"><b>{yen(spent)}</b> / {yen(budget)}</div>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: pct + '%', background: over ? '#A8543D' : c.color }} /></div>
                    <div className={'cat-remain' + (over ? ' over' : '')}>
                      {over ? '予算オーバー ' + yen(spent - budget) : '残り ' + yen(budget - spent)}
                    </div>
                  </div>
                );
              })}
              <div className="total-row">
                <div className="label mincho">合計</div>
                <div className={'value' + (totalSpent > totalBudget ? ' over' : '')}>{yen(totalSpent)} / {yen(totalBudget)}</div>
              </div>
            </div>
            <div className="card">
              <div className="section-title">支払い方法ごとの合計（今月）</div>
              {expenses.length === 0 ? (
                <div style={{ color: 'var(--ink-soft)' }}>今月はまだ記録がありません。</div>
              ) : (
                Object.entries(
                  expenses.reduce((acc, e) => { acc[e.method] = (acc[e.method] || 0) + Number(e.amount); return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).map(([m, total]) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--rule)' }}>
                    <span>{m}</span><b>{yen(total)}</b>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'add' && (
          <>
            <div className="card">
              <div className="section-title">レシートから読み取り（OCR）</div>
              <label htmlFor="ocrFile" className="ocr-box">
                📷 タップしてレシート写真を選択<br />
                <span style={{ fontSize: 11 }}>金額の自動入力を試みます（読み取り精度には限界があります）</span>
              </label>
              <input id="ocrFile" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={(e) => handleOcr(e.target.files[0])} />
              <div className="ocr-status">{ocrStatus}</div>
            </div>
            <div className="card">
              <div className="section-title">支出を記入</div>
              <form onSubmit={submitExpense}>
                <label>入力者</label>
                <div className="chip-group">
                  {WHO.map((w) => (
                    <div key={w} className={'chip' + (who === w ? ' selected' : '')} onClick={() => setWho(w)}>{w}</div>
                  ))}
                </div>
                <label>日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <label>カテゴリ</label>
                <div className="chip-group">
                  {categories.map((c) => (
                    <div key={c.name} className={'chip' + (selectedCat === c.name ? ' selected' : '')} onClick={() => setSelectedCat(c.name)}>{c.name}</div>
                  ))}
                </div>
                <label>金額（円）</label>
                <input type="number" min="1" step="1" placeholder="例）1280" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <label>支払い方法</label>
                <div className="chip-group">
                  {methods.map((m) => (
                    <div key={m} className={'chip' + (m === '楽天Pay' ? ' rakuten' : '') + (selectedMethod === m ? ' selected' : '')} onClick={() => setSelectedMethod(m)}>{m}</div>
                  ))}
                </div>
                <label>メモ（お店の名前など）</label>
                <input type="text" placeholder="例）〇〇スーパー" value={memo} onChange={(e) => setMemo(e.target.value)} />
                <button type="submit" className="btn-primary">この内容で記入する</button>
              </form>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            <div className="card">
              <div className="section-title">絞り込み</div>
              <div className="filter-row">
                {['all', ...categories.map((c) => c.name)].map((k) => (
                  <div key={k} className={'filter-chip' + (filterCat === k ? ' active' : '')} onClick={() => setFilterCat(k)}>{k === 'all' ? 'すべて' : k}</div>
                ))}
              </div>
              <div className="filter-row">
                {['all', ...methods].map((k) => (
                  <div key={k} className={'filter-chip' + (filterMethod === k ? ' active' : '')} onClick={() => setFilterMethod(k)}>{k === 'all' ? '支払方法すべて' : k}</div>
                ))}
              </div>
            </div>
            <div className="card">
              {filteredHistory.length === 0 ? (
                <div className="empty-state">この条件の記録はまだありません。</div>
              ) : (
                filteredHistory.map((e) => (
                  <div className="entry" key={e.id}>
                    <div className="entry-left">
                      <div className="entry-date">{e.date.slice(5).replace('-', '/')}　{e.who || ''}</div>
                      <div className="entry-memo">{e.memo || e.category}</div>
                      <div className="entry-tags">
                        <span className="tag">{e.category}</span>
                        <span className={'tag' + (e.method === '楽天Pay' ? ' rakuten' : '')}>{e.method}</span>
                      </div>
                    </div>
                    <div className="entry-right">
                      <div className="entry-amount">{yen(e.amount)}</div>
                      <button className="del-btn" onClick={() => deleteExpense(e.id)} aria-label="削除">✕</button>
                    </div>
                  </div>
                ))
              )}
              <div className="btn-row">
                <button className="btn-secondary" onClick={exportCsv}>CSVでダウンロード</button>
                <button className="btn-secondary" onClick={() => window.print()}>PDFで保存（印刷）</button>
              </div>
            </div>
          </>
        )}

        {tab === 'charts' && (
          <>
            <div className="card">
              <div className="section-title">今月のカテゴリ別割合</div>
              <div className="chart-wrap"><canvas ref={donutRef} /></div>
              <div className="chart-legend">
                {categories.map((c) => (
                  <div className="legend-item" key={c.name}><span className="legend-dot" style={{ background: c.color }} />{c.name}</div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="section-title">直近6か月の推移（実績と予算）</div>
              <div className="chart-wrap"><canvas ref={trendRef} /></div>
            </div>
          </>
        )}

        {tab === 'settings' && (
          <>
            <div className="card">
              <div className="section-title">月の予算設定</div>
              {categories.map((c) => (
                <div className="budget-input-row" key={c.name}>
                  <div className="cat-name"><span className="cat-mark" style={{ background: c.color }} />{c.name}</div>
                  <input type="number" min="0" step="1000" value={budgetDraft[c.name] ?? 0}
                    onChange={(e) => setBudgetDraft({ ...budgetDraft, [c.name]: Number(e.target.value) || 0 })} />
                </div>
              ))}
              <button className="btn-primary" onClick={saveBudgets}>予算を保存</button>
              <div className="save-note">{budgetNote}</div>
            </div>

            <div className="card">
              <div className="section-title">カテゴリの管理</div>
              {categories.map((c) => (
                <div className="manage-row" key={c.name}>
                  <div className="manage-name"><span className="cat-mark" style={{ background: c.color }} />{c.name}</div>
                  <button className="manage-del" onClick={() => deleteCategory(c.name)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} />
                <input type="text" placeholder="新しいカテゴリ名" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                <button onClick={addCategory}>追加</button>
              </div>
            </div>

            <div className="card">
              <div className="section-title">支払い方法の管理</div>
              {methods.map((m) => (
                <div className="manage-row" key={m}>
                  <div className="manage-name">{m}</div>
                  <button className="manage-del" onClick={() => deleteMethod(m)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="text" placeholder="新しい支払い方法（例：家族カード）" value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} />
                <button onClick={addMethod}>追加</button>
              </div>
            </div>

            <div className="card">
              <div className="section-title">テスト用データ</div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
                動作確認用に、今月分のサンプル支出を何件か入れてみることができます。あとからまとめて消せます。
              </p>
              <div className="btn-row">
                <button className="btn-secondary" onClick={addSampleData}>サンプルデータを入れる</button>
                <button className="btn-secondary" onClick={clearSampleData}>サンプルデータを消す</button>
              </div>
              <div className="save-note">{sampleNote}</div>
            </div>

            <div className="card">
              <div className="section-title">このアプリについて</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
                データはSupabase（自分たちのデータベース）に保存され、PINでログインした人だけが読み書きできます。約8秒ごとに最新の状態へ更新します。<br /><br />
                楽天Payは支払い方法として選んで手入力する運用です。<br /><br />
                レシートOCRはブラウザ内で処理され、画像が外部サーバーに送信されることはありません。<br /><br />
                PDF出力はブラウザの印刷機能を使っています。
              </p>
            </div>
          </>
        )}
      </main>

      <div className="print-only">
        <div className="print-title">おうち帳簿</div>
        <div className="print-sub">{monthLabelOf(monthOffset)}　合計 {yen(totalSpent)} / {yen(totalBudget)}</div>
        <table className="print-table">
          <thead><tr><th>カテゴリ</th><th>予算</th><th>実績</th><th>残り</th></tr></thead>
          <tbody>
            {categories.map((c) => {
              const spent = expenses.filter((e) => e.category === c.name).reduce((s, e) => s + Number(e.amount), 0);
              return (
                <tr key={c.name}>
                  <td>{c.name}</td><td>{yen(budgets[c.name] || 0)}</td><td>{yen(spent)}</td><td>{yen((budgets[c.name] || 0) - spent)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className="print-table">
          <thead><tr><th>日付</th><th>カテゴリ</th><th>支払い方法</th><th>金額</th><th>入力者</th><th>メモ</th></tr></thead>
          <tbody>
            {printRows.map((e) => (
              <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.method}</td><td>{yen(e.amount)}</td><td>{e.who || ''}</td><td>{e.memo || ''}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
