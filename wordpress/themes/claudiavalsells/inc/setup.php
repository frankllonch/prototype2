<?php
/** What the theme asks of WordPress, and what it asks it not to do. */

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

/*
 * And not the three of WordPress's own that only duplicate them: 768 beside 800,
 * 1536 beside 1600, and 2048, which no page here asks for.
 */
add_filter( 'intermediate_image_sizes', function ( array $sizes ): array {
	return array_values( array_diff( $sizes, [ 'medium_large', '1536x1536', '2048x2048' ] ) );
} );

/* Pictures are resized on the server, as they always were. */
add_filter( 'wp_client_side_media_processing_enabled', '__return_false' );

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
// No link to the REST API either: nothing on these pages looks it up — the order form posts
// to its endpoint by name — and an app looking for the API still finds the same link in the
// HTTP headers.
remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
// No rule for pictures sized `auto`: every picture here is written by the theme with sizes of
// its own.
remove_action( 'wp_head', 'wp_print_auto_sizes_contain_css_fix', 1 );
// No generator tag from the Modern Image Formats plugin: like WordPress's own, taken out
// above, it tells a visitor only which version of it runs.
remove_action( 'wp_head', 'webp_uploads_render_generator' );
// The canonical link is the theme's (cv_canonical_url, printed by header.php), on every page
// rather than only on single entries.
remove_action( 'wp_head', 'rel_canonical' );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_classic_theme_styles' );
add_filter( 'emoji_svg_url', '__return_false' );
// No speculative prefetching: the links WordPress would prefetch on hover — an exhibition's
// row, a work in the grid — open as a panel or in the lightbox without leaving the page, so
// the pages fetched would go unused.
add_filter( 'wp_speculation_rules_configuration', '__return_null' );

/* The tab's icon. */
add_action( 'do_faviconico', function () {
	if ( ! has_site_icon() ) {
		status_header( 404 );
		exit;
	}
} );

// One stylesheet, the design's own.
add_filter( 'should_load_separate_core_block_assets', '__return_false' );
// Nor the "block supports" styles WordPress stores while rendering and prints at the foot: the
// blocks here carry no layout or colour attributes to style.
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_stored_styles' );
remove_action( 'wp_footer', 'wp_enqueue_stored_styles', 1 );

add_action( 'wp_enqueue_scripts', function () {
	foreach ( [ 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles', 'core-block-supports', 'wp-webfonts' ] as $handle ) {
		wp_dequeue_style( $handle );
	}
	wp_enqueue_style( 'cv-site', cv_asset( 'site.css' ), [], null );
	// Versioned by when the file last changed, not by the theme's version: a change to wp.css
	// that leaves the version alone would otherwise sit in every browser's cache until someone
	// remembered to bump it.
	wp_enqueue_style( 'cv-wp', CV_THEME_URI . '/wp.css', [ 'cv-site' ], (string) ( @filemtime( CV_THEME_DIR . '/wp.css' ) ?: CV_THEME_VERSION ) );
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

/** The scripts header.php preloads: the entry, as `npm run wp:assets` lists it in modules.json. */
function cv_modules(): array {
	$listed = json_decode( (string) @file_get_contents( CV_THEME_DIR . '/assets/modules.json' ), true );
	$names  = is_array( $listed ) && $listed ? $listed : [ 'index' ];
	return array_map( fn( $m ) => cv_asset( 'js/' . sanitize_file_name( $m ) . '.js' ), $names );
}

/* ----------------------------------------------------------- the page */

/**
 * What the current template has decided about the page: its title and
 * description, which menu item is current, and the chrome it carries — a year
 * rail, controls, overlays, the scroll cue — which header.php and footer.php
 * print around `main`.
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
	// Escaped here: a non-empty answer to this filter is printed as it is.
	if ( '' === $title || $title === $site ) {
		return esc_html( $site );
	}
	return esc_html( "$title — $site" );
} );

/**
 * The page's own address, for the canonical link header.php prints: an entry's
 * permalink, the front page's and each index's own.
 */
function cv_canonical_url(): string {
	if ( is_404() ) {
		return '';
	}
	$page = cv_page();
	if ( is_singular( [ 'exhibition', 'commissioned' ] ) && '' === $page['open'] ) {
		return home_url( $page['path'] );
	}
	if ( is_singular() ) {
		return (string) wp_get_canonical_url();
	}
	if ( is_front_page() ) {
		return home_url( '/' );
	}
	if ( is_post_type_archive() ) {
		$type = get_queried_object();
		return $type instanceof WP_Post_Type ? (string) get_post_type_archive_link( $type->name ) : '';
	}
	return '';
}

/**
 * What a link to this page shows when it is shared — WhatsApp, Instagram,
 * Facebook, a text message: the title, a line, and a picture.
 */
function cv_share_tags( string $description, string $url ): string {
	$page  = cv_page();
	$site  = get_bloginfo( 'name' );
	$title = '' !== $page['title'] && $page['title'] !== $site ? $page['title'] . ' — ' . $site : $site;

	$image = null;
	$post  = is_singular() ? get_queried_object() : null;
	if ( $post instanceof WP_Post ) {
		$id = 0;
		if ( 'artwork' === $post->post_type ) {
			$photo = (int) get_post_meta( $post->ID, '_cv_photo_id', true );
			$id    = $photo && 'attachment' === get_post_type( $photo ) ? $photo : (int) get_post_thumbnail_id( $post );
		} elseif ( in_array( $post->post_type, [ 'exhibition', 'commissioned' ], true ) && '' !== $page['open'] ) {
			// Its main photograph, or else the first its panel shows.
			$panel = 'exhibition' === $post->post_type ? cv_exhibition( $post ) : cv_project( $post );
			$id    = (int) get_post_thumbnail_id( $post ) ?: (int) ( $panel['images'][0]['id'] ?? 0 );
		}
		$src = $id ? wp_get_attachment_image_src( $id, 'cv-1600' ) : false;
		if ( $src ) {
			$alt   = trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) );
			$image = [ $src[0], (int) $src[1], (int) $src[2], '' !== $alt ? $alt : $title ];
		}
	}
	if ( ! $image ) {
		$poster = CV_THEME_DIR . '/assets/video/whats-color-poster.jpg';
		$size   = is_readable( $poster ) ? @getimagesize( $poster ) : false;
		$image  = [ cv_asset( 'video/whats-color-poster.jpg' ), $size ? (int) $size[0] : 0, $size ? (int) $size[1] : 0, 'What’s Color? (I), Alzueta Gallery, December 2020' ];
	}

	$tags = [
		[ 'og:type', 'website' ],
		[ 'og:site_name', $site ],
		[ 'og:title', $title ],
		[ 'og:description', $description ],
		[ 'og:url', $url ],
		[ 'og:image', $image[0] ],
		[ 'og:image:width', $image[1] ?: '' ],
		[ 'og:image:height', $image[2] ?: '' ],
		[ 'og:image:alt', $image[3] ],
		[ 'twitter:card', 'summary_large_image' ],
	];
	$out = '';
	foreach ( $tags as [ $property, $value ] ) {
		if ( '' === (string) $value || ( 'og:url' === $property && '' === $url ) ) {
			continue;
		}
		$attr = str_starts_with( $property, 'twitter:' ) ? 'name' : 'property';
		$out .= sprintf( "<meta %s=\"%s\" content=\"%s\" />\n", $attr, esc_attr( $property ), esc_attr( 'og:url' === $property || 'og:image' === $property ? esc_url_raw( (string) $value ) : (string) $value ) );
	}
	return $out;
}

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
