<?php
/**
 * Nothing at this address.
 */
cv_page( [ 'title' => 'Not found', 'path' => '' ] );
status_header( 404 );
get_header();
?>
<article class="page-plain">
	<h1>Nothing here</h1>
	<div class="prose">
		<p>There is no page at this address. The work is under <a href="<?php echo esc_url( home_url( '/artwork/' ) ); ?>">Artwork</a>, the shows under <a href="<?php echo esc_url( home_url( '/exhibitions/' ) ); ?>">Exhibitions</a>.</p>
	</div>
</article>
<?php
get_footer();
