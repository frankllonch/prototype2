<?php
/**
 * The gallery. The wordmark, then every painting gathered into one stack;
 * scrolling disperses the stack into the grid, which is where the tiles live.
 */
$cv_items = array_values( array_filter( array_map( 'cv_work_item', cv_works() ), fn( $i ) => $i['image'] ) );

cv_page( [
	'title'       => 'Artwork',
	'description' => (string) cv_option( 'cv_tagline' ),
	'path'        => '/artwork/',
	'rail'        => cv_year_rail( cv_years() ),
	// The pile fills the screen and does not read as the top of a document.
	'cue'         => 'ink',
	'controls'    => cv_grid_controls( [], true, count( cv_works() ) ),
] );
get_header();
?>
<h1 class="sr-only"><?php echo esc_html( get_bloginfo( 'name' ) ); ?> — Artwork</h1>
<div class="hero" data-hero aria-hidden="true"></div>
<?php
// Tiles go to the painting's own page rather than opening over the gallery:
// the page carries the caption, the lean and the way through the collection.
echo cv_grid( [ 'items' => $cv_items, 'stack' => true, 'toScale' => true ] );
get_footer();
