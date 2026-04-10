import React, { useState, useEffect, useRef, useCallback } from 'react';

// USGS Earthquake API — free, no key needed
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=3.5&latitude=28.3949&longitude=84.1240&maxradiuskm=700&limit=5&orderby=time';

function getMagColor(mag) {
  if (mag >= 6.0) return '#dc2626';
  if (mag >= 5.0) return '#ea580c';
  if (mag >= 4.0) return '#d97706';
  return '#65a30d';
}

function timeSince(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EarthquakeWidget() {
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  // BUG-05 FIX: Track mount state so async callbacks never update
  // state on an unmounted component (stale state / React 19 warning).
  const mountedRef = useRef(true);

  const fetchQuakes = useCallback(async () => {
    try {
      const r = await fetch(USGS_URL);
      const data = await r.json();
      const list = (data.features || []).map(f => ({
        id: f.id,
        mag: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        url: f.properties.url,
        depth: f.geometry.coordinates[2],
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
      if (!mountedRef.current) return;
      setQuakes(list);
      setLastFetch(new Date());
    } catch (e) {
      console.warn('[EarthquakeWidget] fetch error:', e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchQuakes();
    const interval = setInterval(fetchQuakes, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchQuakes]);

  const top = quakes[0];
  const hasAlert = top && top.mag >= 5.0;

  return (
    <div className={`eq-widget ${hasAlert ? 'eq-alert' : ''}`}>
      <div className="eq-header" onClick={() => setExpanded(e => !e)}>
        <span className="eq-icon">{hasAlert ? '🚨' : '🌏'}</span>
        <div className="eq-title-block">
          <span className="eq-title">Seismic Monitor</span>
          {loading ? (
            <span className="eq-sub">Loading…</span>
          ) : top ? (
            <span className="eq-sub" style={{ color: getMagColor(top.mag) }}>
              M{top.mag.toFixed(1)} · {top.place?.split(', ').pop() || 'Region'}
            </span>
          ) : (
            <span className="eq-sub">No recent activity</span>
          )}
        </div>
        <span className="eq-chevron">{expanded ? '▴' : '▾'}</span>
      </div>

      {expanded && (
        <div className="eq-list">
          {loading && <div className="eq-loading">Fetching seismic data…</div>}
          {!loading && quakes.length === 0 && (
            <div className="eq-empty">No earthquakes ≥ M3.5 in 700km radius recently</div>
          )}
          {quakes.map(q => (
            <a key={q.id} href={q.url} target="_blank" rel="noopener noreferrer" className="eq-item">
              <div className="eq-mag-badge" style={{ background: getMagColor(q.mag) }}>
                M{q.mag.toFixed(1)}
              </div>
              <div className="eq-info">
                <div className="eq-place">{q.place}</div>
                <div className="eq-meta">
                  <span>⏱ {timeSince(q.time)}</span>
                  <span>↓ {q.depth.toFixed(0)}km deep</span>
                </div>
              </div>
            </a>
          ))}
          {lastFetch && (
            <div className="eq-footer">
              USGS Live · Updated {lastFetch.toLocaleTimeString()}
              <button onClick={e => { e.stopPropagation(); fetchQuakes(); }} className="eq-refresh-btn">↻</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
