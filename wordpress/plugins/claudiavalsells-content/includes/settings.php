<?php
/**
 * The handful of texts that belong to the site rather than to any one entry,
 * and the one address nobody else may see.
 *
 * Settings → Site texts.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cvc_option_defaults(): array {
	return [
		'cv_tagline'      => 'Claudia Valsells — an artist working with colour as material, language and subject.',
		'cv_lead'         => '',
		'cv_loader_lines' => "CLAUDIA VALSELLS\n1969\nAlzueta Gallery\nBarcelona, Spain\n© All Rights Reserved",
		'cv_inquiry_to'   => '',
		'cv_inquiry_cap'  => 60,
	];
}

function cvc_option( string $key ) {
	$defaults = cvc_option_defaults();
	$value    = get_option( $key, $defaults[ $key ] ?? '' );
	return ( '' === $value || null === $value ) ? ( $defaults[ $key ] ?? '' ) : $value;
}

add_action( 'admin_init', function () {
	register_setting( 'cvc_site', 'cv_tagline', [ 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ] );
	register_setting( 'cvc_site', 'cv_lead', [ 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ] );
	register_setting( 'cvc_site', 'cv_loader_lines', [ 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ] );
	register_setting( 'cvc_site', 'cv_inquiry_to', [ 'type' => 'string', 'sanitize_callback' => 'sanitize_email' ] );
	register_setting( 'cvc_site', 'cv_inquiry_cap', [ 'type' => 'integer', 'sanitize_callback' => 'absint' ] );

	add_settings_section( 'cvc_texts', __( 'Texts', 'claudiavalsells' ), '__return_false', 'cvc_site' );
	add_settings_section( 'cvc_desk', __( 'The order desk', 'claudiavalsells' ), function () {
		echo '<p>' . esc_html__( 'Where the Colour Chart’s order form sends. The address is never shown on the site.', 'claudiavalsells' ) . '</p>';
	}, 'cvc_site' );

	$text = function ( string $key, string $kind = 'text', array $attrs = [] ) {
		return function () use ( $key, $kind, $attrs ) {
			$value = cvc_option( $key );
			if ( 'textarea' === $kind ) {
				printf( '<textarea name="%s" rows="%d" class="large-text">%s</textarea>', esc_attr( $key ), (int) ( $attrs['rows'] ?? 4 ), esc_textarea( (string) $value ) );
			} else {
				printf( '<input type="%s" name="%s" value="%s" class="regular-text" />', esc_attr( $kind ), esc_attr( $key ), esc_attr( (string) $value ) );
			}
			if ( ! empty( $attrs['help'] ) ) {
				echo '<p class="description">' . esc_html( $attrs['help'] ) . '</p>';
			}
		};
	};

	add_settings_field( 'cv_tagline', __( 'Description', 'claudiavalsells' ), $text( 'cv_tagline', 'text', [ 'help' => __( 'What search engines show under the site’s name.', 'claudiavalsells' ) ] ), 'cvc_site', 'cvc_texts' );
	add_settings_field( 'cv_lead', __( 'What’s Color? — the note above the names', 'claudiavalsells' ), $text( 'cv_lead', 'textarea', [ 'rows' => 4 ] ), 'cvc_site', 'cvc_texts' );
	add_settings_field( 'cv_loader_lines', __( 'The opening screen', 'claudiavalsells' ), $text( 'cv_loader_lines', 'textarea', [ 'rows' => 5, 'help' => __( 'Five lines, one per line.', 'claudiavalsells' ) ] ), 'cvc_site', 'cvc_texts' );
	add_settings_field( 'cv_inquiry_to', __( 'Send inquiries to', 'claudiavalsells' ), $text( 'cv_inquiry_to', 'email' ), 'cvc_site', 'cvc_desk' );
	add_settings_field( 'cv_inquiry_cap', __( 'At most, per day', 'claudiavalsells' ), $text( 'cv_inquiry_cap', 'number', [ 'help' => __( 'A ceiling on messages a day, against a flood.', 'claudiavalsells' ) ] ), 'cvc_site', 'cvc_desk' );
} );

add_action( 'admin_menu', function () {
	add_options_page(
		__( 'Site texts', 'claudiavalsells' ),
		__( 'Site texts', 'claudiavalsells' ),
		'manage_options',
		'cvc-site',
		function () {
			echo '<div class="wrap"><h1>' . esc_html__( 'Site texts', 'claudiavalsells' ) . '</h1><form method="post" action="options.php">';
			settings_fields( 'cvc_site' );
			do_settings_sections( 'cvc_site' );
			submit_button();
			echo '</form></div>';
		}
	);
} );
