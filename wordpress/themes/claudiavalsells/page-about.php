<?php
/**
 * About, at its own address.
 *
 * The overlay is on every page; this is the start page with it already open,
 * so a shared link to /about/ opens on the card, with or without scripting,
 * and closing it leaves the reader on the start page.
 */
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
