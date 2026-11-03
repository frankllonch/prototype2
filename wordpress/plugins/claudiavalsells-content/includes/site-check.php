<?php
/**
 * Tools → Site check: the go-live checklist, checked by the site itself.
 *
 * Section 6 of the plan says everything that keeps staging private comes off
 * at go-live "from a checklist, so none of it is forgotten on the live site".
 * A list on paper is only as good as the morning it is read on; this one reads
 * the site's real state each time the page is opened — search engines, HTTPS,
 * permalinks, the order form's recipient and a test message, the redirects,
 * the sitemap, debug output, the default admin account, the import folder,
 * what the server can do with images — and says, for the kind of site it is
 * (production, staging, local), which items are right, which need a look and
 * which must be fixed before anyone else sees the site.
 *
 * It also answers the plan's questions about the host (PHP version, memory,
 * time limit, WebP and AVIF) the moment the site is installed there, and puts
 * the whole report in a box to paste into an email.
 *
 * Administrators only. It changes nothing but, on request, sends one test
 * message to the order form's recipient.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', function () {
	add_management_page(
		__( 'Site check', 'claudiavalsells' ),
		__( 'Site check', 'claudiavalsells' ),
		'manage_options',
		'cvc-site-check',
		'cvc_site_check_page'
	);
} );

add_action( 'admin_post_cvc_site_check_mail', 'cvc_site_check_send_mail' );

/**
 * Every check: [ 'group', 'label', 'status' ok|warn|fail|info, 'detail', 'fix' ].
 * A 'fail' must be fixed before go-live (or, on staging, before anyone is
 * shown the site); a 'warn' wants a look; 'info' is a fact worth knowing.
 */
function cvc_site_checks(): array {
	if ( ! function_exists( 'is_plugin_active' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}
	$env    = wp_get_environment_type();
	$live   = 'production' === $env;
	$local  = 'local' === $env;
	$checks = [];
	$add    = function ( string $group, string $label, string $status, string $detail, string $fix = '' ) use ( &$checks ) {
		$checks[] = compact( 'group', 'label', 'status', 'detail', 'fix' );
	};
	$any_active = function ( array $plugins ): string {
		foreach ( $plugins as $file => $name ) {
			if ( is_plugin_active( $file ) ) {
				return $name;
			}
		}
		return '';
	};

	/* ------------------------------------------------------------ the site */
	$g = __( 'The site', 'claudiavalsells' );

	$names = [
		'production'  => __( 'production — the live site', 'claudiavalsells' ),
		'staging'     => __( 'staging — the private test copy', 'claudiavalsells' ),
		'development' => __( 'development', 'claudiavalsells' ),
		'local'       => __( 'local — a copy on a laptop', 'claudiavalsells' ),
	];
	$add( $g, __( 'Which site this is', 'claudiavalsells' ), 'info', $names[ $env ] ?? $env,
		$live ? '' : __( 'Set by WP_ENVIRONMENT_TYPE in wp-config.php. The live site must not set it (or set it to production).', 'claudiavalsells' ) );

	$public = (bool) get_option( 'blog_public' );
	if ( $live ) {
		$add( $g, __( 'Search engines', 'claudiavalsells' ), $public ? 'ok' : 'fail',
			$public ? __( 'Allowed to index the site.', 'claudiavalsells' ) : __( 'Asked to stay away — the live site would not appear on Google.', 'claudiavalsells' ),
			$public ? '' : __( 'Settings → Reading: untick “Discourage search engines from indexing this site”.', 'claudiavalsells' ) );
	} else {
		$add( $g, __( 'Search engines', 'claudiavalsells' ), $public ? 'warn' : 'ok',
			$public ? __( 'Allowed to index this copy, which would compete with the live site.', 'claudiavalsells' ) : __( 'Asked to stay away, as a copy should be. Every page also sends a no-index header.', 'claudiavalsells' ),
			$public ? __( 'Settings → Reading: tick “Discourage search engines from indexing this site”.', 'claudiavalsells' ) : '' );
	}

	// The addresses as saved, not as this request sees them: home_url() takes
	// the scheme of the page it is called from, so an admin opened over https
	// would make a site still saved as http look right.
	$home  = (string) get_option( 'home' );
	$https = str_starts_with( $home, 'https://' ) && str_starts_with( (string) get_option( 'siteurl' ), 'https://' );
	$add( $g, __( 'HTTPS', 'claudiavalsells' ), $https ? 'ok' : ( $local ? 'info' : 'fail' ),
		/* translators: %s: the site's address. */
		sprintf( __( 'The site’s address is %s.', 'claudiavalsells' ), $home ),
		$https ? '' : __( 'Settings → General: both addresses must start with https:// once the certificate is in place.', 'claudiavalsells' ) );

	$permalinks = (string) get_option( 'permalink_structure' );
	$add( $g, __( 'Addresses (permalinks)', 'claudiavalsells' ), '/%postname%/' === $permalinks ? 'ok' : 'fail',
		$permalinks ?: __( 'plain', 'claudiavalsells' ),
		'/%postname%/' === $permalinks ? '' : __( 'Settings → Permalinks: choose “Post name” and save.', 'claudiavalsells' ) );

	$theme  = get_stylesheet();
	$assets = get_stylesheet_directory() . '/assets';
	if ( 'claudiavalsells' !== $theme ) {
		$add( $g, __( 'Theme', 'claudiavalsells' ), 'fail', $theme, __( 'Appearance → Themes: activate Claudia Valsells.', 'claudiavalsells' ) );
	} else {
		$built = is_readable( "$assets/site.css" ) && is_readable( "$assets/version.txt" ) && is_readable( "$assets/js/index.js" );
		$add( $g, __( 'Theme', 'claudiavalsells' ), $built ? 'ok' : 'fail',
			$built
				/* translators: %s: the build stamp of the theme's stylesheet and scripts. */
				? sprintf( __( 'Claudia Valsells, with its stylesheet and scripts (build %s).', 'claudiavalsells' ), trim( (string) file_get_contents( "$assets/version.txt" ) ) )
				: __( 'Active, but its stylesheet and scripts are missing: pages would show unstyled.', 'claudiavalsells' ),
			$built ? '' : __( 'Upload the theme package made by npm run wp:package, which includes them.', 'claudiavalsells' ) );
	}

	$privacy = get_privacy_policy_url();
	$add( $g, __( 'Privacy notice', 'claudiavalsells' ), $privacy ? 'ok' : 'warn',
		$privacy
			/* translators: %s: the address of the privacy notice. */
			? sprintf( __( 'Published at %s and linked under the order form.', 'claudiavalsells' ), $privacy )
			: __( 'None published, so the order form links to none. The form collects a name and an email address.', 'claudiavalsells' ),
		$privacy ? '' : __( 'Settings → Privacy: create or choose the page, have the wording confirmed, publish it.', 'claudiavalsells' ) );

	/* ---------------------------------------------------------- the content */
	$g      = __( 'Content', 'claudiavalsells' );
	$counts = [];
	foreach ( [ 'artwork' => __( 'artwork', 'claudiavalsells' ), 'exhibition' => __( 'exhibitions', 'claudiavalsells' ), 'commissioned' => __( 'commissioned', 'claudiavalsells' ), 'wc_edition' => __( 'editions', 'claudiavalsells' ), 'wc_answer' => __( 'people in What’s Color?', 'claudiavalsells' ) ] as $type => $name ) {
		$counts[] = (int) ( wp_count_posts( $type )->publish ?? 0 ) . ' ' . $name;
	}
	$last = get_option( 'cv_imported_at' );
	$add( $g, __( 'Published entries', 'claudiavalsells' ), 'info', implode( ', ', $counts ),
		/* translators: %s: date and time of the last import. */
		$last ? sprintf( __( 'Last import: %s.', 'claudiavalsells' ), $last ) : __( 'Never imported.', 'claudiavalsells' ) );

	$run = class_exists( 'CVC_Importer' ) ? CVC_Importer::current_run() : null;
	if ( $run && empty( $run['finished'] ) ) {
		$add( $g, _x( 'Import', 'the name of a check on the site check page', 'claudiavalsells' ), 'warn', __( 'An import was started and did not finish.', 'claudiavalsells' ), __( 'Tools → Import content: continue it.', 'claudiavalsells' ) );
	}

	$bundle = is_dir( WP_CONTENT_DIR . '/import' );
	if ( $bundle ) {
		$add( $g, __( 'Import folder', 'claudiavalsells' ), $live ? 'warn' : 'info',
			__( 'wp-content/import is on the server.', 'claudiavalsells' ),
			$live ? __( 'Once the last import is done, delete the folder by SFTP: it is not needed and its files can be downloaded by anyone who guesses their names.', 'claudiavalsells' ) : '' );
	}

	$uploads  = wp_upload_dir();
	$writable = empty( $uploads['error'] ) && wp_is_writable( $uploads['basedir'] );
	$add( $g, __( 'Uploads folder', 'claudiavalsells' ), $writable ? 'ok' : 'fail',
		$writable ? __( 'Writable: pictures can be added.', 'claudiavalsells' ) : __( 'Not writable: adding a picture will fail.', 'claudiavalsells' ),
		$writable ? '' : __( 'Ask the host to give the web server write access to wp-content/uploads.', 'claudiavalsells' ) );

	/* ---------------------------------------------------------- the order form */
	$g  = __( 'Order form', 'claudiavalsells' );
	$to = (string) cvc_option( 'cv_inquiry_to' );
	$add( $g, __( 'Recipient', 'claudiavalsells' ), is_email( $to ) ? ( $live ? 'ok' : 'info' ) : 'fail',
		is_email( $to )
			/* translators: %s: email address. */
			? sprintf( __( 'Messages go to %s.', 'claudiavalsells' ), $to )
			: __( 'No address set: the form answers that it cannot send.', 'claudiavalsells' ),
		is_email( $to )
			? ( $live ? '' : __( 'On a copy, this should be your own address; on the live site, Claudia’s.', 'claudiavalsells' ) )
			: __( 'Settings → Site texts: “Send inquiries to”.', 'claudiavalsells' ) );

	$smtp = $any_active( [
		'wp-mail-smtp/wp_mail_smtp.php'   => 'WP Mail SMTP',
		'fluent-smtp/fluent-smtp.php'     => 'FluentSMTP',
		'post-smtp/postman-smtp.php'      => 'Post SMTP',
		'easy-wp-smtp/easy-wp-smtp.php'   => 'Easy WP SMTP',
	] );
	$add( $g, __( 'How mail is sent', 'claudiavalsells' ), $smtp ? 'ok' : ( $local ? 'info' : 'warn' ),
		$smtp
			/* translators: %s: name of the mail plugin. */
			? sprintf( __( 'Through %s.', 'claudiavalsells' ), $smtp )
			: ( function_exists( 'cvc_is_laptop' ) && cvc_is_laptop() ? __( 'On this laptop, written to wp-content/cv-mail.log.php instead of sent.', 'claudiavalsells' ) : __( 'Through the server’s own mail function, which often lands in spam or is not delivered at all.', 'claudiavalsells' ) ),
		$smtp || $local ? __( 'Send a test message below, and check it arrives (and not in spam).', 'claudiavalsells' ) : __( 'Install WP Mail SMTP and connect it to the domain’s mail account (the host has the details); then send a test message below.', 'claudiavalsells' ) );

	/* ---------------------------------------------------------- old addresses */
	$g      = __( 'Old addresses', 'claudiavalsells' );
	$sample = [ '/colour-chart/' => '/color-chart/', '/projects/' => '/commissioned/', '/contacto/' => '/about/' ];
	$work   = get_posts( [ 'post_type' => 'artwork', 'posts_per_page' => 1, 'fields' => 'ids' ] );
	if ( $work ) {
		$slug                         = get_post_field( 'post_name', $work[0] );
		$sample[ "/portfolio/$slug/" ] = "/artwork/$slug/";
	}
	$wrong = [];
	foreach ( $sample as $old => $new ) {
		$target = null;
		foreach ( cvc_redirect_rules() as [ $pattern, $replacement ] ) {
			if ( preg_match( $pattern, $old ) ) {
				$target = preg_replace( $pattern, $replacement, $old );
				break;
			}
		}
		if ( $target !== $new ) {
			$wrong[] = "$old → " . ( $target ?? '—' );
		}
	}
	$add( $g, __( 'Redirect rules', 'claudiavalsells' ), $wrong ? 'fail' : 'ok',
		$wrong ? implode( '; ', $wrong ) : __( 'The rules send old addresses where the plan says.', 'claudiavalsells' ),
		$wrong ? __( 'Check includes/redirects.php in the content plugin.', 'claudiavalsells' ) : __( 'Every old address is checked from outside with npm run wp:check-links.', 'claudiavalsells' ) );

	// From outside in: the server answering a real request for an old address.
	// On a laptop in Docker, and on staging behind its password, the site often
	// cannot reach itself; that is reported, not counted against it.
	$probe = wp_remote_get( home_url( '/colour-chart/' ), [ 'redirection' => 0, 'timeout' => 8 ] );
	if ( is_wp_error( $probe ) ) {
		$add( $g, __( 'A redirect, requested', 'claudiavalsells' ), 'info',
			/* translators: %s: the error. */
			sprintf( __( 'The site could not reach itself to try one: %s', 'claudiavalsells' ), $probe->get_error_message() ),
			__( 'Normal on a laptop. On a server, ask the host to allow the site to call its own address.', 'claudiavalsells' ) );
	} else {
		$code     = (int) wp_remote_retrieve_response_code( $probe );
		$location = (string) wp_remote_retrieve_header( $probe, 'location' );
		if ( 401 === $code ) {
			$add( $g, __( 'A redirect, requested', 'claudiavalsells' ), 'info', __( 'The server password stopped the request — expected on staging.', 'claudiavalsells' ) );
		} else {
			$good = 301 === $code && str_ends_with( untrailingslashit( wp_parse_url( $location, PHP_URL_PATH ) ?: '' ), '/color-chart' );
			$add( $g, __( 'A redirect, requested', 'claudiavalsells' ), $good ? 'ok' : 'fail',
				/* translators: 1: HTTP status, 2: where it pointed. */
				sprintf( __( '/colour-chart/ answered %1$d %2$s', 'claudiavalsells' ), $code, $location ? "→ $location" : '' ),
				$good ? '' : __( 'Settings → Permalinks: press Save once, then check again.', 'claudiavalsells' ) );
		}
	}

	$sitemaps = function_exists( 'wp_sitemaps_get_server' ) && wp_sitemaps_get_server()->sitemaps_enabled();
	if ( $live ) {
		$add( $g, __( 'Sitemap', 'claudiavalsells' ), $sitemaps ? 'ok' : 'fail',
			$sitemaps
				/* translators: %s: sitemap address. */
				? sprintf( __( 'Served at %s, where the old site’s sitemap address now leads.', 'claudiavalsells' ), home_url( '/wp-sitemap.xml' ) )
				: __( 'Switched off — search engines are told to stay away, or a plugin turned it off.', 'claudiavalsells' ),
			$sitemaps ? __( 'Submit it in Google Search Console.', 'claudiavalsells' ) : __( 'Allow search engines (Settings → Reading).', 'claudiavalsells' ) );
	} else {
		$add( $g, __( 'Sitemap', 'claudiavalsells' ), 'info', $sitemaps ? __( 'On.', 'claudiavalsells' ) : __( 'Off while search engines are told to stay away — it comes on with them.', 'claudiavalsells' ) );
	}

	/* ---------------------------------------------------------- pictures */
	$g    = __( 'Pictures', 'claudiavalsells' );
	$webp = wp_image_editor_supports( [ 'mime_type' => 'image/webp' ] );
	$avif = wp_image_editor_supports( [ 'mime_type' => 'image/avif' ] );
	$add( $g, __( 'What the server can make', 'claudiavalsells' ), $webp ? 'ok' : 'warn',
		/* translators: 1: the image library, 2: yes/no, 3: yes/no. */
		sprintf( __( 'Image library %1$s; WebP %2$s; AVIF %3$s.', 'claudiavalsells' ), _wp_image_editor_choose() ?: '—', $webp ? __( 'yes', 'claudiavalsells' ) : __( 'no', 'claudiavalsells' ), $avif ? __( 'yes', 'claudiavalsells' ) : __( 'no', 'claudiavalsells' ) ),
		$webp ? '' : __( 'Without WebP the pages serve heavier JPEG and PNG files. Ask the host for GD or Imagick with WebP.', 'claudiavalsells' ) );

	$mif = is_plugin_active( 'webp-uploads/load.php' );
	$add( $g, __( 'Modern Image Formats', 'claudiavalsells' ), $mif ? 'ok' : 'warn',
		$mif
			? ( get_option( 'perflab_generate_webp_and_jpeg' ) ? __( 'On, making WebP beside every JPEG and PNG.', 'claudiavalsells' ) : __( 'On, making WebP only.', 'claudiavalsells' ) )
			: __( 'Not active: pictures are served as JPEG and PNG only.', 'claudiavalsells' ),
		$mif ? '' : __( 'Plugins → Add New: “Modern Image Formats”, install and activate; then Settings → Media.', 'claudiavalsells' ) );

	/* ---------------------------------------------------------- server */
	$g      = __( 'Server', 'claudiavalsells' );
	// The limit the server sets, as WordPress saved it before raising it for
	// the admin: the front of the site, and the import's requests, run at this.
	$limit  = class_exists( 'WP_Site_Health' ) ? (string) WP_Site_Health::get_instance()->php_memory_limit : '';
	$limit  = '' !== $limit ? $limit : (string) ini_get( 'memory_limit' );
	$memory = wp_convert_hr_to_bytes( $limit );
	$add( $g, __( 'PHP', 'claudiavalsells' ), version_compare( PHP_VERSION, '8.1', '>=' ) ? 'ok' : 'fail',
		/* translators: 1: PHP version, 2: memory limit, 3: time limit, 4: upload size limit. */
		sprintf( __( 'Version %1$s; memory %2$s; time limit %3$s s; uploads up to %4$s.', 'claudiavalsells' ), PHP_VERSION, $limit, ini_get( 'max_execution_time' ) ?: '∞', ini_get( 'upload_max_filesize' ) ),
		version_compare( PHP_VERSION, '8.1', '>=' ) ? ( $memory > 0 && $memory < 256 * MB_IN_BYTES ? __( 'Memory under 256M can fail on large photographs; ask the host to raise it.', 'claudiavalsells' ) : '' ) : __( 'The content plugin needs PHP 8.1 or newer.', 'claudiavalsells' ) );

	$cache = $any_active( [
		'wp-super-cache/wp-cache.php'               => 'WP Super Cache',
		'w3-total-cache/w3-total-cache.php'         => 'W3 Total Cache',
		'litespeed-cache/litespeed-cache.php'       => 'LiteSpeed Cache',
		'wp-fastest-cache/wpFastestCache.php'       => 'WP Fastest Cache',
		'wp-rocket/wp-rocket.php'                   => 'WP Rocket',
		'cache-enabler/cache-enabler.php'           => 'Cache Enabler',
		'sg-cachepress/sg-cachepress.php'           => 'SiteGround Optimizer',
		'breeze/breeze.php'                         => 'Breeze',
	] );
	$add( $g, __( 'Page cache', 'claudiavalsells' ), $cache || ( defined( 'WP_CACHE' ) && WP_CACHE ) ? 'ok' : ( $live ? 'warn' : 'info' ),
		$cache
			/* translators: %s: name of the cache plugin. */
			? sprintf( __( 'Through %s.', 'claudiavalsells' ), $cache )
			: ( defined( 'WP_CACHE' ) && WP_CACHE ? __( 'The server caches pages (WP_CACHE).', 'claudiavalsells' ) : __( 'None: every visit builds the page anew, which is slow on shared hosting.', 'claudiavalsells' ) ),
		$cache ? __( 'Empty the cache after every change to the theme.', 'claudiavalsells' ) : __( 'Ask the host whether the server caches pages; if not, install a cache plugin.', 'claudiavalsells' ) );

	/* ---------------------------------------------------------- safety */
	$g = __( 'Safety', 'claudiavalsells' );

	$display = defined( 'WP_DEBUG' ) && WP_DEBUG && ( ! defined( 'WP_DEBUG_DISPLAY' ) || WP_DEBUG_DISPLAY );
	$logfile = defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG;
	if ( $display || $logfile ) {
		$add( $g, __( 'Debugging', 'claudiavalsells' ), $live ? 'fail' : 'info',
			$display ? __( 'Errors are shown on the pages.', 'claudiavalsells' ) : __( 'Errors are written to wp-content/debug.log, which anyone can download by its address.', 'claudiavalsells' ),
			$live ? __( 'In wp-config.php: define( \'WP_DEBUG\', false );', 'claudiavalsells' ) : '' );
	} else {
		$add( $g, __( 'Debugging', 'claudiavalsells' ), 'ok', __( 'Off.', 'claudiavalsells' ) );
	}

	$default_admin = get_user_by( 'login', 'admin' );
	$admins        = count( get_users( [ 'role' => 'administrator', 'fields' => 'ID' ] ) );
	$add( $g, __( 'Accounts', 'claudiavalsells' ), $default_admin ? ( $local ? 'info' : 'fail' ) : 'ok',
		( $default_admin ? __( 'An account named “admin” exists — the first name every attack tries.', 'claudiavalsells' ) . ' ' : '' )
		/* translators: %d: number of administrator accounts. */
		. sprintf( _n( '%d administrator.', '%d administrators.', $admins, 'claudiavalsells' ), $admins ),
		$default_admin && ! $local ? __( 'Users: make your own administrator account, sign in with it, then delete “admin” and give its content to your account.', 'claudiavalsells' ) : '' );

	$editing = defined( 'DISALLOW_FILE_EDIT' ) && DISALLOW_FILE_EDIT;
	$add( $g, __( 'Editing code from the admin', 'claudiavalsells' ), $editing ? 'ok' : ( $live ? 'warn' : 'info' ),
		$editing ? __( 'Switched off.', 'claudiavalsells' ) : __( 'Possible: anyone who gets into an administrator account can change the theme’s code.', 'claudiavalsells' ),
		$editing ? '' : __( 'In wp-config.php: define( \'DISALLOW_FILE_EDIT\', true );', 'claudiavalsells' ) );

	$guard = $any_active( [ 'wordfence/wordfence.php' => 'Wordfence', 'better-wp-security/better-wp-security.php' => 'Solid Security', 'all-in-one-wp-security-and-firewall/wp-security.php' => 'All In One WP Security' ] );
	$add( $g, __( 'Security plugin', 'claudiavalsells' ), $guard ? 'ok' : ( $live ? 'warn' : 'info' ),
		$guard ?: __( 'None.', 'claudiavalsells' ),
		$guard ? '' : __( 'The old site uses Wordfence; install it here too, or confirm with the host what protects the login.', 'claudiavalsells' ) );

	return $checks;
}

function cvc_site_check_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$checks = cvc_site_checks();
	$marks  = [
		'ok'   => [ '✓', '#00a32a', __( 'Right', 'claudiavalsells' ) ],
		'info' => [ 'i', '#2271b1', __( 'To know', 'claudiavalsells' ) ],
		'warn' => [ '!', '#dba617', __( 'Look at it', 'claudiavalsells' ) ],
		'fail' => [ '✕', '#d63638', __( 'Fix it', 'claudiavalsells' ) ],
	];
	$tally  = array_count_values( array_column( $checks, 'status' ) );
	$mail   = isset( $_GET['mail'] ) ? sanitize_key( $_GET['mail'] ) : '';
	$error  = get_transient( 'cvc_site_check_mail_error_' . get_current_user_id() );
	?>
	<div class="wrap cvc-site-check">
		<h1><?php esc_html_e( 'Site check', 'claudiavalsells' ); ?></h1>
		<p><?php esc_html_e( 'The go-live checklist, read from the site as it is now. Red must be fixed before go-live; amber wants a look.', 'claudiavalsells' ); ?></p>
		<p>
			<?php
			/* translators: 1: number fixed, 2: number to look at, 3: number right. */
			printf( esc_html__( '%1$d to fix, %2$d to look at, %3$d right.', 'claudiavalsells' ), (int) ( $tally['fail'] ?? 0 ), (int) ( $tally['warn'] ?? 0 ), (int) ( $tally['ok'] ?? 0 ) );
			?>
		</p>

		<?php if ( 'sent' === $mail ) : ?>
			<div class="notice notice-success inline"><p><?php esc_html_e( 'Test message handed to the mail system. Check that it arrived, and not in spam.', 'claudiavalsells' ); ?></p></div>
		<?php elseif ( 'failed' === $mail ) : ?>
			<div class="notice notice-error inline"><p><?php echo esc_html( __( 'The test message could not be sent.', 'claudiavalsells' ) . ( $error ? ' ' . $error : '' ) ); ?></p></div>
		<?php endif; ?>

		<table class="widefat striped" style="max-width:72rem">
			<thead><tr>
				<th style="width:7rem"><?php esc_html_e( 'State', 'claudiavalsells' ); ?></th>
				<th style="width:14rem"><?php esc_html_e( 'Check', 'claudiavalsells' ); ?></th>
				<th><?php esc_html_e( 'What the site says', 'claudiavalsells' ); ?></th>
				<th><?php esc_html_e( 'What to do', 'claudiavalsells' ); ?></th>
			</tr></thead>
			<tbody>
			<?php
			$group = null;
			foreach ( $checks as $c ) :
				if ( $c['group'] !== $group ) :
					$group = $c['group'];
					?>
					<tr><th colspan="4" style="background:#f6f7f7"><strong><?php echo esc_html( $group ); ?></strong></th></tr>
				<?php endif; ?>
				<tr>
					<td><span style="display:inline-block;min-width:1.4em;text-align:center;font-weight:700;color:<?php echo esc_attr( $marks[ $c['status'] ][1] ); ?>" aria-hidden="true"><?php echo esc_html( $marks[ $c['status'] ][0] ); ?></span> <?php echo esc_html( $marks[ $c['status'] ][2] ); ?></td>
					<td><?php echo esc_html( $c['label'] ); ?></td>
					<td><?php echo esc_html( $c['detail'] ); ?></td>
					<td><?php echo esc_html( $c['fix'] ); ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>

		<h2><?php esc_html_e( 'Test the order form’s mail', 'claudiavalsells' ); ?></h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="cvc_site_check_mail" />
			<?php wp_nonce_field( 'cvc_site_check_mail' ); ?>
			<p><?php esc_html_e( 'Sends one short message to the order form’s recipient, the way the form does.', 'claudiavalsells' ); ?></p>
			<p><button type="submit" class="button" <?php disabled( ! is_email( (string) cvc_option( 'cv_inquiry_to' ) ) ); ?>><?php esc_html_e( 'Send a test message', 'claudiavalsells' ); ?></button></p>
		</form>

		<h2><?php esc_html_e( 'The report as text', 'claudiavalsells' ); ?></h2>
		<p><?php esc_html_e( 'To paste into an email to the host.', 'claudiavalsells' ); ?></p>
		<textarea readonly rows="14" style="width:100%;max-width:72rem;font-family:monospace;font-size:12px" onfocus="this.select()"><?php
			echo esc_textarea( home_url() . ' — ' . gmdate( 'Y-m-d H:i' ) . " UTC\n" );
			foreach ( $checks as $c ) {
				echo esc_textarea( sprintf( "[%s] %s / %s: %s%s\n", strtoupper( $c['status'] ), $c['group'], $c['label'], $c['detail'], $c['fix'] ? ' — ' . $c['fix'] : '' ) );
			}
		?></textarea>
	</div>
	<?php
}

/** The test message: to the order form's recipient, by wp_mail, as the form sends. */
function cvc_site_check_send_mail(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Only an administrator can do this.', 'claudiavalsells' ), '', [ 'response' => 403 ] );
	}
	check_admin_referer( 'cvc_site_check_mail' );
	$to   = (string) cvc_option( 'cv_inquiry_to' );
	$key  = 'cvc_site_check_mail_error_' . get_current_user_id();
	$fail = '';
	$hook = function ( WP_Error $e ) use ( &$fail ) {
		$fail = $e->get_error_message();
	};
	add_action( 'wp_mail_failed', $hook );
	$sent = is_email( $to ) && wp_mail(
		$to,
		/* translators: %s: the site's address. */
		sprintf( __( 'Site check: a test message from %s', 'claudiavalsells' ), home_url() ),
		__( 'This is a test sent from Tools → Site check. If it arrived, the order form’s messages will arrive too.', 'claudiavalsells' ),
		[ 'Content-Type: text/plain; charset=UTF-8' ]
	);
	remove_action( 'wp_mail_failed', $hook );
	$fail ? set_transient( $key, $fail, 5 * MINUTE_IN_SECONDS ) : delete_transient( $key );
	wp_safe_redirect( admin_url( 'tools.php?page=cvc-site-check&mail=' . ( $sent ? 'sent' : 'failed' ) ) );
	exit;
}
