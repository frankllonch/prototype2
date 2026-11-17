import { isPlainClick, phone } from './env.js';
export const stepState = () => (history.state ?? {});
let leaving = false;
/**
 * Back over a step, once. Close asked for twice before the first has landed —
 * two key presses in a row, or one tap heard by two listeners — would be two
 * steps back, and the second leaves the page.
 */
export function stepBack() {
    if (leaving)
        return;
    leaving = true;
    history.back();
}
window.addEventListener('popstate', () => { leaving = false; });
// After a reload the entry behind a step can be another page's, so the step
// back may leave this one altogether — and Forward can bring it back whole
// from the cache with the step still marked as under way.
window.addEventListener('pageshow', () => { leaving = false; });
// Where the page is, as of the last time it moved: `keepScroll` has to know
// where it was before the browser touched it.
let pageY = window.scrollY;
window.addEventListener('scroll', () => { pageY = window.scrollY; }, { passive: true });
/**
 * For the `popstate` that leaves a step or lands on one: the page under it
 * stays where it was.
 *
 * The browser treats the step as an arrival at the address it lands on, and
 * where that address ends in an anchor — /#whats-color, /artwork/#year-2022 —
 * it takes the page to the anchor, away from where it was being read. By the
 * standard that is decided after this event, and an entry on `manual` is left
 * alone, so the entry is put on `manual` for the length of the step and given
 * back what it had straight after: a reload, or a return from another page,
 * restores the scroll as it always did. For an engine that moves the page
 * before the event instead, the page is also put back, now and once the step
 * is over.
 */
export function keepScroll() {
    const y = pageY;
    const mode = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, y);
    window.setTimeout(() => {
        history.scrollRestoration = mode;
        if (Math.abs(window.scrollY - y) > 1)
            window.scrollTo(0, y);
    }, 0);
}
/**
 * About and each exhibition open above the page you are on, which stays visible
 * and softly blurred behind them. The panels are already in the markup — this
 * only raises one — so there is no fetch and nothing to wait for.
 *
 * The veil fades rather than appearing: it is always in the DOM and only its
 * opacity changes, so opening reads as the page receding, not a curtain dropping.
 *
 * A panel may have an address of its own (`data-panel-url`, as the WordPress
 * theme gives each exhibition and commissioned project), in which case opening
 * it puts that address in the bar rather than an anchor, and a page may be
 * served with a panel already open — that same address, loaded directly. The
 * static site does neither, and nothing here depends on either.
 *
 * On a phone the sheets are drawn with no Close (07-sheet.css), so the way out
 * of one is the phone's own: opening a panel there is a step in the history,
 * and Back closes it and leaves you on the page, where you were on it. About
 * opens the same way, for the same Back — and from the menu over an open
 * sheet it is a second step, with the sheet left standing under it, so Back
 * returns to the sheet where it was being read. Wider than a phone the address
 * is replaced, as it always was, and Back leaves the page.
 */
export function initPanels() {
    const panels = [...document.querySelectorAll('[data-panel]')];
    const veil = document.querySelector('[data-panel-veil]');
    if (!panels.length || !veil)
        return;
    /*
     * Where the bar goes back to when a panel closes. Normally the page itself,
     * read once here because opening a panel may have replaced the address; a
     * page served at a panel's own address names the index it belongs to instead
     * (`data-panel-root`), so closing it does not leave the bar on the panel.
     */
    const page = location.pathname + location.search;
    const root = document.querySelector('[data-panel-root]')?.dataset.panelRoot ?? page;
    const index = new URL(root, location.href).pathname;
    // Every address this page puts in the bar: its own, its index's, its panels'.
    const addresses = new Set([location.pathname, index]);
    for (const panel of panels) {
        if (panel.dataset.panelUrl)
            addresses.add(new URL(panel.dataset.panelUrl, location.href).pathname);
    }
    /*
     * A panel's Close link is inside it, or — where it has to be drawn over the
     * panel as the bar is, as the negative of whatever passes under it — beside
     * it, naming the panel it closes (`data-panel-close="about"`). A blend
     * reaches only what shares its stacking context, and a panel is one.
     */
    const closer = (panel) => panel.querySelector('[data-panel-close]') ??
        document.querySelector(`[data-panel-close="${panel.id}"]`);
    const panelOf = (id) => (id ? panels.find((panel) => panel.id === id) ?? null : null);
    /** The address in the bar is this panel's: its anchor, or the address of its own. */
    const addressed = (panel) => location.hash === `#${panel.id}` ||
        (location.hash === '' && panel.dataset.panelUrl !== undefined &&
            new URL(panel.dataset.panelUrl, location.href).pathname === location.pathname);
    let open = null;
    // The sheet the open panel was raised over, still standing under it.
    let under = null;
    // What opened the panel, so that closing it hands the keyboard back there
    // rather than dropping focus on the body when the Close link is hidden.
    let opener = null;
    // The open panel stands on a history step of its own, one on from the page.
    let stepped = false;
    /** `byHistory`: Back has already left the panel's step, and only the panel is left to put away. */
    const close = (byHistory = false) => {
        if (!open)
            return;
        // Close, Escape and the menu go back over the step rather than leaving it
        // behind them, where Forward would find a panel nobody asked for. The
        // `popstate` below does the closing.
        if (stepped && !byHistory && stepState().panel === open.id) {
            stepBack();
            return;
        }
        stepped = false;
        const id = open.id;
        open.classList.remove('is-open');
        under?.classList.remove('is-open');
        open = under = null;
        veil.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        if (!byHistory)
            history.replaceState(null, '', root);
        const back = opener ?? document.querySelector(`[data-panel-open="${id}"]`);
        opener = null;
        // On a phone what opened it may be in the menu, which is out of sight
        // again by now: the menu's button takes the keyboard instead.
        const shown = back && back.getClientRects().length > 0 && getComputedStyle(back).visibility !== 'hidden';
        (shown ? back : document.querySelector('[data-menu-toggle]') ?? back)?.focus({ preventScroll: true });
    };
    /**
     * `arriving`: the page came with this panel up, and nobody has pressed anything yet.
     * `beneath`: the panel this one is raised over, which stays up under it.
     */
    const show = (id, arriving = false, beneath = null) => {
        const panel = panelOf(id);
        if (!panel)
            return;
        // Not up yet — the page was reloaded on this step, or Forward skipped
        // the one before it — so it is raised first, as it would have been.
        if (beneath && beneath !== open)
            show(beneath.id, arriving);
        // Back on the sheet that was under About: it never went away, and is not
        // to be taken back to its top. Its row is what opened it, not About's link.
        const kept = panel === under;
        if (kept)
            opener = null;
        for (const other of [open, under]) {
            if (other && other !== panel && other !== beneath)
                other.classList.remove('is-open');
        }
        open = panel;
        under = beneath;
        veil.classList.add('is-open');
        panel.classList.add('is-open');
        if (!kept) {
            panel.scrollTop = 0;
            // The figure column follows the scroll, so it has to be told that the
            // scroll just went back to the top.
            panel.dispatchEvent(new CustomEvent('panelopen'));
        }
        document.body.classList.add('is-locked');
        // Close takes the keyboard — but not on a phone sheet the page arrived
        // with. Focus given before anything has been touched is drawn as a
        // keyboard's would be, and the Close those sheets keep out of sight until
        // a key reaches it (07-sheet.css) would be the first thing on them. The
        // sheet itself takes it there, so the first Tab is Close all the same.
        // About keeps its Close in view on a phone, and is given it as ever.
        if (arriving && phone.matches && panel.classList.contains('panel')) {
            panel.tabIndex = -1;
            panel.focus({ preventScroll: true });
            return;
        }
        closer(panel)?.focus({ preventScroll: true });
    };
    for (const trigger of document.querySelectorAll('[data-panel-open]')) {
        const id = trigger.dataset.panelOpen;
        trigger.addEventListener('click', (event) => {
            if (!isPlainClick(event))
                return;
            const panel = document.getElementById(id);
            if (!panel)
                return; // not on this page: let the link go home
            event.preventDefault();
            /*
             * A panel with an address of its own is reached at that address; the
             * rest are reached by their anchor, which is also what the link says.
             *
             * On a phone the address is a step that Back returns from and a reload
             * can land on, so it is taken only where a reload would bring this same
             * page back: under the page's own address, as an exhibition's is under
             * /exhibitions/. About's is the start page with About open. Taken from
             * any other page and reloaded — which a phone does on its own to a tab
             * it had put aside — it left the start page standing on a step whose
             * Back led to this page's address, with the wrong page under it. From
             * those pages About takes its anchor, as on the static site.
             */
            const own = panel.dataset.panelUrl;
            const here = own !== undefined && (!phone.matches || new URL(own, location.href).pathname.startsWith(index));
            const url = here ? own : `#${id}`;
            // One step per panel. About raised over a sheet, from the menu, is a
            // step of its own and names the sheet it stands over; wider than a
            // phone the newcomer replaces what was open, address and all.
            const over = phone.matches && open && open !== panel ? open : null;
            if (phone.matches && (!open || over)) {
                history.pushState(over ? { panel: id, over: over.id } : { panel: id }, '', url);
                stepped = true;
            }
            else
                history.replaceState(stepped ? { panel: id } : null, '', url);
            opener = trigger;
            show(id, false, over);
        });
    }
    for (const panel of panels) {
        closer(panel)?.addEventListener('click', (event) => {
            event.preventDefault();
            close();
        });
    }
    veil.addEventListener('click', () => close());
    document.addEventListener('keydown', (event) => { if (open && event.key === 'Escape')
        close(); });
    // Back from a panel's step closes it; Forward onto one raises it again.
    // A panel that made no step is not touched: there Back is on its way out
    // of the page, as it has always been.
    window.addEventListener('popstate', () => {
        // Back onto an address this page is never at. Reloaded on a panel's own
        // address — About's /about/, taken over a step on a phone that was then
        // widened — the reload served that address's page, the start page, and
        // the entries behind it still name the page before. That page is loaded,
        // rather than its address left over this one with this one's menu.
        if (!addresses.has(location.pathname)) {
            location.reload();
            return;
        }
        const { panel: id, over } = stepState();
        if (id && panelOf(id)) {
            keepScroll();
            show(id, false, panelOf(over));
            stepped = true;
        }
        else if (stepped) {
            keepScroll();
            // Back off About onto a sheet the page arrived with, which made no step:
            // the entry is that sheet's all the same, and it stays up.
            if (under && addressed(under)) {
                show(under.id);
                stepped = false;
            }
            else
                close(true);
        }
    });
    // Served already open — a panel loaded at its own address — so the script
    // takes charge of what the page has done, and can close it. First, whatever
    // the hash says: a stray #main from the skip link must not leave the panel
    // open with nothing in charge of it.
    const served = panels.find((panel) => panel.classList.contains('is-open'));
    if (served)
        show(served.id, true);
    // Arriving on a shared #about or #exhibition-… link opens it straight away.
    // Reloaded on a panel's step, the step is still there behind it, and says
    // what the panel stood over.
    const at = stepState();
    const named = location.hash.slice(1);
    if (named)
        show(named, true, at.panel === named ? panelOf(at.over) : null);
    stepped = open !== null && at.panel === open.id;
}
