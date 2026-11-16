<?php
/**
 * The Colour Chart and its order form — src/components/colour-chart.ts.
 *
 * A page of type, after the designer's sheet: what the chart is, in her own
 * words; the way to order one; what it costs; her thanks; and the site's own
 * line at the foot. On a desktop the page holds still on one screen and the
 * scroll writes the statement, a word to a slice of the run behind it
 * (`.chart-runway`), which is why every word and each of the four things under
 * them carries its own `animation-range`, and its slice as bare fractions
 * (`--w0`, `--w1`) that a phone held upright multiplies by its own run
 * (06-colour-chart.css), as colour-chart.ts writes them.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** The share of the run the statement is written over; the rest brings the page in under it. */
const CV_CHART_WRITTEN_BY = 0.8;

/** The four that arrive after the sentence: the way to order, the price, the thanks, the foot. */
const CV_CHART_ARRIVING = 4;

/** A share of the run as the static site prints it: a percentage to two places. */
function cv_chart_pc( float $share ): string {
	return sprintf( '%.2F', $share * 100 );
}

/**
 * Where each of the four comes in, as a slice of the run. The slices overlap
 * by half, and the last finishes on the last pixel — `arriving` in
 * colour-chart.ts, the same sums in the same order.
 */
function cv_chart_arriving( int $i ): string {
	$step = ( 1 - CV_CHART_WRITTEN_BY ) / ( CV_CHART_ARRIVING + 1 );
	$from = CV_CHART_WRITTEN_BY + $i * $step;
	$to   = min( $from + $step * 2, 1 );
	return 'animation-range: ' . cv_chart_pc( $from ) . '% ' . cv_chart_pc( $to ) . '%';
}

/**
 * The words of one line of the statement. A line is text: whatever the editor
 * wrapped round a word (bold, a link) comes off, since a word is written whole
 * and a tag cannot be split across the spans that write it.
 */
function cv_chart_words( string $markup ): array {
	$text = html_entity_decode( wp_strip_all_tags( $markup ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	return preg_split( '/[\s\p{Z}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY ) ?: [];
}

/**
 * The statement, written by the scroll — `written` in colour-chart.ts.
 *
 * `$paragraphs` is cv_chart()'s statement: the inner markup of each paragraph,
 * which may carry a line break. The break is split out and put back between
 * the halves rather than run through the word splitter. The words are shared
 * out over one more slice than there are words and each takes the one after
 * the first, so the page at rest is blank. `reveal` is where the page travels
 * to on its own (client/chart.ts): the middle of the slice after the first
 * paragraph's last word.
 */
function cv_chart_written( array $paragraphs ): array {
	$lines = [];
	foreach ( $paragraphs as $paragraph ) {
		$lines[] = array_map( 'cv_chart_words', preg_split( '#<br\s*/?>#i', (string) $paragraph ) ?: [] );
	}
	$words = fn( array $halves ): int => array_sum( array_map( 'count', $halves ) );
	// Never nought: the run is divided by it, and an empty page is one slice.
	$total = max( 1, array_sum( array_map( $words, $lines ) ) );

	$n     = 0;
	$block = '<div class="chart-statement">';
	foreach ( $lines as $halves ) {
		$block .= '<p>';
		foreach ( $halves as $h => $half ) {
			$block .= $h > 0 ? '<br />' : '';
			foreach ( $half as $i => $word ) {
				$from   = ( ( $n + 1 ) / ( $total + 1 ) ) * CV_CHART_WRITTEN_BY;
				$to     = ( ( $n + 2 ) / ( $total + 1 ) ) * CV_CHART_WRITTEN_BY;
				$block .= ( $i > 0 ? ' ' : '' )
					. '<span class="chart-word" style="--w0:' . sprintf( '%.4F', $from ) . ';--w1:' . sprintf( '%.4F', $to ) . ';animation-range: ' . cv_chart_pc( $from ) . '% ' . cv_chart_pc( $to ) . '%">' . esc_html( $word ) . '</span>';
				$n++;
			}
		}
		$block .= '</p>';
	}
	$block .= '</div>';

	$opening = max( 1, $words( $lines[0] ?? [] ) );
	return [ 'block' => $block, 'reveal' => ( ( $opening + 0.5 ) / ( $total + 1 ) ) * CV_CHART_WRITTEN_BY ];
}

/**
 * The page — `colourChart` in colour-chart.ts. `$chart` is cv_chart(): the
 * statement, the price and the photographs, all read from the Color Chart page.
 */
function cv_colour_chart( array $chart ): string {
	$written = cv_chart_written( $chart['statement'] );
	$about   = cv_about();

	$out = '<div class="chart" data-chart-reveal="' . sprintf( '%.4F', $written['reveal'] ) . '" data-chart-written="' . CV_CHART_WRITTEN_BY . '">'
		. '<div class="chart-page">'
		// The bar names the page; the heading is here for the document's
		// structure and for anything reading the page rather than looking at it.
		. '<h1 class="sr-only">Color Chart</h1>'
		. $written['block']
		// An anchor to a real section further down the document: with scripting
		// the click opens the form over the page; without it the same href walks
		// to it. Two arrows, both drawn rather than typed: the desktop sheet's,
		// which turns on hover, and the phone sheet's, which is not the same one
		// made smaller. The stylesheet shows one or the other.
		. '<a class="chart-order chart-in" style="' . cv_chart_arriving( 0 ) . '" href="#inquiries" data-inquiries-open> Order yours '
		. '<svg class="chart-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.4 9.6 9.4 2.6M4.3 2.6h5.1v5.1" fill="none" stroke="currentColor" stroke-width="1.2" /></svg> '
		. '<svg class="chart-arrow-phone" viewBox="0 0 22.5 22" aria-hidden="true" focusable="false"><path d="M1.5 1.5H21V22M1.2 20.97 20.6 1.57" fill="none" stroke="currentColor" stroke-width="3" /></svg> '
		. '</a>';
	if ( '' !== $chart['price'] ) {
		$out .= '<p class="chart-price chart-in" style="' . cv_chart_arriving( 1 ) . '">Cost: <b>' . esc_html( $chart['price'] ) . '</b></p>';
	}
	// Her thanks, and a way of seeing who they are to: the photographs people
	// have sent her of the chart in use. An anchor to a real panel, as About and
	// every exhibition are; plain words while the page holds no photographs.
	$out .= '<p class="chart-thanks chart-in" style="' . cv_chart_arriving( 2 ) . '">'
		. ( $chart['photographs'] ? '<a href="#chart-photographs" data-panel-open="chart-photographs">Thanks to everyone!</a>' : 'Thanks to everyone!' )
		. '</p>'
		// The site's own line, the one at the foot of the About sheet, read from
		// where that one is; its sign written as the static page writes it.
		. '<footer class="chart-footer chart-in" style="' . cv_chart_arriving( 3 ) . '"><b>' . esc_html( $about['card']['name'] ) . '</b> '
		. str_replace( '©', '&copy;', esc_html( $about['copyright'] ) ) . '</footer>'
		. '</div>'
		// The run the writing is divided over: a strip of nothing behind the
		// page, there to be scrolled through, and in the markup so the page can
		// be read by the scroll on its first paint.
		. '<div class="chart-runway" aria-hidden="true"></div>'
		. '</div>';
	return $out;
}

/**
 * The photographs of the chart in use, as a panel over the page —
 * `chartPhotographs` in colour-chart.ts. The same sheet an exhibition that is
 * photographs and nothing else gets (plates.php), under her thanks for a
 * title, with no place and no dates; raised and put away by client/panels.ts
 * like every other detail. It has no address of its own, so no
 * `data-panel-url`: open, the bar shows `#chart-photographs`, as on the static
 * site. Nothing at all when the page holds no photographs.
 */
function cv_chart_photographs( array $chart ): string {
	if ( ! $chart['photographs'] ) {
		return '';
	}
	$plates = cv_plates_body( [
		'title'  => 'Thanks to everyone!',
		'venue'  => '',
		'from'   => '',
		'to'     => '',
		'year'   => 0,
		'images' => $chart['photographs'],
	] );
	// A show always has a year under its name; these have nothing to say there,
	// and the line is left out rather than left empty.
	$plates = str_replace( '<p class="sheet-when"></p>', '', $plates );
	return '<div class="panels"><article class="panel" id="chart-photographs" data-panel>'
		. '<a class="panel-close" href="#" data-panel-close>Close</a>'
		. $plates
		. '</article></div>';
}

/**
 * The order form, over the page. Every field is in the markup and the form has
 * a real action and method, so it is a working form before a line of script
 * runs. The honeypot and the `started` stamp are the handler's guards, prepared
 * here; the handler (the content plugin's order desk) decides.
 */
function cv_inquiries(): string {
	$field = fn( string $id, string $label, string $input ) =>
		'<div class="inq-field inq-' . $id . '"><label class="inq-label" for="inq-' . $id . '">' . esc_html( $label ) . '</label>' . $input . '</div>';
	$action = function_exists( 'cvc_inquiries_endpoint' ) ? cvc_inquiries_endpoint() : '';

	return '<section class="inq" id="inquiries" data-inquiries aria-labelledby="inq-title">'
		. '<a class="inq-close" href="#" data-inquiries-close>Close</a>'
		. '<form class="inq-form" method="post" action="' . esc_url( $action ) . '" data-inquiries-form novalidate>'
		. '<h2 class="inq-title" id="inq-title">Inquiries</h2>'
		. $field( 'name', 'Contact name:', '<input class="inq-input" id="inq-name" name="name" type="text" required maxlength="120" autocomplete="name" enterkeyhint="next" />' )
		. $field( 'country', 'Country:', '<input class="inq-input" id="inq-country" name="country" type="text" maxlength="80" autocomplete="country-name" enterkeyhint="next" />' )
		. $field( 'email', 'Your email:', '<input class="inq-input" id="inq-email" name="email" type="email" required maxlength="160" autocomplete="email" spellcheck="false" enterkeyhint="next" />' )
		. $field( 'subject', 'Subject:', '<input class="inq-input" id="inq-subject" name="subject" type="text" maxlength="160" enterkeyhint="next" />' )
		. $field( 'message', 'Your message:', '<textarea class="inq-input inq-area" id="inq-message" name="message" required maxlength="4000" rows="1"></textarea>' )
		. '<div class="inq-trap" aria-hidden="true"><label for="inq-website">Website</label><input id="inq-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>'
		. '<input type="hidden" name="started" value="" data-inquiries-started />'
		. '<div class="inq-check" data-inquiries-check></div>'
		. '<div class="inq-send"><p class="inq-status" data-inquiries-status role="status" aria-live="polite"></p>'
		. '<button type="submit" class="inq-button" data-inquiries-submit>Send</button></div>'
		. cv_inquiries_privacy()
		. '</form></section>';
}

/**
 * One line under the form, linking the privacy notice: the form takes a name
 * and an email address, and data-protection law asks for a notice wherever
 * that happens. The page is WordPress's own (Settings → Privacy); the line
 * appears once that page is published, and not before, so the form never
 * links to a notice nobody has written.
 */
function cv_inquiries_privacy(): string {
	$url = get_privacy_policy_url();
	if ( '' === $url ) {
		return '';
	}
	return '<p class="inq-privacy">Your message goes to Claudia Valsells to answer your inquiry, and is not kept on this site. <a href="' . esc_url( $url ) . '">Privacy notice</a></p>';
}
