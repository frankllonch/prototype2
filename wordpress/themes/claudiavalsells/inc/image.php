<?php
/**
 * Responsive pictures from the media library — src/components/image.ts.
 *
 * A `<picture>` with one `<source>` per modern format the library holds for the
 * image (AVIF, WebP, when a plugin such as Modern Image Formats makes them) and
 * the JPEG as the `<img>`, with every size WordPress made in its srcset.
 * `aspect-ratio` is always set from the measured size so the grid holds its
 * shape before any bytes arrive.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Everything known about an attachment, once per request: its size, alt, the
 * files per format and width.
 */
function cv_image_data( int $id ): ?array {
	static $cache = [];
	if ( array_key_exists( $id, $cache ) ) {
		return $cache[ $id ];
	}
	$meta = $id ? wp_get_attachment_metadata( $id ) : null;
	if ( ! $meta || empty( $meta['width'] ) || empty( $meta['height'] ) || empty( $meta['file'] ) ) {
		return $cache[ $id ] = null;
	}

	$uploads = wp_get_upload_dir();
	$dir     = $uploads['baseurl'];
	$rel     = _wp_get_attachment_relative_path( $meta['file'] );
	if ( $rel ) {
		$dir .= '/' . $rel;
	}
	$mime  = get_post_mime_type( $id ) ?: 'image/jpeg';
	$ratio = $meta['width'] / $meta['height'];
	$by    = [];

	$add = function ( string $type, int $width, int $height, string $file ) use ( &$by, $dir, $ratio ) {
		// A size cut to another shape (the admin's square thumbnail) is not this picture.
		if ( $height && abs( $width / $height - $ratio ) > 0.02 ) {
			return;
		}
		$by[ $type ][ $width ] = "$dir/" . wp_basename( $file );
	};

	$add( $mime, (int) $meta['width'], (int) $meta['height'], $meta['file'] );
	foreach ( $meta['sources'] ?? [] as $type => $source ) {
		$add( $type, (int) $meta['width'], (int) $meta['height'], $source['file'] );
	}
	foreach ( $meta['sizes'] ?? [] as $size ) {
		$add( $size['mime-type'] ?? $mime, (int) $size['width'], (int) $size['height'], $size['file'] );
		foreach ( $size['sources'] ?? [] as $type => $source ) {
			$add( $type, (int) $size['width'], (int) $size['height'], $source['file'] );
		}
	}
	foreach ( $by as &$list ) {
		ksort( $list );
	}
	unset( $list );

	$post = get_post( $id );
	return $cache[ $id ] = [
		'width'   => (int) $meta['width'],
		'height'  => (int) $meta['height'],
		'alt'     => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
		'caption' => $post ? trim( (string) $post->post_excerpt ) : '',
		'mime'    => $mime,
		'by'      => $by,
	];
}

/** Aspect ratio as a number, used by the gallery's row-packing maths. */
function cv_aspect( int $id ): float {
	$d = cv_image_data( $id );
	return $d && $d['height'] ? $d['width'] / $d['height'] : 0.75;
}

function cv_srcset( array $list ): string {
	$out = [];
	foreach ( $list as $width => $url ) {
		$out[] = esc_url( $url ) . " {$width}w";
	}
	return implode( ', ', $out );
}

/**
 * The picture.
 *
 * @param int    $id    The attachment.
 * @param string $sizes The `sizes` attribute. Get this right or the browser over-fetches.
 * @param array  $o     priority (eager, high fetch priority), class, alt (overrides the library's).
 */
function cv_image( int $id, string $sizes, array $o = [] ): string {
	$d = cv_image_data( $id );
	if ( ! $d ) {
		return '';
	}
	$priority = ! empty( $o['priority'] );
	$class    = $o['class'] ?? '';
	$alt      = array_key_exists( 'alt', $o ) && null !== $o['alt'] ? $o['alt'] : $d['alt'];
	$ratio    = "{$d['width']} / {$d['height']}";

	$fallback = $d['by'][ $d['mime'] ] ?? ( reset( $d['by'] ) ?: [] );
	if ( ! $fallback ) {
		return '';
	}
	$sources = '';
	foreach ( [ 'image/avif', 'image/webp' ] as $type ) {
		if ( $type !== $d['mime'] && ! empty( $d['by'][ $type ] ) ) {
			$sources .= sprintf( '<source type="%s" srcset="%s" sizes="%s" />', $type, cv_srcset( $d['by'][ $type ] ), esc_attr( $sizes ) );
		}
	}
	// The `src` is the widest of the rendered sizes rather than the full file,
	// so a browser without srcset is not handed the largest thing there is.
	$widths  = array_keys( $fallback );
	$chosen  = null;
	foreach ( $widths as $w ) {
		if ( $w <= 1600 ) {
			$chosen = $w;
		}
	}
	$src = $fallback[ $chosen ?? $widths[0] ];

	return sprintf(
		'<picture class="%s">%s<img src="%s" srcset="%s" sizes="%s" alt="%s" width="%d" height="%d" style="aspect-ratio:%s" loading="%s" %s /></picture>',
		esc_attr( $class ),
		$sources,
		esc_url( $src ),
		cv_srcset( $fallback ),
		esc_attr( $sizes ),
		esc_attr( $alt ),
		$d['width'],
		$d['height'],
		esc_attr( $ratio ),
		$priority ? 'eager' : 'lazy',
		$priority ? 'fetchpriority="high"' : 'decoding="async"'
	);
}

/**
 * The theme's own sizes get WebP too. The Modern Image Formats plugin writes
 * a second format only for WordPress's core sizes unless told otherwise, and
 * the sizes the pictures are actually served at are these three.
 */
add_filter( 'webp_uploads_image_sizes_with_additional_mime_type_support', function ( array $sizes ): array {
	foreach ( [ 'cv-400', 'cv-800', 'cv-1600' ] as $size ) {
		$sizes[ $size ] = true;
	}
	return $sizes;
} );
