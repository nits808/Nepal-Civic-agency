import React, { useState, useRef, useEffect } from 'react';
import { CAT_ICONS } from './data.js';
import { ANALYTICS_API_BASE_URL } from './config.js';

const BACKEND = ANALYTICS_API_BASE_URL;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function MdText({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const escaped = escapeHtml(line);
        const formatted = escaped
          .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.+?)\*/g, '<i>$1</i>');
        return (
          <div
            key={i}
            style={{ lineHeight: 1.65, marginBottom: line === '' ? 6 : 0 }}
            dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }}
          />
        );
      })}
    </div>
  );
}

export function ChatPage({ articles }) {
  const [msgs, setMsgs] = useState([{
    role: 'bot',
    text: `👋 नमस्ते! I'm the Nepal Civic Intelligence Assistant.\n\nI am connected to the backend full-text search engine. Ask me anything:\n• "Latest news"\n• "भ्रष्टाचार"\n• "Earthquake updates"\n• "Health news Nepal"`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const sugs = ['भ्रष्टाचार', 'Disaster reports', 'News in Kathmandu', 'Health updates', 'Economic news'];

  const send = async (q) => {
    const text = q || input;
    if (!text.trim() || loading) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      
      let reply = '';
      if (!data.results || data.results.length === 0) {
        reply = `I searched the database but found nothing for **"${text}"**.\n\nTry asking:\n• "Latest news"\n• A topic: *health, economy, politics*\n• Nepali keywords: *भूकम्प, बाढी*`;
      } else {
        reply = `**🔍 Results for "${text}"** (${data.total} found)\n\n` +
          data.results.slice(0, 6).map((a,i) => {
            const icon = CAT_ICONS[a.category] || '📰';
            return `${i+1}. **${a.title}**\n   ${icon} ${a.category} • ${a.source} • ${new Date(a.date).toLocaleDateString()}`;
          }).join('\n\n');
      }

      setMsgs(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMsgs(prev => [...prev, { role: 'bot', text: 'Error connecting to the search backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">🤖 AI Civic Assistant</div>
      <div className="chat-wrap">
        <div className="chat-suggestions">
          {sugs.map((s, i) => (
            <button key={i} className="chat-sug-btn" onClick={() => send(s)}>💡 {s}</button>
          ))}
        </div>
        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <MdText text={m.text} />
            </div>
          ))}
          {loading && <div className="msg bot"><i>Searching the database...</i></div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input-row">
          <input className="chat-in" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Search news, policies, disasters, provinces..." />
          <button className="chat-send" onClick={() => send()} disabled={loading}>Send ➔</button>
        </div>
      </div>
    </div>
  );
}
