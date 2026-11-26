<?php
/** What's Color?, and the first thing the site shows. */
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
