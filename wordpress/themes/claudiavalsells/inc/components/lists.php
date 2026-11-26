<?php
/** The two indexes — src/components/exhibitions.ts and src/components/commissioned.ts. */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The sheet's four groups, in its order: the key a row is filed under, and the
 * name over it — SHOW_GROUPS in src/content/exhibitions-list.ts.
 */
const CV_SHOW_GROUPS = [
	'solo'       => 'Solo shows',
	'group'      => 'Group shows',
	'fair'       => 'Art fairs',
	'collection' => 'Private collections',
];

/**
 * The groups the phone sheet runs together, in the order they take within a year
 * (PHONE_MERGED).
 */
const CV_PHONE_MERGED = [ 'solo', 'group' ];

/**
 * The opening phrase of a location: the kind of show, its comma if it has one,
 * and an "at" if one follows (KIND).
 */
const CV_SHOW_KIND = '/^\s*((?:solo|solow|group)\s*(?:show|exhibition)s?\b,?)[\s,]*(at\s+)?/iu';

/** The place a show was, with the kind of show taken off the front — placeOf(). */
function cv_show_place( string $venue ): string {
	return (string) preg_replace( '/^\s+|\s+$/u', '', (string) preg_replace( CV_SHOW_KIND, '', $venue ) );
}

/** What cv_show_place() takes off, for the phone, which shows it — kindOf(). */
function cv_show_kind( string $venue ): ?array {
	return preg_match( CV_SHOW_KIND, $venue, $lead ) ? [ 'kind' => $lead[1], 'at' => ! empty( $lead[2] ) ] : null;
}

/** Where each row stands on the phone, counted from 1, by its index in `$rows` — phoneOrder(). */
function cv_show_phone_order( array $rows ): array {
	$run = [];
	foreach ( $rows as $i => $row ) {
		$merged = array_search( $row['group'], CV_PHONE_MERGED, true );
		if ( false !== $merged ) {
			$run[] = [ 'year' => (int) ( $row['year'] ?? 0 ), 'merged' => $merged, 'index' => $i ];
		}
	}
	usort( $run, fn( $a, $b ) => [ $b['year'], $a['merged'], $a['index'] ] <=> [ $a['year'], $b['merged'], $b['index'] ] );
	$sequence = array_column( $run, 'index' );
	foreach ( array_keys( CV_SHOW_GROUPS ) as $group ) {
		if ( in_array( $group, CV_PHONE_MERGED, true ) ) {
			continue;
		}
		foreach ( $rows as $i => $row ) {
			if ( $row['group'] === $group ) {
				$sequence[] = $i;
			}
		}
	}
	$order = [];
	foreach ( $sequence as $n => $i ) {
		$order[ $i ] = $n + 1;
	}
	return $order;
}

/** `$shows`: exhibitions as cv_exhibition() reads them, in their listed order. */
function cv_exhibition_list( array $shows, array $collections = [] ): string {
	$rows = [];
	foreach ( $shows as $s ) {
		$kind       = $s['kindKey'] ?? '';
		$s['group'] = isset( CV_SHOW_GROUPS[ $kind ] ) && 'collection' !== $kind ? $kind : array_key_first( CV_SHOW_GROUPS );
		$rows[]     = $s;
	}
	// A collection states no year, has no page behind it and no photograph.
	foreach ( $collections as $c ) {
		$rows[] = [ 'group' => 'collection', 'title' => $c['name'], 'venue' => $c['place'] ?? '' ];
	}
	$order = cv_show_phone_order( $rows );

	$out = '<div class="xlist exh-list"><h2 class="sr-only">Exhibitions</h2>';
	foreach ( CV_SHOW_GROUPS as $group => $name ) {
		$mine = array_filter( $rows, fn( $row ) => $row['group'] === $group );
		if ( ! $mine ) {
			continue;
		}
		// On the phone a merged group loses its heading to the eye, since its rows no longer stand
		// together; the others keep theirs, placed just ahead of their first row.
		$merged = in_array( $group, CV_PHONE_MERGED, true );
		$first  = min( array_intersect_key( $order, $mine ) );
		$out   .= '<section class="xgroup" data-group="' . esc_attr( $name ) . '"' . ( $merged ? ' data-phone="merged"' : '' ) . '>'
			. '<h2 class="xgroup-name"' . ( $merged ? '' : ' style="--phone-order:' . $first . '"' ) . '>' . esc_html( $name ) . '</h2>'
			. '<div class="xrows">';
		foreach ( $mine as $i => $row ) {
			$out .= cv_exhibition_row( $row, $order[ $i ] );
		}
		$out .= '</div></section>';
	}
	return $out . '</div>';
}

/** A row: the show's name, what kind it was and where, and the year at the margin. */
function cv_exhibition_row( array $s, int $order ): string {
	$venue = (string) ( $s['venue'] ?? '' );
	$place = cv_show_place( $venue );
	$lead  = cv_show_kind( $venue );
	$note  = (string) ( $s['note'] ?? '' );
	// The row's photograph is the first of the show's reel, never one set apart.
	$cover = (int) ( $s['images'][0]['id'] ?? 0 );

	$inner = '<span class="exh-name"><span class="exh-title">' . esc_html( $s['title'] ) . '</span>'
		. ( '' !== $note ? '<span class="exh-note">' . esc_html( $note ) . '</span>' : '' )
		. ( $lead ? '<span class="exh-kind">' . esc_html( $lead['kind'] ) . '</span>' : '' )
		. ( '' !== $place ? '<span class="exh-venue">' . ( $lead && $lead['at'] ? '<span class="exh-at">at </span>' : '' ) . esc_html( $place ) . '</span>' : '' )
		. '</span>'
		. '<span class="exh-plate" aria-hidden="true">'
		. ( $cover ? cv_image( $cover, '(max-width: 899px) 30vw, 13vw', [ 'alt' => '' ] ) : '' )
		. '</span>'
		. '<span class="exh-year">'
		. ( ! empty( $s['year'] ) ? '<span>' . (int) $s['year'] . '</span>' : '' )
		. ( ! empty( $s['yearEnd'] ) ? '<span>' . (int) $s['yearEnd'] . '</span>' : '' )
		. '</span>';

	// Only a show with a page behind it is a link; the rest are plain rows that still answer to
	// the pointer, so the list reads as one thing.
	return ! empty( $s['hasPage'] )
		? '<a class="xrow hrow" href="' . esc_url( $s['url'] ) . '" data-panel-open="' . esc_attr( "exhibition-{$s['slug']}" ) . '" style="--phone-order:' . $order . '">' . $inner . '</a>'
		: '<div class="xrow hrow" style="--phone-order:' . $order . '">' . $inner . '</div>';
}

/**
 * Where the phone sheet turns a project's name onto its second line by hand, as
 * the words it comes after, by the project's slug — BREAK_AFTER in
 * src/content/groups.ts.
 */
function cv_index_breaks(): array {
	static $breaks = null;
	if ( null === $breaks ) {
		$breaks = json_decode( (string) @file_get_contents( CV_THEME_DIR . '/assets/index-breaks.json' ), true );
		$breaks = is_array( $breaks ) ? $breaks : [];
	}
	return $breaks;
}

/**
 * A project's name, escaped, with the one designed break offered where it is
 * recorded — title() in src/components/commissioned.ts, with breakOf()'s
 * guard: only while the name still opens with those words and goes on.
 */
function cv_index_title( string $slug, string $title ): string {
	$lead = cv_index_breaks()[ $slug ] ?? '';
	if ( ! is_string( $lead ) || '' === $lead || ! str_starts_with( $title, "$lead " ) || strlen( $title ) <= strlen( $lead ) + 1 ) {
		return esc_html( $title );
	}
	return esc_html( $lead ) . ' <br class="xrow-br">' . esc_html( substr( $title, strlen( $lead ) + 1 ) );
}

/** `$groups`: [{name, items: [project arrays]}]. */
function cv_commissioned_list( array $groups ): string {
	$out = '<div class="xlist com-list">';
	foreach ( $groups as $group ) {
		$out .= '<section class="xgroup"><h2 class="xgroup-name">' . esc_html( $group['name'] ) . '</h2><div class="xrows">';
		foreach ( $group['items'] as $item ) {
			// The first photograph of the project's reel, never one set apart.
			$cover = (int) ( $item['images'][0]['id'] ?? 0 );
			$out  .= '<a class="xrow hrow" href="' . esc_url( $item['url'] ) . '" data-panel-open="' . esc_attr( "commissioned-{$item['slug']}" ) . '">'
				. '<span class="xrow-title">' . cv_index_title( $item['slug'], $item['title'] ) . '</span>'
				. '<span class="exh-plate" aria-hidden="true">'
				. ( $cover ? cv_image( $cover, '(max-width: 899px) 30vw, 13vw', [ 'alt' => '' ] ) : '' )
				. '</span>'
				. '<span class="xrow-when">' . esc_html( $item['when'] ) . '</span>'
				. '</a>';
		}
		$out .= '</div></section>';
	}
	return $out . '</div>';
}
