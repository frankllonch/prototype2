<?php
/**
 * Tools → Import content: the import, run from the admin.
 *
 * For a host without WP-CLI. The bundle (`npm run wp:export`) is uploaded by
 * SFTP into wp-content/import; this page shows what it holds and runs the
 * import a few entries per request — each request stops well inside the time
 * a shared host allows, the page asks for the next one, and a run interrupted
 * by a closed tab or a dropped connection continues from where it stood.
 *
 * Administrators only. The work is in importer.php, the same as WP-CLI's.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', function () {
	add_management_page(
		__( 'Import content', 'claudiavalsells' ),
		__( 'Import content', 'claudiavalsells' ),
		'manage_options',
		'cvc-import',
		'cvc_import_page'
	);
} );

add_action( 'wp_ajax_cvc_import', 'cvc_import_ajax' );

/** The step names as the page shows them. */
function cvc_import_step_labels(): array {
	return [
		'site'         => __( 'Site settings', 'claudiavalsells' ),
		'works'        => __( 'Artwork', 'claudiavalsells' ),
		'commissioned' => __( 'Commissioned', 'claudiavalsells' ),
		'exhibitions'  => __( 'Exhibitions', 'claudiavalsells' ),
		'editions'     => __( 'What’s Color?', 'claudiavalsells' ),
		'pages'        => __( 'About and Color Chart', 'claudiavalsells' ),
		'retire'       => __( 'Clearing out what the bundle no longer has', 'claudiavalsells' ),
		'finish'       => __( 'Finishing', 'claudiavalsells' ),
	];
}

function cvc_import_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$manifest = CVC_Importer::manifest();
	$run      = CVC_Importer::current_run();
	$last     = get_option( 'cv_imported_at' );
	$files    = $manifest ? count( glob( CVC_Importer::bundle_dir() . '/files/*' ) ?: [] ) : 0;
	$people   = $manifest ? array_sum( array_map( fn( $e ) => count( $e['participants'] ), $manifest['editions'] ) ) : 0;
	$stopped  = $manifest && $run && empty( $run['finished'] );
	// A run belongs to the bundle it started on; after a new upload, only a
	// fresh start is offered.
	$stale    = $stopped && ( $run['bundle'] ?? '' ) !== CVC_Importer::bundle_stamp( $manifest );
	$stopped  = $stopped && ! $stale;
	?>
	<div class="wrap cvc-import">
		<h1><?php esc_html_e( 'Import content', 'claudiavalsells' ); ?></h1>
		<p><?php esc_html_e( 'Brings the works, exhibitions, commissioned projects, What’s Color? and the About and Color Chart pages in from the bundle prepared from the site’s dataset. Entries already here are brought up to date; entries edited in WordPress since the last import are left as they are.', 'claudiavalsells' ); ?></p>

		<?php if ( ! $manifest ) : ?>
			<div class="notice notice-warning inline"><p>
				<?php
				/* translators: %s: the folder on the server where the bundle goes. */
				printf( esc_html__( 'No bundle found. Upload the import folder by SFTP so that its manifest.json is at %s, then come back to this page.', 'claudiavalsells' ), '<code>' . esc_html( str_replace( ABSPATH, '', CVC_Importer::bundle_dir() ) . '/manifest.json' ) . '</code>' );
				?>
			</p></div>
		<?php else : ?>
			<h2><?php esc_html_e( 'The bundle', 'claudiavalsells' ); ?></h2>
			<table class="widefat striped" style="max-width:36rem">
				<tbody>
					<tr><th scope="row"><?php esc_html_e( 'Prepared on', 'claudiavalsells' ); ?></th><td><?php echo esc_html( $manifest['generatedAt'] ?? '—' ); ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'Artwork', 'claudiavalsells' ); ?></th><td><?php echo (int) count( $manifest['works'] ); ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'Commissioned', 'claudiavalsells' ); ?></th><td><?php echo (int) count( $manifest['commissioned'] ?? [] ); ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'Exhibitions', 'claudiavalsells' ); ?></th><td><?php echo (int) count( $manifest['exhibitions'] ); ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'What’s Color? editions and people', 'claudiavalsells' ); ?></th><td><?php echo (int) count( $manifest['editions'] ) . ' / ' . (int) $people; ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'Pictures in the bundle', 'claudiavalsells' ); ?></th><td><?php echo (int) $files; ?></td></tr>
					<tr><th scope="row"><?php esc_html_e( 'Last import', 'claudiavalsells' ); ?></th><td><?php echo esc_html( $last ?: __( 'never', 'claudiavalsells' ) ); ?></td></tr>
				</tbody>
			</table>

			<?php if ( $stale ) : ?>
				<div class="notice notice-info inline"><p><?php esc_html_e( 'An import was stopped, and the bundle has been replaced since. Start the import again: it brings everything up to date and skips nothing.', 'claudiavalsells' ); ?></p></div>
			<?php endif; ?>
			<?php if ( $stopped ) : ?>
				<div class="notice notice-info inline"><p>
					<?php
					$labels = cvc_import_step_labels();
					/* translators: 1: the step it stopped at, 2: how far into that step. */
					printf( esc_html__( 'An import stopped at “%1$s” (%2$d done). Continue it, or start again from the beginning.', 'claudiavalsells' ), esc_html( $labels[ $run['step'] ] ?? $run['step'] ), (int) $run['offset'] );
					?>
				</p></div>
			<?php endif; ?>

			<form class="cvc-import-form" onsubmit="return false">
				<p><label><input type="checkbox" name="overwrite" value="1" />
					<?php esc_html_e( 'Also overwrite entries edited in WordPress since the last import', 'claudiavalsells' ); ?></label>
					<?php if ( $stopped ) : ?><br /><span class="description"><?php esc_html_e( 'Applies when starting again; a continued import keeps the choice it was started with.', 'claudiavalsells' ); ?></span><?php endif; ?></p>
				<p>
					<?php if ( $stopped ) : ?>
						<button type="button" class="button button-primary" data-op="continue"><?php esc_html_e( 'Continue the import', 'claudiavalsells' ); ?></button>
						<button type="button" class="button" data-op="start"><?php esc_html_e( 'Start again', 'claudiavalsells' ); ?></button>
					<?php else : ?>
						<button type="button" class="button button-primary" data-op="start"><?php esc_html_e( 'Import', 'claudiavalsells' ); ?></button>
					<?php endif; ?>
				</p>
			</form>

			<div class="cvc-import-progress" hidden>
				<p><strong class="cvc-import-step"></strong></p>
				<progress max="100" value="0" style="width:100%;max-width:36rem"></progress>
				<p class="description"><?php esc_html_e( 'Keep this page open until it says the import is complete. It takes a few minutes the first time, while every picture is resized.', 'claudiavalsells' ); ?></p>
				<ol class="cvc-import-log" aria-live="polite" style="max-height:24rem;overflow:auto;font-family:monospace;font-size:12px"></ol>
			</div>
			<?php cvc_import_script(); ?>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * One request's worth of the import. `op` start begins a run, continue
 * carries on the current one; either way the answer says where the run
 * stands and what happened, and the page asks again until it is finished.
 */
function cvc_import_ajax(): void {
	check_ajax_referer( 'cvc_import', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( [ 'message' => __( 'Only an administrator can import.', 'claudiavalsells' ) ], 403 );
	}
	$manifest = CVC_Importer::manifest();
	if ( ! $manifest ) {
		wp_send_json_error( [ 'message' => __( 'No bundle found.', 'claudiavalsells' ) ], 400 );
	}

	// One request at a time: a second tab, or a retry while the first request
	// is still working, waits rather than importing the same entries twice.
	// add_option() is the lock because it either makes the row or fails, in
	// one statement; a lock older than any request can run is a dead one.
	$held = (int) get_option( 'cvc_import_lock', 0 );
	if ( $held && time() - $held > 300 ) {
		delete_option( 'cvc_import_lock' );
	}
	if ( ! add_option( 'cvc_import_lock', time(), '', false ) ) {
		wp_send_json_success( [ 'busy' => true ] );
	}

	$op  = sanitize_key( $_POST['op'] ?? 'continue' );
	$run = 'start' === $op ? CVC_Importer::begin( ! empty( $_POST['overwrite'] ), $manifest ) : CVC_Importer::current_run();
	if ( ! $run || ( 'start' !== $op && ( $run['bundle'] ?? '' ) !== CVC_Importer::bundle_stamp( $manifest ) ) ) {
		delete_option( 'cvc_import_lock' );
		wp_send_json_error( [ 'message' => $run
			? __( 'The bundle has been replaced since this import began. Start the import again.', 'claudiavalsells' )
			: __( 'There is no import to continue. Start a new one.', 'claudiavalsells' ) ], 400 );
	}

	if ( ! defined( 'WP_IMPORTING' ) ) {
		define( 'WP_IMPORTING', true );
	}
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';

	// Stop well inside what the host allows: half its time limit, at most
	// twenty seconds. A picture already started is always finished.
	$limit  = (int) ini_get( 'max_execution_time' );
	$budget = $limit > 0 ? min( 20, max( 5, $limit / 2 ) ) : 20;
	if ( function_exists( 'set_time_limit' ) ) {
		// Room for the item in hand to finish, and well inside the lock's life.
		@set_time_limit( 120 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors -- not every host allows it
	}

	$log      = [];
	$importer = new CVC_Importer( CVC_Importer::bundle_dir(), $manifest, function ( string $level, string $message ) use ( &$log ) {
		$log[] = [ 'level' => $level, 'message' => $message ];
	}, $run );
	$run      = $importer->advance( microtime( true ) + $budget );
	delete_option( 'cvc_import_lock' );

	$labels = cvc_import_step_labels();
	wp_send_json_success( [
		'busy'     => false,
		'step'     => $run['step'],
		'label'    => $labels[ $run['step'] ] ?? $run['step'],
		'offset'   => (int) $run['offset'],
		'totals'   => $importer->totals(),
		'order'    => CVC_Importer::STEPS,
		'finished' => (bool) $run['finished'],
		'log'      => $log,
	] );
}

/** The page's script: asks for the next step until the run is finished. No build step, no dependencies. */
function cvc_import_script(): void {
	$data = [
		'ajax'     => admin_url( 'admin-ajax.php' ),
		'nonce'    => wp_create_nonce( 'cvc_import' ),
		'done'     => __( 'The import is complete.', 'claudiavalsells' ),
		'failed'   => __( 'The import stopped: the server did not answer. Press “Continue the import” to carry on from where it stopped.', 'claudiavalsells' ),
		'continue' => __( 'Continue the import', 'claudiavalsells' ),
		'starting' => __( 'Starting…', 'claudiavalsells' ),
	];
	?>
	<script>
	( function () {
		const cfg = <?php echo wp_json_encode( $data ); ?>;
		const form = document.querySelector( '.cvc-import-form' );
		const box = document.querySelector( '.cvc-import-progress' );
		const bar = box.querySelector( 'progress' );
		const label = box.querySelector( '.cvc-import-step' );
		const list = box.querySelector( '.cvc-import-log' );
		const say = ( text, level ) => {
			const li = document.createElement( 'li' );
			li.textContent = text;
			if ( level === 'warning' ) li.style.color = '#b32d2e';
			list.appendChild( li );
			list.scrollTop = list.scrollHeight;
		};
		const progress = ( r ) => {
			let done = 0, all = 0;
			for ( const step of r.order ) {
				const n = r.totals[ step ];
				all += n;
				const at = r.order.indexOf( step ), cur = r.order.indexOf( r.step );
				if ( at < cur ) done += n; else if ( at === cur ) done += Math.min( r.offset, n );
			}
			bar.value = r.finished ? 100 : Math.floor( ( done / all ) * 100 );
			label.textContent = r.finished ? cfg.done : r.label + ' — ' + Math.min( r.offset, r.totals[ r.step ] ) + ' / ' + r.totals[ r.step ];
		};
		const ask = async ( op, overwrite ) => {
			const body = new FormData();
			body.append( 'action', 'cvc_import' );
			body.append( 'nonce', cfg.nonce );
			body.append( 'op', op );
			if ( overwrite ) body.append( 'overwrite', '1' );
			const res = await fetch( cfg.ajax, { method: 'POST', body, credentials: 'same-origin' } );
			const json = await res.json().catch( () => null );
			if ( ! res.ok || ! json || ! json.success ) {
				throw new Error( ( json && json.data && json.data.message ) || ( 'HTTP ' + res.status ) );
			}
			return json.data;
		};
		const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );
		const go = async ( op ) => {
			form.querySelectorAll( 'button' ).forEach( ( b ) => ( b.disabled = true ) );
			box.hidden = false;
			label.textContent = cfg.starting;
			const tick = form.querySelector( '[name=overwrite]' );
			const overwrite = !! ( tick && tick.checked );
			let failures = 0;
			for ( ;; ) {
				let r;
				try {
					r = await ask( op, overwrite );
				} catch ( e ) {
					// A dropped request is retried as it was asked — a start stays a
					// start until the server has begun it: every step can be run
					// twice safely.
					if ( ++failures <= 3 ) { await wait( 3000 * failures ); continue; }
					say( cfg.failed + ' (' + e.message + ')', 'warning' );
					form.innerHTML = '<p><button type="button" class="button button-primary" data-op="continue">' + cfg.continue + '</button></p>';
					form.querySelector( 'button' ).addEventListener( 'click', () => go( 'continue' ) );
					return;
				}
				if ( r.busy ) { await wait( 3000 ); continue; }
				op = 'continue';
				failures = 0;
				r.log.forEach( ( m ) => say( m.message, m.level ) );
				progress( r );
				if ( r.finished ) return;
			}
		};
		form.querySelectorAll( 'button[data-op]' ).forEach( ( b ) => b.addEventListener( 'click', () => go( b.dataset.op ) ) );
	} )();
	</script>
	<?php
}
