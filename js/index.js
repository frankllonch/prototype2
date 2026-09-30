/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
import { initTextRoll } from './text-roll.js';
import { initControls } from './controls.js';
import { initStack } from './stack.js';
import { initYears } from './years.js';
import { initPanels } from './panels.js';
import { initPanelScroll } from './panel-scroll.js';
import { initLightbox } from './lightbox.js';
import { initCursor } from './cursor.js';
initTextRoll();
initControls();
initStack();
initYears();
initPanels();
initPanelScroll();
initLightbox();
initCursor();
