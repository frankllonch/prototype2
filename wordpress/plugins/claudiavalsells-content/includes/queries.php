<?php
/**
 * The order things come in.
 *
 * Content rules rather than presentation, so they live here and not in the
 * theme: the works newest first, the exhibitions and the commissioned work in
 * the order they were listed with anything new on top, and everything on one
 * page — these are archives of a few hundred entries at most, not feeds.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'pre_get_posts', 'cvc_order_archives' );

function cvc_order_archives( WP_Query $q ): void {
	if ( is_admin() || ! $q->is_main_query() ) {
		return;
	}

	if ( $q->is_post_type_archive( 'artwork' ) ) {
		$q->set( 'posts_per_page', -1 );
		$q->set( 'no_found_rows', true );
		$q->set( 'meta_query', [ 'year' => [ 'key' => '_cv_year', 'type' => 'NUMERIC', 'compare' => 'EXISTS' ] ] );
		$q->set( 'orderby', [ 'year' => 'DESC', 'date' => 'DESC' ] );
	}

	if ( $q->is_post_type_archive( 'exhibition' ) || $q->is_post_type_archive( 'commissioned' ) ) {
		$q->set( 'posts_per_page', -1 );
		$q->set( 'no_found_rows', true );
		$q->set( 'meta_query', [ 'year' => [ 'key' => '_cv_year', 'type' => 'NUMERIC', 'compare' => 'EXISTS' ] ] );
		$q->set( 'orderby', [ 'menu_order' => 'ASC', 'year' => 'DESC', 'date' => 'DESC' ] );
	}
}

/**
 * Every published work, newest year first, ties broken by the date it was added.
 *
 * Cached for the request and for an hour across requests, since the gallery,
 * each painting's page (for its neighbours and its place in the archive) and
 * the year rail all ask for the same list.
 */
function cvc_works(): array {
	static $works = null;
	if ( null !== $works ) {
		return $works;
	}
	$ids = get_transient( 'cvc_work_ids' );
	if ( ! is_array( $ids ) ) {
		$ids = get_posts( [
			'post_type'      => 'artwork',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'meta_query'     => [ 'year' => [ 'key' => '_cv_year', 'type' => 'NUMERIC', 'compare' => 'EXISTS' ] ],
			'orderby'        => [ 'year' => 'DESC', 'date' => 'DESC' ],
		] );
		set_transient( 'cvc_work_ids', $ids, HOUR_IN_SECONDS );
	}
	_prime_post_caches( $ids, true, true );
	cvc_prime_pictures( $ids );
	$works = array_values( array_filter( array_map( 'get_post', $ids ) ) );
	return $works;
}

/**
 * The pictures of a list of entries, read into the cache in one go.
 *
 * Each tile asks for its picture's metadata and mime type; without this,
 * that is two queries per entry — some four hundred for the grid.
 */
function cvc_prime_pictures( array $post_ids ): void {
	$pictures = [];
	foreach ( $post_ids as $id ) {
		$thumb = (int) get_post_meta( $id, '_thumbnail_id', true );
		if ( $thumb ) {
			$pictures[] = $thumb;
		}
	}
	if ( $pictures ) {
		_prime_post_caches( array_unique( $pictures ), false, true );
	}
}

/**
 * The list is remade whenever a work is saved, trashed or restored. The save
 * is caught on wp_after_insert_post, which the block editor fires once an
 * entry's fields are written — save_post fires before them, with the year
 * still the old one.
 */
add_action( 'wp_after_insert_post', function ( int $post_id, WP_Post $post ) {
	if ( 'artwork' === $post->post_type ) {
		cvc_forget_works();
	}
}, 10, 2 );
add_action( 'deleted_post', 'cvc_forget_works' );
add_action( 'trashed_post', 'cvc_forget_works' );
add_action( 'untrashed_post', 'cvc_forget_works' );
function cvc_forget_works(): void {
	delete_transient( 'cvc_work_ids' );
}

/**
 * An entry saved without a year is this year's.
 *
 * The year is what the grid, the rail and the lists are ordered by, so an
 * entry without one would not appear at all — and the editor only sends the
 * fields that were touched, so a new painting published without opening the
 * Year field has none. This year is the likeliest answer, and the field is
 * there to correct it. Early, so the colour sampler and the list cache see it.
 */
add_action( 'wp_after_insert_post', function ( int $post_id, WP_Post $post ) {
	if ( ! in_array( $post->post_type, [ 'artwork', 'exhibition', 'commissioned' ], true ) ) {
		return;
	}
	if ( in_array( $post->post_status, [ 'auto-draft', 'trash' ], true ) ) {
		return;
	}
	if ( '' === (string) get_post_meta( $post_id, '_cv_year', true ) ) {
		update_post_meta( $post_id, '_cv_year', (int) current_time( 'Y' ) );
	}
}, 5, 2 );

/** Exhibitions in their listed order: anything new (order 0) first, then as listed, then by year. */
function cvc_exhibitions(): array {
	static $items = null;
	if ( null === $items ) {
		$items = get_posts( [
			'post_type'      => 'exhibition',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'no_found_rows'  => true,
			'meta_query'     => [ 'year' => [ 'key' => '_cv_year', 'type' => 'NUMERIC', 'compare' => 'EXISTS' ] ],
			'orderby'        => [ 'menu_order' => 'ASC', 'year' => 'DESC', 'date' => 'DESC' ],
		] );
		cvc_prime_pictures( wp_list_pluck( $items, 'ID' ) );
	}
	return $items;
}

/**
 * The commissioned work by group, the groups in their own order.
 *
 * A project filed under no group falls into the first one rather than
 * disappearing — it turns up on the page where it will be noticed and moved.
 */
function cvc_commissioned_groups(): array {
	$terms = get_terms( [ 'taxonomy' => 'commissioned_group', 'hide_empty' => false ] );
	if ( is_wp_error( $terms ) ) {
		$terms = [];
	}
	usort( $terms, fn( $a, $b ) => (int) get_term_meta( $a->term_id, 'order', true ) <=> (int) get_term_meta( $b->term_id, 'order', true ) );

	$groups = [];
	foreach ( $terms as $term ) {
		$groups[ $term->term_id ] = [ 'name' => $term->name, 'slug' => $term->slug, 'items' => [] ];
	}
	$first = array_key_first( $groups );

	$posts = get_posts( [
		'post_type'      => 'commissioned',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'no_found_rows'  => true,
		'meta_query'     => [ 'year' => [ 'key' => '_cv_year', 'type' => 'NUMERIC', 'compare' => 'EXISTS' ] ],
		'orderby'        => [ 'menu_order' => 'ASC', 'year' => 'DESC', 'date' => 'DESC' ],
	] );
	cvc_prime_pictures( wp_list_pluck( $posts, 'ID' ) );
	foreach ( $posts as $post ) {
		// get_the_terms reads the cache get_posts has just filled; wp_get_post_terms would query again.
		$own = get_the_terms( $post, 'commissioned_group' );
		$own = is_array( $own ) ? wp_list_pluck( $own, 'term_id' ) : [];
		$key = ( $own && isset( $groups[ $own[0] ] ) ) ? $own[0] : $first;
		if ( null === $key ) {
			$groups[0] = [ 'name' => __( 'Commissioned', 'claudiavalsells' ), 'slug' => 'commissioned', 'items' => [] ];
			$key = $first = 0;
		}
		$groups[ $key ]['items'][] = $post;
	}
	return array_values( array_filter( $groups, fn( $g ) => count( $g['items'] ) > 0 ) );
}

/** The editions, newest first — III, II, I — which is how the site builds them. */
function cvc_editions(): array {
	$editions = get_posts( [
		'post_type'      => 'wc_edition',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'no_found_rows'  => true,
	] );
	usort( $editions, fn( $a, $b ) => cvc_roman( get_post_meta( $b->ID, '_cv_numeral', true ) ) <=> cvc_roman( get_post_meta( $a->ID, '_cv_numeral', true ) ) );
	return $editions;
}

function cvc_roman( $numeral ): int {
	$values = [ 'I' => 1, 'V' => 5, 'X' => 10, 'L' => 50, 'C' => 100 ];
	$total  = 0;
	$chars  = str_split( strtoupper( trim( (string) $numeral ) ) );
	for ( $i = 0; $i < count( $chars ); $i++ ) {
		$v = $values[ $chars[ $i ] ] ?? 0;
		$n = $values[ $chars[ $i + 1 ] ?? '' ] ?? 0;
		$total += $v < $n ? -$v : $v;
	}
	return $total;
}

/** Everyone filed under an edition, in the order they were listed. */
function cvc_answers( WP_Post $edition ): array {
	$term = get_term_by( 'slug', $edition->post_name, 'cv_edition' );
	if ( ! $term ) {
		return [];
	}
	return get_posts( [
		'post_type'      => 'wc_answer',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'no_found_rows'  => true,
		'orderby'        => [ 'menu_order' => 'ASC', 'title' => 'ASC' ],
		'tax_query'      => [ [ 'taxonomy' => 'cv_edition', 'field' => 'term_id', 'terms' => $term->term_id ] ],
	] );
}
