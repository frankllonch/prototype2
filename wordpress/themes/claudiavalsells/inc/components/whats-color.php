<?php
/**
 * What's Color? — src/components/whats-color.ts.
 *
 * The opening view: the note written word by word as the reader scrolls, one
 * run of names per edition, and the three editions' own writing beneath. An
 * edition's own page: its whole roster, then the designer's composed sheet —
 * a reel of photographs, then the entries in three columns (editions I to
 * III) — or, for an edition she has not composed, the statement with the
 * answers in three columns.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** A number as JavaScript's String() writes it — 0.0696, 2.294, 0 — so the markup matches the static site's. */
function cv_num( $n ): string {
	if ( is_int( $n ) ) {
		return (string) $n;
	}
	$s = rtrim( rtrim( sprintf( '%.10F', (float) $n ), '0' ), '.' );
	return '-0' === $s ? '0' : $s;
}

/**
 * The names, set as a paragraph because that is what they are — a sentence of
 * people. Hovering a name brings up the colour that person's answer was given.
 *
 * On an edition's own page a name goes straight to that person's answer; on
 * the opening view to the answer on its edition's page, the address carrying
 * the person. A name with no answer has nothing to point at: on its edition's
 * page it stands as a name rather than a link; on the opening view it leads
 * into that edition, to its top.
 */
function cv_wc_names( array $participants, ?string $within = null ): string {
	$out = '<p class="wc-names">';
	foreach ( $participants as $i => $p ) {
		$sep   = $i > 0 ? '<span class="wc-sep">, </span>' : '';
		$paint = sprintf( '--swatch: %s; --swatch-ink: var(--%s)', esc_attr( $p['colour'] ), cv_ink_on( $p['colour'] ) );
		if ( $within && '' === $p['id'] ) {
			$out .= $sep . '<span class="wc-name" style="' . $paint . '">' . esc_html( $p['name'] ) . '</span>';
			continue;
		}
		$href = $within
			? '#' . $p['id']
			: ( $p['url'] ?? home_url( '/whats-color/' . strtolower( $p['edition'] ?: 'i' ) . '/' ) ) . ( '' !== $p['id'] ? '#' . $p['id'] : '' );
		$out .= $sep . '<a class="wc-name" href="' . esc_url( $href ) . '" style="' . $paint . '">' . esc_html( $p['name'] ) . '</a>';
	}
	return $out . '</p>';
}

/** The opening view entire. */
function cv_wc_opening( array $editions ): string {
	$out = '<div class="wc" id="whats-color">' . cv_wc_write_on( (string) cv_option( 'cv_lead' ) );
	foreach ( $editions as $edition ) {
		// The inner wrapper is what fades in once the note stands written; the
		// group itself belongs to the farewell.
		$out .= '<section class="wc-group"><div class="wc-rise">'
			. '<p class="wc-numeral" aria-hidden="true">(' . esc_html( $edition['numeral'] ) . ')</p>'
			. '<h2 class="sr-only">What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</h2>'
			. cv_wc_names( $edition['roster'] ?: $edition['participants'] )
			. '</div></section>';
	}
	return $out . cv_wc_texts( $editions ) . '</div>';
}

/**
 * The note, written as the reader scrolls — writeOn() in whats-color.ts, to
 * the number: each word revealed over its own slice of the section's travel,
 * the question given almost three times a word's share and followed by a held
 * pause, the slices fractions of a travel the stylesheet sets
 * (--wc-write-length must agree with SCREENS).
 *
 * A blank line in the text starts a new paragraph; the last of several is the
 * invitation, set semibold in capitals. The question's words are joined, the
 * space between them inside the colour, so the band runs unbroken.
 */
function cv_wc_write_on( string $text ): string {
	// No note, no section: an empty one would still take its screens of
	// scrolling, with nothing written in them.
	if ( '' === trim( $text ) ) {
		return '';
	}
	$paragraphs = array_map(
		fn( $p ) => preg_split( '/\s+/u', trim( $p ) ),
		preg_split( '/\R\s*\R/u', trim( $text ) )
	);
	$words   = array_merge( ...$paragraphs );
	$screens = 2.4;
	$cover   = $screens + 1;
	$start   = 1;
	$end     = 1 + 0.85 * ( $screens - 1 );
	$marked  = fn( string $w ) => mb_strlen( $w ) > 1 && preg_match( '/[A-Z]/', $w ) && $w === mb_strtoupper( $w );
	$weights = array_map( fn( $w ) => $marked( $w ) ? 3 : 1, $words );
	$ask     = -1;
	$last    = -1;
	foreach ( $words as $i => $w ) {
		if ( $marked( $w ) ) {
			$ask  = $ask < 0 ? $i : $ask;
			$last = $i;
		}
	}
	if ( $ask > 0 ) {
		$weights[ $ask - 1 ] = 2;
	}
	$pause = 14;
	$total = array_sum( $weights ) + ( $last >= 0 ? $pause : 0 );
	$at    = 0;
	$i     = 0;
	$count = count( $paragraphs );
	$out   = '<section class="wc-write"><div class="wc-write-pin"><div class="wc-lead-block">';
	foreach ( $paragraphs as $p => $list ) {
		$out .= '<p class="wc-lead' . ( $p > 0 && $p === $count - 1 ? ' wc-lead-call' : '' ) . '">';
		$len  = count( $list );
		foreach ( $list as $k => $word ) {
			$n    = $i++;
			$from = $start + ( $at / $total ) * ( $end - $start );
			$at  += $weights[ $n ];
			if ( $n === $last ) {
				$at += $pause;
			}
			$width  = ( $weights[ $n ] / $total ) * ( $end - $start ) * 2.3;
			$to     = min( $from + $width, $end + 0.04 );
			$is_end = $k === $len - 1;
			$joined = $marked( $word ) && ! $is_end && $marked( $list[ $k + 1 ] );
			// %F, not %f: written the same whatever the server's locale, which in
			// Spanish or Catalan would put a comma in the number and void the rule.
			$range = sprintf( 'animation-range: cover %.2F%% cover %.2F%%', $from / $cover * 100, $to / $cover * 100 );
			if ( $marked( $word ) && preg_match( '/^(.*?)([.,:;]*)$/u', $word, $parts ) ) {
				$class = 'wc-ask'
					. ( 0 === $n || ! $marked( $words[ $n - 1 ] ) ? ' wc-ask-start' : '' )
					. ( $joined ? '' : ' wc-ask-end' );
				$inner = '<mark class="' . $class . '">' . esc_html( $parts[1] ) . ( $joined ? "\u{00A0}" : '' ) . '</mark>' . esc_html( $parts[2] );
			} else {
				$inner = esc_html( $word );
			}
			// The last two words of a paragraph held together, so it never ends on
			// one word; joined words already carry their space inside the colour.
			$gap  = $is_end || $joined ? '' : ( $k === $len - 2 ? '&nbsp;' : ' ' );
			$out .= '<span class="wc-word" style="' . $range . '">' . $inner . '</span>' . $gap;
		}
		$out .= '</p>';
	}
	return $out . '</div></div></section>';
}

/**
 * The three editions' writing at the foot of the opening view, newest first,
 * III to I, in the order of the rosters above: a heading line, then the text
 * cut where the start-page sheet cuts it, the rest behind "Read more".
 * Without scripting the whole text stands open.
 */
function cv_wc_texts( array $editions ): string {
	$out = '<section class="wc-texts" aria-label="About the three editions">';
	foreach ( $editions as $edition ) {
		$o = $edition['opening'];
		if ( ! $o ) {
			continue;
		}
		$head  = '<p class="wc-text-head"><a href="' . esc_url( $edition['url'] ) . '">' . esc_html( $o['heading'] ) . '</a></p>';
		$paras = function ( array $list, string $button ): string {
			$html = '';
			foreach ( $list as $i => $para ) {
				$html .= '<p>' . $para . ( count( $list ) - 1 === $i ? ' ' . $button : '' ) . '</p>';
			}
			return $html;
		};
		$out .= '<div class="wc-text" data-edition="' . esc_attr( strtolower( $edition['numeral'] ) ) . '" style="--wc-text-align: ' . esc_attr( $o['align'] ) . '">'
			. '<div class="wc-text-closed">' . $head . $paras( $o['teaser'], '<button type="button" class="wc-more" aria-expanded="false">Read more...</button>' ) . '</div>'
			. '<div class="wc-text-open">' . $head . $paras( $o['full'], '<button type="button" class="wc-less">Read less</button>' ) . '</div>'
			. '</div>';
	}
	return $out . '</section>';
}

/**
 * One participant's answer, for an edition the designer has not composed: the
 * name large, what they do beside it, the colour set in that colour, the
 * answer below.
 */
function cv_wc_answer( array $p ): string {
	$out = '<article class="wc-answer" id="' . esc_attr( $p['id'] ) . '">'
		. '<h2 class="wc-answer-name">' . esc_html( $p['name'] )
		. ( $p['alias'] ? '<span class="wc-answer-alias">' . esc_html( $p['alias'] ) . '</span>' : '' )
		. '</h2><p class="wc-answer-meta">'
		. ( $p['role'] ? '<span class="wc-answer-role">' . esc_html( $p['role'] ) . '</span>' : '' );
	if ( $p['code'] ) {
		$out .= '<span class="wc-answer-code" style="' . sprintf( '--swatch: %s; --swatch-ink: var(--%s)', esc_attr( $p['colour'] ), cv_ink_on( $p['colour'] ) ) . '"><span class="wc-code-band">'
			. esc_html( $p['code'] . ( $p['colourName'] ? ' ' . $p['colourName'] : '' ) ) . '</span></span>';
	}
	$out .= '</p>';
	if ( $p['answer'] ) {
		$out .= '<div class="wc-answer-text">' . $p['answer'] . '</div>';
	} elseif ( $p['inImages'] ) {
		$out .= '<p class="wc-answer-images">Answered in images</p>';
	}
	return $out . '</article>';
}

/** One edition: its numeral, its whole roster, then its sheet or its list. */
function cv_wc_edition( array $edition ): string {
	$n     = strtolower( $edition['numeral'] );
	$table = cv_wc_sheets()[ $edition['numeral'] ] ?? null;
	$out   = '<div class="wc wc-edition wc-edition-' . esc_attr( $n ) . ( $table ? ' wc-sheet-page' : '' ) . '">'
		. '<p class="wc-numeral" aria-hidden="true">(' . esc_html( $edition['numeral'] ) . ')</p>'
		. '<h1 class="sr-only">What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</h1>'
		. cv_wc_names( $edition['roster'] ?: $edition['participants'], $edition['numeral'] )
		. ( $table ? cv_wc_sheet( $edition, $table ) : cv_wc_edition_list( $edition ) );
	// The names, not the film: someone at the foot of an edition asking for all
	// of What's Color? means the roster, so this points past the film.
	return $out . '<p class="wc-back"><a href="' . esc_url( home_url( '/#whats-color' ) ) . '">All of What&rsquo;s Color?</a></p>'
		. cv_wc_chart( $edition ) . '</div>';
}

/**
 * The edition's colour chart, at the very foot of its page — chart() in
 * whats-color.ts: a bar of each person's colour standing on one line, the name
 * upright above it, as the sheet places them (read from the theme's copy of
 * the sheets). A bar leads to that person's answer; someone who never
 * answered has a bar that is only a bar.
 */
function cv_wc_chart( array $edition ): string {
	$bars = cv_wc_sheet_data()['charts'][ $edition['numeral'] ] ?? null;
	if ( ! $bars ) {
		return '';
	}
	$people = [];
	foreach ( ( $edition['roster'] ?: $edition['participants'] ) as $p ) {
		$people[ cv_wc_key( $p['name'] ) ] = $p;
	}
	$out = '<section class="wc-chart" aria-label="Their colours">';
	foreach ( $bars as $bar ) {
		$person = $people[ cv_wc_key( $bar['who'] ) ] ?? null;
		$paint  = is_array( $bar['colour'] )
			? 'linear-gradient(90deg, ' . $bar['colour'][0] . ' 50%, ' . $bar['colour'][1] . ' 50%)'
			: $bar['colour'];
		$style  = '--bar-h: ' . cv_num( $bar['h'] ) . '; --bar-c: ' . $paint;
		$inner  = '<span class="wc-bar-name">' . esc_html( $bar['label'] ?? $bar['who'] ) . '</span><span class="wc-bar-fill"></span>';
		$out   .= $person && '' !== $person['id']
			? '<a class="wc-bar" href="#' . esc_attr( $person['id'] ) . '" style="' . esc_attr( $style ) . '">' . $inner . '</a>'
			: '<span class="wc-bar" style="' . esc_attr( $style ) . '">' . $inner . '</span>';
	}
	return $out . '</section>';
}

/** Editions without a sheet: the statement as one block, then the answers under it. */
function cv_wc_edition_list( array $edition ): string {
	$out = '<div class="wc-edition-intro">' . $edition['statement'] . '</div>';
	if ( $edition['participants'] ) {
		$out .= '<div class="wc-answers">';
		foreach ( $edition['participants'] as $p ) {
			$out .= cv_wc_answer( $p );
		}
		$out .= '</div>';
	} else {
		$out .= '<p class="wc-answers-none">The source for this edition names everyone who took part but keeps no record of what they answered.</p>';
	}
	return $out;
}

/* ------------------------------------------------------------- the sheets */

/**
 * Where everything sits on the sheets, as src/content/whats-color-sheet.ts
 * places it — read from the copy `npm run wp:assets` writes into the theme,
 * so a sheet re-traced on the static site arrives here with the next build.
 *
 * Each slot: who (a participant, by name), say (one of the edition's
 * paragraphs, by position), title, strip (the reel's photographs, in order),
 * col, drop, lead (the air above it, as a share of the sheet's width), rule.
 */
function cv_wc_sheet_data(): array {
	static $data = null;
	if ( null === $data ) {
		$data = json_decode( (string) @file_get_contents( CV_THEME_DIR . '/assets/whats-color-sheets.json' ), true );
		$data = is_array( $data ) ? $data : [];
	}
	return $data;
}

/** The three composed sheets — the copy also carries the colour charts, set apart from these. */
function cv_wc_sheets(): array {
	return array_intersect_key( cv_wc_sheet_data(), [ 'I' => 1, 'II' => 1, 'III' => 1 ] );
}

/** `--lead: …`, or nothing when the slot carries none. */
function cv_wc_air( $lead ): string {
	return null === $lead ? '' : '--lead: ' . cv_num( $lead );
}

/**
 * An edition's reel: its photographs in one row, all one height, each cell at
 * its file's shape — or the sheet's, where she frames it a shade tighter. Each
 * is a real link to the photograph, so without scripting a click still shows
 * the picture; with it, the script opens the same picture over the page.
 */
function cv_wc_strip( array $plates, $lead = null ): string {
	$out = '<div class="wc-strip" style="' . cv_wc_air( $lead ) . '">';
	foreach ( $plates as $book ) {
		$jpg   = cv_asset( 'img/' . $book['name'] . '.jpg' );
		$shape = isset( $book['cell'] ) ? cv_num( $book['cell'] ) : (int) $book['w'] . ' / ' . (int) $book['h'];
		$out  .= '<a class="wc-book" href="' . esc_url( $jpg ) . '" style="aspect-ratio: ' . $shape . '" data-book>'
			. '<picture>'
			. '<source srcset="' . esc_url( cv_asset( 'img/' . $book['name'] . '.webp' ) ) . '" type="image/webp" />'
			. '<img src="' . esc_url( $jpg ) . '" alt="' . esc_attr( $book['alt'] ) . '"'
			. ' width="' . (int) $book['w'] . '" height="' . (int) $book['h'] . '" loading="lazy" decoding="async" />'
			. '</picture></a>';
	}
	return $out . '</div>';
}

/** Where a clicked photograph opens. Empty and hidden until the script fills it. */
function cv_wc_book_view(): string {
	return '<div class="wc-book-view" data-book-view hidden><figure class="wc-book-plate" data-book-plate></figure></div>';
}

/**
 * A name as a key: case, accents, spacing and the shape of an apostrophe set
 * aside, so that the sheet still finds a person whose title WordPress has
 * texturised or an editor has retyped with a different quote.
 */
function cv_wc_key( string $name ): string {
	$k = html_entity_decode( $name, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$k = str_replace( [ '’', '‘', '`' ], "'", $k );
	$k = remove_accents( $k );
	return strtolower( trim( preg_replace( '/\s+/u', ' ', $k ) ) );
}

/**
 * A sheet: the slots in the designer's order, then anyone who answered that
 * she did not place, column by column after the composition — on the static
 * site the roster cannot change without the sheet being redrawn, here Claudia
 * can add someone on her own, and a new entry has to appear somewhere.
 *
 * A band's lead is written once, on its first slot, and carried to the rest
 * of its row: grid items sit at the top of their row, so a band only moves as
 * one if every slot in it wears the same margin. Anything spanning the full
 * width ends the band.
 */
function cv_wc_sheet( array $edition, array $table ): string {
	$by_name = [];
	foreach ( $edition['participants'] as $p ) {
		$by_name[ cv_wc_key( $p['name'] ) ] = $p;
	}
	$placed = [];
	$strip  = false;
	$band   = null;
	$out    = '<div class="wc-sheet">';
	foreach ( $table as $slot ) {
		$lead = $slot['lead'] ?? null;
		if ( ! empty( $slot['title'] ) ) {
			$band = null;
			$out .= cv_wc_sheet_title( $edition, $lead );
			continue;
		}
		if ( ! empty( $slot['strip'] ) ) {
			$band  = null;
			$strip = true;
			$out  .= cv_wc_strip( $slot['strip'], $lead );
			continue;
		}
		if ( isset( $slot['say'] ) ) {
			$band = null;
			$out .= '<p class="wc-say" style="' . cv_wc_air( $lead ) . '">' . ( $edition['says'][ $slot['say'] ] ?? '' ) . '</p>';
			continue;
		}
		if ( null !== $lead ) {
			$band = $lead;
		}
		$key    = isset( $slot['who'] ) ? cv_wc_key( $slot['who'] ) : '';
		$person = $by_name[ $key ] ?? null;
		if ( ! $person ) {
			continue;
		}
		$placed[ $key ] = true;
		$out           .= cv_wc_slot( $person, (int) ( $slot['col'] ?? 1 ), (int) ( $slot['drop'] ?? 0 ), $band );
	}
	$col = 0;
	foreach ( $edition['participants'] as $p ) {
		if ( isset( $placed[ cv_wc_key( $p['name'] ) ] ) ) {
			continue;
		}
		$out .= cv_wc_slot( $p, 1 + ( $col++ % 3 ), 0, null );
	}
	return $out . '</div>' . ( $strip ? cv_wc_book_view() : '' );
}

/** One placed entry: the column it sits in, how far it is dropped and the air above its band ride on the slot. */
function cv_wc_slot( array $person, int $col, int $drop, $band ): string {
	return '<div class="wc-slot" style="--col: ' . $col . '; --drop: ' . $drop . '; ' . cv_wc_air( $band ) . '">'
		. cv_wc_cell( $person ) . '</div>';
}

/**
 * The edition's own title, where its sheet carries one: the project and the
 * numeral set bold, and whatever the source title says after that beside it
 * in the ordinary weight. Hidden from the reading order because the page
 * already opens with the same heading.
 */
function cv_wc_sheet_title( array $edition, $lead = null ): string {
	$tail = (string) preg_replace( '/^\s*what.s\s+colou?r\s*\??\s*/iu', '', $edition['sourceTitle'] );
	$tail = trim( (string) preg_replace( '/^\(?\s*(i{1,3})\s*\)?\s*/iu', '', $tail ) );
	return '<p class="wc-say wc-sheet-title" aria-hidden="true" style="' . cv_wc_air( $lead ) . '">'
		. '<strong>What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</strong>'
		. ( '' !== $tail ? ' ' . esc_html( $tail ) : '' )
		. '</p>';
}

/**
 * One entry on the sheet: the name, the role and its translation ranged right
 * against the column, the colour under them, and the answer below.
 */
function cv_wc_cell( array $p ): string {
	[ $role, $also ] = cv_wc_split_role( $p['role'] );
	return '<article class="wc-cell" id="' . esc_attr( $p['id'] ) . '">'
		. '<h2 class="wc-cell-name">' . esc_html( $p['name'] )
		. ( $p['alias'] ? '<span class="wc-cell-alias">' . esc_html( $p['alias'] ) . '</span>' : '' )
		. '</h2><p class="wc-cell-meta">'
		. ( $role ? '<span class="wc-cell-role">' . esc_html( $role ) . '</span>' : '' )
		. ( $also ? '<span class="wc-cell-role wc-cell-also">' . esc_html( $also ) . '</span>' : '' )
		. ( $p['code'] ? '<span class="wc-cell-code" style="' . sprintf( '--swatch: %s; --swatch-ink: var(--%s)', esc_attr( $p['colour'] ), cv_ink_on( $p['colour'] ) ) . '"><span class="wc-code-band">' . esc_html( $p['code'] . ( $p['colourName'] ? ' ' . $p['colourName'] : '' ) ) . '</span></span>' : '' )
		. '</p>'
		. ( $p['answer'] ? '<div class="wc-cell-text">' . $p['answer'] . '</div>' : '' )
		. '</article>';
}

/**
 * The role as the sheet sets it: what they do, then the same in the other
 * language beneath it, the pair kept in one field separated by a slash.
 */
function cv_wc_split_role( string $role ): array {
	if ( '' === $role ) {
		return [ '', '' ];
	}
	$at = strpos( $role, ' / ' );
	return false === $at ? [ $role, '' ] : [ substr( $role, 0, $at ), substr( $role, $at + 3 ) ];
}

/** The opening film: the documentation of edition I, full screen, with the bar across the middle of it. */
function cv_wc_film(): string {
	$poster = cv_asset( 'video/whats-color-poster.jpg' );
	return '<section class="wc-film" style="--film-poster: url(\'' . esc_url( $poster ) . '\')" aria-label="What’s Color? (I), Alzueta Gallery, December 2020">'
		. '<video class="wc-film-video" autoplay muted loop playsinline preload="auto" poster="' . esc_url( $poster ) . '">'
		. '<source src="' . esc_url( cv_asset( 'video/whats-color.mp4' ) ) . '" type="video/mp4" />'
		. '</video></section>';
}

/** The start page's body, with or without About already open over it. */
function cv_wc_opening_page(): string {
	return '<h1 class="sr-only">What’s Color?</h1>' . cv_wc_film() . cv_wc_opening( cv_editions() );
}
