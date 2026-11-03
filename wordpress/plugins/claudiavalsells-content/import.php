<?php
/**
 * The import, from WP-CLI:
 *
 *   wp eval-file wp-content/plugins/claudiavalsells-content/import.php
 *
 * The work itself is in includes/importer.php, which the admin's
 * Tools → Import content runs too, a few entries per request. From here it
 * runs in one go. To overwrite entries edited in WordPress since the last
 * import:
 *
 *   wp --exec='define("CV_IMPORT_OVERWRITE", true);' eval-file …/import.php
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( "Run with WP-CLI: wp eval-file import.php\n" );
}

define( 'WP_IMPORTING', true );

// Entries are written by the site's first administrator, as they would be by
// whoever runs the import from the admin.
$cv_admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'fields' => 'ID' ] );
wp_set_current_user( $cv_admins ? (int) $cv_admins[0] : 0 );

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$cv_manifest = CVC_Importer::manifest();
if ( ! $cv_manifest ) {
	WP_CLI::error( 'No bundle at ' . CVC_Importer::bundle_dir() . '/manifest.json — run `npm run wp:export` first.' );
}

$cv_importer = new CVC_Importer(
	CVC_Importer::bundle_dir(),
	$cv_manifest,
	function ( string $level, string $message ) {
		'warning' === $level ? WP_CLI::warning( $message ) : WP_CLI::log( $message );
	},
	CVC_Importer::begin( defined( 'CV_IMPORT_OVERWRITE' ) && CV_IMPORT_OVERWRITE, $cv_manifest )
);
$cv_run = $cv_importer->advance();
$cv_run['finished'] ? WP_CLI::success( 'Done.' ) : WP_CLI::error( 'The import stopped before the end.' );
