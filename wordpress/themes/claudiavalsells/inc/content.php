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

	$caption   = cv_caption_lines( $parts['text'] );
	$reference = (string) cv_meta( $p->ID, '_cv_reference' );
	if ( '' === $reference && preg_match( '/^([a-z]{1,3}\d{2,4})\b/i', $caption[0] ?? '', $m ) ) {
		$reference = strtoupper( $m[1] );
	}

	return $cache[ $p->ID ] = [
		'id'         => $p->ID,
		'slug'       => $p->post_name,
		'title'      => cv_work_title( get_the_title( $p ), $reference, $year, (string) cv_meta( $p->ID, '_cv_dimensions' ) ),
		'caption'    => $caption,
		'url'        => get_permalink( $p ),
		'year'       => $year ?: null,
		'dimensions' => (string) cv_meta( $p->ID, '_cv_dimensions' ),
		'materials'  => (string) cv_meta( $p->ID, '_cv_materials' ),
		'reference'  => $reference,
		'available'  => (bool) get_post_meta( $p->ID, '_cv_available', true ),
		'plate'      => (bool) get_post_meta( $p->ID, '_cv_plate', true ),
		'image'      => $cover,
		'photo'      => $photo && $photo !== $cover ? $photo : 0,
		'views'      => $views,
		'text'       => $parts['text'],
	];
}

/**
 * A painting's name on the site (Frank, 2026-11-16), as `workTitle` in
 * src/content/title.ts: its reference (the Inventory reference field, "L569")
 * when it has one; else its own title if that is a real name; and in place of
 * "Untitled", or of a title that only says what it is made of, its year and
 * size until a reference is given.
 */
function cv_work_title( string $title, string $reference, int $year, string $dimensions ): string {
	if ( '' !== $reference ) {
		return $reference;
	}
	if ( ! preg_match( '/^(?:untitled$|acrylic|gouache|goauche|collage|mixed|oil\b|(?:recent )?works\b)/i', $title ) ) {
		return $title;
	}
	$named = implode( ', ', array_filter( [ $year ? (string) $year : '', $dimensions ] ) );
	return '' !== $named ? $named : $title;
}

/**
 * A painting's caption as Claudia wrote it, line for line and in her order:
 * a line per paragraph or break of the work's text (`captionLines` in
 * src/content/caption.ts).
 */
function cv_caption_lines( string $html ): array {
	$lines = [];
	foreach ( preg_split( '#</p>|<br\s*/?>#i', $html ) as $part ) {
		$line = trim( preg_replace( '/\s+/u', ' ', html_entity_decode( wp_strip_all_tags( $part ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
		if ( '' !== $line && 'null' !== $line ) {
			$lines[] = $line;
		}
	}
	return $lines;
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
		'images'  => $images,
		'text'    => $parts['text'],
		// A show with text or pictures opens as a page; one with neither is a line in the list.
		'hasPage' => '' !== $parts['text'] || count( $images ) > 0,
	];
}

/**
 * A show's text with its opening paragraph broken after a title and its
 * translation — splitOpening() in src/content/shows.ts.
 *
 * Mira'm opens on its own name and then an English gloss of it, and only then
 * says what the show is, all in one paragraph; the sheet sets the name apart
 * and leaves an empty line under it. The split is found rather than written:
 * the paragraph has to open on a quotation mark and carry a bracketed gloss
 * near the front, and the break goes after the closing bracket, which goes
 * (with its opening one, where the text still has it). Nothing is reworded,
 * and the entry in the editor stays as it was typed.
 *
 * One paragraph still, with the opening as a block inside it. A text that
 * does not have that shape is returned untouched — and so is one already
 * split, which has no bracket left to find.
 */
function cv_show_opening( string $html ): string {
	if ( ! preg_match( '#^(\s*<p>)(.*?)(</p>)#su', $html, $first ) ) {
		return $html;
	}
	$body = $first[2];
	// Only an opening that is a quoted name: a bracket anywhere else in a
	// paragraph is an aside, not a heading.
	if ( ! preg_match( '/^\s*(<[^>]+>\s*)*[“"\']/u', $body ) ) {
		return $html;
	}
	$close = mb_strpos( $body, ']' );
	if ( false === $close || $close > 220 ) {
		return $html;
	}
	$head = (string) preg_replace( '/\[?([^\[\]]*)\]\s*$/u', '$1', mb_substr( $body, 0, $close + 1 ), 1 );
	$rest = (string) preg_replace( '/^[\s,;:]+/u', '', mb_substr( $body, $close + 1 ) );
	if ( '' === $rest ) {
		return $html;
	}
	return $first[1] . '<span class="lede-open">' . $head . '</span>' . $rest . $first[3] . substr( $html, strlen( $first[0] ) );
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
		'images' => $images,
		'text'   => $parts['text'],
		// The masthead of its own page, where it differs from the index line.
		'heading'  => (string) cv_meta( $p->ID, '_cv_heading' ),
		'lines'    => array_values( array_filter( array_map( 'trim', explode( "\n", (string) cv_meta( $p->ID, '_cv_lines' ) ) ), 'strlen' ) ),
		'pageWhen' => (string) cv_meta( $p->ID, '_cv_page_when' ),
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

	// Everyone filed under the edition is on its roster, the names across the
	// top of its page; only the ones who answered have an entry below, and so
	// only they get an id for a name to point at.
	$people  = [];
	$roster  = [];
	$answers = function_exists( 'cvc_answers' ) ? cvc_answers( $p ) : [];
	foreach ( $answers as $a ) {
		$text     = cv_content_parts( $a )['text'];
		$answered = '' !== trim( wp_strip_all_tags( $text ) );
		$person   = [
			'name'       => get_the_title( $a ),
			'role'       => (string) cv_meta( $a->ID, '_cv_role' ),
			'alias'      => (string) cv_meta( $a->ID, '_cv_alias' ),
			'code'       => (string) cv_meta( $a->ID, '_cv_code' ),
			'colourName' => (string) cv_meta( $a->ID, '_cv_colour_name' ),
			'swatch'     => (string) cv_meta( $a->ID, '_cv_swatch' ),
			'answer'     => $text,
			'inImages'   => (bool) get_post_meta( $a->ID, '_cv_in_images', true ),
			'edition'    => $numeral,
			'id'         => $answered ? cv_id_for( get_the_title( $a ) ) : '',
			'url'        => get_permalink( $p ),
		];
		$person['colour'] = cv_swatch_for( $person );
		$roster[]         = $person;
		if ( $answered ) {
			$people[] = $person;
		}
	}

	// The edition's text as the opening view sets it: the writing in full,
	// shown cut after the words in "cut" until the reader asks for more.
	// The introduction field when there is one, the edition's own text when not.
	// The field is plain text in the side panel: typed as lines rather than as
	// paragraph blocks, it still reads as paragraphs.
	$source = '' !== trim( $intro ) ? cv_bare_block( do_blocks( $intro ) ) : $statement;
	if ( '' !== trim( $intro ) && ! preg_match( '#<p\b#i', $source ) ) {
		$source = wpautop( $source );
	}
	preg_match_all( '#<p\b[^>]*>(.*?)</p>#su', $source, $fm );
	$full = array_values( array_filter( array_map( 'trim', $fm[1] ), fn( $s ) => '' !== wp_strip_all_tags( $s ) ) );
	$cut    = trim( (string) cv_meta( $p->ID, '_cv_opening_cut' ) );
	$teaser = [];
	foreach ( $full as $para ) {
		// Searched in the paragraph's text as read, entities decoded; the
		// opening texts are plain, and a paragraph with markup in it is kept
		// whole rather than cut through a tag.
		$text = html_entity_decode( wp_strip_all_tags( $para ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$at   = '' !== $cut ? mb_strpos( $text, $cut ) : false;
		if ( false === $at ) {
			$teaser[] = $para;
			continue;
		}
		$teaser[] = wp_strip_all_tags( $para ) === $para ? esc_html( mb_substr( $text, 0, $at + mb_strlen( $cut ) ) ) : $para;
		break;
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
		'roster'       => $roster,
		'opening'      => $full ? [
			'heading' => 'WHAT’S COLOR (' . $numeral . ')',
			'align'   => 'justify' === cv_meta( $p->ID, '_cv_opening_align' ) ? 'justify' : 'left',
			'teaser'  => $teaser,
			'full'    => $full,
		] : null,
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

	// Every photograph on the page goes into one row after the opening
	// paragraph, wherever it stands in the editor — Image blocks or a Gallery,
	// in their order. The text is the page without them.
	$images = [];
	$text   = $page ? cv_render_content( $page, function ( int $image ) use ( &$images ): string {
		// A picture deleted from the media library leaves its id behind in the
		// block, and the same picture placed twice is one photograph.
		if ( 'attachment' === get_post_type( $image ) && cv_image_data( $image ) && ! in_array( $image, $images, true ) ) {
			$images[] = $image;
		}
		return '';
	} ) : '';
	// The opening paragraph is the lead, set in capitals: the first paragraph,
	// whether or not it was given the class in the editor, and wherever it
	// stands — anything put before it (a heading, say) follows the photographs.
	$lead = '';
	$rest = $text;
	if ( preg_match( '#^(.*?)(<p\b[^>]*>.*?</p>)(.*)$#s', $text, $m ) ) {
		$m = [ $m[0], $m[2], trim( $m[1] . $m[3] ) ];
		$lead = preg_replace_callback( '#^<p\b([^>]*)>#', function ( array $tag ): string {
			if ( preg_match( '#\bclass="([^"]*)"#', $tag[1], $c ) ) {
				return str_contains( " {$c[1]} ", ' about-lead ' ) ? $tag[0] : str_replace( $c[0], 'class="' . trim( "about-lead {$c[1]}" ) . '"', $tag[0] );
			}
			return '<p class="about-lead"' . $tag[1] . '>';
		}, $m[1] );
		$rest = trim( $m[2] );
	}

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
		'lead'        => $lead,
		'rest'        => $rest,
		'images'      => $images,
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

/**
 * The Colour Chart page as the designer's sheet sets it — the reading
 * src/content/colour-chart.ts makes of its source, made here of the page.
 *
 * The statement is the page's own paragraphs, which is what Claudia edits; the
 * price is the page's Price field; the photographs behind "Thanks to
 * everyone!" are every picture on the page — Image blocks or a Gallery,
 * wherever they stand — and none of them is drawn in the text.
 *
 * The paragraphs are read by the static site's rules, so the page as the old
 * site had it, pasted back whole, still comes out as the sheet: the date
 * range, the byline and the picture credits are withheld; `cost …` and `make
 * your order at: …` are said elsewhere (the price, the form) and her address
 * stays out of the markup; and the statement ends at the first heading —
 * Features, Technical characteristics, About a colour chart — whether it was
 * typed as a paragraph or as a Heading block. Matched on how a paragraph
 * opens, not on its whole text: a comma moved costs the page nothing.
 *
 * `bands` is the chart's colours, still kept on the page (The bands); the
 * sheet no longer sets them, so nothing draws them today.
 */
function cv_chart( ?WP_Post $page = null ): array {
	$page  = $page ?: get_page_by_path( 'color-chart' );
	$id    = $page ? $page->ID : 0;
	$parts = $page ? cv_content_parts( $page ) : [ 'text' => '', 'images' => [] ];

	$bands = [];
	foreach ( preg_split( '/\R/', (string) cv_meta( $id, '_cv_bands' ) ) as $line ) {
		$line = strtolower( trim( $line ) );
		if ( preg_match( '/^#[0-9a-f]{6}$/', $line ) ) {
			$bands[] = $line;
		}
	}

	$plain  = fn( string $markup ): string => trim( (string) preg_replace( '/[\s\p{Z}]+/u', ' ', html_entity_decode( (string) preg_replace( '/<[^>]+>/', ' ', $markup ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
	$opens  = function ( string $text, array $patterns ): bool {
		foreach ( $patterns as $pattern ) {
			if ( preg_match( $pattern, $text ) ) {
				return true;
			}
		}
		return false;
	};
	$moved    = [ '/^cost\b/i', '/^make your order\b/i' ];
	$withheld = [ '#^\d{4}\s*/\s*\d{4}$#', '/^artist colou?r chart\b/i', '/^images:/i', '/^\#\d/' ];
	$headings = [ '/^features\b/i', '/^technical characteristics\b/i', '/^about a colou?r chart\b/i' ];

	// The price as she wrote it in the text, "60,50€", comma and all, wherever
	// its `cost` paragraph stands: the figure the page falls back on when the
	// Price field is empty.
	$cost = '';
	preg_match_all( '#<p\b[^>]*>(.*?)</p>#s', $parts['text'], $found );
	foreach ( $found[1] as $paragraph ) {
		$text = $plain( $paragraph );
		if ( preg_match( '/^cost\b/i', $text ) ) {
			$cost = preg_match( '/\d[\d.,]*\s*€/u', $text, $figure ) ? (string) preg_replace( '/\s+/u', '', $figure[0] ) : '';
			break;
		}
	}

	// The statement: what stands before the first Heading block, paragraph by
	// paragraph, until one of them is a heading.
	$statement = [];
	preg_match_all( '#<p\b[^>]*>(.*?)</p>#s', (string) preg_split( '/<h[1-6]\b/i', $parts['text'], 2 )[0], $found );
	foreach ( $found[1] as $paragraph ) {
		$paragraph = trim( $paragraph );
		$text      = $plain( $paragraph );
		if ( '' === $text || $opens( $text, $moved ) || $opens( $text, $withheld ) ) {
			continue;
		}
		if ( $opens( $text, $headings ) ) {
			break;
		}
		// The designer's one line break, after the colon: "a source of
		// knowledge, a way of life!" is the answer to it and belongs under it.
		// Markup in the paragraph vetoes the break — one she put in herself
		// included, so it is never there twice.
		if ( ! str_contains( $paragraph, '<' ) ) {
			$paragraph = (string) preg_replace( '/\s+(?=a source of knowledge)/i', '<br />', $paragraph, 1 );
		}
		// "Color", not "colour": the page is set American, as the chart itself
		// is lettered, however the text was typed. The case is kept.
		$statement[] = str_replace( [ 'Colour', 'colour' ], [ 'Color', 'color' ], $paragraph );
	}

	return [
		'statement'   => $statement,
		'price'       => (string) cv_meta( $id, '_cv_price' ) ?: $cost,
		'bands'       => $bands ?: CV_BANDS,
		// Only pictures the library can still draw: one deleted since, or never
		// measured, is not a photograph to open a sheet on.
		'photographs' => array_values( array_filter( $parts['images'], fn( array $image ): bool => null !== cv_image_data( $image['id'] ) ) ),
	];
}
