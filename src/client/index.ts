/** Boot. */
import { initTextRoll } from './text-roll.ts';
import { initScramble } from './scramble.ts';
import { initTransitions } from './transitions.ts';
import { initControls } from './controls.ts';
import { initStack } from './stack.ts';
import { initYears } from './years.ts';
import { initHoverList } from './hover-list.ts';
import { initPanels } from './panels.ts';
import { initFigures } from './figures.ts';
import { initSheets } from './sheets.ts';
import { initLightbox } from './lightbox.ts';
import { initCursor } from './cursor.ts';
import { initBall } from './ball.ts';
import { initFilm } from './film.ts';
import { initCurrent } from './current.ts';
import { initScrollbar } from './scrollbar.ts';
import { initTilt } from './tilt.ts';
import { initPaging } from './paging.ts';
import { initViews } from './views.ts';
import { initScrollCue } from './scroll-cue.ts';
import { initAbout } from './about.ts';
import { initInquiries } from './inquiries.ts';
import { initChart } from './chart.ts';
import { initBook } from './book.ts';
import { initWcFocus } from './focus.ts';
import { initWcTexts } from './texts.ts';
import { initGlide } from './glide.ts';
import { initWrite } from './write.ts';
import { initMenu } from './menu.ts';
import { initReveal } from './reveal.ts';
import { initLocate } from './locate.ts';

const root = document.documentElement;
// The head removes this class if the scripts are late (components/layout.ts); put back here.
root.classList.add('js');

// In boot order. The menu first: on a phone it is the only way between pages. Each module is an
// enhancement, so one that fails is reported and the rest still start.
const modules: readonly (() => void)[] = [
  initMenu,
  // The bar's hover, as components/layout.ts chose it.
  root.dataset.hover === 'scramble' ? initScramble : initTextRoll,
  initTransitions,
  initControls,
  initStack,
  initYears,
  initHoverList,
  initPanels,
  initFigures,
  initSheets,
  initLightbox,
  initCursor,
  initBall,
  initFilm,
  initCurrent,
  initScrollbar,
  initTilt,
  initPaging,
  initViews,
  initScrollCue,
  initAbout,
  initInquiries,
  initChart,
  initBook,
  initWcFocus,
  initWcTexts,
  initGlide,
  initWrite,
  initReveal,
  initLocate,
];
for (const init of modules) {
  try { init(); } catch (error) { console.error(error); }
}

// Development tools, fetched only on a local server: the menu's hover tuner (?menu=off hides it),
// and the ball's (?ball), switched off for now.
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.local');
const asked = new URLSearchParams(location.search);
const stored = (key: string) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const BALL_TUNER = false;
if (local && BALL_TUNER && (asked.has('ball') || stored('cv-ball-on'))) void import('./ball-tuner.ts').then((m) => m.initBallTuner());
if (local) void import('./menu-tuner.ts').then((m) => m.initMenuTuner());
