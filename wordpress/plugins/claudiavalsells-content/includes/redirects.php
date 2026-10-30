<?php
/**
 * Every address the old site published keeps working.
 *
 * Three patterns and a handful of one-offs, answered with a permanent redirect
 * before WordPress has decided the old address is nothing. The map is also in
 * docs/wordpress-migration.md, section 5, in words.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The map: a regular expression on the old path, and the new path with
 * captures. Order matters — the one Terranova project goes to What's Color?
 * before the pattern that sends the rest of /projects/ to Commissioned.
 */
function cvc_redirect_rules(): array {
	return [
		[ '#^/portfolio/([^/]+)/?$#', '/artwork/$1/' ],
		[ '#^/portfolio/?$#', '/artwork/' ],
		[ '#^/portfolio_category/[^/]+/?$#', '/artwork/' ],
		[ '#^/available-works/?$#', '/artwork/' ],
		[ '#^/projects/whats-color-3rd-edition-llibreria-terranova-abril-2024/?$#', '/whats-color/iii/' ],
		[ '#^/projects/([^/]+)/?$#', '/commissioned/$1/' ],
		[ '#^/projects/?$#', '/commissioned/' ],
		[ '#^/whats-color-exhibitions/?$#', '/exhibitions/' ],
		[ '#^/colour-chart/?$#', '/color-chart/' ],
		[ '#^/contacto/?$#', '/about/' ],
		[ '#^/(carrito|finalizar-compra)/?$#', '/artwork/' ],
		[ '#^/4824-2/?$#', '/' ],
		[ '#^/sitemap_index\.xml$#', '/wp-sitemap.xml' ],
	];
}

add_action( 'template_redirect', function () {
	$request = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH );
	if ( ! is_string( $request ) || '' === $request ) {
		return;
	}
	// The site may live under a path; the rules are written against its root.
	$home = wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ?: '/';
	$path = '/' . ltrim( substr( $request, strlen( rtrim( $home, '/' ) ) ), '/' );

	foreach ( cvc_redirect_rules() as [ $pattern, $target ] ) {
		if ( preg_match( $pattern, $path ) ) {
			$new = preg_replace( $pattern, $target, $path );
			wp_safe_redirect( home_url( $new ), 301 );
			exit;
		}
	}
}, 0 );
