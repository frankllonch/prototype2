<?php
/**
 * One edition of What's Color?, with its own names and the answers beneath.
 */
$cv_edition = cv_edition( get_queried_object() );
$cv_n       = count( $cv_edition['participants'] );

// The static site's two sentences (whatsColorEditionPage in
// src/pages/index.ts): how many answered, or, where nobody did, who took part.
cv_page( [
	'title'       => "What’s Color? ({$cv_edition['numeral']})",
	'description' => $cv_n
		? sprintf( 'What’s Color? edition %s — %d people, %d of them on what color is.', $cv_edition['numeral'], count( $cv_edition['roster'] ), $cv_n )
		: sprintf( 'What’s Color? edition %s — the %d studios and people who took part.', $cv_edition['numeral'], count( $cv_edition['roster'] ) ),
	'path'        => "/whats-color/{$cv_edition['slug']}/",
] );
get_header();
echo cv_wc_edition( $cv_edition );
get_footer();
