import React, { useState, useRef, useEffect } from 'react';
import { CAT_ICONS, CAT_COLORS, PROVINCES } from './data.js';

// re-export DISTRICT_PROVINCE_MAP for chatbot
const DIST_MAP = {
  'Kathmandu':'Bagmati','Lalitpur':'Bagmati','Bhaktapur':'Bagmati','Chitwan':'Bagmati',
  'Pokhara':'Gandaki','Kaski':'Gandaki',
  'Biratnagar':'Province No. 1','Morang':'Province No. 1','Jhapa':'Province No. 1',
  'Janakpur':'Madhesh','Birgunj':'Madhesh','Parsa':'Madhesh',
  'Butwal':'Lumbini','Rupandehi':'Lumbini','Nepalgunj':'Lumbini','Banke':'Lumbini',
  'Surkhet':'Karnali','Jumla':'Karnali',
  'Dhangadhi':'Sudurpashchim','Kailali':'Sudurpashchim',
};

const KEYWORDS = {
  disaster:['flood','earthquake','landslide','disaster','fire','rescue','emergency','killed','damage'],
  health:['health','hospital','disease','vaccine','medical','doctor','patient','dengue','cholera'],
  economy:['economy','budget','trade','inflation','tax','revenue','bank','investment','export','rupee'],
  politics:['election','parliament','minister','party','government','vote','president','constitution'],
  education:['school','university','education','student','teacher','exam','scholarship'],
  infrastructure:['road','bridge','construction','highway','project','hydro','dam','electricity'],
  sports:['cricket','football','sports','match','tournament','game','team','cup'],
  tourism:['tourism','tourist','trekking','everest','hotel','travel','mountain','himalaya'],
};

function generateResponse(query, articles) {
  const q = query.toLowerCase();

  // by category
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => q.includes(k)) || q.includes(cat)) {
      const matched = articles.filter(a => a.category === cat).slice(0, 6);
      if (!matched.length) return `No ${cat} articles found right now. Try again after refresh.`;
      return `**${CAT_ICONS[cat]} ${cat.toUpperCase()} NEWS** (${matched.length} live articles)\n\n` +
        matched.map((a,i) => `${i+1}. **${a.title}**\n   📍 ${a.district} · ${a.source} · ${a.timeAgo}`).join('\n\n') +
        '\n\n_Source: Live RSS feeds_';
    }
  }

  // by location
  for (const [dist, prov] of Object.entries(DIST_MAP)) {
    if (q.includes(dist.toLowerCase())) {
      const matched = articles.filter(a => a.district===dist || a.province===prov).slice(0, 6);
      if (!matched.length) return `No articles found for ${dist} right now.`;
      return `**📍 ${dist}, ${prov}** — ${matched.length} articles\n\n` +
        matched.map((a,i) => `${i+1}. [${CAT_ICONS[a.category]} ${a.category}] **${a.title}**\n   ${a.source} · ${a.timeAgo}`).join('\n\n');
    }
  }

  for (const prov of PROVINCES) {
    if (q.includes(prov.name.toLowerCase())) {
      const matched = articles.filter(a => a.province === prov.name).slice(0, 6);
      return `**📍 ${prov.name} (${prov.ne})** — ${matched.length} articles\n\n` +
        (matched.length
          ? matched.map((a,i) => `${i+1}. **${a.title}**\n   ${a.source} · ${a.timeAgo}`).join('\n\n')
          : 'No articles found.');
    }
  }

  // general / latest
  if (q.includes('late') || q.includes('today') || q.includes('happen') || q.includes('news')) {
    const latest = articles.slice(0, 7);
    if (!latest.length) return 'No articles loaded yet. Click 🔄 Refresh to fetch live news.';
    return `**📰 LATEST NEPAL NEWS** (${articles.length} total from live feeds)\n\n` +
      latest.map((a,i) => `${i+1}. [${CAT_ICONS[a.category]} ${a.category}] **${a.title}**\n   ${a.source} · ${a.timeAgo}`).join('\n\n');
  }

  // title search
  const found = articles.filter(a => a.title.toLowerCase().includes(q)).slice(0, 6);
  if (found.length) {
    return `**🔍 Results for "${query}"** (${found.length} found)\n\n` +
      found.map((a,i) => `${i+1}. **${a.title}**\n   ${CAT_ICONS[a.category]} ${a.category} · ${a.source} · ${a.timeAgo}`).join('\n\n');
  }

  return `I searched ${articles.length} live articles but found nothing for **"${query}"**.\n\nTry asking:\n• "Latest news"\n• A category: *disaster, health, economy, politics*\n• A place: *Kathmandu, Pokhara, Surkhet*`;
}

function MdText({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const bold = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<b>${m}</b>`);
        const italic = bold.replace(/\*(.+?)\*/g, (_, m) => `<i>${m}</i>`);
        return (
          <div key={i} style={{ lineHeight: 1.65, marginBottom: line === '' ? 6 : 0 }}
            dangerouslySetInnerHTML={{ __html: italic || '&nbsp;' }} />
        );
      })}
    </div>
  );
}

export function ChatPage({ articles }) {
  const [msgs, setMsgs] = useState([{
    role: 'bot',
    text: `नमस्ते! 🙏 I'm the Nepal Civic Intelligence Assistant.\n\nI have access to **${articles.length}** live news articles. Ask me anything:\n• "Latest news"\n• "Disaster reports"\n• "News in Kathmandu"\n• "Health updates"\n• "Economic news Nepal"`
  }]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const sugs = ['Latest news', 'Disaster reports', 'News in Kathmandu', 'Health updates', 'Economic news', 'Sports news'];

  const send = (q) => {
    const text = q || input;
    if (!text.trim()) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text }]);
    setTimeout(() => {
      setMsgs(prev => [...prev, { role: 'bot', text: generateResponse(text, articles) }]);
    }, 400);
  };

  return (
    <div className="page">
      <div className="page-title">🤖 AI Civic Assistant</div>
      <div className="chat-wrap">
        <div className="chat-suggestions">
          {sugs.map((s, i) => (
            <button key={i} className="chat-sug-btn" onClick={() => send(s)}>💬 {s}</button>
          ))}
        </div>
        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <MdText text={m.text} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="chat-input-row">
          <input className="chat-in" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about Nepal news, policies, disasters, provinces…" />
          <button className="chat-send" onClick={() => send()}>Send ➤</button>
        </div>
      </div>
    </div>
  );
}
