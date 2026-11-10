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
 * About opens over whatever page you are on, which stays faintly visible and
 * blurred behind it, and tells itself in four parts as you scroll (the theme's
 * client/about.js): the capitals lead writes itself, the photographs slide in
 * from the side, the rest of the biography writes itself as it rises, and the
 * record, the collections and how to reach her come in last.
 *
 * The markup is the page at rest and matches the static site's byte for byte
 * (`aboutOverlay` in src/components/layout.ts): the opening paragraph, then
 * every photograph on the About page — Image blocks or a Gallery, wherever
 * they stand — in one row, then the rest of the text.
 */
function cv_about_overlay( bool $open = false ): string {
	$a    = cv_about();
	$card = $a['card'];

	$out = '<section class="about' . ( $open ? ' is-open' : '' ) . '" id="about" data-panel data-panel-url="' . esc_url( $a['url'] ) . '" aria-label="About">'
		. '<div class="about-sheet">'
		. '<div class="about-text">'
		. '<div class="about-opening" data-about-opening><div class="about-stage" data-about-stage>'
		. $a['lead'];
	if ( $a['images'] ) {
		$out .= '<div class="about-reel" data-about-reel><div class="about-reel-track" data-about-track>';
		foreach ( $a['images'] as $image ) {
			$out .= '<button type="button" class="about-reel-item">' . cv_image( $image, '(max-width: 899px) 45vw, 20vw' ) . '</button>';
		}
		$out .= '</div></div>';
	}
	$out .= '</div></div>' . $a['rest'] . '</div>'
		. '<div class="about-record">';

	$others = [];
	foreach ( $a['record'] as $group ) {
		if ( ! $group['wide'] ) {
			$others[] = $group['shows'];
		}
	}
	foreach ( $a['record'] as $group ) {
		$out .= '<section class="about-shows' . ( $group['wide'] ? ' is-wide' : '' ) . '">'
			. '<h3 class="about-label">' . esc_html( $group['heading'] ) . '</h3>';
		if ( $group['wide'] ) {
			$n    = cv_about_first_column( $group['shows'], $others );
			$out .= '<div class="about-show-columns">' . cv_about_show_list( array_slice( $group['shows'], 0, $n ) );
			if ( $n < count( $group['shows'] ) ) {
				$out .= cv_about_show_list( array_slice( $group['shows'], $n ) );
			}
			$out .= '</div>';
		} else {
			$out .= cv_about_show_list( $group['shows'] );
		}
		$out .= '</section>';
	}
	if ( $a['collections'] ) {
		$out .= '<section class="about-collections"><h3 class="about-label">Private collections</h3><ul class="about-collection-list">';
		foreach ( $a['collections'] as $c ) {
			$out .= '<li class="about-collection"><span class="about-collection-name">' . esc_html( $c['name'] ) . '</span>'
				. '<span class="about-collection-place">' . esc_html( $c['place'] ) . '</span></li>';
		}
		$out .= '</ul></section>';
	}
	$out .= '</div>';

	// How to reach her, above the copyright: the phone and emails from the
	// About page's side panel.
	if ( $card['phone'] || $card['emails'] ) {
		$out .= '<address class="about-contact">';
		if ( $card['phone'] ) {
			$out .= '<a href="tel:' . esc_attr( preg_replace( '/\s+/', '', $card['phone'] ) ) . '">' . esc_html( $card['phone'] ) . '</a>';
		}
		foreach ( $card['emails'] as $email ) {
			$out .= '<a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>';
		}
		$out .= '</address>';
	}
	$out .= '<p class="about-foot"><b>' . esc_html( $card['name'] ) . '</b> ' . esc_html( $a['copyright'] ) . '</p>'
		. '</div>';
	if ( $a['images'] ) {
		$out .= '<div class="about-viewer" data-about-viewer hidden>'
			. '<figure class="about-viewer-plate" data-about-plate></figure>'
			. '<p class="sr-only" data-about-count data-template="Photograph {n} of {total}" aria-live="polite"></p>'
			. '</div>';
	}
	// Close and the chevron stand beside the panel, so that they can be drawn as
	// the bar is, the negative of whatever passes under them: a blend only sees
	// what shares its stacking context. Served open at /about/, Close leads to
	// the start page for a reader without scripting, as a served panel's leads
	// to its index; with scripting the click never leaves the page.
	return $out . '</section>'
		. '<a class="about-close" href="' . ( $open ? esc_url( home_url( '/' ) ) : '#' ) . '" data-panel-close="about">Close</a>'
		. '<div class="about-cue" data-about-cue aria-hidden="true"><svg viewBox="0 0 28 16" focusable="false">'
		. '<path d="M1.5 1.5 L14 13 L26.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" /></svg></div>'
		// The chevrons for the photographs, beside the panel for the same reason,
		// and only when there is more than one to step through.
		. ( count( $a['images'] ) > 1
			? '<button type="button" class="about-viewer-step is-prev" data-about-step="-1" aria-label="Previous photograph">'
				. '<svg viewBox="0 0 9 16" aria-hidden="true" focusable="false"><path d="M8 1 1 8l7 7" /></svg></button>'
				. '<button type="button" class="about-viewer-step is-next" data-about-step="1" aria-label="Next photograph">'
				. '<svg viewBox="0 0 9 16" aria-hidden="true" focusable="false"><path d="m1 1 7 7-7 7" /></svg></button>'
			: '' );
}

function cv_about_show_list( array $shows ): string {
	$out = '<ul class="about-show-list">';
	foreach ( $shows as $show ) {
		$out .= '<li class="about-show"><span class="about-show-when">' . esc_html( $show['when'] ) . '</span>'
			. '<span class="about-show-title">' . esc_html( $show['title'] ) . '</span>';
		foreach ( $show['lines'] as $line ) {
			$out .= '<span class="about-show-line">' . esc_html( $line ) . '</span>';
		}
		$out .= '</li>';
	}
	return $out . '</ul>';
}

/**
 * How many of a two-column list stand in its first column: filled until it is
 * level with the longest of the other columns, and never fewer than would leave
 * the second the taller. Measured as the sheet sets it — a line 20, a separate
 * line under it 22.75 further, a broken one 20, 65.5 between entries. The same
 * arithmetic as `firstColumn` in src/components/layout.ts.
 */
function cv_about_first_column( array $shows, array $others ): int {
	$entry = function ( array $s ): float {
		$parts = array_merge( [ $s['when'], $s['title'] ], $s['lines'] ?? [], $s['places'] ?? [] );
		$h     = 0.0;
		foreach ( array_values( $parts ) as $i => $part ) {
			$h += ( $i ? 22.75 : 20 ) + substr_count( (string) $part, "\n" ) * 20;
		}
		return $h;
	};
	$column = function ( array $list ) use ( $entry ): float {
		$h = 0.0;
		foreach ( array_values( $list ) as $i => $s ) {
			$h += $entry( $s ) + ( $i ? 65.5 : 0 );
		}
		return $h;
	};
	$level = 0.0;
	foreach ( $others as $list ) {
		$level = max( $level, $column( $list ) );
	}
	$height = 0.0;
	$shows  = array_values( $shows );
	foreach ( $shows as $i => $s ) {
		$height += $entry( $s ) + ( $i ? 65.5 : 0 );
		if ( $height >= $level && $height >= $column( array_slice( $shows, $i + 1 ) ) ) {
			return $i + 1;
		}
	}
	return count( $shows );
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
