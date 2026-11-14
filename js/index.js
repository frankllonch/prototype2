/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
import { initTextRoll } from './text-roll.js';
import { initScramble } from './scramble.js';
import { initTransitions } from './transitions.js';
import { initControls } from './controls.js';
import { initStack } from './stack.js';
import { initYears } from './years.js';
import { initHoverList } from './hover-list.js';
import { initPanels } from './panels.js';
import { initFigures } from './figures.js';
import { initSheets } from './sheets.js';
import { initLightbox } from './lightbox.js';
import { initCursor } from './cursor.js';
import { initFilm } from './film.js';
import { initCurrent } from './current.js';
import { initScrollbar } from './scrollbar.js';
import { initTilt } from './tilt.js';
import { initPaging } from './paging.js';
import { initViews } from './views.js';
import { initScrollCue } from './scroll-cue.js';
import { initAbout } from './about.js';
import { initInquiries } from './inquiries.js';
import { initChart } from './chart.js';
import { initBook } from './book.js';
import { initWcFocus } from './focus.js';
import { initWcTexts } from './texts.js';
import { initGlide } from './glide.js';
import { initWrite } from './write.js';
import { initMenu } from './menu.js';
// The head stops waiting for these scripts after a few seconds and lets the
// page stand as it does without them (components/layout.ts). Arriving later
// than that, they take it back before anything below reads the document.
document.documentElement.classList.add('js');
// The menu first: on a phone it is the only way from one page to another, so
// nothing that fails further down may leave its button unanswered. And before
// the panels: it gets out of About's way on the click that opens it.
initMenu();
// One hover or the other, never both: the document says which, and
// components/layout.ts is where that is decided.
if (document.documentElement.dataset.hover === 'scramble')
    initScramble();
else
    initTextRoll();
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
