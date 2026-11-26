<?php
/** The fallback for anything no other template claims — a search, a date archive, a tag. */
if ( is_singular() ) {
	get_template_part( 'page' );
	return;
}
get_template_part( 'archive', 'artwork' );
