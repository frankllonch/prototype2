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

// The project at its own address joins the panels when no group carries it
// yet — a draft being previewed — and a panel that is not on the page is not
// opened: a veil locked over nothing would be the whole page.
if ( ! empty( $args['project'] ) && ! in_array( $args['project']['id'], array_column( $cv_items, 'id' ), true ) ) {
	$cv_items[] = $args['project'];
}
if ( $cv_open && ! in_array( $cv_open, array_map( fn( $i ) => "commissioned-{$i['slug']}", $cv_items ), true ) ) {
	$cv_open = '';
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
