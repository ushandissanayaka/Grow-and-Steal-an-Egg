// The loading page: the game's art blurred in the background, its icon in the middle, the name, and
// the real loading progress (fonts, world, avatar, joining a server). When the game has loaded it
// fades away by itself and the player is in the game.
//
// It is also the only screen for trouble, so there is never a dead end: when the connection drops it
// comes back ("Reconnecting"), and when the game could not start it says so and tries again by
// itself (with a button to try right away).

import { useEffect, useState } from 'react';
import { useUi } from './store.js';
import { GAME_NAME } from '../shared/gameData.js';
import { reloadGame } from '../net/connection.js';
import { removeBootScreen } from './boot.js';
import './loading.css';

const BG = './loading/background.jpg';
const ICON = './loading/icon.jpg';
const FADE_MS = 700;

// seconds until the next automatic try, counting down
function useCountdown(at) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!at) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [at]);
  return at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

export default function LoadingScreen() {
  const { phase, loading, retryAt } = useUi();
  const showing = phase === 'loading' || phase === 'reconnecting' || phase === 'failed';
  const [gone, setGone] = useState(false);
  const left = useCountdown(phase === 'failed' ? retryAt : 0);

  // now this page is on screen, the identical one from index.html can go
  useEffect(() => { removeBootScreen(); }, []);

  useEffect(() => {
    if (showing) { setGone(false); return undefined; }
    const t = setTimeout(() => setGone(true), FADE_MS); // fade into the game
    return () => clearTimeout(t);
  }, [showing]);
  if (gone && !showing) return null;

  const failed = phase === 'failed';
  const pct = failed ? 0 : Math.round(Math.min(1, loading?.progress ?? 0) * 100);
  const text = failed ? 'Could not reach the game server' : loading?.text || 'Loading';
  return (
    <div className={`loading-page${showing ? '' : ' leaving'}`} aria-busy={showing}>
      <div className="loading-bg" style={{ backgroundImage: `url(${BG})` }} />
      <div className="loading-shade" />
      <div className="loading-center">
        <div className="loading-icon-wrap">
          <i className="spark s1" /><i className="spark s2" /><i className="spark s3" />
          <img className="loading-icon" src={ICON} alt="" width="150" height="150" />
        </div>
        <h1 className="loading-title">{GAME_NAME}</h1>
        <p className="loading-step">{text}{failed ? '' : '…'}</p>
        {failed ? (
          <>
            <p className="loading-note">Trying again in {left}s</p>
            <button type="button" className="loading-retry" onClick={() => reloadGame()}>Try again now</button>
          </>
        ) : (
          <>
            <div className="loading-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="loading-dots"><i /><i /><i /></div>
          </>
        )}
      </div>
    </div>
  );
}
