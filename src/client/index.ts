/**
 * Boot. Every module is an enhancement: the pages are complete and navigable
 * with scripting off — tiles are real links, panels are real anchors.
 */
import { initTextRoll } from './text-roll.ts';
import { initControls } from './controls.ts';
import { initStack } from './stack.ts';
import { initYears } from './years.ts';
import { initPanels } from './panels.ts';
import { initPanelScroll } from './panel-scroll.ts';
import { initLightbox } from './lightbox.ts';

initTextRoll();
initControls();
initStack();
initYears();
initPanels();
initPanelScroll();
initLightbox();
