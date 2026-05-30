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

// Progress node visualization component
function ProgressNode({ label, status, score }) {
  // status: 'active' | 'complete' | 'pending' | 'error'
  return (
    <div className={`progress-node ${status}`}>
      <div className="progress-node-circle">
        {status === 'complete' && (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'active' && <div className="progress-node-pulse" />}
        {status === 'error' && (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div className="progress-node-label">
        {label}
        {score && <span className="progress-node-score">{score}</span>}
      </div>
    </div>
  );
}

// Process pipeline stages with timing control
const PIPELINE_STAGES = [
  { key: 'init', label: 'Initialize', keywords: ['initializing', 'starting', 'beginning', 'competitive scan'] },
  { key: 'connect', label: 'Connect MCP', keywords: ['connecting', 'bright data', 'mcp server', 'sse transport'] },
  { key: 'search', label: 'Search Web', keywords: ['search_web', 'searching', 'query', 'serp'] },
  { key: 'scrape', label: 'Scrape Data', keywords: ['scrape_url', 'scraping', 'extracting', 'web unlocker'] },
  { key: 'analyze', label: 'Analyze Signals', keywords: ['mcp signal:', 'analyzing', 'processing', 'signals_ready', 'intent score'] },
  { key: 'complete', label: 'Complete', keywords: ['mcp path complete', 'complete', 'done', 'finished', 'signals extracted'] }
];

function ScanProgressCard({ activity, scanning, competitor }) {
  const [visibleStage, setVisibleStage] = useState(0);
  const [stageScores, setStageScores] = useState({});
  const transitionTimerRef = useRef(null);
  const lastProcessedActivityLength = useRef(0);
  
  // Determine actual current stage based on activity - ENHANCED with better keyword matching
  const getCurrentStage = () => {
    if (!activity || activity.length === 0) return 0;
    
    // Build comprehensive text from all activity fields
    const activityText = activity.map(a => {
      const parts = [
        a.type || '',
        a.message || '',
        a.tool || '',
        a.query || '',
        a.url || '',
        a.text || ''
      ];
      return parts.join(' ');
    }).join(' ').toLowerCase();
    
    // Check from highest stage to lowest (most specific to least specific)
    for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
      const stage = PIPELINE_STAGES[i];
      const matched = stage.keywords.some(kw => activityText.includes(kw.toLowerCase()));
      if (matched) {
        return i;
      }
    }
    return 0;
  };
  
  const currentStage = getCurrentStage();
  const hasError = activity.some(a => a.type === 'error');
  
  // Extract numeric scores from activity logs for display
  useEffect(() => {
    const newScores = {};
    activity.forEach(item => {
      if (item.type === 'search_result' && item.count) {
        newScores.search = item.count;
      }
      if (item.type === 'scrape_result' && item.chars) {
        newScores.scrape = Math.round(item.chars / 1000) + 'k';
      }
      if (item.type === 'signals_ready' && item.total_signals) {
        newScores.analyze = item.total_signals;
      }
    });
    setStageScores(newScores);
  }, [activity]);
  
  // CRITICAL FIX: Log-driven sequential progression with guaranteed synchronization
  useEffect(() => {
    // Only process if we have new activity
    if (activity.length === lastProcessedActivityLength.current) {
      return;
    }
    lastProcessedActivityLength.current = activity.length;
    
    // If scan is complete (!scanning) and we're behind, instantly catch up
    if (!scanning && currentStage > visibleStage) {
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      setVisibleStage(currentStage);
      return;
    }
    
    // During scanning: Advance immediately if backend has progressed
    if (scanning && currentStage > visibleStage) {
      // Clear any existing timer
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      
      // Calculate how many stages we need to advance
      const stagesToAdvance = currentStage - visibleStage;
      
      if (stagesToAdvance === 1) {
        // Single stage advance - smooth transition
        setTimeout(() => setVisibleStage(currentStage), 300);
      } else {
        // Multiple stages behind - use interval for sequential animation
        let currentVisibleStage = visibleStage;
        transitionTimerRef.current = setInterval(() => {
          currentVisibleStage++;
          setVisibleStage(currentVisibleStage);
          
          // Stop when caught up
          if (currentVisibleStage >= currentStage) {
            if (transitionTimerRef.current) {
              clearInterval(transitionTimerRef.current);
              transitionTimerRef.current = null;
            }
          }
        }, 600); // 600ms between each stage for smooth sequential flow
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [activity.length, currentStage, scanning, visibleStage]);
  
  // Reset on new scan
  useEffect(() => {
    if (scanning && activity.length === 0) {
      setVisibleStage(0);
      setStageScores({});
      lastProcessedActivityLength.current = 0;
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    }
  }, [scanning, activity.length]);
  
  return (
    <div className="scan-progress-card">
      <div className="scan-progress-header">
        <div className="scan-progress-title">
          <span className={`scan-status-dot ${scanning ? 'active' : 'idle'}`} />
          Competitive Intelligence Scan
        </div>
        <div className="scan-progress-target">Target: <strong>{competitor}</strong></div>
      </div>
      
      <div className="scan-progress-pipeline">
        {PIPELINE_STAGES.map((stage, idx) => {
          let status = 'pending';
          if (hasError && idx === visibleStage) {
            status = 'error';
          } else if (idx < visibleStage) {
            status = 'complete';
          } else if (idx === visibleStage && scanning) {
            status = 'active';
          } else if (idx === visibleStage && !scanning) {
            status = 'complete';
          }
          
          // Get score for this stage if available
          let scoreLabel = null;
          if (stage.key === 'search' && stageScores.search) {
            scoreLabel = `${stageScores.search} results`;
          } else if (stage.key === 'scrape' && stageScores.scrape) {
            scoreLabel = `${stageScores.scrape} chars`;
          } else if (stage.key === 'analyze' && stageScores.analyze) {
            scoreLabel = `${stageScores.analyze} signals`;
          }
          
          return (
            <div key={stage.key} className="pipeline-step">
              <ProgressNode label={stage.label} status={status} score={scoreLabel} />
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className={`pipeline-connector ${idx < visibleStage ? 'active' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="scan-progress-details">
        <div className="scan-progress-log">
          {activity.slice(-5).map((item, idx) => (
            <ActivityLogItem key={idx} item={item} />
          ))}
          {scanning && activity.length > 0 && (
            <div className="scan-progress-working">
              <div className="spinner-sm" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityLogItem({ item }) {
  const { type, message, tool, query, url, count, chars, total_signals } = item;
  
  let icon = '•';
  let text = message || '';
  
  if (type === 'thinking') {
    icon = '🔄';
    text = message;
  } else if (type === 'tool_call') {
    if (tool === 'search_web') {
      icon = '🔍';
      text = `Searching: "${query}"`;
    } else if (tool === 'scrape_url') {
      icon = '📄';
      text = `Scraping: ${url?.split('/')[2] || 'source'}`;
    }
  } else if (type === 'search_result') {
    icon = '✓';
    text = `Found ${count} results`;
  } else if (type === 'scrape_result') {
    icon = '✓';
    text = chars > 0 ? `Scraped ${chars.toLocaleString()} chars` : 'Scrape failed';
  } else if (type === 'signals_ready') {
    icon = '⚡';
    text = `Extracted ${total_signals ?? item.signals?.length ?? 0} signals`;
  } else if (type === 'complete') {
    icon = '✅';
    text = `Complete — ${total_signals} opportunities found`;
  } else if (type === 'error') {
    icon = '❌';
    text = message;
  }
  
  return (
    <div className={`activity-log-item ${type}`}>
      <span className="activity-log-icon">{icon}</span>
      <span className="activity-log-text">{text}</span>
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
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'complete'
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const feedRef  = useRef(null);
  const abortRef = useRef(null);
  const jobIdRef = useRef(null); // track current job_id for DB signal refresh

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [activity]);
  useEffect(() => { runScan(competitor); return () => { if (abortRef.current) abortRef.current.abort(); }; }, []);

  // Handle scan state transitions
  useEffect(() => {
    if (scanning && scanState !== 'scanning') {
      setScanState('scanning');
      setActivityExpanded(false);
      setShowCompletion(false);
    }
    if (done && !scanning && signals.length > 0 && scanState !== 'complete') {
      // Brief delay for completion animation
      setTimeout(() => {
        setScanState('complete');
        setShowCompletion(true);
        // Hide completion badge after 3 seconds
        setTimeout(() => setShowCompletion(false), 3000);
      }, 300);
    }
  }, [scanning, done, signals.length, scanState]);

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
    setScanState('scanning');
    setActivityExpanded(false);
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

  const highIntentCount = signals.filter(s => s.intent_score >= 8).length;

  return (
    <div className="workspace">
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}
      
      {/* Completion celebration overlay */}
      {showCompletion && (
        <div className="completion-overlay">
          <div className="completion-badge">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Scan Complete — {signals.length} opportunities found</span>
          </div>
        </div>
      )}

      <div className="workspace-topbar">
        <button className="topbar-back" onClick={onBack}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Dashboard
        </button>
        <div className="topbar-target">
          <span className="topbar-target-label">{scanState === 'scanning' ? 'SCANNING' : scanState === 'complete' ? 'COMPLETE' : 'TARGET'}</span>
          <span className="topbar-target-name">{competitor}</span>
        </div>
        <form className="topbar-search" onSubmit={handleNewScan}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color:'var(--text-muted)',flexShrink:0}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input className="topbar-input" placeholder="Scan new competitor…" value={newQuery} onChange={e => setNewQuery(e.target.value)} disabled={scanning} />
          <button className="btn-scan" type="submit" disabled={scanning || !newQuery.trim()}>Scan</button>
        </form>
        
        {/* Only show stats in complete state - removed from scanning */}
        {scanState === 'complete' && (
          <div className="stats-bar complete">
            <div className="stat-item"><span className="stat-value">{signals.length}</span><span>signals</span></div>
            {highIntentCount > 0 && <div className="stat-item highlight"><span className="stat-value">{highIntentCount}</span><span>high-intent</span></div>}
          </div>
        )}
      </div>
      <div className={`progress-line ${scanning ? 'active' : ''}`}>{scanning && <div className="progress-line-fill" />}</div>
      
      {/* ROI Panel - only show when complete */}
      {scanState === 'complete' && <ROIPanel signals={signals} />}
      
      <div className={`workspace-body ${scanState}`}>
        {/* Scanning state: Show centered progress card */}
        {scanState === 'scanning' && (
          <div className="scan-progress-container">
            <ScanProgressCard 
              activity={activity} 
              scanning={scanning} 
              competitor={competitor}
            />
          </div>
        )}
        
        {/* Activity panel - only for complete state (collapsed) */}
        {scanState === 'complete' && (
          <div className={`activity-panel collapsed`}>
            <div className="panel-header" onClick={() => setActivityExpanded(!activityExpanded)}>
              <div className="panel-header-title">
                <span className={`pulse-dot idle`} />
                Activity Log
              </div>
              <button className="expand-toggle">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{transform: activityExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {activityExpanded && (
              <>
                {activity.length === 0
                  ? <div className="activity-empty"><div className="activity-empty-icon" /><div>No activity recorded</div></div>
                  : <div className="activity-feed" ref={feedRef}>
                      {activity.map((item, i) => <ActivityItem key={i} item={item} />)}
                    </div>
                }
              </>
            )}
          </div>
        )}
        
        {/* Signals panel - hidden during scan, prominent when complete */}
        {scanState === 'complete' && (
          <div className="results-container">
            <div className="results-card">
              <div className="results-card-header">
                <div className="results-card-title">
                  Intent Signals
                  <span className="results-count-badge">{signals.length}</span>
                </div>
                {highIntentCount > 0 && (
                  <span className="results-high-intent-badge">{highIntentCount} high-intent</span>
                )}
              </div>
              
              <div className={`results-card-body ${selected ? 'drawer-open' : ''}`}>
                <div className="results-signals-scroll">
                  {signals.length === 0
                    ? <div className="signals-empty"><div className="signals-empty-icon" /><h3>No signals found</h3><p>Try scanning a different competitor.</p></div>
                    : signals.slice().sort((a, b) => b.intent_score - a.intent_score).map((sig, idx) => (
                        <div key={sig.id ?? idx} className={`signal-card ${selected?.id === sig.id ? 'active' : ''}`} onClick={() => setSelected(sig)} style={{animationDelay: `${idx * 50}ms`}}>
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
        )}
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
