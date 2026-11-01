<?php
/**
 * The sheet — src/components/sheet.ts.
 *
 * A detail that is read and looked at: the masthead at the top left, the text
 * under it, the photograph holding the right of the screen with an arrow
 * either side. Nothing on it scrolls but the text, and the round button beside
 * the text gives it the whole sheet. The markup reuses data-reader,
 * data-figures, .reader-figure, data-figure-step and data-expand, which the
 * shared client code already drives.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `$item`: title, lines (list of strings), when, text (html), images
 * ([{id, caption}]).
 */
function cv_sheet_body( array $item ): string {
	$images = $item['images'];
	$n      = count( $images );
	$lines  = array_values( array_filter( $item['lines'] ?? [], fn( $l ) => '' !== trim( $l ) ) );

	$out = '<div class="sheet" data-reader data-sheet>'
		. '<header class="sheet-head">'
		. '<h2 class="sheet-title">' . esc_html( $item['title'] ) . '</h2>';
	if ( $lines ) {
		$out .= '<p class="sheet-lines">' . implode( '<br />', array_map( 'esc_html', $lines ) ) . '</p>';
	}
	if ( '' !== $item['when'] ) {
		$out .= '<p class="sheet-when">' . esc_html( $item['when'] ) . '</p>';
	}
	$out .= '</header>'
		. '<div class="sheet-text" data-sheet-text tabindex="-1">'
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
			$out .= '<button type="button" class="sheet-step sheet-prev" data-figure-step="-1" aria-label="Previous photograph">' . cv_sheet_chevron( 'M8 1 1 8l7 7' ) . '</button>'
				. '<button type="button" class="sheet-step sheet-next" data-figure-step="1" aria-label="Next photograph">' . cv_sheet_chevron( 'm1 1 7 7-7 7' ) . '</button>'
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

/** The sheet's arrow: a hairline chevron, eight wide and fifteen tall at 1920. */
function cv_sheet_chevron( string $d ): string {
	return '<svg viewBox="0 0 9 16" aria-hidden="true"><path d="' . esc_attr( $d ) . '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
