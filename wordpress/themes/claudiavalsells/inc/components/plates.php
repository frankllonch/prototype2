<?php
/** The second sheet — src/components/plates.ts. */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** "From May to June 2025", "July 2026", "2018" — as the sheets write a show's dates. */
function cv_show_when( array $show ): string {
	$from = $show['from'] ?? '';
	$to   = $show['to'] ?? '';
	$run  = $from && $to ? "From $from to $to" : $from;
	return trim( $run . ' ' . ( $show['year'] ? (string) $show['year'] : '' ) );
}

/** `$show`: an exhibition as cv_exhibition() reads it. */
function cv_plates_body( array $show ): string {
	$images = $show['images'];
	$out    = '<div class="plates" data-reader>'
		. '<header class="plates-head">'
		. '<h2 class="sheet-title">' . esc_html( $show['title'] ) . '</h2>'
		. ( $show['venue'] ? '<p class="sheet-lines">' . esc_html( $show['venue'] ) . '</p>' : '' )
		. '<p class="sheet-when">' . esc_html( cv_show_when( $show ) ) . '</p>'
		. '</header>'
		. '<div class="plates-stage" data-figures><div class="plates-frame">';
	foreach ( $images as $i => $image ) {
		$out .= '<figure class="reader-figure plates-figure' . ( cv_sheet_wide( $image['id'] ) ? ' is-wide' : '' ) . ( 0 === $i ? ' is-current' : '' ) . '">'
			. cv_image( $image['id'], '(max-width: 899px) 92vw, 57vw', [ 'priority' => 0 === $i ] )
			. '</figure>';
	}
	$out .= '</div></div>';
	if ( count( $images ) > 1 ) {
		$out .= '<button type="button" class="plates-step plates-prev" data-figure-step="-1" aria-label="Previous photograph">' . cv_step_chevron( -1 ) . '</button>'
			. '<button type="button" class="plates-step plates-next" data-figure-step="1" aria-label="Next photograph">' . cv_step_chevron( 1 ) . '</button>'
			. '<p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>';
	}
	return $out . '</div>';
}

/**
 * An exhibition's detail, on whichever of the designer's two sheets it takes:
 * the reading sheet when it has a text, the plates when it is only pictures.
 */
function cv_exhibition_body( array $show ): string {
	// Nothing at all to read, as the static site decides it: a text that is only an embed — a
	// film of the opening — still opens on the reading sheet.
	if ( '' === trim( $show['text'] ) ) {
		return cv_plates_body( $show );
	}
	return cv_sheet_body( [
		'title'  => $show['title'],
		'lines'  => $show['venue'] ? [ $show['venue'] ] : [],
		'when'   => cv_show_when( $show ),
		'text'   => $show['text'],
		'images' => $show['images'],
	] );
}
