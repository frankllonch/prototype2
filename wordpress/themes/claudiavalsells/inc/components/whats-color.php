<?php
/**
 * What's Color? — src/components/whats-color.ts.
 *
 * The opening view: everyone who has answered, in one run of names per
 * edition, and the editions introduced beneath. An edition's own page: its
 * names, the artist's statement, and the answers in three columns.
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
		$href   = ( $within && $p['id'] ) ? '#' . $p['id'] : home_url( '/whats-color/' . strtolower( $p['edition'] ?: 'i' ) . '/' );
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

/** One edition: its numeral, its own names, the statement, and the answers. */
function cv_wc_edition( array $edition ): string {
	$n   = strtolower( $edition['numeral'] );
	$out = '<div class="wc wc-edition wc-edition-' . esc_attr( $n ) . '">'
		. '<p class="wc-numeral" aria-hidden="true">(' . esc_html( $edition['numeral'] ) . ')</p>'
		. '<h1 class="sr-only">What&rsquo;s Color? (' . esc_html( $edition['numeral'] ) . ')</h1>'
		. cv_wc_names( $edition['participants'], $edition['numeral'] )
		. '<div class="wc-edition-intro">' . $edition['statement'] . '</div>';
	if ( $edition['participants'] ) {
		$out .= '<div class="wc-answers">';
		foreach ( $edition['participants'] as $p ) {
			$out .= cv_wc_answer( $p );
		}
		$out .= '</div>';
	} else {
		$out .= '<p class="wc-answers-none">The source for this edition names everyone who took part but keeps no record of what they answered.</p>';
	}
	return $out . '<p class="wc-back"><a href="' . esc_url( home_url( '/#whats-color' ) ) . '">All of What&rsquo;s Color?</a></p></div>';
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
