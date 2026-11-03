<?php
/**
 * Brings the site's content in from the bundle `npm run wp:export` writes.
 *
 * The bundle — a manifest and a folder of files — goes into wp-content/import
 * (wp-env mounts it there; on a server, upload it there by SFTP). Two ways to
 * run it, the same work either way:
 *
 *   - WP-CLI, where the host has it:
 *       wp eval-file wp-content/plugins/claudiavalsells-content/import.php
 *   - The admin, where it has not: Tools → Import content (import-admin.php),
 *     which runs the import in short steps, each one request, because a
 *     shared host stops any request that runs longer than half a minute or so
 *     and bringing in five hundred photographs takes several minutes.
 *
 * So the work is cut into steps — the site's settings, then the works, the
 * commissioned projects, the exhibitions, the editions, the two pages, the
 * clean-up, the finish — and every step into items that can be done a few at
 * a time and picked up again where the last request stopped.
 *
 * Runs again safely: an entry is found by its address (or by the key the
 * first run stamped on it) and updated, a picture by the id the bundle gave it
 * and reused. An entry edited in WordPress since the last run is kept as it is,
 * unless the run is told to overwrite. Every photograph goes into the uploads
 * folder of the month it was first published, under its original filename, so
 * the addresses the old site gave its pictures keep resolving.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class CVC_Importer {

	/** Where the state of a run is kept between requests. */
	const RUN = 'cvc_import_run';

	/** The steps, in order. */
	const STEPS = [ 'site', 'works', 'commissioned', 'exhibitions', 'editions', 'pages', 'retire', 'finish' ];

	private string $dir;
	private array $m;
	/** @var callable(string $level, string $message): void */
	private $log;
	private array $run;
	private array $seen = [];

	/**
	 * @param callable $log `( 'info' | 'warning', string )`, where the messages go.
	 */
	public function __construct( string $dir, array $manifest, callable $log, array $run ) {
		$this->dir = $dir;
		$this->m   = $manifest;
		$this->log = $log;
		$this->run = $run;
	}

	public static function bundle_dir(): string {
		return WP_CONTENT_DIR . '/import';
	}

	/** The bundle's manifest, or null when there is no bundle (or it cannot be read). */
	public static function manifest( ?string $dir = null ): ?array {
		$file = ( $dir ?? self::bundle_dir() ) . '/manifest.json';
		if ( ! is_readable( $file ) ) {
			return null;
		}
		$m = json_decode( (string) file_get_contents( $file ), true );
		return is_array( $m ) && isset( $m['works'], $m['exhibitions'], $m['editions'] ) ? $m : null;
	}

	/**
	 * A new run: when it started, whether it overwrites entries edited in
	 * WordPress, whether the site has ever been imported into. Kept in an option
	 * so the admin's next request knows where it is.
	 */
	public static function begin( bool $overwrite, array $manifest ): array {
		$run = [
			'started'   => time(),
			'overwrite' => $overwrite,
			'first'     => ! get_option( 'cv_imported_at' ),
			'bundle'    => self::bundle_stamp( $manifest ),
			'step'      => self::STEPS[0],
			'offset'    => 0,
			'finished'  => false,
		];
		update_option( self::RUN, $run, false );
		return $run;
	}

	/**
	 * Which bundle a run was started on. A run is a position in one bundle's
	 * lists; carried on against another — a new bundle uploaded in between —
	 * it would skip whatever the new one has before that position.
	 */
	public static function bundle_stamp( array $manifest ): string {
		return (string) ( $manifest['generatedAt'] ?? '' ) . '/' . count( $manifest['works'] ?? [] ) . '/' . count( $manifest['exhibitions'] ?? [] );
	}

	public static function current_run(): ?array {
		$run = get_option( self::RUN );
		return is_array( $run ) && isset( $run['step'], $run['started'] ) ? $run : null;
	}

	/** How many items each step has, for the progress shown while it runs. */
	public function totals(): array {
		$m = $this->m;
		return [
			'site'         => 1,
			'works'        => count( $m['works'] ),
			'commissioned' => count( $m['commissioned'] ?? [] ),
			'exhibitions'  => count( $m['exhibitions'] ),
			'editions'     => count( $m['editions'] ),
			'pages'        => 2,
			'retire'       => 1,
			'finish'       => 1,
		];
	}

	/**
	 * Does as much as fits before `$deadline` (a microtime; 0 for no limit),
	 * from where the run stands, and returns where it stands after. Always
	 * finishes at least one item, so every request moves the run forward.
	 */
	public function advance( float $deadline = 0.0 ): array {
		$totals = $this->totals();
		wp_defer_term_counting( true );
		$did = 0;
		while ( ! $this->run['finished'] ) {
			$step  = $this->run['step'];
			$total = $totals[ $step ];
			if ( $this->run['offset'] >= $total ) {
				$next = array_search( $step, self::STEPS, true ) + 1;
				if ( $next >= count( self::STEPS ) ) {
					$this->run['finished'] = true;
					break;
				}
				$this->run['step']   = self::STEPS[ $next ];
				$this->run['offset'] = 0;
				continue;
			}
			if ( $did > 0 && $deadline > 0 && microtime( true ) >= $deadline ) {
				break;
			}
			$this->item( $step, $this->run['offset'] );
			$this->run['offset']++;
			$did++;
			update_option( self::RUN, $this->run, false );
		}
		update_option( self::RUN, $this->run, false );
		wp_defer_term_counting( false );
		return $this->run;
	}

	private function item( string $step, int $i ): void {
		switch ( $step ) {
			case 'site':
				$this->site();
				break;
			case 'works':
				$this->work( $this->m['works'][ $i ] );
				if ( 0 === ( $i + 1 ) % 20 ) {
					$this->say( sprintf( 'works: %d/%d', $i + 1, count( $this->m['works'] ) ) );
				}
				break;
			case 'commissioned':
				$this->project( $this->m['commissioned'][ $i ] );
				break;
			case 'exhibitions':
				$this->exhibition( $this->m['exhibitions'][ $i ] );
				break;
			case 'editions':
				$this->edition( $this->m['editions'][ $i ], $i );
				break;
			case 'pages':
				0 === $i ? $this->about() : $this->chart();
				break;
			case 'retire':
				$this->retire();
				break;
			case 'finish':
				$this->finish();
				break;
		}
	}

	/* ------------------------------------------------------------- messages */

	private function say( string $message ): void {
		( $this->log )( 'info', $message );
	}

	private function warn( string $message ): void {
		( $this->log )( 'warning', $message );
	}

	/* --------------------------------------------------------------- steps */

	/**
	 * The site itself — its settings on the first run only. After that these
	 * are settings someone may have changed on purpose: the tagline, the note
	 * on What's Color?, and above all whether search engines are kept out,
	 * which a run after go-live must not switch back on.
	 */
	private function site(): void {
		$m = $this->m;
		$this->say( 'Importing from the bundle of ' . ( $m['generatedAt'] ?? '?' ) . ( $this->run['first'] ? ' (first import: setting up the site)' : '' ) );
		if ( $this->run['first'] ) {
			update_option( 'blogname', 'Claudia Valsells' );
			update_option( 'blogdescription', 'Artwork, exhibitions, commissioned work and the colour chart.' );
			update_option( 'timezone_string', 'Europe/Madrid' );
			update_option( 'date_format', 'j F Y' );
			update_option( 'start_of_week', 1 );
			update_option( 'uploads_use_yearmonth_folders', 1 );
			update_option( 'permalink_structure', '/%postname%/' );
			update_option( 'show_on_front', 'posts' );
			update_option( 'default_comment_status', 'closed' );
			update_option( 'default_ping_status', 'closed' );
			// Not on a test site, and not until go-live: nobody indexes a rehearsal.
			update_option( 'blog_public', 0 );
			update_option( 'cv_lead', $m['lead'] ?? '' );
			// Modern Image Formats, installed now or later: WebP, with the JPEG or
			// PNG kept beside it for the few browsers without — the way the theme
			// serves pictures, and the way the static site did.
			update_option( 'perflab_modern_image_format', 'webp' );
			update_option( 'perflab_generate_webp_and_jpeg', '1' );
		}
		// The years' colours: the ones sampled since stay, the bundle fills the rest.
		$colours = is_array( get_option( 'cv_year_colours' ) ) ? get_option( 'cv_year_colours' ) : [];
		foreach ( $m['yearColours'] ?? [] as $y ) {
			$colours[ (int) $y['year'] ] = $colours[ (int) $y['year'] ] ?? $y['colour'];
		}
		update_option( 'cv_year_colours', $colours, false );

		// The starter content WordPress ships with has no place here.
		foreach ( [ [ 'hello-world', 'post' ], [ 'sample-page', 'page' ] ] as [ $slug, $type ] ) {
			$starter = get_page_by_path( $slug, OBJECT, $type );
			if ( $starter && 'trash' !== $starter->post_status ) {
				wp_trash_post( $starter->ID );
			}
		}

		// The groups of the Commissioned page, in their order.
		foreach ( [ 'Commissioned', 'Education', 'Solidary' ] as $i => $group ) {
			$term = term_exists( $group, 'commissioned_group' );
			if ( ! $term ) {
				$term = wp_insert_term( $group, 'commissioned_group' );
			}
			if ( ! is_wp_error( $term ) ) {
				update_term_meta( (int) $term['term_id'], 'order', $i + 1 );
			}
		}
	}

	private function work( array $w ): void {
		$id = $this->post( 'artwork', $w['slug'], array_merge( [ 'post_title' => $w['title'] ], $this->dates( $w['date'] ?? null ) ), [
			'_cv_year'         => (int) $w['year'],
			'_cv_dimensions'   => $w['dimensions'],
			'_cv_materials'    => $w['materials'],
			'_cv_reference'    => $w['reference'],
			'_cv_available'    => $w['available'] ? '1' : '',
			'_cv_plate'        => $w['plate'] ? '1' : '',
			'_cv_source_url'   => $w['sourceUrl'],
			'_cv_source_title' => $w['sourceTitle'],
		] );
		if ( ! $id ) {
			return;
		}
		$cover = $this->attachment( $w['cover'] ?? null, $id );
		if ( $cover ) {
			set_post_thumbnail( $id, $cover );
		} elseif ( ! has_post_thumbnail( $id ) ) {
			// A painting without its picture is an empty tile in the grid: kept as
			// a draft, where it is noticed, until the picture is there.
			wp_update_post( [ 'ID' => $id, 'post_status' => 'draft' ] );
			$this->warn( "{$w['slug']}: no picture in the bundle, left as a draft" );
		}
		update_post_meta( $id, '_cv_photo_id', $this->attachment( $w['photo'] ?? null, $id ) );
		$blocks = $w['text'];
		foreach ( $w['views'] as $view ) {
			$blocks[] = [ 'type' => 'image', 'image' => $view ];
		}
		wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( $this->blocks( $blocks, $id ) ) ] );
		$this->stamp( $id );
	}

	private function project( array $c ): void {
		$id = $this->post( 'commissioned', $c['slug'], array_merge( [ 'post_title' => $c['title'], 'menu_order' => (int) $c['order'] ], $this->dates( $c['date'] ?? null ) ), [
			'_cv_year'       => (int) $c['year'],
			'_cv_when'       => $c['when'],
			'_cv_source_url' => $c['sourceUrl'],
			'_cv_heading'    => $c['heading'] ?? '',
			'_cv_lines'      => $c['lines'] ?? '',
			'_cv_page_when'  => $c['pageWhen'] ?? '',
		] );
		if ( ! $id ) {
			return;
		}
		wp_set_object_terms( $id, $c['group'], 'commissioned_group' );
		$cover = $this->attachment( $c['cover'] ?? null, $id );
		if ( $cover ) {
			set_post_thumbnail( $id, $cover );
		}
		wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( $this->blocks( $c['blocks'], $id ) ) ] );
		$this->stamp( $id );
	}

	private function exhibition( array $e ): void {
		// Midsummer of its year, but never later than now: a show listed for next
		// year dated in the future would be scheduled rather than published.
		$date = min( sprintf( '%04d-%02d-01 12:00:00', (int) $e['year'], 6 ), current_time( 'mysql' ) );
		$id   = $this->post( 'exhibition', $e['slug'], [
			'post_title'    => $e['title'],
			'menu_order'    => (int) $e['order'],
			'post_date'     => $date,
			'post_date_gmt' => get_gmt_from_date( $date ),
		], [
			'_cv_year'     => (int) $e['year'],
			'_cv_year_end' => (int) ( $e['yearEnd'] ?? 0 ),
			'_cv_venue'    => $e['venue'],
			'_cv_from'     => $e['from'],
			'_cv_to'       => $e['to'],
			'_cv_kind'     => $e['kind'],
			'_cv_note'     => $e['note'],
		] );
		if ( ! $id ) {
			return;
		}
		$cover = $this->attachment( $e['cover'] ?? null, $id );
		if ( $cover ) {
			set_post_thumbnail( $id, $cover );
		}
		wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( $this->blocks( $e['blocks'], $id ) ) ] );
		$this->stamp( $id );
	}

	/** One edition of What's Color?, and everyone who took part in it. */
	private function edition( array $ed, int $i ): void {
		$statement = $this->blocks( $ed['statement'], 0 );
		$intro     = $this->blocks( $ed['intro'], 0 );
		$id        = $this->post( 'wc_edition', $ed['slug'], [
			'post_title'   => $ed['title'],
			'post_content' => $statement,
			'menu_order'   => $i + 1,
		], [
			'_cv_numeral'       => $ed['numeral'],
			'_cv_intro'         => $intro,
			'_cv_opening_cut'   => $ed['openingCut'] ?? '',
			'_cv_opening_align' => $ed['openingAlign'] ?? 'left',
			'_cv_source_title'  => $ed['sourceTitle'],
		] );
		if ( $id ) {
			$this->stamp( $id );
		}
		// The people are filed under the edition's term whether or not the
		// edition's own entry was kept as Claudia left it.
		$term = term_exists( $ed['slug'], 'cv_edition' );
		if ( ! $term ) {
			$term = wp_insert_term( $ed['numeral'], 'cv_edition', [ 'slug' => $ed['slug'] ] );
		}
		if ( is_wp_error( $term ) ) {
			$this->warn( 'edition term: ' . $term->get_error_message() );
			return;
		}
		// Named by its numeral, as the Answers list and the editor show it —
		// the term the edition's own save made may carry its title instead.
		$named = get_term( (int) $term['term_id'], 'cv_edition' );
		if ( $named instanceof WP_Term && $named->name !== $ed['numeral'] ) {
			wp_update_term( $named->term_id, 'cv_edition', [ 'name' => $ed['numeral'] ] );
		}
		$people = 0;
		foreach ( $ed['participants'] as $p ) {
			$pid = $this->post( 'wc_answer', sanitize_title( $ed['slug'] . '-' . $p['name'] ), [
				'post_title'   => $p['name'],
				'post_content' => $this->paragraphs( $p['answer'] ),
				'menu_order'   => (int) $p['order'],
			], [
				'_cv_role'        => $p['role'],
				'_cv_alias'       => $p['alias'],
				'_cv_code'        => $p['code'],
				'_cv_colour_name' => $p['colourName'],
				'_cv_in_images'   => $p['inImages'] ? '1' : '',
			] );
			if ( $pid ) {
				wp_set_object_terms( $pid, [ (int) $term['term_id'] ], 'cv_edition' );
				$this->stamp( $pid );
				$people++;
			}
		}
		$this->say( "Edition {$ed['numeral']}: $people people" );
	}

	private function about(): void {
		$about = $this->m['about'];
		$id    = $this->post( 'page', 'about', [ 'post_title' => 'About' ], [
			'_cv_city'        => $about['card']['city'],
			'_cv_born'        => $about['card']['year'],
			'_cv_phone'       => $about['card']['phone'],
			'_cv_emails'      => implode( "\n", $about['card']['emails'] ),
			'_cv_collections' => implode( "\n", array_map( fn( $c ) => $c['name'] . ' | ' . $c['place'], $about['collections'] ) ),
			'_cv_copyright'   => $about['copyright'],
		] );
		if ( $id ) {
			wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( $this->blocks( $about['blocks'], $id ) ) ] );
			$this->stamp( $id );
			$this->say( 'About: done' );
		}
	}

	private function chart(): void {
		$chart = $this->m['chart'];
		$id    = $this->post( 'page', 'color-chart', [ 'post_title' => 'Color Chart' ], [
			'_cv_price' => $chart['price'],
			'_cv_bands' => implode( "\n", $chart['bands'] ),
		] );
		if ( $id ) {
			$blocks = $chart['prose'];
			foreach ( $chart['photographs'] as $photo ) {
				$blocks[] = [ 'type' => 'image', 'image' => $photo ];
			}
			wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( $this->blocks( $blocks, $id ) ) ] );
			$this->stamp( $id );
			$this->say( 'Colour Chart: done' );
		}
	}

	/**
	 * Entries an earlier run brought in that the bundle no longer names — a
	 * show whose address changed, a person taken off an edition — go to the
	 * bin, where they can be restored. Only entries this importer made, and only
	 * ones left as it made them: anything created or edited in WordPress stays.
	 * What this run touched is known by its stamp, which is no older than the
	 * run's start.
	 */
	private function retire(): void {
		$m     = $this->m;
		$named = [];
		foreach ( [ 'works' => 'artwork', 'commissioned' => 'commissioned', 'exhibitions' => 'exhibition' ] as $key => $type ) {
			foreach ( $m[ $key ] ?? [] as $entry ) {
				$named[ $type ][ $entry['slug'] ] = true;
			}
		}
		foreach ( $m['editions'] as $ed ) {
			foreach ( $ed['participants'] as $p ) {
				$named['wc_answer'][ sanitize_title( $ed['slug'] . '-' . $p['name'] ) ] = true;
			}
		}
		$retired = 0;
		foreach ( $named as $type => $slugs ) {
			$stamped = get_posts( [
				'post_type'      => $type,
				'post_status'    => [ 'publish', 'draft', 'pending', 'private', 'future' ],
				'posts_per_page' => -1,
				'meta_key'       => '_cv_import_slug',
			] );
			// A bundle naming far fewer entries than the import has made reads
			// as one cut short — a failed export, a half-copied folder — rather
			// than as the site losing a fifth of its works: nothing is binned.
			if ( count( $stamped ) > 10 && count( $slugs ) < 0.8 * count( $stamped ) ) {
				$this->warn( sprintf( '%s: the bundle names %d, the site has %d from earlier imports — nothing moved to the bin; check the bundle', $type, count( $slugs ), count( $stamped ) ) );
				continue;
			}
			foreach ( $stamped as $post ) {
				$slug     = (string) get_post_meta( $post->ID, '_cv_import_slug', true );
				$imported = (int) get_post_meta( $post->ID, '_cv_imported_at', true );
				if ( isset( $slugs[ $slug ] ) || $imported >= $this->run['started'] ) {
					continue;
				}
				if ( ! $imported || (int) strtotime( $post->post_modified_gmt . ' UTC' ) > $imported + 5 ) {
					$this->say( "$type/$slug: no longer in the bundle, but edited in WordPress — kept" );
					continue;
				}
				wp_trash_post( $post->ID );
				$this->say( "$type/$slug: no longer in the bundle — moved to the bin" );
				$retired++;
			}
		}
		if ( $retired ) {
			$this->say( "Retired: $retired" );
		}
	}

	private function finish(): void {
		update_option( 'cv_imported_at', gmdate( 'c' ), false );
		delete_transient( 'cvc_work_ids' );
		flush_rewrite_rules();
		$this->say( 'Import complete.' );
	}

	/* ------------------------------------------------------------- pictures */

	/**
	 * One attachment per picture in the bundle, found again by the bundle's id.
	 * A source outside the bundle's folder is refused: the manifest decides
	 * which files are copied into the public uploads, and only the bundle's own
	 * files may be.
	 */
	private function attachment( ?array $ref, int $parent ): int {
		if ( ! $ref || empty( $ref['id'] ) ) {
			return 0;
		}
		if ( isset( $this->seen[ $ref['id'] ] ) ) {
			return $this->seen[ $ref['id'] ];
		}

		$existing = get_posts( [
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_cv_import_id',
			'meta_value'     => $ref['id'],
		] );
		$root   = realpath( $this->dir );
		$source = realpath( $this->dir . '/' . ( $ref['src'] ?? '' ) );
		$inside = $root && $source && str_starts_with( $source, $root . DIRECTORY_SEPARATOR ) && is_file( $source );

		if ( $existing ) {
			$id = (int) $existing[0];
			if ( $parent && ! (int) get_post_field( 'post_parent', $id ) ) {
				wp_update_post( [ 'ID' => $id, 'post_parent' => $parent ] );
			}
			if ( get_post_meta( $id, '_cv_import_pending', true ) ) {
				// Left by a request that stopped while making or replacing it:
				// finished now — its file put back first if it had gone.
				$file = get_attached_file( $id );
				if ( $file && ! is_file( $file ) && $inside ) {
					wp_mkdir_p( dirname( $file ) );
					copy( $source, $file );
					update_post_meta( $id, '_cv_import_hash', sha1_file( $source ) );
				}
				$this->sizes( $id );
			} elseif ( $inside ) {
				$this->refresh( $id, $source, $ref );
			}
			return $this->seen[ $ref['id'] ] = $id;
		}

		if ( ! $inside ) {
			$this->warn( 'missing ' . ( $ref['src'] ?? '(no file named)' ) );
			return 0;
		}

		$folder = preg_match( '#^\d{4}/\d{2}$#', $ref['folder'] ?? '' ) ? $ref['folder'] : null;
		$upload = wp_upload_dir( $folder );
		wp_mkdir_p( $upload['path'] );
		// The old site's filename, kept as it is while nothing else has it:
		// wp_unique_filename() would rename every file ending in -scaled or
		// -WxH on sight, and those are the addresses the old site published.
		// Not passed through sanitize_file_name() either, which folds a double
		// hyphen into one and drops a © — the old site served those names, so
		// they are safe names; only one that is not (a path, a control
		// character, a leading dot) is cleaned.
		$base = wp_basename( (string) $ref['name'] );
		if ( '' === $base || '.' === $base[0] || preg_match( '/[\x00-\x1f\x7f\/\\\\<>:"|?*]/', $base ) ) {
			$base = sanitize_file_name( $base );
		}
		// Except where the name reads as one of another picture's sizes in the
		// same folder (foo-1024x768.jpg beside foo.jpg): the other picture's
		// resizing could write over it. WordPress's own numbering takes over
		// there, as it would on an upload.
		$stem   = pathinfo( $base, PATHINFO_FILENAME );
		$shadow = preg_match( '/^(.+)-(?:\d+x\d+|scaled|rotated)$/', $stem, $sm )
			&& array_filter( (array) glob( $upload['path'] . '/*' ), fn( $f ) => pathinfo( (string) $f, PATHINFO_FILENAME ) === $sm[1] );
		$name   = file_exists( $upload['path'] . '/' . $base ) || $shadow ? wp_unique_filename( $upload['path'], $base ) : $base;
		$path = $upload['path'] . '/' . $name;
		$type = wp_check_filetype( $name );
		if ( empty( $type['type'] ) || ! str_starts_with( $type['type'], 'image/' ) ) {
			$this->warn( "not a picture: {$ref['src']}" );
			return 0;
		}
		if ( ! copy( $source, $path ) ) {
			$this->warn( "could not copy {$ref['src']}" );
			return 0;
		}

		$date = $folder ? str_replace( '/', '-', $folder ) . '-01 12:00:00' : current_time( 'mysql' );
		$id   = wp_insert_attachment( [
			'post_mime_type' => $type['type'],
			'post_title'     => preg_replace( '/\.[^.]+$/', '', $ref['name'] ),
			'post_content'   => '',
			'post_excerpt'   => $ref['caption'] ?? '',
			'post_status'    => 'inherit',
			'post_parent'    => $parent,
			'post_date'      => $date,
			'post_date_gmt'  => get_gmt_from_date( $date ),
			'guid'           => $upload['url'] . '/' . $name,
		], $path, $parent, true );
		if ( is_wp_error( $id ) ) {
			$this->warn( "attachment failed for {$ref['src']}: " . $id->get_error_message() );
			return 0;
		}
		// Tagged the moment it exists, and marked as not yet resized: if the
		// request stops during the slow part below, the retry finds this
		// picture and finishes it, rather than bringing it in a second time.
		update_post_meta( $id, '_cv_import_id', $ref['id'] );
		update_post_meta( $id, '_cv_import_hash', sha1_file( $source ) );
		update_post_meta( $id, '_wp_attachment_image_alt', $ref['alt'] ?? '' );
		update_post_meta( $id, '_cv_import_pending', 1 );
		$this->sizes( $id );
		return $this->seen[ $ref['id'] ] = $id;
	}

	/**
	 * The sizes, and the WebP beside each — the slow part, and the reason the
	 * admin runs the import a few entries at a time.
	 */
	private function sizes( int $id ): void {
		$file = get_attached_file( $id );
		if ( ! $file || ! is_file( $file ) ) {
			$this->warn( "picture $id: its file is missing from the uploads folder" );
			return;
		}
		wp_raise_memory_limit( 'image' );
		wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
		delete_post_meta( $id, '_cv_import_pending' );
	}

	/**
	 * A picture imported before whose file in the bundle has changed since — a
	 * painting re-cut at a better resolution, say — is replaced in place: the
	 * same attachment, the same filename, every size made again, so every page
	 * and every link that shows it shows the new one.
	 *
	 * Changed means the bundle's file is not the one this picture was made
	 * from: its fingerprint is kept from the import that made it, and for a
	 * picture imported before fingerprints were kept, it is taken from the
	 * original still in the uploads folder. A picture edited in WordPress's own
	 * media editor (cropped, rotated) is left as it is, whatever the bundle
	 * says — the edit is Claudia's.
	 */
	private function refresh( int $id, string $source, array $ref ): void {
		$hash = sha1_file( $source );
		$held = (string) get_post_meta( $id, '_cv_import_hash', true );
		if ( '' === $held ) {
			$original = wp_get_original_image_path( $id ) ?: get_attached_file( $id );
			$held     = $original && is_readable( $original ) ? (string) sha1_file( $original ) : '';
			if ( $held === $hash ) {
				update_post_meta( $id, '_cv_import_hash', $hash );
				return;
			}
		}
		if ( $held === $hash ) {
			return;
		}
		if ( get_post_meta( $id, '_wp_attachment_backup_sizes', true ) ) {
			$this->say( "{$ref['src']}: changed in the bundle, but edited in WordPress — kept" );
			return;
		}

		$file = get_attached_file( $id );
		$meta = wp_get_attachment_metadata( $id );
		if ( ! $file || ! is_array( $meta ) ) {
			return;
		}
		$dir  = dirname( $file );
		$path = $dir . '/' . wp_basename( wp_get_original_image_path( $id ) ?: $file );

		// The new file is copied in beside the old ones first; only once it is
		// safely there do the old ones go. A full disk or a failed copy leaves
		// the picture as it was, not without a file.
		$tmp = $dir . '/.cv-import-' . $id . '-' . wp_basename( $path );
		if ( is_file( $tmp ) ) {
			wp_delete_file( $tmp ); // left by a request that stopped here before
		}
		if ( ! copy( $source, $tmp ) || filesize( $tmp ) !== filesize( $source ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors -- it may not exist
			$this->warn( "could not copy {$ref['src']}: the picture is left as it was" );
			return;
		}

		// Every file the old version left: its sizes, its scaled copy, and the
		// WebP made beside each (Modern Image Formats lists them as sources).
		$old = [ $file, $path ];
		foreach ( $meta['sizes'] ?? [] as $size ) {
			$old[] = $dir . '/' . $size['file'];
			foreach ( $size['sources'] ?? [] as $s ) {
				$old[] = $dir . '/' . $s['file'];
			}
		}
		foreach ( $meta['sources'] ?? [] as $s ) {
			$old[] = $dir . '/' . $s['file'];
		}
		// From here until the sizes are made again the picture is unfinished;
		// marked so, a request that stops in between leaves it for the next run
		// to complete rather than skip.
		update_post_meta( $id, '_cv_import_pending', 1 );
		foreach ( array_unique( $old ) as $f ) {
			if ( is_file( $f ) && $f !== $tmp ) {
				wp_delete_file( $f );
			}
		}
		if ( ! rename( $tmp, $path ) ) {
			$this->warn( "could not put {$ref['src']} in place" );
			return;
		}
		update_attached_file( $id, $path );
		update_post_meta( $id, '_cv_import_hash', $hash );
		$this->sizes( $id );
		$this->say( "{$ref['src']}: changed in the bundle — replaced" );
	}

	/* --------------------------------------------------------------- blocks */

	/** The bundle's blocks as block markup, the pictures brought in on the way. */
	private function blocks( array $blocks, int $parent ): string {
		$out = [];
		foreach ( $blocks as $b ) {
			switch ( $b['type'] ) {
				case 'paragraph':
					$class = $b['className'] ?? '';
					$attrs = $class ? wp_json_encode( [ 'className' => $class ] ) . ' ' : '';
					$open  = $class ? '<p class="' . esc_attr( $class ) . '">' : '<p>';
					$out[] = "<!-- wp:paragraph {$attrs}-->\n{$open}{$b['html']}</p>\n<!-- /wp:paragraph -->";
					break;
				case 'heading':
					$level = (int) ( $b['level'] ?? 2 );
					$out[] = "<!-- wp:heading {\"level\":{$level}} -->\n<h{$level} class=\"wp-block-heading\">{$b['html']}</h{$level}>\n<!-- /wp:heading -->";
					break;
				case 'html':
					$out[] = "<!-- wp:html -->\n{$b['html']}\n<!-- /wp:html -->";
					break;
				case 'image':
					$id = $this->attachment( $b['image'], $parent );
					if ( ! $id ) {
						break;
					}
					$class = $b['className'] ?? '';
					$attrs = [ 'id' => $id, 'sizeSlug' => 'large', 'linkDestination' => 'none' ];
					if ( $class ) {
						$attrs['className'] = $class;
					}
					$url     = wp_get_attachment_image_url( $id, 'large' ) ?: wp_get_attachment_url( $id );
					$caption = isset( $b['image']['caption'] ) && '' !== $b['image']['caption']
						? '<figcaption class="wp-element-caption">' . esc_html( $b['image']['caption'] ) . '</figcaption>'
						: '';
					$out[] = '<!-- wp:image ' . wp_json_encode( $attrs ) . " -->\n"
						. '<figure class="wp-block-image size-large' . ( $class ? ' ' . esc_attr( $class ) : '' ) . '">'
						. '<img src="' . esc_url( $url ) . '" alt="' . esc_attr( $b['image']['alt'] ?? '' ) . '" class="wp-image-' . $id . '"/>'
						. $caption . "</figure>\n<!-- /wp:image -->";
					break;
			}
		}
		return implode( "\n\n", $out );
	}

	/** Plain paragraphs — an answer, a note — as paragraph blocks. */
	private function paragraphs( string $text ): string {
		$out = [];
		foreach ( preg_split( '/\n\s*\n/', trim( $text ) ) ?: [] as $para ) {
			$para = trim( $para );
			if ( '' !== $para ) {
				$out[] = "<!-- wp:paragraph -->\n<p>" . esc_html( $para ) . "</p>\n<!-- /wp:paragraph -->";
			}
		}
		return implode( "\n\n", $out );
	}

	/* ---------------------------------------------------------------- posts */

	/**
	 * An entry the bundle names, found again on a later run.
	 *
	 * By the key the first run stamped on it, so a permalink changed in the
	 * editor does not make a second copy; by its address before that, in any
	 * state — one in the bin stays there, one made private stays private.
	 */
	private function find( string $type, string $slug ): ?WP_Post {
		$states = [ 'publish', 'draft', 'pending', 'private', 'future', 'trash' ];
		$found  = get_posts( [
			'post_type'      => $type,
			'post_status'    => $states,
			'posts_per_page' => 1,
			'meta_key'       => '_cv_import_slug',
			'meta_value'     => $slug,
		] );
		foreach ( [ $slug, $slug . '__trashed' ] as $name ) {
			if ( $found ) {
				break;
			}
			$found = get_posts( [ 'post_type' => $type, 'post_status' => $states, 'name' => $name, 'posts_per_page' => 1 ] );
		}
		return $found ? $found[0] : null;
	}

	/**
	 * One entry, brought in or brought up to date — or left alone.
	 *
	 * An entry edited in WordPress since the last run is kept as it is and
	 * reported, because what Claudia typed outranks what the bundle says, unless
	 * the run was started to overwrite. An entry in the bin is left there. The
	 * state an existing entry is in — published, draft, private — is hers and
	 * stays.
	 */
	private function post( string $type, string $slug, array $args, array $meta = [] ): int {
		$existing = $this->find( $type, $slug );
		if ( $existing && 'trash' === $existing->post_status ) {
			$this->say( "$type/$slug: in the bin, left there" );
			return 0;
		}
		if ( $existing && ! $this->run['overwrite'] ) {
			$imported = (int) get_post_meta( $existing->ID, '_cv_imported_at', true );
			$modified = (int) strtotime( $existing->post_modified_gmt . ' UTC' );
			// An entry the import itself was still working on when a request
			// stopped (marked open until stamped) changed by the import's own
			// hand, not Claudia's: it is finished, not kept.
			$open = (bool) get_post_meta( $existing->ID, '_cv_import_open', true );
			if ( $imported && $modified > $imported + 5 && ! $open ) {
				$this->say( "$type/$slug: edited in WordPress since the last import, kept" );
				return 0;
			}
			// One the import never touched — made by hand in WordPress, at an
			// address the bundle also has — is hers too, and is kept.
			if ( ! $imported && '' === (string) get_post_meta( $existing->ID, '_cv_import_slug', true ) ) {
				$this->say( "$type/$slug: made in WordPress, at the same address as an entry in the bundle — kept" );
				return 0;
			}
		}
		$data = array_merge( [ 'post_type' => $type, 'post_name' => $slug ], $args );
		if ( $existing ) {
			$data['ID'] = $existing->ID;
			$id         = wp_update_post( wp_slash( $data ), true );
		} else {
			$data['post_status'] = 'publish';
			$id                  = wp_insert_post( wp_slash( $data ), true );
		}
		if ( is_wp_error( $id ) ) {
			$this->warn( "$type/$slug: " . $id->get_error_message() );
			return 0;
		}
		update_post_meta( $id, '_cv_import_slug', $slug );
		update_post_meta( $id, '_cv_import_open', 1 );
		foreach ( $meta as $key => $value ) {
			update_post_meta( $id, $key, $value );
		}
		return (int) $id;
	}

	/**
	 * Marks an entry as the import left it, once everything about it is done,
	 * so a later run can tell an edit made in WordPress since from its own.
	 */
	private function stamp( int $id ): void {
		update_post_meta( $id, '_cv_imported_at', time() );
		delete_post_meta( $id, '_cv_import_open' );
	}

	private function dates( ?string $iso ): array {
		$ts = $iso ? strtotime( $iso ) : false;
		if ( ! $ts ) {
			$now = current_time( 'mysql' );
			return [ 'post_date' => $now, 'post_date_gmt' => get_gmt_from_date( $now ) ];
		}
		$gmt = gmdate( 'Y-m-d H:i:s', $ts );
		return [ 'post_date' => get_date_from_gmt( $gmt ), 'post_date_gmt' => $gmt ];
	}
}
