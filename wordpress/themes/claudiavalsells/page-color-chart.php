<?php
/**
 * The Color Chart, on the designer's own composition: the price and the way to
 * order held still in the margin, the chart's colours beside them, and only the
 * text moving. The one page that is exactly a screen tall, so `chart-body`
 * takes the document's own scrollbar away. The order form goes in the overlays,
 * outside `main`, so it can rise above the veil.
 */
$cv_chart = cv_chart( get_queried_object() );

cv_page( [
	'title'       => 'Color Chart',
	'description' => 'Claudia Valsells’ artist colour chart for architects and designers — a fan deck of 142 colours in real paint.',
	'path'        => '/color-chart/',
	'bodyClass'   => 'chart-body',
	'overlays'    => cv_inquiries(),
] );
get_header();
echo cv_colour_chart( $cv_chart );
get_footer();
