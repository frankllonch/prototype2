<?php
/**
 * A painting on its own page — the detail in src/pages/index.ts.
 *
 * The cut-out takes the plate; behind it, when the painting was cropped, is the
 * photograph it was cut from, and after that any further views. Each gets a
 * small picture under the plate. The caption follows the designer's sheet: the
 * title and the medium at the painting's top edge, the year and the size part
 * way down, the work's place in the archive at its bottom edge.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** The first year whose cut-outs lean towards the pointer; earlier ones lie flat. */
const CV_TILT_FROM = 2021;

/**
 * The painting, and under it its other pictures and `$under` (the work's place
 * in the archive) — plateStage() in src/pages/index.ts.
 */
function cv_plate_stage( array $work, string $under = '' ): string {
	if ( ! $work['image'] ) {
		return '';
	}
	// Only a cut-out leans, and only from CV_TILT_FROM on. Before that the
	// cut-out is for the gallery alone: the page shows the photograph it was
	// taken from, and lies flat.
	$plate = $work['plate'] && ( $work['year'] ?? 0 ) >= CV_TILT_FROM;
	$cover = cv_image_data( $work['image'] );
	$alt   = cv_describe( $work, $cover ? $cover['alt'] : '' );

	$views = [];
	if ( $plate ) {
		$views[] = [ 'id' => $work['image'], 'alt' => $alt ];
	}
	if ( $work['photo'] ) {
		$views[] = [ 'id' => $work['photo'], 'alt' => "Photograph of {$work['title']}, uncropped" ];
	} elseif ( ! $plate ) {
		$views[] = [ 'id' => $work['image'], 'alt' => $alt ];
	}
	foreach ( $work['views'] as $view ) {
		$d       = cv_image_data( $view['id'] );
		$views[] = [ 'id' => $view['id'], 'alt' => ( $d && $d['alt'] ) ? $d['alt'] : "{$work['title']}, another view" ];
	}

	$out = '<div class="detail-stage"><figure class="detail-plate" data-tilt><span class="detail-plate-inner' . ( $plate ? '' : ' is-photo' ) . '">';
	foreach ( $views as $i => $v ) {
		$out .= '<span class="detail-view' . ( 0 === $i ? ' is-shown' : '' ) . '" data-view="' . $i . '"' . ( $plate && 0 === $i ? ' data-plate' : '' ) . '>'
			. cv_image( $v['id'], '(max-width: 900px) 92vw, 54vw', [ 'priority' => 0 === $i, 'alt' => $v['alt'] ] )
			. '</span>';
	}
	$out .= '</span></figure><div class="detail-under">';
	if ( count( $views ) > 1 ) {
		$out .= '<div class="detail-thumbs" role="group" aria-label="Pictures of this work">';
		foreach ( $views as $i => $v ) {
			$out .= sprintf(
				'<button type="button" class="detail-thumb%s" data-show="%d" aria-pressed="%s" aria-label="%s">%s</button>',
				0 === $i ? ' is-shown' : '',
				$i,
				0 === $i ? 'true' : 'false',
				esc_attr( $v['alt'] ),
				cv_image( $v['id'], '(max-width: 899px) 5rem, 6vw', [ 'priority' => true, 'alt' => '' ] )
			);
		}
		$out .= '</div>';
	}
	return $out . $under . '</div></div>';
}

/**
 * The page: the plate with the work's place in the archive under it, the
 * caption — title and medium, then size and year — and the way through the
 * collection. The arrangement is the stylesheet's (01-grid.css).
 *
 * The ghost is for the phone alone, whose sheet shows the gallery faintly
 * behind the open work: the paintings that stand round this one there, drawn
 * again as a ground with nothing in it to read or to touch (05-artwork.css,
 * THE WORK ON A PHONE). They are lazy and out of the layout on a wide screen,
 * so nothing is fetched for them there.
 */
function cv_artwork_detail( WP_Post $post ): string {
	$work  = cv_work( $post );
	$works = cv_works();
	$index = array_search( $post->ID, array_map( fn( $p ) => $p->ID, $works ), true );
	$prev  = false !== $index && $index > 0 ? $works[ $index - 1 ] : null;
	$next  = false !== $index && isset( $works[ $index + 1 ] ) ? $works[ $index + 1 ] : null;

	$link = fn( ?WP_Post $p, string $label, string $rel ) => $p
		? '<a href="' . esc_url( get_permalink( $p ) ) . '" rel="' . $rel . '" data-replace>' . $label . '</a>'
		: '<span></span>';

	$place = false !== $index
		? '<p class="detail-index"><b>' . ( $index + 1 ) . '</b> of ' . count( $works ) . '</p>'
		: '';

	$ghost = '';
	foreach ( cv_work_around( $post ) as $cover ) {
		$ghost .= cv_image( $cover, '43vw', [ 'alt' => '' ] );
	}

	$gallery = esc_url( home_url( '/artwork/' ) );
	$out     = '<article class="detail">'
		. ( $ghost ? '<div class="detail-ghost" aria-hidden="true">' . $ghost . '</div>' : '' )
		. '<a class="detail-back detail-section" href="' . $gallery . '">Artwork</a>'
		. '<a class="detail-back detail-close" href="' . $gallery . '" aria-label="Close, back to the gallery">Close</a>'
		. cv_plate_stage( $work, $place )
		. '<div class="detail-caption"><div class="detail-head"><h1 class="detail-title">' . esc_html( $work['title'] ) . '</h1>'
		. ( $work['materials'] ? '<p class="detail-medium">' . esc_html( $work['materials'] ) . '</p>' : '' )
		. '</div><div class="detail-facts">'
		. ( $work['dimensions'] ? '<p class="detail-size">' . esc_html( $work['dimensions'] ) . '</p>' : '' )
		. ( $work['year'] ? '<p class="detail-year">' . (int) $work['year'] . '</p>' : '' )
		. '</div></div>';
	$out .= '<nav class="detail-pager" aria-label="Between works">'
		. $link( $prev, 'Previous', 'prev' )
		. $link( $next, 'Next', 'next' )
		. '</nav></article>';
	return $out;
}

/**
 * The covers of the twelve paintings round a work on the phone gallery's two
 * columns — its own row, the two rows above and the three below, or the
 * nearest twelve at either end. The gallery's own list and order (every work
 * with a cover, as archive-artwork.php prints them); none for a work that has
 * no cover and so is not on that wall. The same rule as src/build.ts.
 *
 * @return int[] Attachment ids.
 */
function cv_work_around( WP_Post $post, int $count = 12 ): array {
	$wall = [];
	$at   = -1;
	foreach ( cv_works() as $p ) {
		$cover = (int) get_post_thumbnail_id( $p );
		if ( ! $cover ) {
			continue;
		}
		if ( $p->ID === $post->ID ) {
			$at = count( $wall );
		}
		$wall[] = $cover;
	}
	if ( $at < 0 ) {
		return [];
	}
	$from = max( 0, min( intdiv( $at, 2 ) * 2 - 4, count( $wall ) - $count ) );
	return array_slice( $wall, $from, $count );
}

/** A work as a grid item. */
function cv_work_item( WP_Post $p ): array {
	$w = cv_work( $p );
	$d = cv_image_data( $w['image'] );
	return $w + [ 'alt' => cv_describe( $w, $d ? $d['alt'] : '' ) ];
}
