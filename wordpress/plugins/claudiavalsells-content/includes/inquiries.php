<?php
/**
 * The order desk.
 *
 * The Colour Chart's form posts here: one message, one email to Claudia,
 * nothing kept. Every check the form made is made again, because a page can be
 * edited by whoever is looking at it, so nothing the browser decides counts.
 *
 * A refusal says only `invalid`, `email`, `rate` or `blocked` — never which
 * check caught it. The honeypot and the time trap answer as if all were well
 * and send nothing, so a robot has no reason to come back and try it
 * differently. The same arrangement as the Cloudflare worker this replaces
 * (server/inquiries/), moved in-house because the host can send mail.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'cv/v1', '/inquiries', [
		'methods'             => 'POST',
		'callback'            => 'cvc_inquiry',
		'permission_callback' => '__return_true',
	] );
} );

/** Where the form posts. The theme prints it as the form's action. */
function cvc_inquiries_endpoint(): string {
	return rest_url( 'cv/v1/inquiries' );
}

/** Anything bound for a mail header loses its control characters, which is how a second recipient gets added. */
function cvc_header_safe( string $value, int $max ): string {
	$value = preg_replace( '/[\x00-\x1F\x7F]+/u', ' ', $value ) ?? '';
	return mb_substr( trim( preg_replace( '/\s+/u', ' ', $value ) ), 0, $max );
}

function cvc_body_safe( string $value, int $max ): string {
	$value = str_replace( "\r\n", "\n", $value );
	$value = preg_replace( '/[^\P{C}\n\t]+/u', '', $value ) ?? '';
	return mb_substr( trim( $value ), 0, $max );
}

/**
 * The sender's address, hashed with a pepper before it becomes a key, so the
 * store never holds a list of who has written.
 */
function cvc_sender_key(): string {
	$pepper = get_option( 'cv_inquiry_pepper' );
	if ( ! $pepper ) {
		$pepper = wp_generate_password( 48, true, true );
		update_option( 'cv_inquiry_pepper', $pepper, false );
	}
	$ip = $_SERVER['REMOTE_ADDR'] ?? '';
	return substr( hash_hmac( 'sha256', $ip, $pepper ), 0, 24 );
}

/** Counts a window up and says whether it is over. */
function cvc_over( string $name, int $limit, int $seconds ): bool {
	$count = (int) get_transient( $name );
	if ( $count >= $limit ) {
		return true;
	}
	set_transient( $name, $count + 1, $seconds );
	return false;
}

function cvc_inquiry( WP_REST_Request $request ) {
	$p = fn( string $key ) => (string) ( $request->get_param( $key ) ?? '' );

	$to = cvc_option( 'cv_inquiry_to' );
	if ( ! $to || ! is_email( $to ) ) {
		return new WP_REST_Response( [ 'error' => 'unconfigured' ], 503 );
	}

	// The two silent traps: a field no person can see, and a form submitted in
	// less time than a message takes to type, or left open past any reason.
	if ( '' !== trim( $p( 'website' ) ) ) {
		return new WP_REST_Response( [ 'ok' => true ], 200 );
	}
	$started = (float) $p( 'started' );
	$age     = ( microtime( true ) * 1000 ) - $started;
	if ( $started <= 0 || $age < 3000 || $age > 12 * HOUR_IN_SECONDS * 1000 ) {
		return new WP_REST_Response( [ 'ok' => true ], 200 );
	}

	$name    = cvc_header_safe( $p( 'name' ), 120 );
	$country = cvc_header_safe( $p( 'country' ), 80 );
	$email   = cvc_header_safe( $p( 'email' ), 160 );
	$subject = cvc_header_safe( $p( 'subject' ), 160 );
	$message = cvc_body_safe( $p( 'message' ), 4000 );

	if ( mb_strlen( $name ) < 2 || mb_strlen( $message ) < 10 ) {
		return new WP_REST_Response( [ 'error' => 'invalid' ], 400 );
	}
	if ( ! is_email( $email ) ) {
		return new WP_REST_Response( [ 'error' => 'email' ], 400 );
	}

	$key = cvc_sender_key();
	if ( cvc_over( "cv_inq_h_$key", 3, HOUR_IN_SECONDS ) || cvc_over( "cv_inq_d_$key", 6, DAY_IN_SECONDS ) ) {
		return new WP_REST_Response( [ 'error' => 'rate' ], 429 );
	}
	if ( cvc_over( 'cv_inq_all_' . gmdate( 'Ymd' ), max( 1, (int) cvc_option( 'cv_inquiry_cap' ) ), DAY_IN_SECONDS ) ) {
		return new WP_REST_Response( [ 'error' => 'rate' ], 429 );
	}

	$lines = [
		sprintf( '%s: %s', 'Name', $name ),
		sprintf( '%s: %s', 'Email', $email ),
	];
	if ( $country ) {
		$lines[] = sprintf( '%s: %s', 'Country', $country );
	}
	if ( $subject ) {
		$lines[] = sprintf( '%s: %s', 'Subject', $subject );
	}
	$body = implode( "\n", $lines ) . "\n\n" . $message . "\n\n—\n" . sprintf( 'Sent from the Colour Chart order form on %s.', home_url( '/' ) );

	$headers = [
		'Content-Type: text/plain; charset=UTF-8',
		sprintf( 'Reply-To: %s <%s>', str_replace( [ '<', '>', '"' ], '', $name ), $email ),
	];
	$sent = wp_mail( $to, sprintf( 'Colour chart inquiry — %s', $subject ?: $name ), $body, $headers );

	if ( ! $sent ) {
		return new WP_REST_Response( [ 'error' => 'server' ], 500 );
	}
	return new WP_REST_Response( [ 'ok' => true ], 200 );
}
