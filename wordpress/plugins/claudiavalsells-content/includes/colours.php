<?php
/**
 * One colour per year, taken from that year's paintings.
 *
 * The year rail is a column of swatches, each sampled from the work itself.
 * The colours of the years already on the site were sampled by the static
 * site's palette script and arrive with the import; a year that has none yet —
 * the first painting of a new year — is sampled here, from the thumbnails of
 * its works, the first time one is saved.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** `[ year => '#rrggbb' ]`, as stored. */
function cvc_year_colours(): array {
	$stored = get_option( 'cv_year_colours', [] );
	return is_array( $stored ) ? $stored : [];
}

add_action( 'save_post_artwork', function ( int $post_id, WP_Post $post ) {
	if ( 'publish' !== $post->post_status ) {
		return;
	}
	$year = (int) get_post_meta( $post_id, '_cv_year', true );
	if ( ! $year ) {
		return;
	}
	$colours = cvc_year_colours();
	if ( ! empty( $colours[ $year ] ) ) {
		return;
	}
	$colour = cvc_sample_year( $year );
	if ( $colour ) {
		$colours[ $year ] = $colour;
		update_option( 'cv_year_colours', $colours, false );
	}
}, 20, 2 );

/**
 * The commonest vivid hue across a year's paintings.
 *
 * Every thumbnail is read and only actual paint kept — the wall, the glass and
 * the cream ground go by saturation and lightness. What remains is bucketed by
 * hue, weighted by how vivid it is, and the heaviest bucket's average is the
 * year's colour. Simpler than the palette script, which asks which hue a year
 * leans on more than the archive does; good enough for a swatch until that
 * script is run again.
 */
function cvc_sample_year( int $year ): ?string {
	if ( ! function_exists( 'imagecreatefromstring' ) ) {
		return null;
	}
	$ids = get_posts( [
		'post_type'      => 'artwork',
		'post_status'    => 'publish',
		'posts_per_page' => 40,
		'fields'         => 'ids',
		'no_found_rows'  => true,
		'meta_key'       => '_cv_year',
		'meta_value'     => $year,
	] );

	$buckets = array_fill( 0, 24, [ 'w' => 0.0, 'r' => 0.0, 'g' => 0.0, 'b' => 0.0 ] );
	foreach ( $ids as $id ) {
		$thumb = get_post_thumbnail_id( $id );
		if ( ! $thumb ) {
			continue;
		}
		$file = get_attached_file( $thumb );
		$meta = wp_get_attachment_metadata( $thumb );
		if ( $file && ! empty( $meta['sizes']['thumbnail']['file'] ) ) {
			$file = path_join( dirname( $file ), $meta['sizes']['thumbnail']['file'] );
		}
		if ( ! $file || ! is_readable( $file ) ) {
			continue;
		}
		$img = @imagecreatefromstring( (string) file_get_contents( $file ) );
		if ( ! $img ) {
			continue;
		}
		$w = imagesx( $img );
		$h = imagesy( $img );
		$step = max( 1, (int) floor( max( $w, $h ) / 64 ) );
		for ( $y = 0; $y < $h; $y += $step ) {
			for ( $x = 0; $x < $w; $x += $step ) {
				$rgb = imagecolorat( $img, $x, $y );
				$r = ( ( $rgb >> 16 ) & 255 ) / 255;
				$g = ( ( $rgb >> 8 ) & 255 ) / 255;
				$b = ( $rgb & 255 ) / 255;
				$max = max( $r, $g, $b );
				$min = min( $r, $g, $b );
				$l = ( $max + $min ) / 2;
				$d = $max - $min;
				if ( $d <= 0 || $l < 0.12 || $l > 0.74 ) {
					continue;
				}
				$s = $l > 0.5 ? $d / ( 2 - $max - $min ) : $d / ( $max + $min );
				if ( $s < 0.34 ) {
					continue;
				}
				if ( $max === $r ) {
					$hue = ( ( $g - $b ) / $d + ( $g < $b ? 6 : 0 ) ) / 6;
				} elseif ( $max === $g ) {
					$hue = ( ( $b - $r ) / $d + 2 ) / 6;
				} else {
					$hue = ( ( $r - $g ) / $d + 4 ) / 6;
				}
				$i = min( 23, (int) floor( $hue * 24 ) );
				$buckets[ $i ]['w'] += $s;
				$buckets[ $i ]['r'] += $r * $s;
				$buckets[ $i ]['g'] += $g * $s;
				$buckets[ $i ]['b'] += $b * $s;
			}
		}
		imagedestroy( $img );
	}

	usort( $buckets, fn( $a, $b ) => $b['w'] <=> $a['w'] );
	$best = $buckets[0];
	if ( $best['w'] <= 0 ) {
		return null;
	}
	$hex = fn( float $v ) => str_pad( dechex( (int) round( min( 1, max( 0, $v / $best['w'] ) ) * 255 ) ), 2, '0', STR_PAD_LEFT );
	return '#' . $hex( $best['r'] ) . $hex( $best['g'] ) . $hex( $best['b'] );
}
