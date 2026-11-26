<?php
/** Claudia Valsells — the theme. */

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
	'components/sheet',
	'components/plates',
	'components/lists',
	'components/chart',
	'components/whats-color',
	'components/artwork',
] as $cv_file ) {
	require_once CV_THEME_DIR . "/inc/{$cv_file}.php";
}
unset( $cv_file );
