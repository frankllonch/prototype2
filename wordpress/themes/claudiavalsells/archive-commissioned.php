<?php
/**
 * Commissioned work: grouped by the kind of job rather than shown as a grid,
 * after the designer's layout. The row answers in a colour and brings up its
 * photograph; each opens as a panel.
 */
$cv_open  = $args['open'] ?? '';
$cv_title = $args['title'] ?? 'Commissioned';
$cv_desc  = $args['description'] ?? 'Commissioned work and collaborations by Claudia Valsells: colour charts, collections, workshops.';

$cv_groups = [];
$cv_items  = [];
foreach ( function_exists( 'cvc_commissioned_groups' ) ? cvc_commissioned_groups() : [] as $group ) {
	$items       = array_map( 'cv_project', $group['items'] );
	$cv_groups[] = [ 'name' => $group['name'], 'items' => $items ];
	$cv_items    = array_merge( $cv_items, $items );
}

cv_page( [
	'title'       => $cv_title,
	'description' => $cv_desc,
	'path'        => '/commissioned/',
	'overlays'    => cv_panels( 'commissioned', $cv_items, $cv_open ),
	'open'        => $cv_open,
	'root'        => $cv_open ? home_url( '/commissioned/' ) : '',
] );
get_header();
echo '<h1 class="sr-only">Commissioned</h1>';
echo cv_commissioned_list( $cv_groups );
get_footer();
