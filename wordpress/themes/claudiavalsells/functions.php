<?php
/**
 * Claudia Valsells — the theme.
 *
 * The design has one source: the TypeScript components, stylesheets and client
 * scripts under src/ in the repository. This theme is their WordPress reading.
 * The stylesheet and the scripts are copied in as they are (`npm run wp:assets`);
 * each component under inc/components/ is the PHP of one TypeScript component,
 * emitting the same markup, so the stylesheet and the scripts need know nothing
 * about which of the two is drawing.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CV_THEME_VERSION', '0.1.0' );
define( 'CV_THEME_DIR', get_template_directory() );
define( 'CV_THEME_URI', get_template_directory_uri() );

foreach ( [
	'setup',
	'colour',
	'size',
	'image',
	'content',
	'components/layout',
	'components/gallery',
	'components/editorial',
	'components/lists',
	'components/chart',
	'components/whats-color',
	'components/artwork',
] as $cv_file ) {
	require_once CV_THEME_DIR . "/inc/{$cv_file}.php";
}
unset( $cv_file );
