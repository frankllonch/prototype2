<?php
/**
 * Any other page — a privacy notice, say — set as a column of text.
 */
$cv_post = get_queried_object();
cv_page( [
	'title' => get_the_title( $cv_post ),
	'path'  => wp_make_link_relative( get_permalink( $cv_post ) ),
] );
get_header();
?>
<article class="page-plain">
	<h1><?php echo esc_html( get_the_title( $cv_post ) ); ?></h1>
	<div class="prose"><?php echo cv_render_content( $cv_post, fn( int $id, string $caption ) => '<figure class="page-figure">' . cv_image( $id, '(max-width: 899px) 92vw, 44rem' ) . ( $caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : '' ) . '</figure>' ); ?></div>
</article>
<?php
get_footer();
