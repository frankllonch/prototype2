<?php
/**
 * The grid, its tiles, the density controls and the year rail —
 * src/components/gallery.ts and src/components/years.ts.
 *
 * Rows of one height, widths following the pictures, left-aligned with wide
 * gutters. `--unit` (the row height) is the only thing the density control
 * changes; every tile's width is `--unit × --a`. Everything the lightbox
 * caption needs rides on the tile as data attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Density levels, after tylermitchell.co's 50 / 200 / 500. */
const CV_DENSITIES = [
	[ 'unit' => '14.51vw', 'label' => 24 ],
	[ 'unit' => '9.07vw', 'label' => 60 ],
	[ 'unit' => '7.26vw', 'label' => 154 ],
];
const CV_DEFAULT_DENSITY = 2;

/**
 * One tile. `$item`: slug, title, url, image (attachment id), and optionally
 * year, dimensions, materials, reference, available, plate.
 */
function cv_tile( array $item, int $index, bool $priority, ?string $panels = null, ?int $anchor = null, ?float $scaled = null ): string {
	$name   = $item['title'];
	$href   = $panels ? ( $item['url'] ?: "#{$panels}-{$item['slug']}" ) : $item['url'];
	$style  = '--a:' . number_format( cv_aspect( $item['image'] ), 4, '.', '' );
	if ( null !== $scaled ) {
		$style .= ';--sh:' . number_format( $scaled, 4, '.', '' );
	}
	$year = $item['year'] ?? null;

	return sprintf(
		'<a class="tile" href="%s"%s style="%s"%s data-title="%s" data-year="%s" data-dimensions="%s" data-materials="%s" data-reference="%s" data-available="%s" data-index="%d" aria-label="%s">%s</a>',
		esc_url( $href ),
		$anchor ? ' id="year-' . (int) $anchor . '"' : '',
		esc_attr( $style ),
		$panels ? ' data-panel-open="' . esc_attr( "{$panels}-{$item['slug']}" ) . '"' : '',
		esc_attr( $name ),
		esc_attr( $year ? (string) $year : '' ),
		esc_attr( $item['dimensions'] ?? '' ),
		esc_attr( $item['materials'] ?? '' ),
		esc_attr( $item['reference'] ?? '' ),
		! empty( $item['available'] ) ? 'true' : 'false',
		$index,
		esc_attr( $name . ( $year ? ", $year" : '' ) ),
		cv_image( $item['image'], '(max-width: 599px) 40vw, 260px', [ 'priority' => $priority, 'class' => 'tile-image', 'alt' => $item['alt'] ?? null ] )
	);
}

/**
 * The grid. Options: items, lightbox, panels (kind), stack, justified, feed,
 * toScale, eager (leading tiles loaded eagerly).
 */
function cv_grid( array $o ): string {
	$items     = $o['items'];
	$lightbox  = ! empty( $o['lightbox'] );
	$panels    = $o['panels'] ?? null;
	$stack     = ! empty( $o['stack'] );
	$justified = ! empty( $o['justified'] );
	$feed      = ! empty( $o['feed'] );
	$to_scale  = ! empty( $o['toScale'] );
	$eager     = $o['eager'] ?? 14;

	// Every tile carries the size it would be drawn at on a wall, whether or
	// not the reader ever asks for it: the switch is then a class on the grid.
	$sizes    = array_map( fn( $item ) => cv_real_size( $item['dimensions'] ?? null ), $items );
	$scale    = cv_scale_against( $sizes );
	$scale_of = fn( array $item, int $i ) => ( $to_scale && ! empty( $item['plate'] ) ) ? $scale( $sizes[ $i ], cv_aspect( $item['image'] ) ) : null;

	if ( $feed ) {
		$columns = [ '', '' ];
		foreach ( $items as $i => $item ) {
			$columns[ $i % 2 ] .= cv_tile( $item, $i, $i < $eager, $panels );
		}
		return '<div class="grid grid-feed" data-grid' . ( $lightbox ? ' data-lightbox-source' : '' ) . '>'
			. '<div class="feed-column">' . $columns[0] . '</div><div class="feed-column">' . $columns[1] . '</div></div>';
	}

	// The first tile of each year carries that year's anchor, so the rail can
	// be plain links and still work with scripting off.
	$seen  = [];
	$tiles = '';
	foreach ( $items as $i => $item ) {
		$year  = $item['year'] ?? null;
		$first = $year && ! isset( $seen[ $year ] );
		if ( $first ) {
			$seen[ $year ] = true;
		}
		$tiles .= cv_tile( $item, $i, $i < $eager, $panels, $first ? (int) $year : null, $scale_of( $item, $i ) );
	}

	return sprintf(
		'<div class="grid%s%s" data-grid%s%s%s style="--unit:%s">%s</div>',
		$justified ? ' grid-justified' : '',
		$to_scale ? ' grid-scaled' : '',
		$lightbox ? ' data-lightbox-source' : '',
		$stack ? ' data-stack' : '',
		$to_scale ? ' data-scalable' : '',
		CV_DENSITIES[ CV_DEFAULT_DENSITY ]['unit'],
		$tiles
	);
}

/**
 * Density steps and, where the works are catalogued with their measurements, a
 * switch between showing them all at one height and at their relative sizes.
 */
function cv_grid_controls( array $years = [], bool $scalable = false, ?int $total = null ): string {
	$out = '<div class="controls" data-controls><div class="control-group" role="group" aria-label="Grid size">';
	foreach ( CV_DENSITIES as $i => $d ) {
		$label  = ( $i === count( CV_DENSITIES ) - 1 && $total ) ? $total : $d['label'];
		$active = CV_DEFAULT_DENSITY === $i;
		$out   .= sprintf(
			'<button type="button" class="control%s" data-density="%s" aria-pressed="%s">%s</button>',
			$active ? ' is-active' : '',
			esc_attr( $d['unit'] ),
			$active ? 'true' : 'false',
			esc_html( (string) $label )
		);
	}
	$out .= '</div>';
	if ( $scalable ) {
		$out .= '<div class="control-group" role="group" aria-label="Sizing">'
			. '<button type="button" class="control" data-scale="equal" aria-pressed="false">Equal</button>'
			. '<button type="button" class="control is-active" data-scale="real" aria-pressed="true">To scale</button></div>';
	}
	if ( $years ) {
		$out .= '<div class="control-group" role="group" aria-label="Year">'
			. '<button type="button" class="control is-active" data-year-filter="all" aria-pressed="true">All</button>';
		foreach ( $years as $y ) {
			$out .= '<button type="button" class="control" data-year-filter="' . (int) $y . '" aria-pressed="false">' . (int) $y . '</button>';
		}
		$out .= '</div>';
	}
	return $out . '</div>';
}

/**
 * The year rail: a column of colour swatches down the left edge, one per year,
 * each in a colour sampled from that year's own paintings.
 */
function cv_year_rail( array $years ): string {
	if ( ! $years ) {
		return '';
	}
	$out = '<nav class="years" data-years aria-label="Jump to year">';
	foreach ( $years as $y ) {
		$out .= sprintf(
			'<a class="year" href="#year-%1$d" data-year="%1$d" style="--c:%2$s"><span class="year-swatch" aria-hidden="true"></span><span class="year-label">%1$d</span></a>',
			(int) $y['year'],
			esc_attr( $y['colour'] )
		);
	}
	return $out . '</nav>';
}
