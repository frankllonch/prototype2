<?php
/**
 * A painting on its own page — what a shared link opens.
 */
$cv_post = get_queried_object();
$cv_work = cv_work( $cv_post );
$cv_text = trim( wp_strip_all_tags( $cv_work['text'] ) );

cv_page( [
	'title'       => $cv_work['title'],
	'description' => $cv_text ? wp_trim_words( $cv_text, 40, '…' ) : cv_describe( $cv_work, '' ),
	'path'        => '/artwork/',
	// No menu over a painting: its corners say where to go instead.
	'bodyClass'   => 'is-detail',
] );
get_header();
echo cv_artwork_detail( $cv_post );
get_footer();
