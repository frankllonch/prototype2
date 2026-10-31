<?php
/**
 * One project at its own address: the index, with its panel open.
 */
$cv_project = cv_project( get_queried_object() );
$cv_text    = trim( wp_strip_all_tags( $cv_project['text'] ) );

get_template_part( 'archive', 'commissioned', [
	'open'        => 'commissioned-' . $cv_project['slug'],
	'project'     => $cv_project,
	'title'       => $cv_project['title'],
	'description' => $cv_text ? wp_trim_words( $cv_text, 40, '…' ) : "{$cv_project['title']} — commissioned work by Claudia Valsells, {$cv_project['when']}",
] );
