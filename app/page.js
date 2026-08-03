'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const WHO = ['自分', '妻'];
const HEADER_CATEGORIES = ['食費', '外食費', '娯楽費'];
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

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
function calendarCellsOf(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const year = d.getFullYear(), monthIdx = d.getMonth();
  const firstWeekday = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return cells;
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
  const monthOffsetRef = useRef(0);
  useEffect(() => { monthOffsetRef.current = monthOffset; }, [monthOffset]);

  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [carriedNotice, setCarriedNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncedAt, setSyncedAt] = useState(null);

  const [who, setWho] = useState(WHO[0]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('');
  const [memo, setMemo] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');

  const [filterCat, setFilterCat] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [calendarDay, setCalendarDay] = useState(null);

  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetNote, setBudgetNote] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#7B98AC');
  const [newMethodName, setNewMethodName] = useState('');
  const [sampleNote, setSampleNote] = useState('');

  const [newIncomeLabel, setNewIncomeLabel] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newFixedLabel, setNewFixedLabel] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVariableLabel, setNewVariableLabel] = useState('');
  const [newVariableAmount, setNewVariableAmount] = useState('');
  const [newAssetLabel, setNewAssetLabel] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [editingBudgetItemId, setEditingBudgetItemId] = useState(null);
  const [editBudgetItemDraft, setEditBudgetItemDraft] = useState({});
  const [prevBudgetItems, setPrevBudgetItems] = useState([]);

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
    } catch {
      setErrorMsg('データの読み込みに失敗しました。通信状況を確認してください。');
    }
  }
  async function loadExpenses(offset) {
    try {
      const res = await api('/api/expenses?month=' + monthKeyOf(offset));
      setExpenses(res.expenses || []);
      setErrorMsg('');
      setSyncedAt(new Date());
    } catch {
      setErrorMsg('支出データの読み込みに失敗しました。');
    }
  }
  async function loadBudgetItems(offset) {
    try {
      const res = await api('/api/budget-items?month=' + monthKeyOf(offset));
      setBudgetItems(res.items || []);
      if (res.carried) {
        setCarriedNotice(`${res.carriedFrom}の内容を引き継ぎました。金額を確認してください。`);
        setTimeout(() => setCarriedNotice(''), 6000);
      }
    } catch {
      // 収支データはダッシュボードの主目的ではないため、静かに失敗させる
    }
    try {
      const prevRes = await api('/api/budget-items?month=' + monthKeyOf(offset - 1) + '&noCarry=1');
      setPrevBudgetItems(prevRes.items || []);
    } catch {
      setPrevBudgetItems([]);
    }
  }

  useEffect(() => {
    loadCore();
    loadExpenses(0);
    loadBudgetItems(0);
    const interval = setInterval(() => {
      loadCore();
      loadExpenses(monthOffsetRef.current);
      loadBudgetItems(monthOffsetRef.current);
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCalendarDay(null);
    loadExpenses(monthOffset);
    loadBudgetItems(monthOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

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
    if (tab === 'charts') { renderDonut(); loadTrend(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, categories, expenses]);
  useEffect(() => {
    if (tab === 'charts' && trend.length) renderTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend]);

  async function loadTrend() {
    try { const res = await api('/api/trend'); setTrend(res.months || []); }
    catch { setTrend([]); }
  }
  async function renderDonut() {
    if (!donutRef.current) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    const labels = categories.map((c) => c.name);
    const data = categories.map((c) => expenses.filter((e) => e.category === c.name).reduce((s, e) => s + Number(e.amount), 0));
    const colors = categories.map((c) => c.color);
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#FFFBF6', borderWidth: 2 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.label + ': ' + yen(c.raw) } } } }
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
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: (v) => yen(v) } } } }
    });
  }

  const totalBudget = useMemo(() => categories.reduce((s, c) => s + (Number(budgets[c.name]) || 0), 0), [categories, budgets]);
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const incomeItems = useMemo(() => budgetItems.filter((i) => i.type === 'income'), [budgetItems]);
  const fixedItems = useMemo(() => budgetItems.filter((i) => i.type === 'fixed'), [budgetItems]);
  const variableItems = useMemo(() => budgetItems.filter((i) => i.type === 'variable'), [budgetItems]);
  const assetItems = useMemo(() => budgetItems.filter((i) => i.type === 'asset'), [budgetItems]);
  const incomeTotal = useMemo(() => incomeItems.reduce((s, i) => s + Number(i.amount), 0), [incomeItems]);
  const fixedTotal = useMemo(() => fixedItems.reduce((s, i) => s + Number(i.amount), 0), [fixedItems]);
  const variableTotal = useMemo(() => variableItems.reduce((s, i) => s + Number(i.amount), 0), [variableItems]);
  const assetTotal = useMemo(() => assetItems.reduce((s, i) => s + Number(i.amount), 0), [assetItems]);
  const expenseTotal = fixedTotal + variableTotal;
  const balance = incomeTotal - expenseTotal;

  function sumByType(items, type) {
    return items.filter((i) => i.type === type).reduce((s, i) => s + Number(i.amount), 0);
  }
  const prevIncomeTotal = useMemo(() => sumByType(prevBudgetItems, 'income'), [prevBudgetItems]);
  const prevExpenseTotal = useMemo(() => sumByType(prevBudgetItems, 'fixed') + sumByType(prevBudgetItems, 'variable'), [prevBudgetItems]);
  const prevBalance = prevIncomeTotal - prevExpenseTotal;
  const prevAssetTotal = useMemo(() => sumByType(prevBudgetItems, 'asset'), [prevBudgetItems]);
  const deltaIncome = incomeTotal - prevIncomeTotal;
  const deltaExpense = expenseTotal - prevExpenseTotal;
  const deltaBalance = balance - prevBalance;
  const deltaAsset = assetTotal - prevAssetTotal;

  function deltaFor(current, label, type) {
    const prev = prevBudgetItems.find((i) => i.type === type && i.label === label);
    if (!prev) return null;
    return current - Number(prev.amount);
  }
  function DeltaTag({ value }) {
    if (value === null || value === undefined || value === 0) return null;
    const cls = value > 0 ? 'pos' : 'neg';
    const sign = value > 0 ? '+' : '';
    return <span className={'delta ' + cls}>（先月比 {sign}{yen(value)}）</span>;
  }

  async function submitExpense(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0 || !selectedCat || !selectedMethod) return;
    try {
      await api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ date, amount: amt, category: selectedCat, method: selectedMethod, who, store, memo })
      });
      setAmount(''); setStore(''); setMemo(''); setOcrStatus('');
      await loadExpenses(monthOffset);
      setTab('dashboard');
    } catch { setErrorMsg('支出の保存に失敗しました。もう一度お試しください。'); }
  }
  function startEditExpense(e) {
    setEditingExpenseId(e.id);
    setEditDraft({ date: e.date, amount: e.amount, category: e.category, method: e.method, who: e.who || WHO[0], store: e.store || '', memo: e.memo || '' });
  }
  function cancelEditExpense() { setEditingExpenseId(null); setEditDraft({}); }
  async function saveEditExpense(id) {
    try {
      await api('/api/expenses', { method: 'PATCH', body: JSON.stringify({ id, ...editDraft, amount: Number(editDraft.amount) }) });
      setEditingExpenseId(null);
      await loadExpenses(monthOffset);
    } catch { setErrorMsg('支出の更新に失敗しました。'); }
  }
  async function deleteExpense(id) {
    try { await api('/api/expenses?id=' + id, { method: 'DELETE' }); await loadExpenses(monthOffset); }
    catch { setErrorMsg('削除に失敗しました。'); }
  }

  async function saveBudgets() {
    try {
      await api('/api/budgets', { method: 'PUT', body: JSON.stringify({ budgets: budgetDraft }) });
      setBudgets(budgetDraft);
      setBudgetNote('保存しました。');
      setTimeout(() => setBudgetNote(''), 2500);
    } catch { setBudgetNote('保存に失敗しました。'); }
  }
  async function addCategory() {
    if (!newCatName.trim()) return;
    try { await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }) }); setNewCatName(''); await loadCore(); }
    catch { setErrorMsg('カテゴリの追加に失敗しました。'); }
  }
  async function deleteCategory(name) {
    if (categories.length <= 1) return;
    try { await api('/api/categories?name=' + encodeURIComponent(name), { method: 'DELETE' }); await loadCore(); }
    catch { setErrorMsg('カテゴリの削除に失敗しました。'); }
  }
  async function addMethod() {
    if (!newMethodName.trim()) return;
    try { await api('/api/methods', { method: 'POST', body: JSON.stringify({ name: newMethodName.trim() }) }); setNewMethodName(''); await loadCore(); }
    catch { setErrorMsg('支払い方法の追加に失敗しました。'); }
  }
  async function deleteMethod(name) {
    if (methods.length <= 1) return;
    try { await api('/api/methods?name=' + encodeURIComponent(name), { method: 'DELETE' }); await loadCore(); }
    catch { setErrorMsg('支払い方法の削除に失敗しました。'); }
  }

  const BUDGET_ITEM_INPUTS = {
    income: [newIncomeLabel, setNewIncomeLabel, newIncomeAmount, setNewIncomeAmount],
    fixed: [newFixedLabel, setNewFixedLabel, newFixedAmount, setNewFixedAmount],
    variable: [newVariableLabel, setNewVariableLabel, newVariableAmount, setNewVariableAmount],
    asset: [newAssetLabel, setNewAssetLabel, newAssetAmount, setNewAssetAmount]
  };
  async function addBudgetItem(type) {
    const [label, setLabel, amt, setAmt] = BUDGET_ITEM_INPUTS[type];
    if (!label.trim()) return;
    try {
      await api('/api/budget-items', { method: 'POST', body: JSON.stringify({ month: monthKeyOf(monthOffset), type, label: label.trim(), amount: Number(amt) || 0 }) });
      setLabel(''); setAmt('');
      await loadBudgetItems(monthOffset);
    } catch { setErrorMsg('項目の追加に失敗しました。'); }
  }
  function startEditBudgetItem(item) { setEditingBudgetItemId(item.id); setEditBudgetItemDraft({ label: item.label, amount: item.amount }); }
  function cancelEditBudgetItem() { setEditingBudgetItemId(null); setEditBudgetItemDraft({}); }
  async function saveEditBudgetItem(id) {
    try {
      await api('/api/budget-items', { method: 'PATCH', body: JSON.stringify({ id, ...editBudgetItemDraft, amount: Number(editBudgetItemDraft.amount) || 0 }) });
      setEditingBudgetItemId(null);
      await loadBudgetItems(monthOffset);
    } catch { setErrorMsg('項目の更新に失敗しました。'); }
  }
  async function deleteBudgetItem(id) {
    try { await api('/api/budget-items?id=' + id, { method: 'DELETE' }); await loadBudgetItems(monthOffset); }
    catch { setErrorMsg('項目の削除に失敗しました。'); }
  }

  const SAMPLE_TAG = 'サンプル:';
  async function addSampleData() {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear(), m = d.getMonth();
    const cats = categories.length ? categories : [{ name: '食費' }];
    const meths = methods.length ? methods : ['現金'];
    const pick = (arr, i) => arr[i % arr.length];
    const samples = [
      { day: 2, amount: 3480, store: '〇〇スーパー' },
      { day: 3, amount: 1200, store: '△△食堂' },
      { day: 5, amount: 780, store: 'ドラッグストア□□' },
      { day: 8, amount: 5600, store: '焼肉屋さん', memo: '誕生日祝い' },
      { day: 11, amount: 2150, store: 'ホームセンター' },
      { day: 14, amount: 980, store: 'カフェ' },
      { day: 18, amount: 4300, store: '映画館', memo: '前売り券込み' },
      { day: 22, amount: 1650, store: 'コンビニ' }
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
            store: SAMPLE_TAG + s.store,
            memo: s.memo || ''
          })
        });
      }
      await loadExpenses(monthOffset);
      setSampleNote(samples.length + '件のサンプルを入れました。');
    } catch { setSampleNote('サンプルの追加に失敗しました。'); }
    setTimeout(() => setSampleNote(''), 2500);
  }
  async function clearSampleData() {
    const targets = expenses.filter((e) => (e.store || '').startsWith(SAMPLE_TAG));
    try {
      for (const t of targets) await api('/api/expenses?id=' + t.id, { method: 'DELETE' });
      await loadExpenses(monthOffset);
      setSampleNote(targets.length > 0 ? targets.length + '件のサンプルを消しました。' : '消せるサンプルはありませんでした。');
    } catch { setSampleNote('削除に失敗しました。'); }
    setTimeout(() => setSampleNote(''), 2500);
  }

  async function handleOcr(file) {
    if (!file) return;
    setOcrStatus('画像を読み取っています…（数十秒かかることがあります）');
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(file, 'jpn+eng', {
        logger: (m) => { if (m.status === 'recognizing text') setOcrStatus(`読み取り中… ${Math.round(m.progress * 100)}%`); }
      });
      const numbers = (data.text.match(/[0-9][0-9,]{2,}/g) || []).map((s) => Number(s.replace(/,/g, ''))).filter((n) => n > 0 && n < 1000000);
      if (numbers.length) {
        const guess = Math.max(...numbers);
        setAmount(String(guess));
        setOcrStatus(`金額欄に ${yen(guess)} を自動入力しました。内容を確認して修正してください。`);
      } else { setOcrStatus('金額を自動で見つけられませんでした。手入力してください。'); }
    } catch { setOcrStatus('読み取りに失敗しました。手入力してください。'); }
  }

  function exportCsv() {
    let list = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    if (filterCat !== 'all') list = list.filter((e) => e.category === filterCat);
    if (filterMethod !== 'all') list = list.filter((e) => e.method === filterMethod);
    if (calendarDay) list = list.filter((e) => e.date === calendarDay);
    const header = ['日付', 'カテゴリ', '支払い方法', '金額', '入力者', '店舗', 'メモ'];
    const rows = list.map((e) => [e.date, e.category, e.method, e.amount, e.who || '', (e.store || '').replace(/"/g, '""'), (e.memo || '').replace(/"/g, '""')]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v)}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kakeibo_${monthKeyOf(monthOffset)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function logout() { await fetch('/api/logout', { method: 'POST' }); router.replace('/login'); }

  const dayTotals = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.date] = (map[e.date] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);
  const calendarCells = useMemo(() => calendarCellsOf(monthOffset), [monthOffset]);

  let filteredHistory = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (filterCat !== 'all') filteredHistory = filteredHistory.filter((e) => e.category === filterCat);
  if (filterMethod !== 'all') filteredHistory = filteredHistory.filter((e) => e.method === filterMethod);
  if (calendarDay) filteredHistory = filteredHistory.filter((e) => e.date === calendarDay);

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
          ['budget', '収支'],
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
                    <div className={'cat-remain' + (over ? ' over' : '')}>{over ? '予算オーバー ' + yen(spent - budget) : '残り ' + yen(budget - spent)}</div>
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
                Object.entries(expenses.reduce((acc, e) => { acc[e.method] = (acc[e.method] || 0) + Number(e.amount); return acc; }, {}))
                  .sort((a, b) => b[1] - a[1]).map(([m, total]) => (
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
              <input id="ocrFile" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleOcr(e.target.files[0])} />
              <div className="ocr-status">{ocrStatus}</div>
            </div>
            <div className="card">
              <div className="section-title">支出を記入</div>
              <form onSubmit={submitExpense}>
                <label>入力者</label>
                <div className="chip-group">
                  {WHO.map((w) => (<div key={w} className={'chip' + (who === w ? ' selected' : '')} onClick={() => setWho(w)}>{w}</div>))}
                </div>
                <label>日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <label>カテゴリ</label>
                <div className="chip-group">
                  {categories.map((c) => (<div key={c.name} className={'chip' + (selectedCat === c.name ? ' selected' : '')} onClick={() => setSelectedCat(c.name)}>{c.name}</div>))}
                </div>
                <label>金額（円）</label>
                <input type="number" min="1" step="1" placeholder="例）1280" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <label>支払い方法</label>
                <div className="chip-group">
                  {methods.map((m) => (<div key={m} className={'chip' + (m === '楽天Pay' ? ' rakuten' : '') + (selectedMethod === m ? ' selected' : '')} onClick={() => setSelectedMethod(m)}>{m}</div>))}
                </div>
                <label>お店の名前（任意）</label>
                <input type="text" placeholder="例）〇〇スーパー" value={store} onChange={(e) => setStore(e.target.value)} />
                <label>メモ（任意）</label>
                <input type="text" placeholder="例）友人の誕生日プレゼント" value={memo} onChange={(e) => setMemo(e.target.value)} />
                <button type="submit" className="btn-primary">この内容で記入する</button>
              </form>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            <div className="card">
              <div className="section-title">{monthLabelOf(monthOffset)}のカレンダー</div>
              <div className="calendar">
                {WEEKDAYS.map((w) => (<div className="calendar-weekday" key={w}>{w}</div>))}
                {calendarCells.map((dateStr, i) => {
                  if (!dateStr) return <div className="calendar-cell empty" key={'empty' + i} />;
                  const total = dayTotals[dateStr] || 0;
                  const day = Number(dateStr.slice(-2));
                  const selected = calendarDay === dateStr;
                  return (
                    <div
                      key={dateStr}
                      className={'calendar-cell' + (total > 0 ? ' has-spend' : '') + (selected ? ' selected' : '')}
                      onClick={() => setCalendarDay(selected ? null : dateStr)}
                    >
                      <div className="calendar-day">{day}</div>
                      {total > 0 && <div className="calendar-amount">{yen(total)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="section-title">絞り込み</div>
              {calendarDay && (
                <div className="filter-row">
                  <div className="filter-chip active" onClick={() => setCalendarDay(null)}>{calendarDay.slice(5).replace('-', '/')} のみ表示中 ✕</div>
                </div>
              )}
              <div className="filter-row">
                {['all', ...categories.map((c) => c.name)].map((k) => (<div key={k} className={'filter-chip' + (filterCat === k ? ' active' : '')} onClick={() => setFilterCat(k)}>{k === 'all' ? 'すべて' : k}</div>))}
              </div>
              <div className="filter-row">
                {['all', ...methods].map((k) => (<div key={k} className={'filter-chip' + (filterMethod === k ? ' active' : '')} onClick={() => setFilterMethod(k)}>{k === 'all' ? '支払方法すべて' : k}</div>))}
              </div>
            </div>

            <div className="card">
              {filteredHistory.length === 0 ? (
                <div className="empty-state">この条件の記録はまだありません。</div>
              ) : (
                filteredHistory.map((e) => editingExpenseId === e.id ? (
                  <div className="entry-edit-form" key={e.id}>
                    <div className="grid2" style={{ marginBottom: 8 }}>
                      <div>
                        <label style={{ margin: '0 0 4px' }}>日付</label>
                        <input type="date" value={editDraft.date} onChange={(ev) => setEditDraft({ ...editDraft, date: ev.target.value })} />
                      </div>
                      <div>
                        <label style={{ margin: '0 0 4px' }}>金額</label>
                        <input type="number" value={editDraft.amount} onChange={(ev) => setEditDraft({ ...editDraft, amount: ev.target.value })} />
                      </div>
                    </div>
                    <div className="grid2" style={{ marginBottom: 8 }}>
                      <div>
                        <label style={{ margin: '0 0 4px' }}>カテゴリ</label>
                        <select value={editDraft.category} onChange={(ev) => setEditDraft({ ...editDraft, category: ev.target.value })}>
                          {categories.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label style={{ margin: '0 0 4px' }}>支払い方法</label>
                        <select value={editDraft.method} onChange={(ev) => setEditDraft({ ...editDraft, method: ev.target.value })}>
                          {methods.map((m) => (<option key={m} value={m}>{m}</option>))}
                        </select>
                      </div>
                    </div>
                    <label style={{ margin: '0 0 4px' }}>入力者</label>
                    <select value={editDraft.who} onChange={(ev) => setEditDraft({ ...editDraft, who: ev.target.value })}>
                      {WHO.map((w) => (<option key={w} value={w}>{w}</option>))}
                    </select>
                    <label style={{ margin: '8px 0 4px' }}>お店の名前</label>
                    <input type="text" value={editDraft.store} onChange={(ev) => setEditDraft({ ...editDraft, store: ev.target.value })} />
                    <label style={{ margin: '8px 0 4px' }}>メモ</label>
                    <input type="text" value={editDraft.memo} onChange={(ev) => setEditDraft({ ...editDraft, memo: ev.target.value })} />
                    <div className="btn-row">
                      <button className="btn-secondary" onClick={() => saveEditExpense(e.id)}>保存</button>
                      <button className="btn-secondary" onClick={cancelEditExpense}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <div className="entry" key={e.id}>
                    <div className="entry-left">
                      <div className="entry-date">{e.date.slice(5).replace('-', '/')}　{e.who || ''}</div>
                      <div className="entry-memo">{e.store || e.category}</div>
                      {e.memo && <div className="entry-note">{e.memo}</div>}
                      <div className="entry-tags">
                        <span className="tag">{e.category}</span>
                        <span className={'tag' + (e.method === '楽天Pay' ? ' rakuten' : '')}>{e.method}</span>
                      </div>
                    </div>
                    <div className="entry-right">
                      <div className="entry-amount">{yen(e.amount)}</div>
                      <button className="del-btn" onClick={() => startEditExpense(e)} aria-label="編集">✎</button>
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

        {tab === 'budget' && (
          <>
            {carriedNotice && <div className="card" style={{ fontSize: 12, color: 'var(--good)' }}>{carriedNotice}</div>}

            <div className="card">
              <div className="section-title">収支サマリー（{monthLabelOf(monthOffset)}）</div>
              <div className="budget-summary-row"><span>収入合計</span><span><b>{yen(incomeTotal)}</b><DeltaTag value={deltaIncome} /></span></div>
              <div className="budget-summary-row"><span>支出合計（固定費＋変動費）</span><span><b>{yen(expenseTotal)}</b><DeltaTag value={deltaExpense} /></span></div>
              <div className="budget-summary-row total">
                <span>収支（収入 − 支出）＝手残り</span>
                <span><b className={balance < 0 ? 'neg' : ''}>{yen(balance)}</b><DeltaTag value={deltaBalance} /></span>
              </div>
              <div className="budget-summary-row muted"><span>参考：台帳の変動費実績（食費・外食費など）</span><span>{yen(totalSpent)}</span></div>
              <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.6 }}>
                固定費・変動費はカード請求額などから概算で手入力する想定です。翌月以降は前月の内容を自動で引き継ぐので、金額だけ調整してください。
              </p>
            </div>

            <div className="card">
              <div className="section-title">収入</div>
              {incomeItems.length === 0 && <div className="empty-state">まだ収入の記録がありません。</div>}
              {incomeItems.map((item) => editingBudgetItemId === item.id ? (
                <div className="manage-row" key={item.id}>
                  <input type="text" style={{ flex: 1 }} value={editBudgetItemDraft.label} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, label: ev.target.value })} />
                  <input type="number" style={{ width: 100 }} value={editBudgetItemDraft.amount} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, amount: ev.target.value })} />
                  <button className="manage-del" onClick={() => saveEditBudgetItem(item.id)} aria-label="保存">✓</button>
                  <button className="manage-del" onClick={cancelEditBudgetItem} aria-label="キャンセル">✕</button>
                </div>
              ) : (
                <div className="manage-row" key={item.id}>
                  <div className="manage-name">{item.label}</div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{yen(item.amount)}</div><DeltaTag value={deltaFor(item.amount, item.label, 'income')} /></div>
                  <button className="manage-del" onClick={() => startEditBudgetItem(item)} aria-label="編集">✎</button>
                  <button className="manage-del" onClick={() => deleteBudgetItem(item.id)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="text" placeholder="例）給与（自分）" value={newIncomeLabel} onChange={(e) => setNewIncomeLabel(e.target.value)} style={{ flex: 2 }} />
                <input type="number" placeholder="金額" value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => addBudgetItem('income')}>追加</button>
              </div>
            </div>

            <div className="card">
              <div className="section-title">支出</div>

              <div className="budget-subheading">固定費<span className="budget-subtotal">{yen(fixedTotal)}</span></div>
              {fixedItems.length === 0 && <div className="empty-state">まだ固定費の記録がありません。</div>}
              {fixedItems.map((item) => editingBudgetItemId === item.id ? (
                <div className="manage-row" key={item.id}>
                  <input type="text" style={{ flex: 1 }} value={editBudgetItemDraft.label} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, label: ev.target.value })} />
                  <input type="number" style={{ width: 100 }} value={editBudgetItemDraft.amount} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, amount: ev.target.value })} />
                  <button className="manage-del" onClick={() => saveEditBudgetItem(item.id)} aria-label="保存">✓</button>
                  <button className="manage-del" onClick={cancelEditBudgetItem} aria-label="キャンセル">✕</button>
                </div>
              ) : (
                <div className="manage-row" key={item.id}>
                  <div className="manage-name">{item.label}</div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{yen(item.amount)}</div><DeltaTag value={deltaFor(item.amount, item.label, 'fixed')} /></div>
                  <button className="manage-del" onClick={() => startEditBudgetItem(item)} aria-label="編集">✎</button>
                  <button className="manage-del" onClick={() => deleteBudgetItem(item.id)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="text" placeholder="例）家賃・保険" value={newFixedLabel} onChange={(e) => setNewFixedLabel(e.target.value)} style={{ flex: 2 }} />
                <input type="number" placeholder="金額" value={newFixedAmount} onChange={(e) => setNewFixedAmount(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => addBudgetItem('fixed')}>追加</button>
              </div>

              <div className="budget-subheading" style={{ marginTop: 16 }}>変動費<span className="budget-subtotal">{yen(variableTotal)}</span></div>
              {variableItems.length === 0 && <div className="empty-state">まだ変動費の記録がありません。</div>}
              {variableItems.map((item) => editingBudgetItemId === item.id ? (
                <div className="manage-row" key={item.id}>
                  <input type="text" style={{ flex: 1 }} value={editBudgetItemDraft.label} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, label: ev.target.value })} />
                  <input type="number" style={{ width: 100 }} value={editBudgetItemDraft.amount} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, amount: ev.target.value })} />
                  <button className="manage-del" onClick={() => saveEditBudgetItem(item.id)} aria-label="保存">✓</button>
                  <button className="manage-del" onClick={cancelEditBudgetItem} aria-label="キャンセル">✕</button>
                </div>
              ) : (
                <div className="manage-row" key={item.id}>
                  <div className="manage-name">{item.label}</div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{yen(item.amount)}</div><DeltaTag value={deltaFor(item.amount, item.label, 'variable')} /></div>
                  <button className="manage-del" onClick={() => startEditBudgetItem(item)} aria-label="編集">✎</button>
                  <button className="manage-del" onClick={() => deleteBudgetItem(item.id)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="text" placeholder="例）現金おろした分・カード引き落とし" value={newVariableLabel} onChange={(e) => setNewVariableLabel(e.target.value)} style={{ flex: 2 }} />
                <input type="number" placeholder="金額" value={newVariableAmount} onChange={(e) => setNewVariableAmount(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => addBudgetItem('variable')}>追加</button>
              </div>
            </div>

            <div className="card">
              <div className="section-title">資産（手残りの内訳）</div>
              {assetItems.length === 0 && <div className="empty-state">まだ資産の記録がありません。現金や各銀行口座の残高を入れてみてください。</div>}
              {assetItems.map((item) => editingBudgetItemId === item.id ? (
                <div className="manage-row" key={item.id}>
                  <input type="text" style={{ flex: 1 }} value={editBudgetItemDraft.label} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, label: ev.target.value })} />
                  <input type="number" style={{ width: 100 }} value={editBudgetItemDraft.amount} onChange={(ev) => setEditBudgetItemDraft({ ...editBudgetItemDraft, amount: ev.target.value })} />
                  <button className="manage-del" onClick={() => saveEditBudgetItem(item.id)} aria-label="保存">✓</button>
                  <button className="manage-del" onClick={cancelEditBudgetItem} aria-label="キャンセル">✕</button>
                </div>
              ) : (
                <div className="manage-row" key={item.id}>
                  <div className="manage-name">{item.label}</div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{yen(item.amount)}</div><DeltaTag value={deltaFor(item.amount, item.label, 'asset')} /></div>
                  <button className="manage-del" onClick={() => startEditBudgetItem(item)} aria-label="編集">✎</button>
                  <button className="manage-del" onClick={() => deleteBudgetItem(item.id)} aria-label="削除">✕</button>
                </div>
              ))}
              <div className="add-row">
                <input type="text" placeholder="例）現金・〇〇銀行" value={newAssetLabel} onChange={(e) => setNewAssetLabel(e.target.value)} style={{ flex: 2 }} />
                <input type="number" placeholder="金額" value={newAssetAmount} onChange={(e) => setNewAssetAmount(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => addBudgetItem('asset')}>追加</button>
              </div>
              <div className="total-row">
                <div className="label mincho">合計</div>
                <div className="value">{yen(assetTotal)}<DeltaTag value={deltaAsset} /></div>
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
                {categories.map((c) => (<div className="legend-item" key={c.name}><span className="legend-dot" style={{ background: c.color }} />{c.name}</div>))}
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
                  <input type="number" min="0" step="1000" value={budgetDraft[c.name] ?? 0} onChange={(e) => setBudgetDraft({ ...budgetDraft, [c.name]: Number(e.target.value) || 0 })} />
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
                PDF出力はブラウザの印刷機能を使っています。<br /><br />
                「収支」タブの固定費は、いずれカード請求額などと連動させる想定ですが、現在は手入力のみです。
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
              return (<tr key={c.name}><td>{c.name}</td><td>{yen(budgets[c.name] || 0)}</td><td>{yen(spent)}</td><td>{yen((budgets[c.name] || 0) - spent)}</td></tr>);
            })}
          </tbody>
        </table>
        <table className="print-table">
          <thead><tr><th>日付</th><th>カテゴリ</th><th>支払い方法</th><th>金額</th><th>入力者</th><th>店舗</th><th>メモ</th></tr></thead>
          <tbody>
            {printRows.map((e) => (
              <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.method}</td><td>{yen(e.amount)}</td><td>{e.who || ''}</td><td>{e.store || ''}</td><td>{e.memo || ''}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
