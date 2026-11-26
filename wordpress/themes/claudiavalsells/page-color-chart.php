<?php
/**
 * The Color Chart — `colourChartPage` in src/pages/index.ts: a page of type,
 * the statement written by the scroll on a desktop and simply standing on a
 * phone.
 */
$cv_chart = cv_chart( get_queried_object() );

cv_page( [
	'title'       => 'Color Chart',
	'description' => 'Claudia Valsells’ artist colour chart for architects and designers — a fan deck of 142 colours in real paint.',
	'path'        => '/color-chart/',
	'cue'         => 'ink',
	'bodyClass'   => 'chart-body',
	'overlays'    => cv_chart_photographs( $cv_chart ) . cv_inquiries(),
] );
get_header();
echo cv_colour_chart( $cv_chart );
get_footer();
