import { play } from '../audio.js';
// Starts a game in 3D (on the cabin table) or, without WebGL, as a 2D board in the HUD.
let active = null;
export function isGameActive() { return !!active; }
export function exitGame() { active?.exit(); }

export async function launchGame(kind, { stage, go, toast }) {
  if (active) active.exit();
  go('home'); // close any section panel
  document.body.classList.add('in-game');
  const done = () => { active = null; document.body.classList.remove('in-game'); if (stage) stage.endGame(); };
  if (kind === 'snakes') {
    const { createSnakes, snakes2DView } = await import('./snakes.js');
    let view;
    if (stage) { const { snakesGiantView } = await import('../world/games-giant.js'); stage.focusGame('journey'); view = snakesGiantView(stage); }
    else { const { snakesTex } = await import('../stage/textures.js'); view = snakes2DView(snakesTex(360, [1, 21, 28, 51, 72, 80, 100]).image); }
    active = createSnakes({ view, toast, onExit: done, onEnd: (won) => { play(won ? 'win' : 'lose'); stage?.avatar.play(won ? 'Victory' : 'Disappointed'); } });
  } else if (kind === 'chess') {
    const { createChess, chess2DView } = await import('./chess.js');
    let view;
    if (stage) { const { chessGiantView } = await import('../world/games-giant.js'); stage.focusGame('skills'); view = chessGiantView(stage); }
    else view = chess2DView();
    active = createChess({
      view, onExit: done,
      onThink: (on) => { if (on) stage?.avatar.play('Think'); else stage?.avatar.play('Idle'); },
      onEnd: (won, level) => { if (won !== null) play(won ? 'win' : 'lose'); if (won === true) stage?.avatar.play(level === 'hard' ? 'Dance' : 'Victory'); else if (won === false) stage?.avatar.play('Disappointed'); },
    });
  }
}
