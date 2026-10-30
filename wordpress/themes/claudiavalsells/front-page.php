<?php
/**
 * What's Color?, and the first thing the site shows.
 *
 * The film changes how the chrome behaves: the bar begins across the middle of
 * it and rises to the top as you scroll. That is a page-level decision, so it
 * travels on the body.
 */
cv_page( [
	'title'       => get_bloginfo( 'name' ),
	'description' => 'What’s Color? — Claudia Valsells assigns a colour to people she admires and asks them what colour means to them.',
	'path'        => '/',
	'bodyClass'   => 'has-film',
	'cue'         => 'negative',
] );
get_header();
echo cv_wc_opening_page();
get_footer();
