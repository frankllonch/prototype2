<?php
/**
 * What the theme asks of WordPress, and what it asks it not to do.
 *
 * The page is the stylesheet and scripts built from src/, and nothing else:
 * no block-library CSS, no global styles, no emoji script. Every one of those
 * would land in a cascade that was written without them.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', [ 'gallery', 'caption', 'style', 'script' ] );
	add_theme_support( 'editor-styles' );
	add_editor_style( 'editor.css' );
	remove_theme_support( 'core-block-patterns' );

	// The three widths the static site renders; WordPress makes them on upload.
	add_image_size( 'cv-400', 400, 0 );
	add_image_size( 'cv-800', 800, 0 );
	add_image_size( 'cv-1600', 1600, 0 );
} );

/* ----------------------------------------------------------- the head */

remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wlwmanifest_link' );
remove_action( 'wp_head', 'wp_shortlink_wp_head' );
remove_action( 'wp_head', 'feed_links', 2 );
remove_action( 'wp_head', 'feed_links_extra', 3 );
remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
remove_action( 'wp_head', 'wp_oembed_add_host_js' );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_classic_theme_styles' );
add_filter( 'emoji_svg_url', '__return_false' );

add_action( 'wp_enqueue_scripts', function () {
	foreach ( [ 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles', 'core-block-supports', 'wp-webfonts' ] as $handle ) {
		wp_dequeue_style( $handle );
	}
	wp_enqueue_style( 'cv-site', cv_asset( 'site.css' ), [], null );
	wp_enqueue_style( 'cv-wp', CV_THEME_URI . '/wp.css', [ 'cv-site' ], CV_THEME_VERSION );
}, 100 );

/** Built assets carry the build's stamp in their address, so a rebuild is a new address. */
function cv_asset_version(): string {
	static $version = null;
	if ( null === $version ) {
		$stamp   = @file_get_contents( CV_THEME_DIR . '/assets/version.txt' );
		$version = $stamp ? trim( $stamp ) : CV_THEME_VERSION;
	}
	return $version;
}

function cv_asset( string $path ): string {
	return CV_THEME_URI . '/assets/' . $path . '?v=' . rawurlencode( cv_asset_version() );
}

/** The client modules, in boot order, as src/components/layout.ts lists them. */
function cv_modules(): array {
	$names = [
		'env', 'text-roll', 'transitions', 'controls', 'stack', 'years', 'hover-list', 'panels',
		'figures', 'lightbox', 'cursor', 'film', 'tilt', 'paging', 'views',
		'scroll-cue', 'inquiries', 'hues', 'index',
	];
	return array_map( fn( $m ) => cv_asset( "js/$m.js" ), $names );
}

/* ----------------------------------------------------------- the page */

/**
 * What the current template has decided about the page: its title and
 * description, which menu item is current, and the chrome it carries — a year
 * rail, controls, overlays, the scroll cue — which header.php and footer.php
 * print around `main`. Set by each template before get_header().
 */
function cv_page( ?array $set = null ): array {
	static $page = [
		'title'       => '',
		'description' => '',
		'path'        => '/',
		'rail'        => '',
		'controls'    => '',
		'overlays'    => '',
		'cue'         => null,
		'bodyClass'   => '',
		// A panel served open — `exhibition-<slug>`, `about` — and the index it closes back to.
		'open'        => '',
		'root'        => '',
	];
	if ( null !== $set ) {
		$page = array_merge( $page, $set );
	}
	return $page;
}

add_filter( 'pre_get_document_title', function () {
	$title = cv_page()['title'];
	$site  = get_bloginfo( 'name' );
	if ( '' === $title || $title === $site ) {
		return $site;
	}
	return "$title — $site";
} );

add_filter( 'body_class', function ( array $classes ) {
	$page = cv_page();
	if ( $page['bodyClass'] ) {
		$classes[] = $page['bodyClass'];
	}
	if ( $page['open'] ) {
		$classes[] = 'is-locked';
	}
	return $classes;
} );

/** A site text, from the content plugin's settings where it is active. */
function cv_option( string $key, $default = '' ) {
	return function_exists( 'cvc_option' ) ? cvc_option( $key ) : $default;
}
