<?php
/** How big each painting really is, and how big to draw it — src/content/size.ts. */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** The geometric mean of the two sides, in centimetres. */
function cv_real_size( ?string $dimensions ): ?float {
	if ( ! $dimensions || ! preg_match( '/(\d+(?:[.,]\d+)?)\s*[x×X]\s*(\d+(?:[.,]\d+)?)/u', $dimensions, $m ) ) {
		return null;
	}
	$a = (float) str_replace( ',', '.', $m[1] );
	$b = (float) str_replace( ',', '.', $m[2] );
	if ( $a <= 0 || $b <= 0 ) {
		return null;
	}
	return sqrt( $a * $b );
}

/**
 * Per-work drawing scale against the median of the set, compressed (GAMMA) so
 * the smallest works are still pictures and the largest still the biggest thing
 * on the wall.
 */
function cv_scale_against( array $sizes ): callable {
	$gamma = 0.6;
	$min   = 0.55;
	$max   = 1.7;

	$known = array_values( array_filter( $sizes, fn( $s ) => null !== $s ) );
	if ( ! $known ) {
		return fn() => null;
	}
	sort( $known );
	$median = $known[ (int) floor( count( $known ) / 2 ) ];

	return function ( ?float $size, float $aspect ) use ( $median, $gamma, $min, $max ): ?float {
		if ( null === $size || ! ( $aspect > 0 ) ) {
			return null;
		}
		$raw    = pow( $size / $median, $gamma );
		$linear = min( $max, max( $min, $raw ) );
		return $linear / sqrt( $aspect );
	};
}
