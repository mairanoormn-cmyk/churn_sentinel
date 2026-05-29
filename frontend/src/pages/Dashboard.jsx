import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

function getScoreClass(score) {
  if (score >= 8) return 'score-high';
  if (score >= 6) return 'score-med';
  return 'score-low';
}

function getSourceClass(src = '') {
  const s = src.toLowerCase();
  if (s.includes('reddit')) return 'src-reddit';
  if (s.includes('job') || s.includes('linkedin')) return 'src-job';
  if (s.includes('g2') || s.includes('capterra') || s.includes('trustpilot')) return 'src-g2';
  return 'src-default';
}

// ── Issue 1: VulnerabilityRadar — fallback 50 makes empty competitors look moderate
// Fixed: use 0 as fallback so radar is accurate
function VulnerabilityRadar({ competitor }) {
  if (!competitor) return null;
  const data = [
    { metric: 'Pricing',   value: competitor.pricing_score   || 0 },
    { metric: 'Support',   value: competitor.support_score   || 0 },
    { metric: 'Features',  value: competitor.feature_score   || 0 },
    { metric: 'Hiring',    value: competitor.hiring_score    || 0 },
    { metric: 'Sentiment', value: competitor.sentiment_score || 0 },
  ];
  return (
    <div className="radar-card">
      <div className="radar-header">
        <h4 className="radar-title">Vulnerability Radar — {competitor.name}</h4>
        <span className="radar-legend">Vulnerability Score Index</span>
      </div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={competitor.name} dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.22} />
            <Tooltip contentStyle={{ background: '#0d1526', borderColor: 'rgba(255,255,255,0.08)', color: '#f1f5f9', borderRadius: 8 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const { type, message, tool, query, url, count, urls, preview, chars, total_signals } = item;
  if (type === 'thinking') return (
    <div className="activity-item thinking">
      <span className="activity-icon-dot thinking-dot" />
      <span className="activity-text">{message}</span>
    </div>
  );
  if (type === 'tool_call') {
    if (tool === 'search_web') return (
      <div className="activity-item search">
        <span className="activity-icon-dot search-dot" />
        <span className="activity-text">search_web<span className="activity-arg">("{query}")</span></span>
      </div>
    );
    if (tool === 'scrape_url') return (
      <div className="activity-item scrape">
        <span className="activity-icon-dot scrape-dot" />
        <span className="activity-text">scrape_url<span className="activity-subtext">{url}</span></span>
      </div>
    );
  }
  if (type === 'search_result') return (
    <div className="activity-item result">
      <span className="activity-icon-dot result-dot" />
      <span className="activity-text">{count} results{urls?.[0] && <span className="activity-subtext">{urls[0]}</span>}</span>
    </div>
  );
  if (type === 'scrape_result') return (
    <div className="activity-item result">
      <span className="activity-icon-dot result-dot" />
      <span className="activity-text">{chars > 0 ? `${chars.toLocaleString()} chars scraped` : 'Scrape failed'}{preview && chars > 0 && <span className="activity-subtext">{preview.slice(0, 100)}…</span>}</span>
    </div>
  );
  if (type === 'signals_ready') return (
    <div className="activity-item signal">
      <span className="activity-icon-dot signal-dot" />
      <span className="activity-text">{total_signals ?? item.signals?.length ?? 0} intent signals extracted</span>
    </div>
  );
  if (type === 'complete') return (
    <div className="activity-item complete">
      <span className="activity-icon-dot complete-dot" />
      <span className="activity-text">Scan complete — {total_signals} opportunities found</span>
    </div>
  );
  if (type === 'error') return (
    <div className="activity-item error">
      <span className="activity-icon-dot error-dot" />
      <span className="activity-text">{message}</span>
    </div>
  );
  return null;
}

function Drawer({ signal, competitor, onClose, onPushed }) {
  const [battlecard, setBattlecard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(signal.is_pushed === 1);
  const [enriching, setEnriching] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [enrichError, setEnrichError] = useState(false);

  useEffect(() => {
    if (signal.battlecard) {
      try {
        const bc = typeof signal.battlecard === 'string' ? JSON.parse(signal.battlecard) : signal.battlecard;
        setBattlecard(bc);
      } catch (_) {}
    }
    setPushed(signal.is_pushed === 1);
  }, [signal]);

  const generate = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`${API}/api/battlecard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id:    signal.id,
          competitor,
          // Send inline signal data so backend works even with temp IDs
          company_name: signal.company_name,
          pain_point:   signal.pain_point,
          raw_text:     signal.raw_text,
          company_size: signal.company_size,
          industry:     signal.industry,
        }),
      });
      if (!res.ok) { setLoadError(true); return; }
      setBattlecard(await res.json());
    } catch (err) { console.error(err); setLoadError(true); } finally { setLoading(false); }
  };

  const push = async () => {
    setPushing(true);
    try {
      const res = await fetch(`${API}/api/push-crm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id:    signal.id,
          company_name: signal.company_name,
          pain_point:   signal.pain_point,
          raw_text:     signal.raw_text,
          source:       signal.source,
          intent_score: signal.intent_score,
        }),
      });
      const data = await res.json();
      if (data.success) { setPushed(true); onPushed(signal.id); }
    } catch (err) { console.error(err); } finally { setPushing(false); }
  };

  const enrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch(`${API}/api/enrich`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: signal.company_name, industry: signal.industry }),
      });
      const data = await res.json();
      if (data.success) setContacts(data.contacts);
    } catch (err) { console.error(err); } finally { setEnriching(false); }
  };

  return (
    <div className="drawer">
      <div className="drawer-header">
        <div>
          <div className="drawer-company">{signal.company_name}</div>
          <div className="drawer-meta">{signal.industry} · {signal.company_size} · Score {signal.intent_score}/10</div>
        </div>
        <button className="btn-close" onClick={onClose}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="drawer-body">
        <div>
          <div className="drawer-section-label">Source Signal</div>
          <div className="source-box">
            <strong style={{ color: 'var(--text-primary)' }}>{signal.source}</strong>
            {signal.source_url && <><br /><a href={signal.source_url} target="_blank" rel="noreferrer" className="source-url-link">{signal.source_url}</a></>}
            <br /><br />"{signal.raw_text}"
          </div>
        </div>
        <div>
          <div className="drawer-section-label">Pain Point</div>
          <div className="pain-tags"><span className="pain-tag">{signal.pain_point}</span></div>
        </div>
        {!battlecard ? (
          <div className="no-battlecard">
            <h4>No Battle Card yet</h4>
            <p>Generate a personalized outbound email and talking points powered by Claude Opus.</p>
            <button className="btn-generate" onClick={generate} disabled={loading}>
              {loading ? <><div className="spinner" style={{width:14,height:14,borderWidth:2}} /> Generating…</> : loadError ? 'Retry Generation' : 'Generate Battle Card'}
            </button>
          </div>
        ) : (
          <>
            <div><div className="drawer-section-label">Opportunity Summary</div><div className="source-box">{battlecard.summary}</div></div>
            {battlecard.talking_points?.length > 0 && (
              <div>
                <div className="drawer-section-label">GTM Talking Points</div>
                <div className="talking-points">
                  {battlecard.talking_points.map((pt, i) => (
                    <div key={i} className="talking-point"><div className="tp-bullet" /><span>{pt}</span></div>
                  ))}
                </div>
              </div>
            )}
            {battlecard.email_pitch && (
              <div>
                <div className="drawer-section-label">Outbound Email</div>
                <div className="email-box">
                  <div className="email-header-row"><span>Subject:</span><span className="email-subject">{battlecard.email_pitch.subject}</span></div>
                  <textarea className="email-body-ta" defaultValue={battlecard.email_pitch.body} rows={6} />
                </div>
              </div>
            )}
            <div className="drawer-actions">
              <button className={`btn-push ${pushed ? 'pushed' : ''}`} onClick={push} disabled={pushing || pushed}>
                {pushing ? 'Pushing…' : pushed ? 'Pushed to HubSpot' : 'Push to CRM'}
              </button>
              <button className="btn-enrich-sm" onClick={enrich} disabled={enriching || !!contacts}>
                {enriching ? <><div className="spinner" style={{width:12,height:12,borderWidth:2}} /> Enriching…</> : contacts ? 'Enriched' : 'Find Contacts'}
              </button>
            </div>
            {contacts && (
              <div>
                <div className="drawer-section-label" style={{display:'flex',alignItems:'center',gap:8}}>
                  Key Decision Makers
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'rgba(124,58,237,0.15)',color:'var(--purple-light)',fontWeight:500,letterSpacing:'0.03em'}}>
                    via Bright Data + Claude Opus
                  </span>
                </div>
                <div className="contacts-list">
                  {contacts.map((c, i) => {
                    const isSearchLink = c.email?.includes('Use ') || c.name?.includes('Search ');
                    return (
                      <div key={i} className="contact-card">
                        <div>
                          <div className="contact-name">{c.name}</div>
                          <div className="contact-title">{c.title}</div>
                          {isSearchLink
                            ? <div className="contact-email" style={{color:'var(--purple-light)',fontSize:11}}>{c.email}</div>
                            : <div className="contact-email">{c.email}</div>
                          }
                        </div>
                        <a href={c.linkedin} target="_blank" rel="noreferrer" className="btn-linkedin">
                          {isSearchLink ? 'Search' : 'LinkedIn'}
                        </a>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:8,lineHeight:1.5}}>
                  Sourced via Bright Data SERP. Verify before outreach.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ROIPanel({ signals }) {
  const highIntent = signals.filter(s => s.intent_score >= 7);
  const pipeline   = highIntent.length * 45000 * 0.23;
  const hoursSaved = signals.length * 8;
  const roi        = hoursSaved > 0 ? Math.round((pipeline / (hoursSaved * 75)) * 100) : 0;
  return (
    <div className="roi-panel">
      <div className="roi-stat"><span className="roi-value">${Math.round(pipeline).toLocaleString()}</span><span className="roi-label">Pipeline Generated</span></div>
      <div className="roi-stat"><span className="roi-value">{hoursSaved}h</span><span className="roi-label">Research Hours Saved</span></div>
      <div className="roi-stat"><span className="roi-value">{roi}%</span><span className="roi-label">ROI on Tool Cost</span></div>
      <div className="roi-stat"><span className="roi-value">{highIntent.length}</span><span className="roi-label">High-Intent Leads</span></div>
    </div>
  );
}

function LandingPanel({ onSearch, vulnData }) {
  const [value, setValue] = useState('');
  const [selectedComp, setSelectedComp] = useState(null);
  const EXAMPLES = ['Salesforce', 'HubSpot', 'SAP', 'Zendesk', 'Oracle', 'Pipedrive'];

  useEffect(() => {
    if (vulnData.length > 0 && !selectedComp) setSelectedComp(vulnData[0]);
  }, [vulnData]);

  const submit = (e) => { e.preventDefault(); if (value.trim()) onSearch(value.trim()); };

  return (
    <div className="dash-landing">
      <div className="dash-landing-hero">
        <h2 className="dash-landing-title">Competitor Intelligence Scanner</h2>
        <p className="dash-landing-sub">Enter a competitor name to begin a live scan across Reddit, G2, Glassdoor, LinkedIn, and Hacker News.</p>
        <form className="dash-search-form" onSubmit={submit}>
          <div className="dash-search-row">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:'var(--text-muted)',flexShrink:0}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input className="dash-search-input" placeholder="e.g. Salesforce, Zendesk, HubSpot" value={value} onChange={e => setValue(e.target.value)} autoFocus />
            <button className="btn-primary" type="submit" disabled={!value.trim()}>Run Scan</button>
          </div>
        </form>
        <div className="dash-examples">
          {EXAMPLES.map(ex => <button key={ex} className="example-chip" onClick={() => onSearch(ex)}>{ex}</button>)}
        </div>
      </div>

      {vulnData.length > 0 && (
        <div className="vuln-section">
          <div className="vuln-section-header">
            <div>
              <h3 className="vuln-section-title">Weekly Vulnerability Index</h3>
              <p className="vuln-section-sub">Aggregated open-web intent signals from the last 7 days</p>
            </div>
            <span className="vuln-updated">Updated: {new Date().toLocaleDateString('en-US', {month:'short', year:'numeric'})}</span>
          </div>
          <div className="vuln-layout">
            <div className="vuln-table-wrap">
              <table className="vuln-table">
                <thead><tr><th>Competitor</th><th>Vulnerability</th><th>Primary Trigger</th><th>Signals</th><th>Trend</th><th>Action</th></tr></thead>
                <tbody>
                  {vulnData.map(row => (
                    <tr key={row.name} className={`vuln-row ${selectedComp?.name === row.name ? 'active' : ''}`} onClick={() => setSelectedComp(row)}>
                      <td><span className="vuln-comp-name">{row.name}</span></td>
                      <td>
                        <div className="vuln-score-group">
                          <span className={`vuln-score level-${row.level?.toLowerCase()}`}>{row.score}%</span>
                          <div className="vuln-bar-bg"><div className={`vuln-bar-fill bg-${row.level?.toLowerCase()}`} style={{width:`${row.score}%`}} /></div>
                        </div>
                      </td>
                      <td><span className="vuln-trigger">{row.trigger}</span></td>
                      <td><span className="vuln-signals-count">{row.signals}</span></td>
                      <td><span className={`vuln-trend-${row.trend}`}>{row.trend === 'up' ? 'Rising' : row.trend === 'down' ? 'Declining' : 'Stable'}</span></td>
                      <td><button className="btn-table-scan" onClick={e => { e.stopPropagation(); onSearch(row.name); }}>Scan</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <VulnerabilityRadar competitor={selectedComp} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScanWorkspace({ competitor, onBack }) {
  const [activity, setActivity]   = useState([]);
  const [signals, setSignals]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [done, setDone]           = useState(false);
  const [stats, setStats]         = useState({ searches: 0, scrapes: 0, tool_calls: 0 });
  const [newQuery, setNewQuery]   = useState('');
  const [toast, setToast]         = useState(null);
  const feedRef  = useRef(null);
  const abortRef = useRef(null);
  const jobIdRef = useRef(null); // track current job_id for DB signal refresh

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [activity]);
  useEffect(() => { runScan(competitor); return () => { if (abortRef.current) abortRef.current.abort(); }; }, []);

  // After scan completes, fetch signals from DB to get real integer IDs
  // This replaces temp_N IDs with real DB IDs so battlecard/push-crm work
  useEffect(() => {
    if (done && jobIdRef.current) {
      // Small delay to ensure DB write is committed
      const timer = setTimeout(() => {
        fetch(`${API}/api/signals?job_id=${encodeURIComponent(jobIdRef.current)}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setSignals(data);
              // Also update selected signal if drawer is open
              setSelected(prev => {
                if (!prev) return null;
                const refreshed = data.find(s =>
                  s.company_name === prev.company_name &&
                  s.pain_point   === prev.pain_point
                );
                return refreshed || prev;
              });
            }
          })
          .catch(() => {});
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [done]);

  const runScan = async (comp) => {
    setScanning(true); setDone(false); setActivity([]); setSignals([]); setSelected(null);
    setStats({ searches: 0, scrapes: 0, tool_calls: 0 });
    jobIdRef.current = null;
    const ctrl = new AbortController(); abortRef.current = ctrl;
    let searches = 0, scrapes = 0, tools = 0;
    try {
      const res = await fetch(`${API}/api/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor: comp }), signal: ctrl.signal,
      });
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { value, done: sd } = await reader.read(); if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim(); if (!raw || raw === '[DONE]') continue;
          let event; try { event = JSON.parse(raw); } catch (_) { continue; }
          const t = event.type;
          if (t === 'stream_end' || t === 'done') { setScanning(false); setDone(true); continue; }
          if (t === 'job_created') { jobIdRef.current = event.job_id; continue; }
          if (t === 'tool_call') { tools++; if (event.tool === 'search_web') searches++; if (event.tool === 'scrape_url') scrapes++; setStats({ searches, scrapes, tool_calls: tools }); }
          if (t === 'signals_ready' && event.signals) setSignals(event.signals.map((s, i) => ({ ...s, id: s.id ?? `temp_${i + 1}` })));
          if (t === 'complete') { setScanning(false); setDone(true); }
          setActivity(prev => [...prev, event]);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setActivity(prev => [...prev, { type: 'error', message: String(err) }]);
    } finally { setScanning(false); setDone(true); }
  };

  const handleNewScan = (e) => { e.preventDefault(); if (newQuery.trim()) { runScan(newQuery.trim()); setNewQuery(''); } };
  const handlePushed  = (id) => { setSignals(prev => prev.map(s => s.id === id ? { ...s, is_pushed: 1 } : s)); showToast('Lead pushed to HubSpot CRM successfully.'); };

  return (
    <div className="workspace">
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}
      <div className="workspace-topbar">
        <button className="topbar-back" onClick={onBack}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Dashboard
        </button>
        <div className="topbar-target">
          <span className="topbar-target-label">Scanning</span>
          <span className="topbar-target-name">{competitor}</span>
        </div>
        <form className="topbar-search" onSubmit={handleNewScan}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:'var(--text-muted)',flexShrink:0}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input className="topbar-input" placeholder="Scan new competitor…" value={newQuery} onChange={e => setNewQuery(e.target.value)} disabled={scanning} />
          <button className="btn-scan" type="submit" disabled={scanning || !newQuery.trim()}>Scan</button>
        </form>
        <div className="stats-bar">
          <div className="stat-item"><span className="stat-value">{stats.searches}</span><span>searches</span></div>
          <div className="stat-item"><span className="stat-value">{stats.scrapes}</span><span>scraped</span></div>
          <div className="stat-item"><span className="stat-value">{stats.tool_calls}</span><span>tool calls</span></div>
        </div>
      </div>
      <div className={`progress-line ${scanning ? 'active' : ''}`}>{scanning && <div className="progress-line-fill" />}</div>
      <ROIPanel signals={signals} />
      <div className="workspace-body">
        <div className="activity-panel">
          <div className="panel-header">
            <div className="panel-header-title"><span className={`pulse-dot ${scanning ? '' : 'idle'}`} />Agent Activity</div>
            <span className="panel-header-meta">Target: <strong style={{color:'var(--purple-light)'}}>{competitor}</strong></span>
          </div>
          {activity.length === 0
            ? <div className="activity-empty"><div className="activity-empty-icon" /><div>Starting agent loop…</div></div>
            : <div className="activity-feed" ref={feedRef}>
                {activity.map((item, i) => <ActivityItem key={i} item={item} />)}
                {scanning && <div className="activity-item thinking"><div className="spinner" /><span>Agent working…</span></div>}
              </div>
          }
        </div>
        <div className="signals-panel">
          <div className="signals-header">
            <div className="signals-title">Intent Signals<span className="count-badge">{signals.length}</span></div>
            {signals.filter(s => s.intent_score >= 8).length > 0 && (
              <span className="high-intent-badge">{signals.filter(s => s.intent_score >= 8).length} high-intent</span>
            )}
          </div>
          <div className={`signals-inner ${selected ? 'drawer-open' : ''}`}>
            <div className="signals-table-wrap">
              {signals.length === 0
                ? <div className="signals-empty"><div className="signals-empty-icon" /><h3>{scanning ? 'Scanning open web…' : 'No signals yet'}</h3><p>{scanning ? 'Bright Data is scraping live sources for intent signals.' : 'Enter a competitor name and click Run Scan.'}</p></div>
                : signals.slice().sort((a, b) => b.intent_score - a.intent_score).map((sig, idx) => (
                    <div key={sig.id ?? idx} className={`signal-card ${selected?.id === sig.id ? 'active' : ''}`} onClick={() => setSelected(sig)}>
                      <div className={`score-badge ${getScoreClass(sig.intent_score)}`}>{sig.intent_score}</div>
                      <div className="signal-body">
                        <div className="signal-company">{sig.company_name}</div>
                        <div className="signal-meta">
                          <span className={`source-tag ${getSourceClass(sig.source)}`}>{sig.source}</span>
                          <span className="signal-industry">{sig.industry} · {sig.company_size}</span>
                        </div>
                        <div className="signal-pain">{sig.pain_point}</div>
                        {sig.raw_text && <div className="signal-snippet">"{sig.raw_text}"</div>}
                      </div>
                      <div className="signal-actions" onClick={e => e.stopPropagation()}>
                        <button className={`btn-review ${sig.is_pushed ? 'pushed' : ''}`} onClick={() => setSelected(sig)}>
                          {sig.is_pushed ? 'Pushed' : 'Review'}
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
            {selected && <Drawer key={selected.id} signal={selected} competitor={competitor} onClose={() => setSelected(null)} onPushed={handlePushed} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const location  = useLocation();
  const [view, setView]           = useState('landing');
  const [competitor, setCompetitor] = useState('');
  const [vulnData, setVulnData]   = useState([]);

  useEffect(() => {
    fetch(`${API}/api/competitor-stats`)
      .then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) setVulnData(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const comp = location.state?.competitor;
    if (comp) { setCompetitor(comp); setView('scan'); }
  }, [location.state]);

  const startScan = (comp) => { setCompetitor(comp); setView('scan'); };

  if (view === 'scan') return <ScanWorkspace competitor={competitor} onBack={() => setView('landing')} />;
  return <LandingPanel onSearch={startScan} vulnData={vulnData} />;
}
