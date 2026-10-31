<?php
/**
 * Reading the entries — the theme's one layer over WordPress's data.
 *
 * Each function hands a component a plain array shaped like the TypeScript
 * props it was written for, so the components below need know nothing about
 * post meta, taxonomies or blocks. Lists come from the content plugin
 * (cvc_works and friends), which owns the order things come in.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cv_meta( int $id, string $key, $default = '' ) {
	$value = get_post_meta( $id, $key, true );
	return ( '' === $value || null === $value || false === $value ) ? $default : $value;
}

/**
 * A post's content rendered block by block, with every picture handed to
 * `$image` — `(int $attachment, string $caption) => string` — instead of
 * being drawn where it stands. Text blocks render as the editor saved them.
 */
function cv_render_content( WP_Post $post, callable $image ): string {
	$out  = '';
	$walk = function ( array $blocks ) use ( &$walk, &$out, $image ) {
		foreach ( $blocks as $block ) {
			$name = $block['blockName'];
			if ( 'core/image' === $name ) {
				$id = (int) ( $block['attrs']['id'] ?? 0 );
				if ( $id ) {
					$caption = preg_match( '#<figcaption[^>]*>(.*?)</figcaption>#s', $block['innerHTML'] ?? '', $m ) ? wp_strip_all_tags( $m[1] ) : '';
					$out .= $image( $id, trim( $caption ) );
				}
				continue;
			}
			if ( 'core/gallery' === $name ) {
				$walk( $block['innerBlocks'] ?? [] );
				continue;
			}
			if ( null === $name ) {
				$html = trim( $block['innerHTML'] ?? '' );
				if ( '' !== $html ) {
					$out .= wpautop( $html );
				}
				continue;
			}
			$out .= cv_bare_block( render_block( $block ) );
		}
	};
	$walk( parse_blocks( $post->post_content ) );
	return trim( $out );
}

/**
 * A rendered block without the class the editor stamps on it.
 *
 * WordPress marks each paragraph, heading and list it renders with
 * `wp-block-paragraph` and the like, a hook for themes styled through
 * theme.json. This theme is styled by the design's own stylesheet, written
 * against bare elements, and its pages are meant to be the static site's
 * markup to the byte — so the stamp comes off, and a class the editor was
 * given for a block (about-lead, say) stays.
 */
function cv_bare_block( string $html ): string {
	return (string) preg_replace_callback(
		'/\sclass="([^"]*)"/',
		function ( array $m ): string {
			$kept = array_filter( explode( ' ', $m[1] ), fn( string $c ) => '' !== $c && ! str_starts_with( $c, 'wp-block-' ) );
			return $kept ? ' class="' . implode( ' ', $kept ) . '"' : '';
		},
		$html
	);
}

/** The text of an entry on one side, its pictures (ids, with any caption typed in the editor) on the other. */
function cv_content_parts( WP_Post $post ): array {
	static $cache = [];
	if ( isset( $cache[ $post->ID ] ) ) {
		return $cache[ $post->ID ];
	}
	$images = [];
	$text   = cv_render_content( $post, function ( int $id, string $caption ) use ( &$images ) {
		// A picture deleted from the library leaves its id behind in the block;
		// it is not a figure any more, and not counted as one.
		if ( ! isset( $images[ $id ] ) && 'attachment' === get_post_type( $id ) ) {
			$images[ $id ] = [ 'id' => $id, 'caption' => $caption ];
		}
		return '';
	} );
	return $cache[ $post->ID ] = [ 'text' => $text, 'images' => array_values( $images ) ];
}

/* ----------------------------------------------------------------- works */

function cv_works(): array {
	return function_exists( 'cvc_works' ) ? cvc_works() : [];
}

/** A painting, as the grid, the lightbox and its own page need it. */
function cv_work( WP_Post $p ): array {
	static $cache = [];
	if ( isset( $cache[ $p->ID ] ) ) {
		return $cache[ $p->ID ];
	}
	$parts = cv_content_parts( $p );
	$cover = (int) get_post_thumbnail_id( $p );
	$photo = (int) cv_meta( $p->ID, '_cv_photo_id', 0 );
	if ( $photo && 'attachment' !== get_post_type( $photo ) ) {
		$photo = 0;
	}
	$views = array_values( array_filter( $parts['images'], fn( $i ) => $i['id'] !== $cover && $i['id'] !== $photo ) );
	$year  = (int) cv_meta( $p->ID, '_cv_year', 0 );

	return $cache[ $p->ID ] = [
		'id'         => $p->ID,
		'slug'       => $p->post_name,
		'title'      => get_the_title( $p ),
		'url'        => get_permalink( $p ),
		'year'       => $year ?: null,
		'dimensions' => (string) cv_meta( $p->ID, '_cv_dimensions' ),
		'materials'  => (string) cv_meta( $p->ID, '_cv_materials' ),
		'reference'  => (string) cv_meta( $p->ID, '_cv_reference' ),
		'available'  => (bool) get_post_meta( $p->ID, '_cv_available', true ),
		'plate'      => (bool) get_post_meta( $p->ID, '_cv_plate', true ),
		'image'      => $cover,
		'photo'      => $photo && $photo !== $cover ? $photo : 0,
		'views'      => $views,
		'text'       => $parts['text'],
	];
}

/** Alt text for a work's picture, built from its own facts where the library has none. */
function cv_describe( array $work, string $alt ): string {
	if ( '' !== trim( $alt ) ) {
		return $alt;
	}
	$facts = array_filter( [ $work['materials'], $work['dimensions'], $work['year'] ? (string) $work['year'] : '' ] );
	$by    = 'Painting by Claudia Valsells.';
	return $facts ? "{$work['title']} — " . implode( ', ', $facts ) . ". $by" : "{$work['title']}. $by";
}

/**
 * The years with works in them, newest first, each with its colour.
 *
 * The colours were sampled from the paintings (content/years.json, carried in by
 * the import, and the plugin for a year that has none yet). A year with no
 * colour at all is given a grey, which is visibly the absence of one.
 */
function cv_years(): array {
	static $years = null;
	if ( null !== $years ) {
		return $years;
	}
	$colours = function_exists( 'cvc_year_colours' ) ? cvc_year_colours() : [];
	$counts  = [];
	foreach ( cv_works() as $p ) {
		$y = (int) cv_meta( $p->ID, '_cv_year', 0 );
		if ( $y ) {
			$counts[ $y ] = ( $counts[ $y ] ?? 0 ) + 1;
		}
	}
	krsort( $counts );
	$years = [];
	foreach ( $counts as $y => $count ) {
		$years[] = [ 'year' => $y, 'colour' => $colours[ $y ] ?? '#8d8d87', 'count' => $count ];
	}
	return $years;
}

/* ----------------------------------------------------- exhibitions, projects */

const CV_KIND_LABELS = [ 'solo' => 'Solo show', 'group' => 'Group show', 'fair' => '' ];

/** An exhibition, for the list row and the panel. */
function cv_exhibition( WP_Post $p ): array {
	static $cache = [];
	if ( isset( $cache[ $p->ID ] ) ) {
		return $cache[ $p->ID ];
	}
	$parts  = cv_content_parts( $p );
	$cover  = (int) get_post_thumbnail_id( $p );
	$images = $parts['images'];
	if ( $cover && ! in_array( $cover, array_column( $images, 'id' ), true ) ) {
		array_unshift( $images, [ 'id' => $cover, 'caption' => '' ] );
	}
	$kind    = (string) cv_meta( $p->ID, '_cv_kind' );
	$year    = (int) cv_meta( $p->ID, '_cv_year', 0 );
	$yearEnd = (int) cv_meta( $p->ID, '_cv_year_end', 0 );

	return $cache[ $p->ID ] = [
		'id'      => $p->ID,
		'slug'    => $p->post_name,
		'title'   => get_the_title( $p ),
		'url'     => get_permalink( $p ),
		'year'    => $year ?: null,
		'yearEnd' => $yearEnd ?: null,
		'venue'   => (string) cv_meta( $p->ID, '_cv_venue' ),
		'from'    => (string) cv_meta( $p->ID, '_cv_from' ),
		'to'      => (string) cv_meta( $p->ID, '_cv_to' ),
		'kindKey' => $kind,
		'kind'    => CV_KIND_LABELS[ $kind ] ?? '',
		'note'    => (string) cv_meta( $p->ID, '_cv_note' ),
		'cover'   => $cover,
		'images'  => $images,
		'text'    => $parts['text'],
		// A show with text or pictures opens as a page; one with neither is a line in the list.
		'hasPage' => '' !== $parts['text'] || count( $images ) > 0,
	];
}

/** A commissioned project, for the list row and the panel. */
function cv_project( WP_Post $p ): array {
	static $cache = [];
	if ( isset( $cache[ $p->ID ] ) ) {
		return $cache[ $p->ID ];
	}
	$parts  = cv_content_parts( $p );
	$cover  = (int) get_post_thumbnail_id( $p );
	$images = $parts['images'];
	if ( $cover && ! in_array( $cover, array_column( $images, 'id' ), true ) ) {
		array_unshift( $images, [ 'id' => $cover, 'caption' => '' ] );
	}
	$year = (int) cv_meta( $p->ID, '_cv_year', 0 );
	return $cache[ $p->ID ] = [
		'id'     => $p->ID,
		'slug'   => $p->post_name,
		'title'  => get_the_title( $p ),
		'url'    => get_permalink( $p ),
		'year'   => $year ?: null,
		'when'   => (string) cv_meta( $p->ID, '_cv_when' ) ?: ( $year ? (string) $year : '' ),
		'cover'  => $cover,
		'images' => $images,
		'text'   => $parts['text'],
	];
}

/* -------------------------------------------------------------- what's color */

/** An edition with the people who answered in words, in their listed order. */
function cv_edition( WP_Post $p ): array {
	static $cache = [];
	if ( isset( $cache[ $p->ID ] ) ) {
		return $cache[ $p->ID ];
	}
	$numeral   = (string) cv_meta( $p->ID, '_cv_numeral' ) ?: strtoupper( $p->post_name );
	$statement = cv_content_parts( $p )['text'];
	$intro     = (string) cv_meta( $p->ID, '_cv_intro' );

	// Claudia's paragraphs one at a time, for the composed sheets, which set
	// them between the entries by position. The same text as `statement`,
	// read back out of its rendered paragraphs; a heading or anything else in
	// the entry is not one of them.
	preg_match_all( '#<p\b[^>]*>(.*?)</p>#su', $statement, $m );
	$says = array_values( array_filter( array_map( 'trim', $m[1] ), fn( $s ) => '' !== wp_strip_all_tags( $s ) ) );

	$people = [];
	$answers = function_exists( 'cvc_answers' ) ? cvc_answers( $p ) : [];
	foreach ( $answers as $a ) {
		$text = cv_content_parts( $a )['text'];
		if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
			continue;
		}
		$person = [
			'name'       => get_the_title( $a ),
			'role'       => (string) cv_meta( $a->ID, '_cv_role' ),
			'alias'      => (string) cv_meta( $a->ID, '_cv_alias' ),
			'code'       => (string) cv_meta( $a->ID, '_cv_code' ),
			'colourName' => (string) cv_meta( $a->ID, '_cv_colour_name' ),
			'swatch'     => (string) cv_meta( $a->ID, '_cv_swatch' ),
			'answer'     => $text,
			'inImages'   => (bool) get_post_meta( $a->ID, '_cv_in_images', true ),
			'edition'    => $numeral,
			'id'         => cv_id_for( get_the_title( $a ) ),
			'url'        => get_permalink( $p ),
		];
		$person['colour'] = cv_swatch_for( $person, count( $people ) );
		$people[]         = $person;
	}

	return $cache[ $p->ID ] = [
		'id'           => $p->ID,
		'numeral'      => $numeral,
		'slug'         => $p->post_name,
		'url'          => get_permalink( $p ),
		'title'        => get_the_title( $p ),
		'intro'        => $intro ? cv_bare_block( trim( do_blocks( $intro ) ) ) : $statement,
		'statement'    => $statement,
		'says'         => $says,
		'sourceTitle'  => (string) cv_meta( $p->ID, '_cv_source_title' ),
		'participants' => $people,
	];
}

/** The editions, newest first, as the pages are built. */
function cv_editions(): array {
	static $editions = null;
	if ( null === $editions ) {
		$editions = array_map( 'cv_edition', function_exists( 'cvc_editions' ) ? cvc_editions() : [] );
	}
	return $editions;
}

/* ------------------------------------------------------------ about, chart */

/**
 * About: the card, the biography with its photographs, the record of shows
 * read out of the exhibitions, the collections and the closing line.
 */
function cv_about(): array {
	static $about = null;
	if ( null !== $about ) {
		return $about;
	}
	// The page as it is being looked at when it is the one being previewed;
	// otherwise only as published — a draft of About is not on every page.
	$page = is_page( 'about' ) ? get_queried_object() : get_page_by_path( 'about' );
	if ( $page && 'publish' !== $page->post_status && ! is_preview() ) {
		$page = null;
	}
	$id = $page ? $page->ID : 0;

	$text = $page ? cv_render_content( $page, fn( int $image, string $caption ) =>
		'<figure class="about-figure">' . cv_image( $image, '(max-width: 899px) 92vw, 79vw' ) . '</figure>' ) : '';

	$emails      = array_values( array_filter( array_map( 'trim', preg_split( '/\R/', (string) cv_meta( $id, '_cv_emails' ) ) ) ) );
	$collections = [];
	foreach ( preg_split( '/\R/', (string) cv_meta( $id, '_cv_collections' ) ) as $line ) {
		$bits = array_map( 'trim', explode( '|', $line, 2 ) );
		if ( '' !== $bits[0] ) {
			$collections[] = [ 'name' => $bits[0], 'place' => $bits[1] ?? '' ];
		}
	}

	// The record, in three columns, each line read off an exhibition entry.
	$columns = [
		'solo'  => [ 'heading' => 'Solo exhibitions', 'shows' => [], 'wide' => false ],
		'group' => [ 'heading' => 'Group exhibitions', 'shows' => [], 'wide' => false ],
		'fair'  => [ 'heading' => 'Art fairs', 'shows' => [], 'wide' => true ],
	];
	$exhibitions = function_exists( 'cvc_exhibitions' ) ? cvc_exhibitions() : [];
	foreach ( $exhibitions as $post ) {
		$e = cv_exhibition( $post );
		if ( ! isset( $columns[ $e['kindKey'] ] ) ) {
			continue;
		}
		$month = fn( string $s ) => trim( preg_replace( '/\s*\d+\s*$/', '', $s ) );
		$year  = $e['yearEnd'] ? min( $e['year'], $e['yearEnd'] ) : $e['year'];
		$when  = (string) $year;
		if ( $e['from'] ) {
			$when .= ' ' . $month( $e['from'] ) . ( $e['to'] ? ' - ' . $month( $e['to'] ) : '' );
		}
		$lines = array_values( array_filter( array_map( 'trim', explode( ',', $e['venue'] ) ) ) );
		$columns[ $e['kindKey'] ]['shows'][] = [ 'when' => $when, 'title' => $e['title'], 'lines' => array_slice( $lines, 0, 3 ) ];
	}

	return $about = [
		'card'        => [
			'name'   => get_bloginfo( 'name' ),
			'city'   => (string) cv_meta( $id, '_cv_city', 'Barcelona' ),
			'year'   => (string) cv_meta( $id, '_cv_born', '1969' ),
			'phone'  => (string) cv_meta( $id, '_cv_phone' ),
			'emails' => $emails,
		],
		'text'        => $text,
		'record'      => array_values( array_filter( $columns, fn( $c ) => count( $c['shows'] ) > 0 ) ),
		'collections' => $collections,
		'copyright'   => (string) cv_meta( $id, '_cv_copyright', '© All Rights Reserved' ),
		'url'         => $page ? get_permalink( $page ) : home_url( '/#about' ),
	];
}

/** The chart's twenty-three bands, as the designer measured them, unless the page says otherwise. */
const CV_BANDS = [
	'#b15f60', '#fbc644', '#f1d8ae', '#fafafa', '#3b5741', '#8d2530',
	'#e83a41', '#e4630e', '#5aba9f', '#b73933', '#b7b39e', '#fbbe41',
	'#cb6c42', '#eb5d41', '#a8a595', '#254e9d', '#006780', '#6d69a4',
	'#d69a2a', '#ec692b', '#85709d', '#5c7e52', '#a9a2a1',
];

/** The Colour Chart page: its price, its bands, its text and its photographs. */
function cv_chart( ?WP_Post $page = null ): array {
	$page = $page ?: get_page_by_path( 'color-chart' );
	$id   = $page ? $page->ID : 0;
	$parts = $page ? cv_content_parts( $page ) : [ 'text' => '', 'images' => [] ];

	$bands = [];
	foreach ( preg_split( '/\R/', (string) cv_meta( $id, '_cv_bands' ) ) as $line ) {
		$line = strtolower( trim( $line ) );
		if ( preg_match( '/^#[0-9a-f]{6}$/', $line ) ) {
			$bands[] = $line;
		}
	}
	return [
		'price'       => (string) cv_meta( $id, '_cv_price' ),
		'bands'       => $bands ?: CV_BANDS,
		'prose'       => $parts['text'],
		'photographs' => $parts['images'],
	];
}
