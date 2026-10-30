<?php
/**
 * Exhibitions: a list rather than a gallery. The name and place at the left,
 * the run of dates and the year at the right, a rule between each — and the
 * photograph only when you reach for a row.
 *
 * Also the body of each exhibition's own address (single-exhibition.php),
 * which is this page with that show's panel already open.
 */
$cv_open  = $args['open'] ?? '';
$cv_title = $args['title'] ?? 'Exhibitions';
$cv_desc  = $args['description'] ?? 'Exhibitions and art fairs of the painter Claudia Valsells, 2000 to today.';

$cv_shows  = array_map( 'cv_exhibition', function_exists( 'cvc_exhibitions' ) ? cvc_exhibitions() : [] );
$cv_panels = array_values( array_filter( $cv_shows, fn( $s ) => $s['hasPage'] ) );

cv_page( [
	'title'       => $cv_title,
	'description' => $cv_desc,
	'path'        => '/exhibitions/',
	'overlays'    => cv_panels( 'exhibition', $cv_panels, $cv_open ),
	'open'        => $cv_open,
	'root'        => $cv_open ? home_url( '/exhibitions/' ) : '',
] );
get_header();
echo '<h1 class="sr-only">Exhibitions</h1>';
echo cv_exhibition_list( $cv_shows );
get_footer();
