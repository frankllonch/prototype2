<?php
/**
 * The fallback for anything no other template claims — a search, a date
 * archive, a tag. None of those are pages of this site, so they are shown the
 * way there is in: the gallery.
 */
if ( is_singular() ) {
	get_template_part( 'page' );
	return;
}
get_template_part( 'archive', 'artwork' );
