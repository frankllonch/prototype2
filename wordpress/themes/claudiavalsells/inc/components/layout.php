<?php
/**
 * The chrome every page shares — src/components/layout.ts.
 *
 * The loading screen, the bar, the About overlay, the lightbox and the scroll
 * cue. header.php and footer.php print these around `main`.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Order and wording of the menu, after the designer's mockup. */
function cv_menu(): array {
	return [
		[ 'label' => 'Color Chart', 'path' => '/color-chart/' ],
		[ 'label' => 'Exhibitions', 'path' => '/exhibitions/' ],
		[ 'label' => 'Commissioned', 'path' => '/commissioned/' ],
		[ 'label' => 'Artwork', 'path' => '/artwork/' ],
		[ 'label' => 'About', 'path' => '/about/', 'panel' => 'about' ],
	];
}

/**
 * The opening screen, shown once a session while the site loads: five lines,
 * throbbing through the palette. Rendered on every page but hidden by the head
 * script on all but the first.
 */
function cv_loading_screen(): string {
	$lines = array_filter( array_map( 'trim', preg_split( '/\R/', (string) cv_option( 'cv_loader_lines', "CLAUDIA VALSELLS\n1969\nAlzueta Gallery\nBarcelona, Spain\n© All Rights Reserved" ) ) ) );
	$out   = '<div class="loader" data-loader aria-hidden="true">';
	foreach ( $lines as $line ) {
		$out .= '<p>' . esc_html( $line ) . '</p>';
	}
	return $out . '</div>';
}

function cv_top_bar(): string {
	$path = cv_page()['path'];
	$out  = '<header class="top">'
		// Decoded before it is uppercased, since the site's name arrives already
		// escaped and an entity's letters must not be touched; escaped once after.
		. '<a class="wordmark" href="' . esc_url( home_url( '/' ) ) . '" data-roll>' . esc_html( mb_strtoupper( wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ) ) . '</a>'
		. '<a class="top-soon" href="' . esc_url( home_url( '/#whats-color' ) ) . '"' . ( '/' === $path ? ' aria-current="page"' : '' ) . ' data-roll>What&rsquo;s Color?</a>'
		. '<nav class="menu" aria-label="Primary">';
	foreach ( cv_menu() as $item ) {
		$out .= sprintf(
			'<a href="%s"%s%s data-roll>%s</a>',
			esc_url( home_url( $item['path'] ) ),
			isset( $item['panel'] ) ? ' data-panel-open="' . esc_attr( $item['panel'] ) . '"' : '',
			$item['path'] === $path ? ' aria-current="page"' : '',
			esc_html( $item['label'] )
		);
	}
	return $out . '</nav></header>';
}

/**
 * About opens over whatever page you are on. The first screen is the designer's
 * card: red, her name at the top, her city and year beneath it, how to reach her
 * at the foot. Scrolling brings the biography up under the card, with the two
 * studio photographs set into it, then the record of exhibitions in columns, the
 * private collections, and the line of copyright.
 */
function cv_about_overlay( bool $open = false ): string {
	$a    = cv_about();
	$card = $a['card'];

	$out = '<section class="about' . ( $open ? ' is-open' : '' ) . '" id="about" data-panel data-panel-url="' . esc_url( $a['url'] ) . '" aria-label="About">'
		// Served open at /about/, its Close leads to the start page for a reader
		// without scripting, as a served panel's leads to its index; with
		// scripting the click never leaves the page.
		. '<a class="about-close" href="' . ( $open ? esc_url( home_url( '/' ) ) : '#' ) . '" data-panel-close>Close</a>'
		. '<div class="about-sheet">'
		. '<div class="about-card-stage" data-tilt><div class="about-card" data-tilt-inner>'
		. '<p class="about-name">' . esc_html( $card['name'] ) . '</p>'
		. '<p class="about-born">' . esc_html( $card['city'] ) . '<br />' . esc_html( $card['year'] ) . '</p>'
		. '<address class="about-contact">';
	if ( $card['phone'] ) {
		$out .= '<a href="tel:' . esc_attr( preg_replace( '/\s+/', '', $card['phone'] ) ) . '">' . esc_html( $card['phone'] ) . '</a>';
	}
	foreach ( $card['emails'] as $email ) {
		$out .= '<a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>';
	}
	// A wide list fills its first column before the next, level with the longest
	// of the other columns — as the sheet breaks the fairs level with the end of
	// the solo shows — or half, if that is more. The static site uses the same
	// rule (wideRows in src/components/layout.ts).
	$longest = 0;
	foreach ( $a['record'] as $group ) {
		if ( ! $group['wide'] ) {
			$longest = max( $longest, count( $group['shows'] ) );
		}
	}
	$out .= '</address></div></div>'
		. '<div class="about-text">' . $a['text'] . '</div>'
		. '<div class="about-record">';
	foreach ( $a['record'] as $group ) {
		$out .= '<section class="about-shows' . ( $group['wide'] ? ' is-wide' : '' ) . '">'
			. '<h3 class="about-label">' . esc_html( $group['heading'] ) . '</h3><ul class="about-show-list"'
			. ( $group['wide'] ? ' style="--rows:' . (int) max( ceil( count( $group['shows'] ) / 2 ), $longest ) . '"' : '' ) . '>';
		foreach ( $group['shows'] as $show ) {
			$out .= '<li class="about-show"><span class="about-show-when">' . esc_html( $show['when'] ) . '</span>'
				. '<span class="about-show-title">' . esc_html( $show['title'] ) . '</span>';
			foreach ( $show['lines'] as $line ) {
				$out .= '<span class="about-show-line">' . esc_html( $line ) . '</span>';
			}
			$out .= '</li>';
		}
		$out .= '</ul></section>';
	}
	$out .= '</div>';
	if ( $a['collections'] ) {
		$out .= '<section class="about-collections"><h3 class="about-label">Private collections</h3><ul class="about-collection-list">';
		foreach ( $a['collections'] as $c ) {
			$out .= '<li class="about-collection"><span class="about-collection-name">' . esc_html( $c['name'] ) . '</span>'
				. '<span class="about-collection-place">' . esc_html( $c['place'] ) . '</span></li>';
		}
		$out .= '</ul></section>';
	}
	$out .= '<p class="about-foot"><b>' . esc_html( $card['name'] ) . '</b> ' . esc_html( $a['copyright'] ) . '</p>'
		. '</div></section>';
	return $out;
}

function cv_lightbox(): string {
	return '<div class="lightbox" data-lightbox data-available-label="Available" hidden>'
		. '<div class="lightbox-veil" data-lightbox-veil></div>'
		. '<button type="button" class="lightbox-close" data-lightbox-close>Close</button>'
		. '<button type="button" class="lightbox-nav lightbox-prev" data-lightbox-prev aria-label="Previous">←</button>'
		. '<div class="lightbox-plate" data-lightbox-plate></div>'
		. '<div class="lightbox-caption"><h2 class="lightbox-title" data-lightbox-title></h2>'
		. '<p class="lightbox-meta" data-lightbox-meta></p>'
		. '<p class="lightbox-count" data-lightbox-count data-template="{n} of {total}"></p></div>'
		. '<button type="button" class="lightbox-nav lightbox-next" data-lightbox-next aria-label="Next">→</button>'
		. '</div>';
}

/**
 * The hint that there is more below, on the pages that open on a full screen of
 * something. `negative` is drawn as the inverse of the film behind it; `ink` is
 * the gallery's, where there is nothing behind it but paper.
 */
function cv_scroll_cue( string $mode ): string {
	return '<div class="scroll-cue scroll-cue-' . esc_attr( $mode ) . '" data-scroll-cue aria-hidden="true">'
		. '<svg viewBox="0 0 28 16" focusable="false"><path d="M1.5 1.5 L14 13 L26.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" /></svg>'
		. '</div>';
}
