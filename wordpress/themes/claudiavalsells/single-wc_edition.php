<?php
/**
 * One edition of What's Color?, with its own names and the answers beneath.
 */
$cv_edition = cv_edition( get_queried_object() );
$cv_n       = count( $cv_edition['participants'] );

cv_page( [
	'title'       => "What’s Color? ({$cv_edition['numeral']})",
	'description' => $cv_n
		? sprintf( 'What’s Color? edition %s — %d people on what color is.', $cv_edition['numeral'], $cv_n )
		: sprintf( 'What’s Color? edition %s — the studios and people who took part.', $cv_edition['numeral'] ),
	'path'        => "/whats-color/{$cv_edition['slug']}/",
] );
get_header();
echo cv_wc_edition( $cv_edition );
get_footer();
