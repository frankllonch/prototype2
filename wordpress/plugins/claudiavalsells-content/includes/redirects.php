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
		// A picture's own page, which the old site kept under the work it was uploaded to.
		[ '#^/portfolio/([^/]+)/(?:attachment/)?[^/]+/?$#', '/artwork/$1/' ],
		[ '#^/portfolio/?$#', '/artwork/' ],
		[ '#^/portfolio_category/[^/]+/?$#', '/artwork/' ],
		[ '#^/available-works/?$#', '/artwork/' ],
		[ '#^/projects/whats-color-3rd-edition-llibreria-terranova-abril-2024/?$#', '/whats-color/iii/' ],
		// Its pictures' pages, under attachment/ where their names are numbers.
		[ '#^/projects/whats-color-3rd-edition-llibreria-terranova-abril-2024/(?:attachment/)?[^/]+/?$#', '/whats-color/iii/' ],
		// The pictures of the old /projects/ page itself, whose own pages look like projects'.
		[ '#^/projects/(aoo-claudia-valsells-w|claudia-valsells-aoo-w|imagen-destacada|solidary-fulard-2022-(?:1|2|3|thumb|thumbs-2))/?$#', '/commissioned/' ],
		[ '#^/projects/([^/]+)/?$#', '/commissioned/$1/' ],
		// A picture's own page, under the project it was uploaded to.
		[ '#^/projects/([^/]+)/(?:attachment/)?[^/]+/?$#', '/commissioned/$1/' ],
		[ '#^/projects/?$#', '/commissioned/' ],
		[ '#^/whats-color-exhibitions/?$#', '/exhibitions/' ],
		// A picture's own page under the old exhibitions page.
		[ '#^/whats-color-exhibitions/(?:attachment/)?[^/]+/?$#', '/exhibitions/' ],
		[ '#^/colour-chart/?$#', '/color-chart/' ],
		// The one picture's page under the old Colour Chart.
		[ '#^/colour-chart/(?:attachment/)?[^/]+/?$#', '/color-chart/' ],
		[ '#^/contacto/?$#', '/about/' ],
		// The pictures' pages under About, each named, since /about/ is still an address.
		[ '#^/about/(img_7927|r1-00056-001a|r1-00056-004a)/?$#', '/about/' ],
		[ '#^/(carrito|finalizar-compra)/?$#', '/artwork/' ],
		[ '#^/4824-2/?$#', '/' ],
		// The picture's page under the old home page, which was /home/.
		[ '#^/home/(?:attachment/)?[^/]+/?$#', '/' ],
		[ '#^/sitemap_index\.xml$#', '/wp-sitemap.xml' ],
		// The sitemaps Yoast's index listed, which search engines were given as well.
		[ '#^/(page|attachment|portfolio|portfolio_category)-sitemap\.xml$#', '/wp-sitemap.xml' ],
	];
}

/*
 * On parse_request, before WordPress runs the query: by template_redirect it
 * has already decided the old address is a 404 and sent the no-cache headers
 * that go with one, and a permanent redirect under those headers is one no
 * browser or proxy keeps.
 */
add_action( 'parse_request', function () {
	$uri     = $_SERVER['REQUEST_URI'] ?? '/';
	$request = wp_parse_url( $uri, PHP_URL_PATH );
	if ( ! is_string( $request ) || '' === $request ) {
		return;
	}
	// The site may live under a path; the rules are written against its root.
	$home = wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ?: '/';
	$path = '/' . ltrim( substr( $request, strlen( rtrim( $home, '/' ) ) ), '/' );

	foreach ( cvc_redirect_rules() as [ $pattern, $target ] ) {
		if ( preg_match( $pattern, $path ) ) {
			$new = preg_replace( $pattern, $target, $path );
			// The query string travels: a campaign's tracking on an old link
			// still counts at the new address.
			$query = wp_parse_url( $uri, PHP_URL_QUERY );
			wp_safe_redirect( home_url( $new ) . ( is_string( $query ) && '' !== $query ? '?' . $query : '' ), 301 );
			exit;
		}
	}
}, 0 );
