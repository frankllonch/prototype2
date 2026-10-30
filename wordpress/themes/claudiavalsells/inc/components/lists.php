<?php
/**
 * The two indexes — src/components/exhibitions.ts and
 * src/components/commissioned.ts.
 *
 * Exhibitions: one line per show, what it was called and where, when it ran,
 * the year at the right margin, a rule between them. The photograph lives in
 * the gap and is only shown on hover, so the page reads as a table until you
 * reach for something. Commissioned: the kind of work named once at the left,
 * its projects beside it.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cv_exhibition_list( array $shows ): string {
	$out = '<div class="xlist exh-list"><h2 class="sr-only">Exhibitions</h2><div class="xrows">';
	foreach ( $shows as $s ) {
		$inner = '<span class="exh-name"><span class="exh-title">' . esc_html( $s['title'] ) . '</span>'
			. ( $s['venue'] ? '<span class="exh-venue">' . esc_html( $s['venue'] ) . '</span>' : '' )
			. '</span>'
			. '<span class="exh-plate" aria-hidden="true">'
			. ( $s['cover'] ? cv_image( $s['cover'], '(max-width: 899px) 30vw, 13vw', [ 'alt' => '' ] ) : '' )
			. '</span>'
			. '<span class="exh-when">'
			. ( $s['from'] ? '<span>' . esc_html( $s['to'] ? "From {$s['from']}" : $s['from'] ) . '</span>' : '' )
			. ( $s['to'] ? '<span>' . esc_html( "To {$s['to']}" ) . '</span>' : '' )
			. '</span>'
			. '<span class="exh-year"><span>' . esc_html( (string) $s['year'] ) . '</span>'
			. ( $s['yearEnd'] ? '<span>' . (int) $s['yearEnd'] . '</span>' : '' )
			. '</span>';

		// Only a show with a page behind it is a link; the rest are plain rows
		// that still answer to the pointer, so the list reads as one thing.
		$out .= $s['hasPage']
			? '<a class="xrow hrow" href="' . esc_url( $s['url'] ) . '" data-panel-open="' . esc_attr( "exhibition-{$s['slug']}" ) . '">' . $inner . '</a>'
			: '<div class="xrow hrow">' . $inner . '</div>';
	}
	return $out . '</div></div>';
}

/** `$groups`: [{name, items: [project arrays]}]. */
function cv_commissioned_list( array $groups ): string {
	$out = '<div class="xlist">';
	foreach ( $groups as $group ) {
		$out .= '<section class="xgroup"><h2 class="xgroup-name">' . esc_html( $group['name'] ) . '</h2><div class="xrows">';
		foreach ( $group['items'] as $item ) {
			$out .= '<a class="xrow hrow" href="' . esc_url( $item['url'] ) . '" data-panel-open="' . esc_attr( "commissioned-{$item['slug']}" ) . '">'
				. '<span class="xrow-title">' . esc_html( $item['title'] ) . '</span>'
				. '<span class="exh-plate" aria-hidden="true">'
				. ( $item['cover'] ? cv_image( $item['cover'], '(max-width: 899px) 30vw, 13vw', [ 'alt' => '' ] ) : '' )
				. '</span>'
				. '<span class="xrow-when">' . esc_html( $item['when'] ) . '</span>'
				. '</a>';
		}
		$out .= '</div></section>';
	}
	return $out . '</div>';
}
