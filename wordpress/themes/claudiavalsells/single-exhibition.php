<?php
/**
 * One exhibition at its own address: the index, with this show's panel open.
 * A show without text or pictures has no panel, and its address shows the list.
 */
$cv_show = cv_exhibition( get_queried_object() );
$cv_text = trim( wp_strip_all_tags( $cv_show['text'] ) );

// The facts, joined only where there are any: a trim() over the em dash
// would be byte-wise and eat into a title that opens with a curly quote.
$cv_facts = implode( ', ', array_filter( [
	$cv_show['title'] . ( $cv_show['venue'] ? " — {$cv_show['venue']}" : '' ),
	$cv_show['year'] ? (string) $cv_show['year'] : '',
] ) );

get_template_part( 'archive', 'exhibition', [
	'open'        => $cv_show['hasPage'] ? 'exhibition-' . $cv_show['slug'] : '',
	'show'        => $cv_show,
	'title'       => $cv_show['title'],
	'description' => $cv_text ? wp_trim_words( $cv_text, 40, '…' ) : $cv_facts,
] );
