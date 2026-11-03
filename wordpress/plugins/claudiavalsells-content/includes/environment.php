<?php
/**
 * Which site is this: the live one, staging, or a copy on a laptop.
 *
 * WordPress reads it from WP_ENVIRONMENT_TYPE in wp-config.php, and a site
 * that does not say is production — so the live site needs nothing set, and
 * staging needs one line: define( 'WP_ENVIRONMENT_TYPE', 'staging' ). wp-env
 * sets 'local' on this Mac.
 *
 * Anywhere but production:
 *   - the admin bar says which site it is, in red, on every page, so a change
 *     meant for staging is never made on the live site or the other way round;
 *   - every page also tells search engines not to index it, as a header, on
 *     top of Settings → Reading — a staging copy found by Google competes with
 *     the real site, and the setting alone is one checkbox from being undone.
 *
 * On a laptop only — a site whose environment is 'local' and whose address is
 * on this machine — mail is written to wp-content/cv-mail.log.php instead of
 * being sent, since there is no mail server in Docker, so the order form and
 * the site check's test message can be tried end to end. The file begins with
 * a line of PHP that ends any request for it, so a browser asking for it gets
 * nothing; and a copy of this site that reaches a server (a Duplicator
 * package carries wp-config.php, 'local' and all) sends its mail as usual,
 * because its address is no longer this machine's.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cvc_is_production(): bool {
	return 'production' === wp_get_environment_type();
}

/** A local environment at an address only this machine answers. */
function cvc_is_laptop(): bool {
	if ( 'local' !== wp_get_environment_type() ) {
		return false;
	}
	$host = strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
	return in_array( $host, [ 'localhost', '127.0.0.1', '::1', '[::1]' ], true ) || str_ends_with( $host, '.localhost' ) || str_ends_with( $host, '.test' );
}

add_action( 'send_headers', function () {
	if ( ! cvc_is_production() && ! is_admin() ) {
		header( 'X-Robots-Tag: noindex, nofollow', true );
	}
} );

add_action( 'admin_bar_menu', function ( WP_Admin_Bar $bar ) {
	if ( cvc_is_production() ) {
		return;
	}
	$labels = [
		'staging'     => __( 'Staging — not the live site', 'claudiavalsells' ),
		'development' => __( 'Development — not the live site', 'claudiavalsells' ),
		'local'       => __( 'Local copy — not the live site', 'claudiavalsells' ),
	];
	$bar->add_node( [
		'id'    => 'cvc-environment',
		'title' => esc_html( $labels[ wp_get_environment_type() ] ?? $labels['staging'] ),
		// A link only for those who may open the site check; a label for the rest.
		'href'  => current_user_can( 'manage_options' ) ? admin_url( 'tools.php?page=cvc-site-check' ) : false,
		'meta'  => [ 'class' => 'cvc-environment' ],
	] );
}, 1 );

add_action( 'wp_head', 'cvc_environment_style' );
add_action( 'admin_head', 'cvc_environment_style' );
function cvc_environment_style(): void {
	if ( cvc_is_production() || ! is_admin_bar_showing() ) {
		return;
	}
	echo '<style>#wpadminbar .cvc-environment > .ab-item{background:#b32d2e;color:#fff;font-weight:600}</style>';
}

/*
 * The mail log, on a laptop only. pre_wp_mail answering anything but null
 * stops wp_mail() there; true says it was sent.
 */
add_filter( 'pre_wp_mail', function ( $short, array $atts ) {
	if ( ! cvc_is_laptop() ) {
		return $short;
	}
	$to      = is_array( $atts['to'] ) ? implode( ', ', $atts['to'] ) : (string) $atts['to'];
	$headers = is_array( $atts['headers'] ) ? implode( "\n", $atts['headers'] ) : (string) $atts['headers'];
	$entry   = sprintf(
		"=== %s\nTo: %s\nSubject: %s\n%s\n\n%s\n\n",
		gmdate( 'c' ),
		$to,
		$atts['subject'],
		trim( $headers ),
		$atts['message']
	);
	$file = cvc_mail_log();
	if ( ! is_file( $file ) ) {
		// Ends a request for the file, and stops PHP reading on: nothing written
		// below — a message is whatever a visitor typed — is ever taken as code.
		file_put_contents( $file, "<?php exit; __halt_compiler();\n" );
	}
	return false !== file_put_contents( $file, $entry, FILE_APPEND | LOCK_EX );
}, 10, 2 );

function cvc_mail_log(): string {
	return WP_CONTENT_DIR . '/cv-mail.log.php';
}
