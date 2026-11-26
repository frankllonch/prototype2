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
import { initBallTuner } from './ball-tuner.ts';
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
import { initPileTuner } from './pile-tuner.ts';

// The head stops waiting for these scripts after a few seconds and lets the page stand as it does
// without them (components/layout.ts).
document.documentElement.classList.add('js');
// The menu first: on a phone it is the only way from one page to another, so nothing that fails
// further down may leave its button unanswered.
initMenu();
// One hover or the other, never both: the document says which, and components/layout.ts is where
// that is decided.
if (document.documentElement.dataset.hover === 'scramble') initScramble();
else initTextRoll();
initTransitions();
initControls();
initStack();
initYears();
initHoverList();
initPanels();
initFigures();
initSheets();
initLightbox();
initCursor();
// The pointer itself: the ball (client/ball.ts, styles/11-ball.css).
initBall();
initFilm();
initCurrent();
initScrollbar();
initTilt();
initPaging();
initViews();
initScrollCue();
initAbout();
initInquiries();
initChart();
initBook();
initWcFocus();
initWcTexts();
initGlide();
initWrite();
initReveal();
// The menu hover tuner (client/hover-tuner.ts) is retired from the page: whatever it left in this
// browser is cleared so the bar is drawn exactly as the stylesheet says.
try { localStorage.removeItem('cv-tune'); localStorage.removeItem('cv-tune-css'); } catch { /* private window */ }
document.getElementById('tune-early')?.remove();
delete document.documentElement.dataset.tune;
// The gallery opening's tuner: off unless the page was opened with ?pile (client/pile-tuner.ts).
initPileTuner();
// The ball's tuner: off unless the page was opened with ?ball (client/ball-tuner.ts).
initBallTuner();
