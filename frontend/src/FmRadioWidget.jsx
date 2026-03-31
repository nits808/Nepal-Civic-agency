import React, { useState, useEffect, useRef } from 'react';
import { NEPAL_FM_STATIONS } from './data.js';

export default function FmRadioWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);

  const activeStation = NEPAL_FM_STATIONS[currentStationIndex];

  // Initialize audio object once
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;

      const onPlaying = () => { setIsPlaying(true); setIsLoading(false); setError(null); };
      const onWaiting = () => { setIsLoading(true); };
      const onError = (e) => {
        console.error('Audio stream error', e);
        setIsPlaying(false);
        setIsLoading(false);
        setError('Stream offline');
      };
      const onPause = () => { setIsPlaying(false); };

      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('waiting', onWaiting);
      audio.addEventListener('error', onError);
      audio.addEventListener('pause', onPause);

      return () => {
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('waiting', onWaiting);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('pause', onPause);
        audio.pause();
        audio.src = '';
      };
    }
  }, []);

  // Handle station change
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // Basic check, browsers expand relative to absolute so direct comparison might fail, 
      // but activeStation.url is absolute anyway. To be safe, just apply only if different.
      if (!audio.src.endsWith(activeStation.url)) {
        const wasPlaying = isPlaying || isLoading || !audio.paused;
        audio.pause();
        audio.src = activeStation.url;
        audio.load();
        if (wasPlaying) {
          setIsLoading(true);
          const p = audio.play();
          if (p !== undefined) {
            p.catch(e => {
              console.warn("Station change auto-play blocked", e);
              setIsPlaying(false);
              setIsLoading(false);
            });
          }
        }
      }
    }
  }, [activeStation.url]);

  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying || isLoading) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);
      // Give it a fresh stream sync so it doesn't play massive old buffer
      audioRef.current.src = activeStation.url; 
      audioRef.current.load();
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.catch(e => {
          console.warn("Playback interrupted or blocked by DOM", e.name, e.message);
          setIsLoading(false);
          // Do not manually setError here, let the native 'error' event handle actual network failures.
        });
      }
    }
  };

  const nextStation = () => {
    setCurrentStationIndex((prev) => (prev + 1) % NEPAL_FM_STATIONS.length);
  };

  const prevStation = () => {
    setCurrentStationIndex((prev) => (prev - 1 + NEPAL_FM_STATIONS.length) % NEPAL_FM_STATIONS.length);
  };

  return (
    <div className={`fm-widget ${isOpen ? 'open' : 'closed'}`}>
      {!isOpen && (
        <button className="fm-bubble-btn" onClick={() => setIsOpen(true)}>
          <span className="fm-icon">📻</span>
          {(isPlaying || isLoading) && <span className="fm-live-ring" style={{ borderColor: activeStation.color }} />}
        </button>
      )}

      {isOpen && (
        <div className="fm-panel">
          <div className="fm-header" style={{ borderBottom: `2px solid ${activeStation.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📻</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-1)' }}>Live Nepal FM</span>
            </div>
            <button className="fm-close-btn" onClick={() => setIsOpen(false)}>✖</button>
          </div>

          <div className="fm-body">
            <div className="fm-station-info">
              <div className="fm-freq" style={{ color: activeStation.color }}>{activeStation.freq}</div>
              <div className="fm-name">{activeStation.name}</div>
              {error ? (
                <div className="fm-status error">{error}</div>
              ) : isLoading ? (
                <div className="fm-status loading">Buffering...</div>
              ) : isPlaying ? (
                <div className="fm-status playing" style={{ color: activeStation.color }}>
                  <span className="live-dot" style={{ background: activeStation.color }}></span> Live Air
                </div>
              ) : (
                <div className="fm-status paused">Paused</div>
              )}
            </div>

            <div className="fm-controls">
              <button className="fm-ctrl-btn" onClick={prevStation}>⏮</button>
              <button className={`fm-play-btn ${isPlaying || isLoading ? 'playing' : ''}`} 
                      onClick={togglePlay}
                      style={{ background: isPlaying || isLoading ? activeStation.color : '#e2e8f0', color: isPlaying || isLoading ? '#fff' : '#334155' }}>
                {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
              </button>
              <button className="fm-ctrl-btn" onClick={nextStation}>⏭</button>
            </div>

            <div className="fm-volume">
              <span style={{ fontSize:'0.7rem' }}>🔈</span>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} />
              <span style={{ fontSize:'0.7rem' }}>🔊</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Native Audio Element */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
