import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { GroupedProject, ProjectGroup } from '../content/groups.ts';

/**
 * The commissioned index, after the designer's layout: the kind of work named
 * once at the left, its projects listed beside it, a rule under each and the
 * year at the right margin.
 *
 * The rows are tighter than the exhibitions index because each is one line, so
 * the photograph cannot sit in the row — it would set the row's height and the
 * list would jump as the pointer crossed it. It floats over the list instead,
 * taken out of flow entirely, which costs the layout nothing and reads as the
 * picture being held up beside the name rather than filed under it.
 */
export function commissionedList(groups: readonly ProjectGroup[]): Html {
  return html`<div class="xlist com-list">
    ${join(groups.map(group))}
  </div>`;
}

function group(section: ProjectGroup): Html {
  return html`<section class="xgroup">
    <h2 class="xgroup-name">${section.name}</h2>
    <div class="xrows">
      ${join(
        section.items.map(
          (item) => html`<a
            class="xrow hrow"
            href="#commissioned-${item.slug}"
            data-panel-open="commissioned-${item.slug}"
          >
            <span class="xrow-title">${title(item)}</span>
            <span class="exh-plate" aria-hidden="true">
              ${item.project.cover
                ? responsiveImage({ image: item.project.cover, sizes: '(max-width: 899px) 30vw, 13vw', alt: '' })
                : ''}
            </span>
            <span class="xrow-when">${item.when}</span>
          </a>`,
        ),
      )}
    </div>
  </section>`;
}

/**
 * A project's name, with the one break the phone sheet sets by hand offered
 * where it is recorded (`BREAK_AFTER` in content/groups.ts).
 *
 * The space before the `<br>` stays: from 900px up the break is not displayed
 * (`.xrow-br`), and the name must read there exactly as it does without it.
 */
function title(item: GroupedProject): Html {
  if (!item.breakAfter) return html`${item.title}`;
  return html`${item.breakAfter} <br class="xrow-br">${item.title.slice(item.breakAfter.length + 1)}`;
}
