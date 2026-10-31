<?php
/**
 * Brings the site's content in from the bundle `npm run wp:export` writes.
 *
 *   wp eval-file wp-content/plugins/claudiavalsells-content/import.php
 *
 * Runs again safely: an entry is found by its address and updated, a picture by
 * the id the bundle gave it and reused. The bundle is mounted at
 * wp-content/import (see wordpress/.wp-env.json); on a server, copy it there.
 *
 * Every photograph goes into the uploads folder of the month it was first
 * published, under its original filename, so the addresses the old site gave
 * its pictures keep resolving once the uploads folder is on the new site.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( "Run with WP-CLI: wp eval-file import.php\n" );
}

define( 'WP_IMPORTING', true );
wp_set_current_user( 1 );
wp_defer_term_counting( true );
wp_suspend_cache_invalidation( false );

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$cv_dir = WP_CONTENT_DIR . '/import';
$cv_manifest = json_decode( (string) file_get_contents( "$cv_dir/manifest.json" ), true );
if ( ! is_array( $cv_manifest ) ) {
	WP_CLI::error( "No manifest at $cv_dir/manifest.json — run `npm run wp:export` first." );
}

/* ------------------------------------------------------------- pictures */

/** One attachment per picture in the bundle, found again by the bundle's id. */
function cv_imp_attachment( ?array $ref, int $parent, string $dir ): int {
	static $seen = [];
	if ( ! $ref ) {
		return 0;
	}
	if ( isset( $seen[ $ref['id'] ] ) ) {
		return $seen[ $ref['id'] ];
	}

	$existing = get_posts( [
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'meta_key'       => '_cv_import_id',
		'meta_value'     => $ref['id'],
	] );
	if ( $existing ) {
		$id = (int) $existing[0];
		if ( $parent && ! (int) get_post_field( 'post_parent', $id ) ) {
			wp_update_post( [ 'ID' => $id, 'post_parent' => $parent ] );
		}
		return $seen[ $ref['id'] ] = $id;
	}

	$source = "$dir/{$ref['src']}";
	if ( ! file_exists( $source ) ) {
		WP_CLI::warning( "missing {$ref['src']}" );
		return 0;
	}

	$folder = preg_match( '#^\d{4}/\d{2}$#', $ref['folder'] ?? '' ) ? $ref['folder'] : null;
	$upload = wp_upload_dir( $folder );
	wp_mkdir_p( $upload['path'] );
	// The old site's filename, kept as it is while nothing else has it:
	// wp_unique_filename() would rename every file ending in -scaled or
	// -WxH on sight, and those are the addresses the old site published.
	$base = sanitize_file_name( $ref['name'] );
	$name = file_exists( $upload['path'] . '/' . $base ) ? wp_unique_filename( $upload['path'], $base ) : $base;
	$path = $upload['path'] . '/' . $name;
	if ( ! copy( $source, $path ) ) {
		WP_CLI::warning( "could not copy {$ref['src']}" );
		return 0;
	}

	$type = wp_check_filetype( $name );
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
		WP_CLI::warning( "attachment failed for {$ref['src']}: " . $id->get_error_message() );
		return 0;
	}
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );
	update_post_meta( $id, '_wp_attachment_image_alt', $ref['alt'] ?? '' );
	update_post_meta( $id, '_cv_import_id', $ref['id'] );
	return $seen[ $ref['id'] ] = $id;
}

/* --------------------------------------------------------------- blocks */

/** The bundle's blocks as block markup, the pictures brought in on the way. */
function cv_imp_blocks( array $blocks, int $parent, string $dir ): string {
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
				$id = cv_imp_attachment( $b['image'], $parent, $dir );
				if ( ! $id ) {
					break;
				}
				$class   = $b['className'] ?? '';
				$attrs   = [ 'id' => $id, 'sizeSlug' => 'large', 'linkDestination' => 'none' ];
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
function cv_imp_paragraphs( string $text ): string {
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

/** An entry, found by its address and kind and updated, or made. */
/**
 * An entry the bundle names, found again on a later run.
 *
 * By the key the first run stamped on it, so a permalink changed in the
 * editor does not make a second copy; by its address before that, in any
 * state — one in the bin stays there, one made private stays private.
 */
function cv_imp_find( string $type, string $slug ): ?WP_Post {
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
 * reported, because what Claudia typed outranks what the bundle says;
 * `wp --exec='define("CV_IMPORT_OVERWRITE", true);' eval-file …` says
 * otherwise for a run. An entry in the bin is left there. The state an
 * existing entry is in — published, draft, private — is hers and stays.
 */
function cv_imp_post( string $type, string $slug, array $args, array $meta = [] ): int {
	global $cv_touched;
	$existing = cv_imp_find( $type, $slug );
	if ( $existing && 'trash' === $existing->post_status ) {
		WP_CLI::log( "  $type/$slug: in the bin, left there" );
		return 0;
	}
	if ( $existing && ! ( defined( 'CV_IMPORT_OVERWRITE' ) && CV_IMPORT_OVERWRITE ) ) {
		$imported = (int) get_post_meta( $existing->ID, '_cv_imported_at', true );
		$modified = (int) strtotime( $existing->post_modified_gmt . ' UTC' );
		if ( $imported && $modified > $imported + 5 ) {
			WP_CLI::log( "  $type/$slug: edited in WordPress since the last run, kept" );
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
		WP_CLI::warning( "$type/$slug: " . $id->get_error_message() );
		return 0;
	}
	update_post_meta( $id, '_cv_import_slug', $slug );
	foreach ( $meta as $key => $value ) {
		update_post_meta( $id, $key, $value );
	}
	$cv_touched[] = (int) $id;
	return (int) $id;
}

function cv_imp_dates( ?string $iso ): array {
	$ts = $iso ? strtotime( $iso ) : false;
	if ( ! $ts ) {
		$now = current_time( 'mysql' );
		return [ 'post_date' => $now, 'post_date_gmt' => get_gmt_from_date( $now ) ];
	}
	$gmt = gmdate( 'Y-m-d H:i:s', $ts );
	return [ 'post_date' => get_date_from_gmt( $gmt ), 'post_date_gmt' => $gmt ];
}

/* ------------------------------------------------------------- the run */

$m = $cv_manifest;
WP_CLI::log( 'Importing from ' . $cv_dir . ' (bundle of ' . ( $m['generatedAt'] ?? '?' ) . ')' );
$cv_touched = [];
$cv_first   = ! get_option( 'cv_imported_at' );

// The site itself — on the first run only. After that these are settings
// someone may have changed on purpose: the tagline, the note on What's
// Color?, and above all whether search engines are kept out, which a run
// after go-live must not switch back on.
if ( $cv_first ) {
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

// Works.
$n = 0;
foreach ( $m['works'] as $w ) {
	$id = cv_imp_post( 'artwork', $w['slug'], array_merge( [ 'post_title' => $w['title'] ], cv_imp_dates( $w['date'] ) ), [
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
		continue;
	}
	$cover = cv_imp_attachment( $w['cover'], $id, $cv_dir );
	if ( $cover ) {
		set_post_thumbnail( $id, $cover );
	} elseif ( ! has_post_thumbnail( $id ) ) {
		// A painting without its picture is an empty tile in the grid: kept as
		// a draft, where it is noticed, until the picture is there.
		wp_update_post( [ 'ID' => $id, 'post_status' => 'draft' ] );
		WP_CLI::warning( "{$w['slug']}: no picture in the bundle, left as a draft" );
	}
	update_post_meta( $id, '_cv_photo_id', cv_imp_attachment( $w['photo'] ?? null, $id, $cv_dir ) );
	$blocks = $w['text'];
	foreach ( $w['views'] as $view ) {
		$blocks[] = [ 'type' => 'image', 'image' => $view ];
	}
	wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( cv_imp_blocks( $blocks, $id, $cv_dir ) ) ] );
	if ( ++$n % 20 === 0 ) {
		WP_CLI::log( "  works: $n/" . count( $m['works'] ) );
	}
}
WP_CLI::log( "Works: $n" );

// Commissioned.
$n = 0;
foreach ( $m['commissioned'] as $c ) {
	$id = cv_imp_post( 'commissioned', $c['slug'], array_merge( [ 'post_title' => $c['title'], 'menu_order' => (int) $c['order'] ], cv_imp_dates( $c['date'] ) ), [
		'_cv_year'       => (int) $c['year'],
		'_cv_when'       => $c['when'],
		'_cv_source_url' => $c['sourceUrl'],
	] );
	if ( ! $id ) {
		continue;
	}
	wp_set_object_terms( $id, $c['group'], 'commissioned_group' );
	$cover = cv_imp_attachment( $c['cover'] ?? null, $id, $cv_dir );
	if ( $cover ) {
		set_post_thumbnail( $id, $cover );
	}
	wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( cv_imp_blocks( $c['blocks'], $id, $cv_dir ) ) ] );
	$n++;
}
WP_CLI::log( "Commissioned: $n" );

// Exhibitions.
$n = 0;
foreach ( $m['exhibitions'] as $e ) {
	// Midsummer of its year, but never later than now: a show listed for next
	// year dated in the future would be scheduled rather than published.
	$date = min( sprintf( '%04d-%02d-01 12:00:00', (int) $e['year'], 6 ), current_time( 'mysql' ) );
	$id   = cv_imp_post( 'exhibition', $e['slug'], [
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
		continue;
	}
	$cover = cv_imp_attachment( $e['cover'] ?? null, $id, $cv_dir );
	if ( $cover ) {
		set_post_thumbnail( $id, $cover );
	}
	wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( cv_imp_blocks( $e['blocks'], $id, $cv_dir ) ) ] );
	$n++;
}
WP_CLI::log( "Exhibitions: $n" );

// What's Color?: the editions, and everyone who took part.
$people = 0;
foreach ( $m['editions'] as $i => $ed ) {
	$statement = cv_imp_blocks( $ed['statement'], 0, $cv_dir );
	$intro     = cv_imp_blocks( $ed['intro'], 0, $cv_dir );
	$id = cv_imp_post( 'wc_edition', $ed['slug'], [
		'post_title'   => $ed['title'],
		'post_content' => $statement,
		'menu_order'   => $i + 1,
	], [
		'_cv_numeral'      => $ed['numeral'],
		'_cv_intro'        => $intro === $statement ? '' : $intro,
		'_cv_source_title' => $ed['sourceTitle'],
	] );
	if ( ! $id ) {
		continue;
	}
	$term = term_exists( $ed['slug'], 'cv_edition' );
	if ( ! $term ) {
		$term = wp_insert_term( $ed['numeral'], 'cv_edition', [ 'slug' => $ed['slug'] ] );
	}
	if ( is_wp_error( $term ) ) {
		WP_CLI::warning( 'edition term: ' . $term->get_error_message() );
		continue;
	}
	foreach ( $ed['participants'] as $p ) {
		$slug = sanitize_title( $ed['slug'] . '-' . $p['name'] );
		$pid  = cv_imp_post( 'wc_answer', $slug, [
			'post_title'   => $p['name'],
			'post_content' => cv_imp_paragraphs( $p['answer'] ),
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
			$people++;
		}
	}
}
WP_CLI::log( 'Editions: ' . count( $m['editions'] ) . ", people: $people" );

// About.
$about = $m['about'];
$id = cv_imp_post( 'page', 'about', [ 'post_title' => 'About' ], [
	'_cv_city'        => $about['card']['city'],
	'_cv_born'        => $about['card']['year'],
	'_cv_phone'       => $about['card']['phone'],
	'_cv_emails'      => implode( "\n", $about['card']['emails'] ),
	'_cv_collections' => implode( "\n", array_map( fn( $c ) => $c['name'] . ' | ' . $c['place'], $about['collections'] ) ),
	'_cv_copyright'   => $about['copyright'],
] );
if ( $id ) {
	wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( cv_imp_blocks( $about['blocks'], $id, $cv_dir ) ) ] );
	WP_CLI::log( 'About: done' );
}

// The Colour Chart.
$chart = $m['chart'];
$id = cv_imp_post( 'page', 'color-chart', [ 'post_title' => 'Color Chart' ], [
	'_cv_price' => $chart['price'],
	'_cv_bands' => implode( "\n", $chart['bands'] ),
] );
if ( $id ) {
	$blocks = $chart['prose'];
	foreach ( $chart['photographs'] as $photo ) {
		$blocks[] = [ 'type' => 'image', 'image' => $photo ];
	}
	wp_update_post( [ 'ID' => $id, 'post_content' => wp_slash( cv_imp_blocks( $blocks, $id, $cv_dir ) ) ] );
	WP_CLI::log( 'Colour Chart: done' );
}

// Every entry this run touched is stamped with the time, so the next run can
// tell an edit made in WordPress since from one of its own.
$cv_now = time();
foreach ( array_unique( $cv_touched ) as $cv_id ) {
	update_post_meta( $cv_id, '_cv_imported_at', $cv_now );
}
update_option( 'cv_imported_at', gmdate( 'c', $cv_now ), false );

wp_defer_term_counting( false );
delete_transient( 'cvc_work_ids' );
flush_rewrite_rules();
WP_CLI::success( 'Import complete.' );
