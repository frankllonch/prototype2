/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
import { initTextRoll } from './text-roll.ts';
import { initTransitions } from './transitions.ts';
import { initControls } from './controls.ts';
import { initStack } from './stack.ts';
import { initYears } from './years.ts';
import { initHoverList } from './hover-list.ts';
import { initPanels } from './panels.ts';
import { initPanelScroll } from './panel-scroll.ts';
import { initFigures } from './figures.ts';
import { initLightbox } from './lightbox.ts';
import { initCursor } from './cursor.ts';

initTextRoll();
initTransitions();
initControls();
initStack();
initYears();
initHoverList();
initPanels();
initPanelScroll();
initFigures();
initLightbox();
initCursor();
