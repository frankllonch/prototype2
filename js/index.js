/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
import { initTextRoll } from './text-roll.js';
import { initControls } from './controls.js';
import { initStack } from './stack.js';
import { initSliders } from './slider.js';
import { initPanels } from './panels.js';
import { initLightbox } from './lightbox.js';
initTextRoll();
initControls();
initStack();
initSliders();
initPanels();
initLightbox();
