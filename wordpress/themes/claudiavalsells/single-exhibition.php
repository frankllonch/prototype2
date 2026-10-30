<?php
/**
 * One exhibition at its own address: the index, with this show's panel open.
 * A show without text or pictures has no panel, and its address shows the list.
 */
$cv_show = cv_exhibition( get_queried_object() );
$cv_text = trim( wp_strip_all_tags( $cv_show['text'] ) );

get_template_part( 'archive', 'exhibition', [
	'open'        => $cv_show['hasPage'] ? 'exhibition-' . $cv_show['slug'] : '',
	'title'       => $cv_show['title'],
	'description' => $cv_text ? wp_trim_words( $cv_text, 40, '…' ) : trim( "{$cv_show['title']} — {$cv_show['venue']}, {$cv_show['year']}", " —," ),
] );
