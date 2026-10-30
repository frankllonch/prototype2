<?php
/**
 * Plugin Name: Claudia Valsells — Content
 * Description: The content types, fields, redirects and order desk of claudiavalsells.com. The theme draws; this says what there is to draw.
 * Version: 0.1.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: Frank Llonch
 * Text Domain: claudiavalsells
 *
 * A plugin rather than part of the theme so that the content survives a change
 * of theme: the works, the exhibitions and everything Claudia has typed stay
 * registered whatever the site happens to look like.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CVC_VERSION', '0.1.0' );
define( 'CVC_DIR', plugin_dir_path( __FILE__ ) );
define( 'CVC_URL', plugin_dir_url( __FILE__ ) );

require_once CVC_DIR . 'includes/post-types.php';
require_once CVC_DIR . 'includes/queries.php';
require_once CVC_DIR . 'includes/editor.php';
require_once CVC_DIR . 'includes/settings.php';
require_once CVC_DIR . 'includes/redirects.php';
require_once CVC_DIR . 'includes/inquiries.php';
require_once CVC_DIR . 'includes/colours.php';

register_activation_hook( __FILE__, function () {
	cvc_register_post_types();
	flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
