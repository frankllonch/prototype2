<?php
/** The sheet — src/components/sheet.ts. */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** `$item`: title, lines (list of strings), when, text (html), images ([{id, caption}]). */
function cv_sheet_body( array $item ): string {
	$images = $item['images'];
	$n      = count( $images );
	$lines  = array_values( array_filter( $item['lines'] ?? [], fn( $l ) => '' !== trim( $l ) ) );

	$out = '<div class="sheet" data-reader data-sheet>'
		. '<div class="sheet-text" data-sheet-text tabindex="-1">'
		. '<header class="sheet-head">'
		. '<h2 class="sheet-title">' . esc_html( $item['title'] ) . '</h2>';
	if ( $lines ) {
		$out .= '<p class="sheet-lines">' . implode( '<br />', array_map( 'esc_html', $lines ) ) . '</p>';
	}
	if ( '' !== $item['when'] ) {
		$out .= '<p class="sheet-when">' . esc_html( $item['when'] ) . '</p>';
	}
	$out .= '</header>'
		. '<div class="sheet-prose">' . $item['text'] . '</div>'
		. '</div>'
		. '<button type="button" class="sheet-more" data-expand="text" aria-pressed="false" aria-label="Read the whole text">'
		. '<svg viewBox="0 0 36 36" aria-hidden="true">'
		. '<circle cx="18" cy="18" r="16.75" />'
		. '<circle class="sheet-dot" cx="11.5" cy="18" r="2" />'
		. '<circle class="sheet-dot" cx="18" cy="18" r="2" />'
		. '<circle class="sheet-dot" cx="24.5" cy="18" r="2" />'
		. '</svg></button>';

	if ( $n ) {
		$out .= '<div class="sheet-stage" data-figures><div class="sheet-frame">';
		foreach ( $images as $i => $image ) {
			$out .= '<figure class="reader-figure sheet-figure' . ( cv_sheet_wide( $image['id'] ) ? ' is-wide' : '' ) . ( 0 === $i ? ' is-current' : '' ) . '">'
				. cv_image( $image['id'], '(max-width: 899px) 92vw, 40vw', [ 'priority' => 0 === $i ] )
				. '</figure>';
		}
		$out .= '</div>';
		if ( $n > 1 ) {
			$out .= '<button type="button" class="sheet-step sheet-prev" data-figure-step="-1" aria-label="Previous photograph">' . cv_step_chevron( -1 ) . '</button>'
				. '<button type="button" class="sheet-step sheet-next" data-figure-step="1" aria-label="Next photograph">' . cv_step_chevron( 1 ) . '</button>'
				. '<p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>';
		}
		$out .= '</div>';
	}
	return $out . '</div>';
}

/** A photograph clearly wider than it is tall — `wide` in sheet.ts. */
function cv_sheet_wide( int $id ): bool {
	$meta = $id ? wp_get_attachment_metadata( $id ) : null;
	return $meta && ! empty( $meta['width'] ) && ! empty( $meta['height'] ) && $meta['width'] > $meta['height'] * 1.1;
}

/**
 * A commissioned project as the sheet takes it: the masthead the designer set
 * for its page where the entry has one, and otherwise what the index shows —
 * its title and its dates — so a project added later still opens on a sheet.
 */
function cv_project_sheet( array $project ): array {
	return [
		'title'  => $project['heading'] ?: $project['title'],
		'lines'  => $project['lines'],
		'when'   => $project['pageWhen'] ?: $project['when'],
		'text'   => $project['text'],
		'images' => $project['images'],
	];
}
