<?php
/** About, at its own address. */
cv_page( [
	'title'       => 'About',
	'description' => 'Claudia Valsells — an artist specialised in colour: biography, exhibitions and collections.',
	'path'        => '/',
	'bodyClass'   => 'has-film',
	'cue'         => 'negative',
	'open'        => 'about',
	'root'        => home_url( '/' ),
] );
get_header();
echo cv_wc_opening_page();
get_footer();
