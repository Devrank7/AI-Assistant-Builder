import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── Login Page ──
function loginPage() {
  return htmlResponse(/* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>AgentsTeam — Login</title>
<script src="/tg-webapp.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@property --border-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
:root {
  --bg-void: #07090f;
  --bg-surface: rgba(12, 17, 30, 0.6);
  --border: rgba(255,255,255,0.06);
  --border-hover: rgba(255,255,255,0.12);
  --cyan: #22d3ee;
  --blue: #60a5fa;
  --rose: #fb7185;
  --text-1: #f1f5f9;
  --text-2: #94a3b8;
  --text-3: #475569;
  --font-display: 'Sora', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --blur: 20px;
  --radius: 20px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 15px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-display);
  background: var(--bg-void);
  color: var(--text-1);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.orb {
  position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
}
.orb-1 {
  width: 340px; height: 340px;
  background: radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%);
  top: -100px; left: -80px;
  animation: drift 26s ease-in-out infinite;
}
.orb-2 {
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(167,139,250,0.11) 0%, transparent 70%);
  bottom: -50px; right: -90px;
  animation: drift 32s ease-in-out infinite reverse;
}
@keyframes drift {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(30px,50px) scale(1.05); }
}
.grid-bg {
  position: fixed; inset: 0; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}
.login-card {
  position: relative; z-index: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  padding: 40px 32px;
  width: 100%;
  max-width: 380px;
  margin: 16px;
  animation: card-in 0.6s cubic-bezier(0.22,1,0.36,1);
}
.login-card::before {
  content: '';
  position: absolute; top: 0; left: 20px; right: 20px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
}
/* Animated border */
.login-card::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: var(--radius);
  padding: 1px;
  background: conic-gradient(
    from var(--border-angle),
    transparent 30%, rgba(34,211,238,0.35) 38%,
    rgba(167,139,250,0.3) 42%, transparent 50%,
    transparent 80%, rgba(96,165,250,0.2) 88%, transparent 95%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: spin-border 8s linear infinite;
  pointer-events: none;
}
@keyframes spin-border { to { --border-angle: 360deg; } }
@keyframes card-in {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.logo {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--cyan), var(--blue));
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
  color: var(--bg-void);
  margin: 0 auto 20px;
  box-shadow: 0 0 20px rgba(34,211,238,0.3), 0 0 60px rgba(34,211,238,0.1);
}
h1 {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-bottom: 6px;
}
.subtitle {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 28px;
}
input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  color: var(--text-1);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  margin-bottom: 16px;
}
input:focus { border-color: var(--cyan); }
input::placeholder { color: var(--text-3); }
button {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(34,211,238,0.2);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(34,211,238,0.12), rgba(96,165,250,0.08));
  color: var(--text-1);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
button:hover {
  border-color: rgba(34,211,238,0.4);
  background: linear-gradient(135deg, rgba(34,211,238,0.18), rgba(96,165,250,0.14));
  box-shadow: 0 0 24px rgba(34,211,238,0.1);
}
button:active { transform: scale(0.98); }
.error-msg {
  color: var(--rose);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  text-align: center;
  margin-top: 12px;
  display: none;
}
</style>
</head>
<body>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="grid-bg"></div>
<div class="login-card">
  <div class="logo">A</div>
  <h1>AgentsTeam</h1>
  <div class="subtitle">Command Center</div>
  <form id="loginForm">
    <input type="password" id="tokenInput" placeholder="Admin token" autocomplete="off" autofocus>
    <button type="submit">Authenticate</button>
    <div class="error-msg" id="errorMsg"></div>
  </form>
</div>
<script>
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#07090f'); tg.setBackgroundColor('#07090f'); }

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = document.getElementById('tokenInput').value.trim();
  if (!token) return;
  const errEl = document.getElementById('errorMsg');
  errEl.style.display = 'none';
  try {
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.success) {
      window.location.reload();
    } else {
      errEl.textContent = data.error || 'Invalid token';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Connection error';
    errEl.style.display = 'block';
  }
});
</script>
</body>
</html>`);
}

// ── Dashboard Page ──
function dashboardPage() {
  return htmlResponse(/* html */ `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>AgentsTeam — Command Center</title>
<script src="/tg-webapp.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
:root {
  --bg-void: #07090f;
  --bg-surface: rgba(12, 17, 30, 0.6);
  --bg-surface-hover: rgba(18, 25, 45, 0.7);
  --bg-elevated: rgba(22, 30, 52, 0.5);
  --border: rgba(255,255,255,0.06);
  --border-hover: rgba(255,255,255,0.12);
  --cyan: #22d3ee;
  --violet: #a78bfa;
  --emerald: #34d399;
  --rose: #fb7185;
  --amber: #fbbf24;
  --blue: #60a5fa;
  --text-1: #f1f5f9;
  --text-2: #94a3b8;
  --text-3: #475569;
  --text-4: #1e293b;
  --font-display: 'Sora', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --font-body: 'DM Sans', sans-serif;
  --blur: 20px;
  --radius: 20px;
  --radius-sm: 14px;
  --radius-xs: 10px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 15px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body {
  font-family: var(--font-body);
  background: var(--bg-void);
  color: var(--text-1);
  min-height: 100vh;
  overflow-x: hidden;
}
.orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; will-change: transform; }
.orb-1 { width: 340px; height: 340px; background: radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%); top: -100px; left: -80px; animation: drift-1 26s ease-in-out infinite; }
.orb-2 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(167,139,250,0.11) 0%, transparent 70%); top: -50px; right: -90px; animation: drift-2 32s ease-in-out infinite; }
.orb-3 { width: 380px; height: 380px; background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%); bottom: 15%; left: -120px; animation: drift-3 28s ease-in-out infinite; }
.orb-4 { width: 220px; height: 220px; background: radial-gradient(circle, rgba(251,113,133,0.07) 0%, transparent 70%); bottom: 8%; right: -70px; animation: drift-4 24s ease-in-out infinite; }
@keyframes drift-1 { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(30px,50px) scale(1.05); } 50% { transform: translate(-20px,70px) scale(0.95); } 75% { transform: translate(50px,25px) scale(1.02); } }
@keyframes drift-2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-45px,35px) scale(1.08); } 66% { transform: translate(25px,-25px) scale(0.94); } }
@keyframes drift-3 { 0%,100% { transform: translate(0,0); } 25% { transform: translate(60px,-35px); } 50% { transform: translate(20px,40px); } 75% { transform: translate(-35px,45px); } }
@keyframes drift-4 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-45px,-35px) scale(1.1); } }
.grid-bg { position: fixed; inset: 0; z-index: 0; background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 28px 28px; pointer-events: none; }
.app { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 0 16px 120px; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 20px; }
.header-left { display: flex; align-items: center; gap: 14px; }
.logo { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--cyan), var(--blue)); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; font-family: var(--font-display); color: var(--bg-void); box-shadow: 0 0 20px rgba(34,211,238,0.3), 0 0 60px rgba(34,211,238,0.1); position: relative; }
.logo::after { content: ''; position: absolute; inset: -2px; border-radius: 14px; background: linear-gradient(135deg, var(--cyan), var(--blue)); z-index: -1; opacity: 0.4; filter: blur(8px); }
.header-info h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; letter-spacing: -0.03em; line-height: 1.2; }
.header-info span { font-family: var(--font-mono); font-size: 0.6rem; font-weight: 400; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.14em; }
.status-pill { display: flex; align-items: center; gap: 7px; padding: 7px 16px; border-radius: 100px; background: var(--bg-surface); border: 1px solid var(--border); backdrop-filter: blur(var(--blur)); -webkit-backdrop-filter: blur(var(--blur)); font-family: var(--font-mono); font-size: 0.65rem; font-weight: 500; color: var(--text-2); letter-spacing: 0.04em; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); position: relative; }
.status-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: inherit; opacity: 0.4; animation: pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.status-dot.offline { background: var(--text-3); }
.status-dot.offline::after { animation: none; }
@keyframes pulse-ring { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.8); opacity: 0; } }
.glass { position: relative; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); backdrop-filter: blur(var(--blur)); -webkit-backdrop-filter: blur(var(--blur)); padding: 22px; margin-bottom: 14px; transition: background 0.3s, border-color 0.3s, transform 0.25s, box-shadow 0.3s; }
.glass::before { content: ''; position: absolute; top: 0; left: 20px; right: 20px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); border-radius: 1px; }
.glass:hover { background: var(--bg-surface-hover); border-color: var(--border-hover); }
.section-label { font-family: var(--font-mono); font-size: 0.6rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-3); margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
.section-label svg { opacity: 0.5; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.stat-card { position: relative; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm); backdrop-filter: blur(var(--blur)); -webkit-backdrop-filter: blur(var(--blur)); padding: 20px 16px 16px; text-align: center; overflow: hidden; transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s, border-color 0.3s; }
.stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 10%, var(--accent, var(--cyan)) 50%, transparent 90%); opacity: 0.5; }
.stat-card::after { content: ''; position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 80px; height: 60px; background: radial-gradient(ellipse, var(--accent, var(--cyan)), transparent 70%); opacity: 0.06; pointer-events: none; }
.stat-card:hover { transform: translateY(-3px); border-color: var(--border-hover); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.stat-value { font-family: var(--font-mono); font-weight: 600; font-size: 2rem; letter-spacing: -0.04em; line-height: 1; margin-bottom: 6px; }
.stat-value.v-cyan { color: var(--cyan); text-shadow: 0 0 40px rgba(34,211,238,0.25); }
.stat-value.v-emerald { color: var(--emerald); text-shadow: 0 0 40px rgba(52,211,153,0.25); }
.stat-value.v-violet { color: var(--violet); text-shadow: 0 0 40px rgba(167,139,250,0.25); }
.stat-value.v-rose { color: var(--rose); text-shadow: 0 0 40px rgba(251,113,133,0.25); }
.stat-value.v-dim { color: var(--text-3); text-shadow: none; }
.stat-label { font-family: var(--font-display); font-size: 0.62rem; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.1em; }
.glass.featured { border: none; background: var(--bg-surface); }
.glass.featured::after { content: ''; position: absolute; inset: 0; border-radius: var(--radius); padding: 1px; background: conic-gradient(from var(--border-angle), transparent 30%, rgba(34,211,238,0.35) 38%, rgba(167,139,250,0.3) 42%, transparent 50%, transparent 80%, rgba(96,165,250,0.2) 88%, transparent 95%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: spin-border 8s linear infinite; pointer-events: none; }
.glass.featured > .card-glow { position: absolute; inset: 8px; border-radius: var(--radius); background: linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.04)); filter: blur(24px); z-index: -1; pointer-events: none; }
@keyframes spin-border { to { --border-angle: 360deg; } }
.pipeline { position: relative; padding: 8px 0 0; }
.pipeline-track { position: absolute; top: 14px; left: 20px; right: 20px; height: 2px; background: rgba(255,255,255,0.05); border-radius: 1px; }
.pipeline-fill { position: absolute; top: 0; left: 0; height: 100%; border-radius: 1px; background: linear-gradient(90deg, var(--cyan), var(--violet)); transition: width 0.8s cubic-bezier(0.22,1,0.36,1); width: 0%; box-shadow: 0 0 12px rgba(34,211,238,0.3); }
.pipeline-nodes { display: flex; justify-content: space-between; position: relative; }
.pipeline-node { display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; }
.node-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-4); border: 2px solid rgba(255,255,255,0.08); transition: all 0.4s; position: relative; }
.pipeline-node.active .node-dot { background: var(--cyan); border-color: var(--cyan); box-shadow: 0 0 14px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.15); }
.pipeline-node.active .node-dot::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid rgba(34,211,238,0.3); animation: node-pulse 2s ease-out infinite; }
.pipeline-node.done .node-dot { background: var(--emerald); border-color: var(--emerald); box-shadow: 0 0 10px rgba(52,211,153,0.3); }
@keyframes node-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
.node-label { font-family: var(--font-mono); font-size: 0.55rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-3); transition: color 0.3s; }
.pipeline-node.active .node-label { color: var(--cyan); }
.pipeline-node.done .node-label { color: var(--text-2); }
.session-row { display: flex; justify-content: space-between; margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.04); }
.session-item { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-3); letter-spacing: 0.02em; }
.session-item b { color: var(--text-2); font-weight: 500; }
.tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.02); border-radius: var(--radius-xs); padding: 3px; margin-bottom: 16px; }
.tab { flex: 1; padding: 8px 0; text-align: center; font-family: var(--font-mono); font-size: 0.62rem; font-weight: 500; color: var(--text-3); border-radius: 8px; cursor: pointer; transition: all 0.25s; border: none; background: none; letter-spacing: 0.06em; text-transform: uppercase; }
.tab.active { background: rgba(255,255,255,0.06); color: var(--text-1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.tab:not(.active):hover { color: var(--text-2); }
.feed-list { list-style: none; }
.feed-item { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.03); animation: item-in 0.35s cubic-bezier(0.22,1,0.36,1) backwards; }
.feed-item:last-child { border-bottom: none; }
.feed-item:nth-child(1) { animation-delay: 0s; }
.feed-item:nth-child(2) { animation-delay: 0.04s; }
.feed-item:nth-child(3) { animation-delay: 0.08s; }
.feed-item:nth-child(4) { animation-delay: 0.12s; }
.feed-item:nth-child(5) { animation-delay: 0.16s; }
@keyframes item-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
.feed-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.feed-icon.success { background: rgba(52,211,153,0.1); color: var(--emerald); box-shadow: inset 0 0 12px rgba(52,211,153,0.05); }
.feed-icon.error { background: rgba(251,113,133,0.1); color: var(--rose); box-shadow: inset 0 0 12px rgba(251,113,133,0.05); }
.feed-icon.info { background: rgba(96,165,250,0.1); color: var(--blue); box-shadow: inset 0 0 12px rgba(96,165,250,0.05); }
.feed-icon.warning { background: rgba(251,191,36,0.1); color: var(--amber); box-shadow: inset 0 0 12px rgba(251,191,36,0.05); }
.feed-body { flex: 1; min-width: 0; }
.feed-action { font-family: var(--font-display); font-size: 0.82rem; font-weight: 500; color: var(--text-1); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-meta { font-family: var(--font-mono); font-size: 0.58rem; color: var(--text-3); margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; letter-spacing: 0.02em; }
.feed-type { display: inline-block; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--text-2); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.52rem; }
.feed-dot { width: 2px; height: 2px; border-radius: 50%; background: var(--text-3); flex-shrink: 0; }
.quick-actions { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; padding: 14px 16px; padding-bottom: max(14px, env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--bg-void) 50%, transparent); }
.actions-row { max-width: 480px; margin: 0 auto; display: flex; gap: 8px; }
.act-btn { flex: 1; padding: 12px 6px; border: 1px solid var(--border); border-radius: var(--radius-xs); background: var(--bg-surface); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: var(--text-2); font-family: var(--font-display); font-size: 0.64rem; font-weight: 500; cursor: pointer; transition: all 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; letter-spacing: 0.01em; }
.act-btn:active { transform: scale(0.95); }
.act-btn:hover { background: var(--bg-surface-hover); border-color: var(--border-hover); color: var(--text-1); }
.act-btn svg { width: 18px; height: 18px; opacity: 0.7; transition: opacity 0.2s; }
.act-btn:hover svg { opacity: 1; }
.act-btn.primary { border-color: rgba(34,211,238,0.2); background: linear-gradient(135deg, rgba(34,211,238,0.08), rgba(96,165,250,0.06)); color: var(--text-1); }
.act-btn.primary svg { opacity: 0.9; color: var(--cyan); }
.act-btn.primary:hover { border-color: rgba(34,211,238,0.35); background: linear-gradient(135deg, rgba(34,211,238,0.14), rgba(96,165,250,0.10)); box-shadow: 0 0 24px rgba(34,211,238,0.1); }
.empty-state { text-align: center; padding: 32px 20px; color: var(--text-3); font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.02em; }
.empty-state svg { margin-bottom: 10px; opacity: 0.25; }
.app { animation: page-in 0.6s cubic-bezier(0.22,1,0.36,1); }
@keyframes page-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.reveal { animation: card-in 0.55s cubic-bezier(0.22,1,0.36,1) backwards; }
.reveal:nth-child(2) { animation-delay: 0.06s; }
.reveal:nth-child(3) { animation-delay: 0.12s; }
.reveal:nth-child(4) { animation-delay: 0.18s; }
.reveal:nth-child(5) { animation-delay: 0.24s; }
@keyframes card-in { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
</style>
</head>
<body>
<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="orb orb-3"></div>
<div class="orb orb-4"></div>
<div class="grid-bg"></div>
<div class="app">
  <header class="header reveal">
    <div class="header-left">
      <div class="logo">A</div>
      <div class="header-info">
        <h1>AgentsTeam</h1>
        <span>Command Center</span>
      </div>
    </div>
    <div class="status-pill">
      <span class="status-dot" id="statusDot"></span>
      <span id="statusText">Connecting</span>
    </div>
  </header>
  <div class="stats-grid reveal">
    <div class="stat-card" style="--accent: var(--cyan)">
      <div class="stat-value v-cyan" id="statOps">&mdash;</div>
      <div class="stat-label">Operations</div>
    </div>
    <div class="stat-card" style="--accent: var(--emerald)">
      <div class="stat-value v-emerald" id="statLeads">&mdash;</div>
      <div class="stat-label">Leads Found</div>
    </div>
    <div class="stat-card" style="--accent: var(--violet)">
      <div class="stat-value v-violet" id="statMessages">&mdash;</div>
      <div class="stat-label">Messages Sent</div>
    </div>
    <div class="stat-card" style="--accent: var(--rose)">
      <div class="stat-value v-dim" id="statErrors">&mdash;</div>
      <div class="stat-label">Errors 24h</div>
    </div>
  </div>
  <div class="glass featured reveal" id="pipelineCard">
    <div class="card-glow"></div>
    <div class="section-label">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Pipeline
    </div>
    <div class="pipeline">
      <div class="pipeline-track"><div class="pipeline-fill" id="pipelineFill"></div></div>
      <div class="pipeline-nodes">
        <div class="pipeline-node idle" id="nodeLeads"><div class="node-dot"></div><span class="node-label">Leads</span></div>
        <div class="pipeline-node idle" id="nodeWidgets"><div class="node-dot"></div><span class="node-label">Widgets</span></div>
        <div class="pipeline-node idle" id="nodeMessages"><div class="node-dot"></div><span class="node-label">Messages</span></div>
        <div class="pipeline-node idle" id="nodeOutreach"><div class="node-dot"></div><span class="node-label">Outreach</span></div>
      </div>
    </div>
    <div class="session-row">
      <div class="session-item">Session <b id="sessionId">None</b></div>
      <div class="session-item">Last <b id="lastActivity">&mdash;</b></div>
    </div>
  </div>
  <div class="glass reveal">
    <div class="section-label">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      Activity
    </div>
    <div class="tabs">
      <button class="tab active" data-filter="all">All</button>
      <button class="tab" data-filter="leads">Leads</button>
      <button class="tab" data-filter="outreach">Outreach</button>
      <button class="tab" data-filter="error">Errors</button>
    </div>
    <ul class="feed-list" id="feedList">
      <li class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m2 7 10 5 10-5"/></svg>
        <div>No activity yet</div>
      </li>
    </ul>
  </div>
</div>
<div class="quick-actions">
  <div class="actions-row">
    <button class="act-btn primary" onclick="sendCommand('/leads')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      Find Leads
    </button>
    <button class="act-btn" onclick="sendCommand('/outreach')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
      Outreach
    </button>
    <button class="act-btn" onclick="sendCommand('/status')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
      Status
    </button>
    <button class="act-btn" onclick="refreshData()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
      Refresh
    </button>
  </div>
</div>
<script>
const tg = window.Telegram?.WebApp;
let currentFilter = 'all';
let refreshTimer = null;

const FEED_ICONS = {
  success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
};

document.addEventListener('DOMContentLoaded', () => {
  if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#07090f'); tg.setBackgroundColor('#07090f'); }
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      loadFeed();
    });
  });
  refreshData();
  refreshTimer = setInterval(refreshData, 15000);
});

async function fetchJSON(path) {
  try {
    const res = await fetch(path, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('API error: ' + path, err);
    return null;
  }
}

async function refreshData() {
  await Promise.all([loadStats(), loadFeed(), loadStatus()]);
}

async function loadStats() {
  const data = await fetchJSON('/api/mini-app/stats');
  if (!data) return;
  animateValue('statOps', data.total_operations || 0);
  animateValue('statLeads', data.by_type?.leads || 0);
  animateValue('statMessages', (data.by_type?.messages || 0) + (data.by_type?.outreach || 0));
  const errs = data.errors_last_24h || 0;
  const errEl = document.getElementById('statErrors');
  animateValue('statErrors', errs);
  errEl.className = errs > 0 ? 'stat-value v-rose' : 'stat-value v-dim';
  if (data.last_activity) {
    document.getElementById('lastActivity').textContent = timeAgo(data.last_activity);
  }
}

function animateValue(id, target) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const diff = target - current;
  const steps = Math.min(Math.abs(diff), 20);
  const stepTime = 300 / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const eased = 1 - Math.pow(1 - step / steps, 3);
    el.textContent = Math.round(current + diff * eased);
    if (step >= steps) { el.textContent = target; clearInterval(timer); }
  }, stepTime);
}

async function loadStatus() {
  const data = await fetchJSON('/api/mini-app/status');
  if (!data) { setStatus('offline'); return; }
  setStatus(data.orchestrator_running ? 'online' : 'standby');
  const sid = data.session_id;
  document.getElementById('sessionId').textContent = sid ? sid.substring(0, 10) + '...' : 'None';
  updatePipeline(data.active_stages || {});
}

function setStatus(state) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className = 'status-dot';
  if (state === 'online') { text.textContent = 'Online'; dot.style.background = 'var(--emerald)'; }
  else if (state === 'standby') { text.textContent = 'Standby'; dot.style.background = 'var(--amber)'; }
  else { text.textContent = 'Offline'; dot.classList.add('offline'); dot.style.background = ''; }
}

function updatePipeline(stages) {
  const names = ['leads', 'widgets', 'messages', 'outreach'];
  let lastCompleted = -1;
  names.forEach((name, i) => {
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    const node = document.getElementById('node' + cap);
    const val = stages[name] || 0;
    node.className = 'pipeline-node';
    if (val >= 100) { node.classList.add('done'); lastCompleted = i; }
    else if (val > 0) { node.classList.add('active'); if (i > lastCompleted) lastCompleted = i; }
    else { node.classList.add('idle'); }
  });
  const fill = document.getElementById('pipelineFill');
  if (lastCompleted >= 0) { fill.style.width = Math.min(((lastCompleted + 0.5) / names.length) * 100, 100) + '%'; }
  else { fill.style.width = '0%'; }
}

async function loadFeed() {
  const params = new URLSearchParams({ limit: '30' });
  if (currentFilter === 'error') params.set('status', 'error');
  else if (currentFilter !== 'all') params.set('type', currentFilter);
  const data = await fetchJSON('/api/mini-app/feed?' + params);
  const list = document.getElementById('feedList');
  if (!data || !data.entries || data.entries.length === 0) {
    list.innerHTML = '<li class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m2 7 10 5 10-5"/></svg><div>No activity yet</div></li>';
    return;
  }
  list.innerHTML = data.entries.map(entry => {
    const st = FEED_ICONS[entry.status] ? entry.status : 'info';
    const icon = FEED_ICONS[st];
    const ago = timeAgo(entry.timestamp);
    const details = entry.details || {};
    const parts = Object.entries(details).slice(0, 3).map(([k, v]) => escHtml(k + ': ' + v));
    return '<li class="feed-item"><div class="feed-icon ' + st + '">' + icon + '</div><div class="feed-body"><div class="feed-action">' + escHtml(entry.action) + '</div><div class="feed-meta"><span class="feed-type">' + escHtml(entry.type) + '</span><span class="feed-dot"></span><span>' + ago + '</span>' + (parts.length ? '<span class="feed-dot"></span><span>' + parts.join(' \\u00b7 ') + '</span>' : '') + '</div></div></li>';
  }).join('');
}

function sendCommand(cmd) {
  if (tg) { tg.sendData(JSON.stringify({ command: cmd })); tg.close(); }
  else { console.log('Command: ' + cmd); }
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
</script>
</body>
</html>`);
}

// ── Route Handler ──
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return loginPage();
  }
  return dashboardPage();
}
