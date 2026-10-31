<?php
/**
 * What's Color? — src/components/whats-color.ts.
 *
 * The opening view: everyone who has answered, in one run of names per
 * edition, and the editions introduced beneath. An edition's own page: its
 * names, then either the designer's composed sheet (editions I and II) or the
 * artist's statement with the answers in three columns (III).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The names, set as a paragraph because that is what they are — a sentence of
 * people. Hovering a name brings up the colour that person's answer was given.
 * On an edition's own page a name goes to that person's answer further down it.
 */
function cv_wc_names( array $participants, ?string $within = null ): string {
	$out = '<p class="wc-names">';
	foreach ( $participants as $i => $p ) {
		$href   = ( $within && $p['id'] ) ? '#' . $p['id'] : ( $p['url'] ?? home_url( '/whats-color/' . strtolower( $p['edition'] ?: 'i' ) . '/' ) );
		$swatch = $p['colour'];
		$out   .= ( $i > 0 ? '<span class="wc-sep">, </span>' : '' )
			. sprintf(
				'<a class="wc-name" href="%s" style="--swatch: %s; --swatch-ink: var(--%s)">%s</a>',
				esc_url( $href ),
				esc_attr( $swatch ),
				cv_ink_on( $swatch ),
				esc_html( $p['name'] )
			);
	}
	return $out . '</p>';
}

/** The introductions across the foot of the view, I, II, III left to right: chapters read forwards. */
function cv_wc_intros( array $editions ): string {
	$out = '<div class="wc-intros">';
	foreach ( array_reverse( $editions ) as $edition ) {
		$out .= '<a class="wc-intro" href="' . esc_url( $edition['url'] ) . '" data-edition="' . esc_attr( $edition['numeral'] ) . '">'
			. '<h2 class="wc-intro-title">What&rsquo;s Color? <sup>(' . esc_html( $edition['numeral'] ) . ')</sup></h2>'
			. '<div class="wc-intro-text">' . $edition['intro'] . '</div>'
			. '</a>';
	}
	return $out . '</div>';
}

/** The opening view entire. */
function cv_wc_opening( array $editions ): string {
	$lead = (string) cv_option( 'cv_lead' );
	$out  = '<div class="wc" id="whats-color"><div class="wc-intro-mask"><div class="wc-intro-slide">'
		. '<p class="wc-title" aria-hidden="true">What&rsquo;s Color?</p>'
		. '<p class="wc-lead">' . esc_html( $lead ) . '</p>'
		. '</div></div>';
	foreach ( $editions as $edition ) {
		$out .= '<section class="wc-group"><p class="wc-numeral" aria-hidden="true">(' . esc_html( $edition['numeral'] ) . ')</p>'
			. '<h2 class="sr-only">What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</h2>'
			. cv_wc_names( $edition['participants'] )
			. '</section>';
	}
	return $out . cv_wc_intros( $editions ) . '</div>';
}

/**
 * One participant's answer: the name large, what they do ranged right beside
 * it, the colour their answer was given set in that colour, the answer below.
 */
function cv_wc_answer( array $p ): string {
	$out = '<article class="wc-answer" id="' . esc_attr( $p['id'] ) . '">'
		. '<h2 class="wc-answer-name">' . esc_html( $p['name'] )
		. ( $p['alias'] ? '<span class="wc-answer-alias">' . esc_html( $p['alias'] ) . '</span>' : '' )
		. '</h2><p class="wc-answer-meta">'
		. ( $p['role'] ? '<span class="wc-answer-role">' . esc_html( $p['role'] ) . '</span>' : '' );
	if ( $p['code'] ) {
		$out .= '<span class="wc-answer-code" style="--swatch: ' . esc_attr( cv_readable( $p['colour'] ) ) . '">'
			. esc_html( $p['code'] . ( $p['colourName'] ? ' ' . $p['colourName'] : '' ) ) . '</span>';
	}
	$out .= '</p>';
	if ( $p['answer'] ) {
		$out .= '<div class="wc-answer-text">' . $p['answer'] . '</div>';
	} elseif ( $p['inImages'] ) {
		$out .= '<p class="wc-answer-images">Answered in images</p>';
	}
	return $out . '</article>';
}

/**
 * One edition: its numeral, its own names, and then the sheet the designer
 * composed for it, or — for an edition she has not — the statement as one
 * block with the answers under it.
 */
function cv_wc_edition( array $edition ): string {
	$n     = strtolower( $edition['numeral'] );
	$table = cv_wc_sheets()[ $edition['numeral'] ] ?? null;
	$out   = '<div class="wc wc-edition wc-edition-' . esc_attr( $n ) . ( $table ? ' wc-sheet-page' : '' ) . '">'
		. '<p class="wc-numeral" aria-hidden="true">(' . esc_html( $edition['numeral'] ) . ')</p>'
		. '<h1 class="sr-only">What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</h1>'
		. cv_wc_names( $edition['participants'], $edition['numeral'] )
		. ( $table ? cv_wc_sheet( $edition, $table ) : cv_wc_edition_list( $edition ) );
	// The names, not the film: someone at the foot of an edition asking for all
	// of What's Color? means the roster, so this points past the film.
	return $out . '<p class="wc-back"><a href="' . esc_url( home_url( '/#whats-color' ) ) . '">All of What&rsquo;s Color?</a></p></div>';
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
 * Where everything sits on the sheets — src/content/whats-color-sheet.ts.
 *
 * Editions I and II are compositions rather than lists. The designer placed
 * every entry herself — which of the three columns it sits in, how far it is
 * dropped below the one beside it — and set Claudia's own words across the
 * full width between them, with plates of the work partway down. None of that
 * follows from the content, so it is written here, in the theme, as layout:
 * what Claudia edits is the words in each entry and the paragraphs between
 * them, and this says where they go.
 *
 * `say` indexes the edition's paragraphs in the order they are written in its
 * entry. Everything else is a participant, by name as the roster names them.
 * A name the roster no longer has leaves its slot empty; a person the sheet
 * does not place — added or renamed in WordPress since it was drawn — follows
 * the composition rather than falling off the page (see cv_wc_sheet).
 */
function cv_wc_sheets(): array {
	static $sheets = null;
	if ( null !== $sheets ) {
		return $sheets;
	}
	$plate_i = [
		'name' => 'whats-color-i',
		'w'    => 1000,
		'h'    => 667,
		'alt'  => 'The exhibition at Alzueta Gallery: answers hung in a row along a white wall.',
	];
	$sheets = [
		'I'  => [
			[ 'say' => 0 ],
			[ 'say' => 1 ],

			[ 'who' => 'Marina Garcés', 'col' => 1 ],
			[ 'who' => 'Olafur Eliasson', 'col' => 2, 'drop' => 1 ],
			[ 'who' => 'Li Edelkoort', 'col' => 3, 'drop' => 2 ],

			[ 'say' => 2 ],

			[ 'who' => 'Rupi Kaur', 'col' => 1 ],
			[ 'who' => 'Ramón Andrés', 'col' => 3 ],

			[ 'who' => 'Victoria Cirlot', 'col' => 2 ],
			[ 'who' => 'Tortell Poltrona', 'col' => 3 ],

			[ 'who' => 'Angelica Dass', 'col' => 1 ],
			[ 'who' => 'Jaume Funes', 'col' => 2 ],

			[ 'say' => 3 ],

			[ 'who' => 'Oscar Tusquets', 'col' => 1 ],
			[ 'who' => 'David Bueno i Torrens', 'col' => 2 ],

			[ 'plate' => $plate_i ],

			[ 'who' => 'Siri Hustvedt', 'col' => 1 ],
			[ 'who' => 'Flavia Company', 'col' => 3, 'drop' => 1 ],

			[ 'who' => 'Henry Giroux', 'col' => 2 ],
		],
		/*
		 * The second edition: four photographs, two across the full width
		 * cropped to a band about twice as wide as tall, two side by side in
		 * the outer columns. The last four — Hanghar, Montse Vicens, Escobedo
		 * Soliz and Marc Morro — answered but were never placed on the sheet,
		 * so they are set after the writing rather than dropped.
		 */
		'II' => [
			[ 'title' => true ],
			[ 'say' => 0 ],

			[ 'who' => 'Plantea Estudio', 'col' => 2 ],
			[ 'who' => 'Stefano Colli', 'col' => 3 ],

			[ 'say' => 1 ],

			[ 'who' => 'Elii', 'col' => 1 ],
			[ 'who' => 'Isabel Francoy', 'col' => 3 ],

			[
				'plate' => [
					'name'   => 'whats-color-ii-1',
					'w'      => 1024,
					'h'      => 843,
					'alt'    => 'Paint pots, mixing dishes and swatch cards laid out on a worktable under a row of colour samples.',
					'aspect' => 2.3,
				],
			],

			[ 'say' => 2 ],

			[ 'who' => 'Tomás López Amat', 'col' => 1 ],
			[ 'who' => 'ContiCert', 'col' => 2 ],
			[ 'who' => 'Un parell d’arquitectes', 'col' => 3, 'drop' => 2 ],

			[ 'who' => 'Isla arquitectos', 'col' => 2 ],

			[
				'plate' => [
					'name' => 'whats-color-ii-2',
					'w'    => 683,
					'h'    => 1024,
					'alt'  => 'A visitor walking past one of Claudia Valsells’ paintings in a white gallery.',
				],
				'col'   => 1,
			],
			[
				'plate' => [
					'name' => 'whats-color-ii-3',
					'w'    => 800,
					'h'    => 1200,
					'alt'  => 'Painted timber battens in many colours, leaning against a wall.',
				],
				'col'   => 3,
			],

			[ 'say' => 3 ],

			[ 'who' => 'Antoni Arola', 'col' => 1 ],
			[ 'who' => 'Laura Castanya', 'col' => 2, 'drop' => 2 ],
			[ 'who' => 'Isabel Sendra', 'col' => 3, 'drop' => 1 ],

			[ 'who' => 'Kal-a', 'col' => 1 ],
			[ 'who' => 'AMOO', 'col' => 3 ],

			[ 'say' => 4 ],

			[
				'plate' => [
					'name'   => 'whats-color-ii-4',
					'w'      => 482,
					'h'      => 994,
					'alt'    => 'Fan decks, colour guides and sample books spread out together.',
					'aspect' => 2.1,
				],
			],

			[ 'who' => 'Anna Vidal', 'col' => 1 ],
			[ 'who' => 'Gema Sach', 'col' => 2 ],
			[ 'who' => 'Barbara Aurell', 'col' => 3, 'drop' => 1 ],

			[ 'say' => 5 ],

			[ 'who' => 'Mariona Espinet', 'col' => 1 ],
			[ 'who' => 'Loca Studio', 'col' => 2, 'drop' => 1 ],
			[ 'who' => 'Auxi Gálvez', 'col' => 3 ],

			[ 'who' => 'HANGHAR', 'col' => 1 ],
			[ 'who' => 'Montse Vicens', 'col' => 2 ],
			[ 'who' => 'Escobedo Soliz', 'col' => 3 ],

			[ 'who' => 'Marc Morro', 'col' => 1 ],
		],
		/*
		 * The third edition: the loosest rhythm of the three — single entries
		 * drop as far as three steps — and a row of photographs of the book
		 * along the top where the other editions open with words.
		 */
		'III' => [
			[ 'strip' => true ],
			[ 'say' => 0 ],

			[ 'who' => 'Marc Gómez del Moral', 'col' => 1 ],
			[ 'who' => 'Jose Javier Serrano', 'col' => 2 ],
			[ 'who' => 'Lucia Boned', 'col' => 3, 'drop' => 2 ],

			[ 'say' => 1 ],

			[ 'who' => 'Albert Riera Galcerán', 'col' => 2 ],
			[ 'who' => 'María Medem', 'col' => 3 ],

			[ 'who' => 'Isabel Martinez', 'col' => 1, 'drop' => 1 ],
			[ 'who' => 'Ana Cuba', 'col' => 2 ],

			[
				'plate' => [
					'name'   => 'whats-color-iii-1',
					'w'      => 750,
					'h'      => 1000,
					'alt'    => 'The book open at Tomás López Amat’s and Rupi Kaur’s colours, set large across the sheet.',
					'aspect' => 1.13,
				],
			],

			[ 'say' => 2 ],

			[ 'who' => 'Julia Ruiz Cabello', 'col' => 1 ],
			[ 'who' => 'Raquel Quevedo', 'col' => 2, 'drop' => 2 ],
			[ 'who' => 'José Quintanar', 'col' => 3, 'drop' => 3 ],

			[ 'say' => 3 ],

			[ 'who' => 'Luís Cerveró', 'col' => 1 ],
			[ 'who' => 'Marta D. Riezu', 'col' => 2, 'drop' => 1 ],

			[ 'who' => 'Belén Gayán', 'col' => 2 ],
			[ 'who' => 'Cristina Stolhe', 'col' => 3, 'drop' => 1 ],

			[ 'say' => 4 ],

			[ 'who' => 'Juan Diego Valera', 'col' => 1 ],
			[ 'who' => 'Álvaro Galmés', 'col' => 2, 'drop' => 3 ],
			[ 'who' => 'Arnau Blanch', 'col' => 3, 'drop' => 1 ],
		],
	];
	return $sheets;
}

/**
 * The photographs of the book, in the order the third edition's sheet runs
 * them along its top. Each is a spread on the studio's pink ground; the first
 * doubles as the plate the sheet sets large further down.
 */
function cv_wc_books(): array {
	return [
		[ 'name' => 'whats-color-iii-1', 'w' => 750, 'h' => 1000, 'alt' => 'The book open at Tomás López Amat’s and Rupi Kaur’s colours.' ],
		[ 'name' => 'whats-color-iii-2', 'w' => 750, 'h' => 1000, 'alt' => 'The book open at Sofia Romero y Miguel Sotos’ and Luis Cerveró’s colours.' ],
		[ 'name' => 'whats-color-iii-3', 'w' => 750, 'h' => 1000, 'alt' => 'The book open at Carlota Guerrero’s and Escobedo Soliz’s colours.' ],
		[ 'name' => 'whats-color-iii-4', 'w' => 750, 'h' => 1000, 'alt' => 'The book open at Ana Vidal’s and Tortell Poltrona’s colours.' ],
		[ 'name' => 'whats-color-iii-5', 'w' => 750, 'h' => 1000, 'alt' => 'The book open at Plantea Estudio’s and Hanghar’s colours.' ],
		[ 'name' => 'whats-color-iii-6', 'w' => 747, 'h' => 995, 'alt' => 'The book open at Carlota Casanova’s and Albert Riera Galcerán’s colours.' ],
		[ 'name' => 'whats-color-iii-7', 'w' => 768, 'h' => 1024, 'alt' => 'The book open at its index: every name with its colour reference.' ],
		[ 'name' => 'whats-color-iii-8', 'w' => 768, 'h' => 1024, 'alt' => 'The book’s cover sheet, printed with rows of painted frames.' ],
	];
}

/**
 * The row of photographs of the book. Each one is a real link to the
 * photograph, so without scripting a click still shows the picture; with it,
 * the script opens the same picture over the page instead.
 */
function cv_wc_strip(): string {
	$out = '<div class="wc-strip">';
	foreach ( cv_wc_books() as $book ) {
		$jpg  = cv_asset( 'img/' . $book['name'] . '.jpg' );
		$out .= '<a class="wc-book" href="' . esc_url( $jpg ) . '" data-book>'
			. '<picture>'
			. '<source srcset="' . esc_url( cv_asset( 'img/' . $book['name'] . '.webp' ) ) . '" type="image/webp" />'
			. '<img src="' . esc_url( $jpg ) . '" alt="' . esc_attr( $book['alt'] ) . '"'
			. ' width="' . (int) $book['w'] . '" height="' . (int) $book['h'] . '" loading="lazy" decoding="async" />'
			. '</picture></a>';
	}
	return $out . '</div>';
}

/**
 * Where a clicked photograph opens: the picture large over the page, closed by
 * a click anywhere or Escape. Empty and hidden until the script fills it;
 * without scripting it never shows and the links above stand on their own.
 */
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
 * A sheet: the slots in the designer's order, then anyone the roster has that
 * she did not place, column by column after the composition.
 *
 * Entries are looked up by name. One the roster no longer has leaves its slot
 * empty — a page short of a person is visible in a way that a silently
 * mis-placed one is not. The other way round is where this differs from the
 * static site: there the roster cannot change without the sheet being
 * redrawn, here Claudia can add someone to an edition on her own, and a new
 * entry has to appear somewhere.
 */
function cv_wc_sheet( array $edition, array $table ): string {
	$by_name = [];
	foreach ( $edition['participants'] as $p ) {
		$by_name[ cv_wc_key( $p['name'] ) ] = $p;
	}
	$placed = [];
	$strip  = false;
	$out    = '<div class="wc-sheet">';
	foreach ( $table as $slot ) {
		if ( ! empty( $slot['title'] ) ) {
			$out .= cv_wc_sheet_title( $edition );
			continue;
		}
		if ( ! empty( $slot['strip'] ) ) {
			$strip = true;
			$out  .= cv_wc_strip();
			continue;
		}
		if ( isset( $slot['say'] ) ) {
			$out .= '<p class="wc-say">' . ( $edition['says'][ $slot['say'] ] ?? '' ) . '</p>';
			continue;
		}
		if ( isset( $slot['plate'] ) ) {
			$out .= cv_wc_plate( $slot['plate'], $slot );
			continue;
		}
		$key    = isset( $slot['who'] ) ? cv_wc_key( $slot['who'] ) : '';
		$person = $by_name[ $key ] ?? null;
		if ( ! $person ) {
			continue;
		}
		$placed[ $key ] = true;
		$out           .= cv_wc_slot( $person, (int) ( $slot['col'] ?? 1 ), (int) ( $slot['drop'] ?? 0 ) );
	}
	$col = 0;
	foreach ( $edition['participants'] as $p ) {
		if ( isset( $placed[ cv_wc_key( $p['name'] ) ] ) ) {
			continue;
		}
		$out .= cv_wc_slot( $p, 1 + ( $col++ % 3 ), 0 );
	}
	return $out . '</div>' . ( $strip ? cv_wc_book_view() : '' );
}

/** One placed entry: the column it sits in and how far it is dropped ride on the slot. */
function cv_wc_slot( array $person, int $col, int $drop ): string {
	return '<div class="wc-slot" style="--col: ' . $col . '; --drop: ' . $drop . '">' . cv_wc_cell( $person ) . '</div>';
}

/**
 * The edition's own title, where its sheet carries one: the project and the
 * numeral set bold, and whatever the source title says after that beside it
 * in the ordinary weight. Split rather than retyped, so the words stay the
 * ones WordPress holds. Hidden from the reading order because the page
 * already opens with the same heading.
 */
function cv_wc_sheet_title( array $edition ): string {
	$tail = (string) preg_replace( '/^\s*what.s\s+colou?r\s*\??\s*/iu', '', $edition['sourceTitle'] );
	$tail = trim( (string) preg_replace( '/^\(?\s*(i{1,3})\s*\)?\s*/iu', '', $tail ) );
	return '<p class="wc-say wc-sheet-title" aria-hidden="true">'
		. '<strong>What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</strong>'
		. ( '' !== $tail ? ' ' . esc_html( $tail ) : '' )
		. '</p>';
}

/**
 * A photograph on the sheet: across all three columns, or in one of them
 * where the design sets a pair side by side. The shape it is cropped to rides
 * on the element — always stated, because these load lazily and an `auto`
 * ratio gives a lazy image no height until it arrives. The files travel with
 * the theme, as the static build carries them to dist/img.
 */
function cv_wc_plate( array $p, array $slot ): string {
	$shape  = '--plate-aspect: ' . ( isset( $p['aspect'] ) ? $p['aspect'] : $p['w'] / $p['h'] );
	$column = isset( $slot['col'] ) ? '--col: ' . (int) $slot['col'] . '; --drop: ' . (int) ( $slot['drop'] ?? 0 ) : '';
	$style  = implode( '; ', array_filter( [ $shape, $column ] ) );
	return '<figure class="wc-plate' . ( isset( $slot['col'] ) ? ' wc-plate-col' : '' ) . '" style="' . esc_attr( $style ) . '">'
		. '<picture>'
		. '<source srcset="' . esc_url( cv_asset( 'img/' . $p['name'] . '.webp' ) ) . '" type="image/webp" />'
		. '<img src="' . esc_url( cv_asset( 'img/' . $p['name'] . '.jpg' ) ) . '" alt="' . esc_attr( $p['alt'] ) . '"'
		. ' width="' . (int) $p['w'] . '" height="' . (int) $p['h'] . '" loading="lazy" decoding="async" />'
		. '</picture></figure>';
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
		. ( $p['code'] ? '<span class="wc-cell-code">' . esc_html( $p['code'] . ( $p['colourName'] ? ' ' . $p['colourName'] : '' ) ) . '</span>' : '' )
		. '</p>'
		. ( $p['answer'] ? '<div class="wc-cell-text">' . $p['answer'] . '</div>' : '' )
		. '</article>';
}

/**
 * The role as the sheet sets it: what they do, then the same in the other
 * language beneath it. The entry keeps the pair in one field separated by a
 * slash, which is how the source writes it; a role with no translation simply
 * has no second line.
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
		. '<video class="wc-film-video" autoplay muted loop playsinline preload="metadata" poster="' . esc_url( $poster ) . '">'
		. '<source src="' . esc_url( cv_asset( 'video/whats-color.mp4' ) ) . '" type="video/mp4" />'
		. '</video></section>';
}

/** The start page's body, with or without About already open over it. */
function cv_wc_opening_page(): string {
	return '<h1 class="sr-only">What’s Color?</h1>' . cv_wc_film() . cv_wc_opening( cv_editions() );
}
