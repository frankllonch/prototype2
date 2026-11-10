/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
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
import { initFilm } from './film.ts';
import { initCurrent } from './current.ts';
import { initScrollbar } from './scrollbar.ts';
import { initTilt } from './tilt.ts';
import { initPaging } from './paging.ts';
import { initViews } from './views.ts';
import { initScrollCue } from './scroll-cue.ts';
import { initAbout } from './about.ts';
import { initInquiries } from './inquiries.ts';
import { initBook } from './book.ts';
import { initWcFocus } from './focus.ts';
import { initWcTexts } from './texts.ts';
import { initGlide } from './glide.ts';
import { initWrite } from './write.ts';

// One hover or the other, never both: the document says which, and
// components/layout.ts is where that is decided.
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
initFilm();
initCurrent();
initScrollbar();
initTilt();
initPaging();
initViews();
initScrollCue();
initAbout();
initInquiries();
initBook();
initWcFocus();
initWcTexts();
initGlide();
initWrite();
