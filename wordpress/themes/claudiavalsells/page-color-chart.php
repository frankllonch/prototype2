<?php
/**
 * The Color Chart — `colourChartPage` in src/pages/index.ts: a page of type,
 * the statement written by the scroll on a desktop and simply standing on a
 * phone.
 *
 * The page opens blank, so the cue says that scrolling is what happens next;
 * the phone stylesheet takes it away again, and `chart-body` is how it knows
 * this page from the others that have one. The photographs behind "Thanks to
 * everyone!" and the order form go in the overlays, outside `main`, so they
 * can rise above the veil.
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
