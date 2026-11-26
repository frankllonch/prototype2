<?php
/** Exhibitions: a list rather than a gallery, in the sheet's four groups. */
$cv_open  = $args['open'] ?? '';
$cv_title = $args['title'] ?? 'Exhibitions';
$cv_desc  = $args['description'] ?? 'Exhibitions and art fairs of the painter Claudia Valsells, 2000 to today.';

$cv_shows  = array_map( 'cv_exhibition', function_exists( 'cvc_exhibitions' ) ? cvc_exhibitions() : [] );
$cv_panels = array_values( array_filter( $cv_shows, fn( $s ) => $s['hasPage'] ) );

// The show at its own address joins the panels when the list does not carry it — a draft
// being previewed, say — and a panel that is not on the page is not opened: a veil locked
// over nothing would be the whole page.
if ( ! empty( $args['show'] ) && $args['show']['hasPage'] && ! in_array( $args['show']['id'], array_column( $cv_panels, 'id' ), true ) ) {
	$cv_panels[] = $args['show'];
}
if ( $cv_open && ! in_array( $cv_open, array_map( fn( $s ) => "exhibition-{$s['slug']}", $cv_panels ), true ) ) {
	$cv_open = '';
}
// Where a served panel closes to: the bar's address once the script closes it, and its Close
// link's for a reader without scripting.
$cv_root = $cv_open ? home_url( '/exhibitions/' ) : '';

// A detail as the static page sets it (exhibitionsPage in src/pages/index.ts).
$cv_panels = array_map(
	fn( $s ) => array_merge( $s, [ 'venue' => cv_show_place( $s['venue'] ), 'text' => cv_show_opening( $s['text'] ) ] ),
	$cv_panels
);

cv_page( [
	'title'       => $cv_title,
	'description' => $cv_desc,
	'path'        => '/exhibitions/',
	'overlays'    => cv_panels( 'exhibition', $cv_panels, $cv_open, $cv_root ),
	'open'        => $cv_open,
	'root'        => $cv_root,
] );
get_header();
echo '<h1 class="sr-only">Exhibitions</h1>';
// The private collections close the list.
echo cv_exhibition_list( $cv_shows, cv_about()['collections'] );
get_footer();
