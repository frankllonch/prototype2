<?php
/**
 * The reading composition and the panels that hold it —
 * src/components/editorial.ts and src/components/panels.ts.
 *
 * The text runs down one column and the photographs hold the other, turned by
 * hand with arrows under them. Shared by the exhibition and commissioned
 * panels, so everything that is read rather than browsed is read the same way.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `$item`: title, text (html), images ([{id, caption}]), and optionally year,
 * venue, from, to, kind.
 */
function cv_editorial_body( array $item ): string {
	$images = $item['images'];
	$n      = count( $images );
	$venue  = $item['venue'] ?? '';
	$from   = $item['from'] ?? '';
	$to     = $item['to'] ?? '';
	$kind   = $item['kind'] ?? '';
	$year   = $item['year'] ?? null;
	// An exhibition opens on its own facts, set as the index sets them.
	$stated = $venue || $from || $kind;

	$out = '<div class="reader' . ( $stated ? ' reader-stated' : '' ) . '" data-reader>'
		. '<div class="reader-text">'
		. '<button type="button" class="reader-expand" data-expand="text" aria-pressed="false" aria-label="Show the text on its own"><span aria-hidden="true"></span></button>'
		. '<header class="reader-head"><h2 class="reader-title">' . esc_html( $item['title'] ) . '</h2>';
	if ( $venue ) {
		$out .= '<p class="reader-venue">' . esc_html( $venue ) . '</p>';
	}
	// The kind on its own line, unless the venue already says it — the list
	// writes "Solo show, Palau de Casavells" as one phrase, and the About page
	// still needs the kind as a fact of its own.
	if ( $kind && ( '' === $venue || false === stripos( $venue, $kind ) ) ) {
		$out .= '<p class="reader-kind">' . esc_html( $kind ) . '</p>';
	}
	if ( $stated ) {
		$out .= '<p class="reader-when">';
		if ( $from && $to ) {
			$out .= '<span class="exh-span"><span class="exh-lead">From</span> <em>' . esc_html( $from ) . '</em></span>'
				. '<span class="exh-span"><span class="exh-lead">To</span> <em>' . esc_html( $to ) . '</em></span>';
		} elseif ( $from ) {
			$out .= '<em>' . esc_html( $from ) . '</em>';
		}
		if ( $year ) {
			$out .= '<span class="reader-when-year">' . (int) $year . '</span>';
		}
		$out .= '</p>';
	} elseif ( $year ) {
		$out .= '<span class="reader-year">' . (int) $year . '</span>';
	}
	$out .= '</header>';
	if ( '' !== trim( $item['text'] ) ) {
		$out .= '<div class="prose">' . $item['text'] . '</div>';
	}
	$out .= '</div>';

	$out .= '<div class="reader-figures" data-figures' . ( $n > 1 ? ' data-multi' : '' ) . ' style="--n:' . $n . '">';
	if ( $n ) {
		$out .= '<button type="button" class="reader-expand" data-expand="figures" aria-pressed="false" aria-label="Show the images on their own"><span aria-hidden="true"></span></button>';
	}
	$out .= '<div class="reader-sticky"><div class="reader-stage">';
	foreach ( $images as $i => $image ) {
		$caption = $image['caption'] ?: ( cv_image_data( $image['id'] )['caption'] ?? '' );
		$out    .= '<figure class="reader-figure' . ( 0 === $i ? ' is-current' : '' ) . '">'
			. cv_image( $image['id'], '(max-width: 899px) 92vw, 52vw', [ 'priority' => 0 === $i ] )
			. ( $caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : '' )
			. '</figure>';
	}
	$out .= '</div>';
	if ( $n > 1 ) {
		$out .= '<nav class="reader-nav" aria-label="Images">'
			. '<button type="button" class="reader-step" data-figure-step="-1" aria-label="Previous image"><span aria-hidden="true">&#8592;</span></button>'
			. '<p class="reader-counter" data-figure-count data-template="{n} / {total}"></p>'
			. '<button type="button" class="reader-step" data-figure-step="1" aria-label="Next image"><span aria-hidden="true">&#8594;</span></button>'
			. '</nav>';
	}
	return $out . '</div></div></div>';
}

/**
 * Detail bodies for exhibitions and commissioned work, rendered once into the
 * page and raised over it on demand. Each carries its own address
 * (`data-panel-url`), which is what the bar shows while it is open; `$open`
 * names the one served open when that address was loaded directly.
 */
function cv_panels( string $kind, array $items, string $open = '' ): string {
	$out = '<div class="panels">';
	foreach ( $items as $item ) {
		$id   = "{$kind}-{$item['slug']}";
		$out .= '<article class="panel' . ( $open === $id ? ' is-open' : '' ) . '" id="' . esc_attr( $id ) . '" data-panel data-panel-url="' . esc_url( $item['url'] ) . '">'
			. '<a class="panel-close" href="#" data-panel-close>Close</a>'
			. cv_editorial_body( $item )
			. '</article>';
	}
	return $out . '</div>';
}
