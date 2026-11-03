<?php
/**
 * The Colour Chart and its order form — src/components/colour-chart.ts.
 *
 * Three columns across one screen: the margin states what the chart costs and
 * how to get one; the chart's own colours stand in the next column as a single
 * stack of bands; the text has the rest of the page, and is the only thing that
 * moves.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cv_colour_chart( array $chart ): string {
	$out = '<div class="chart"><h1 class="chart-title">Color Chart</h1><div class="chart-aside">';
	if ( $chart['price'] ) {
		$out .= '<p class="chart-price">Cost: <b>' . esc_html( $chart['price'] ) . '</b></p>';
	}
	// An anchor to a real section further down the document: with scripting the
	// click opens the form over the page; without it the same href walks to it.
	$out .= '<a class="chart-order" href="#inquiries" data-inquiries-open>Order yours'
		. '<svg class="chart-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.4 9.6 9.4 2.6M4.3 2.6h5.1v5.1" fill="none" stroke="currentColor" stroke-width="1.2" /></svg>'
		. '</a></div>';

	// The chart itself, as colour and nothing else: one labelled image made of
	// divs, because the chart is flat colour.
	$out .= '<div class="chart-bands" role="img" aria-label="' . esc_attr( sprintf( 'The colour chart: %d of its colours, stacked', count( $chart['bands'] ) ) ) . '">';
	foreach ( $chart['bands'] as $colour ) {
		$out .= '<span class="chart-band" style="--band: ' . esc_attr( $colour ) . '"></span>';
	}
	$out .= '</div>';

	$out .= '<div class="chart-text" tabindex="0"><div class="prose">' . $chart['prose'] . '</div>';
	if ( $chart['photographs'] ) {
		$out .= '<div class="chart-plates">';
		foreach ( $chart['photographs'] as $image ) {
			$caption = $image['caption'] ?: ( cv_image_data( $image['id'] )['caption'] ?? '' );
			$out    .= '<figure class="chart-plate">' . cv_image( $image['id'], '(max-width: 899px) 92vw, 46vw' )
				. ( $caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : '' ) . '</figure>';
		}
		$out .= '</div>';
	}
	return $out . '</div></div>';
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
