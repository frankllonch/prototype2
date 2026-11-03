<?php
/**
 * What the site is made of.
 *
 * Five kinds of entry and two pages. Each kind carries the few facts the design
 * sets beside it — a year, a size, where a show was — as fields rather than as
 * text in a title, which is what the old site had to do.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'cvc_register_post_types' );
add_action( 'init', 'cvc_register_meta' );

function cvc_labels( string $plural, string $singular, array $extra = [] ): array {
	return array_merge( [
		'name'               => $plural,
		'singular_name'      => $singular,
		'menu_name'          => $plural,
		/* translators: %s: the kind of entry, plural and in lower case — artwork, exhibitions, answers. */
		'all_items'          => sprintf( __( 'All %s', 'claudiavalsells' ), strtolower( $plural ) ),
		/* translators: %s: the kind of entry, singular and in lower case — work, exhibition, project. */
		'add_new'            => sprintf( __( 'Add %s', 'claudiavalsells' ), strtolower( $singular ) ),
		/* translators: %s: the kind of entry, singular and in lower case — work, exhibition, project. */
		'add_new_item'       => sprintf( __( 'Add a new %s', 'claudiavalsells' ), strtolower( $singular ) ),
		/* translators: %s: the kind of entry, singular and in lower case — work, exhibition, project. */
		'edit_item'          => sprintf( __( 'Edit %s', 'claudiavalsells' ), strtolower( $singular ) ),
		/* translators: %s: the kind of entry, singular and in lower case — work, exhibition, project. */
		'new_item'           => sprintf( __( 'New %s', 'claudiavalsells' ), strtolower( $singular ) ),
		/* translators: %s: the kind of entry, singular and in lower case — work, exhibition, project. */
		'view_item'          => sprintf( __( 'View %s', 'claudiavalsells' ), strtolower( $singular ) ),
		/* translators: %s: the kind of entry, plural and in lower case — artwork, exhibitions, answers. */
		'search_items'       => sprintf( __( 'Search %s', 'claudiavalsells' ), strtolower( $plural ) ),
		/* translators: %s: the kind of entry, plural and in lower case — artwork, exhibitions, answers. */
		'not_found'          => sprintf( __( 'No %s yet.', 'claudiavalsells' ), strtolower( $plural ) ),
		/* translators: %s: the kind of entry, plural and in lower case — artwork, exhibitions, answers. */
		'not_found_in_trash' => sprintf( __( 'No %s in the bin.', 'claudiavalsells' ), strtolower( $plural ) ),
	], $extra );
}

function cvc_register_post_types(): void {
	register_post_type( 'artwork', [
		'labels'       => cvc_labels( __( 'Artwork', 'claudiavalsells' ), __( 'Work', 'claudiavalsells' ), [
			'featured_image'        => __( 'The painting', 'claudiavalsells' ),
			'set_featured_image'    => __( 'Choose the picture of the painting', 'claudiavalsells' ),
			'remove_featured_image' => __( 'Remove the picture', 'claudiavalsells' ),
			'use_featured_image'    => __( 'Use this picture', 'claudiavalsells' ),
		] ),
		'description'  => __( 'A painting. The picture, its year, size and materials; the stack and the grid are built from these.', 'claudiavalsells' ),
		'public'       => true,
		'has_archive'  => 'artwork',
		'rewrite'      => [ 'slug' => 'artwork', 'with_front' => false ],
		'menu_icon'    => 'dashicons-art',
		'menu_position' => 5,
		'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'revisions' ],
		'show_in_rest' => true,
		'template'     => [
			[ 'core/paragraph', [ 'placeholder' => __( 'Anything to say about this work — optional. Further photographs of it can be added here as images.', 'claudiavalsells' ) ] ],
		],
	] );

	register_post_type( 'commissioned', [
		'labels'       => cvc_labels( __( 'Commissioned', 'claudiavalsells' ), __( 'Project', 'claudiavalsells' ), [
			'all_items'          => __( 'All projects', 'claudiavalsells' ),
			'search_items'       => __( 'Search projects', 'claudiavalsells' ),
			'not_found'          => __( 'No projects yet.', 'claudiavalsells' ),
			'not_found_in_trash' => __( 'No projects in the bin.', 'claudiavalsells' ),
			'featured_image'     => __( 'Main photograph', 'claudiavalsells' ),
			'set_featured_image' => __( 'Choose the main photograph', 'claudiavalsells' ),
		] ),
		'description'  => __( 'Commissioned work and collaborations: colour charts, collections, workshops.', 'claudiavalsells' ),
		'public'       => true,
		'has_archive'  => 'commissioned',
		'rewrite'      => [ 'slug' => 'commissioned', 'with_front' => false ],
		'menu_icon'    => 'dashicons-portfolio',
		'menu_position' => 6,
		'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'revisions', 'page-attributes' ],
		'show_in_rest' => true,
		'taxonomies'   => [ 'commissioned_group' ],
	] );

	register_post_type( 'exhibition', [
		'labels'       => cvc_labels( __( 'Exhibitions', 'claudiavalsells' ), __( 'Exhibition', 'claudiavalsells' ), [
			'featured_image'     => __( 'Main photograph', 'claudiavalsells' ),
			'set_featured_image' => __( 'Choose the main photograph', 'claudiavalsells' ),
		] ),
		'description'  => __( 'Every show and fair, newest first. One with text and photographs opens as a page; one without is a line in the list.', 'claudiavalsells' ),
		'public'       => true,
		'has_archive'  => 'exhibitions',
		'rewrite'      => [ 'slug' => 'exhibitions', 'with_front' => false ],
		'menu_icon'    => 'dashicons-building',
		'menu_position' => 7,
		'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'revisions', 'page-attributes' ],
		'show_in_rest' => true,
	] );

	register_post_type( 'wc_edition', [
		'labels'       => cvc_labels( __( 'Editions', 'claudiavalsells' ), __( 'Edition', 'claudiavalsells' ), [
			'name'      => __( 'What’s Color?', 'claudiavalsells' ),
			'menu_name' => __( 'What’s Color?', 'claudiavalsells' ),
		] ),
		'description'  => __( 'One edition of What’s Color?: Claudia’s paragraphs in the order the page sets them between the entries, and the people who answered.', 'claudiavalsells' ),
		'public'       => true,
		'has_archive'  => false,
		'rewrite'      => [ 'slug' => 'whats-color', 'with_front' => false ],
		'menu_icon'    => 'dashicons-color-picker',
		'menu_position' => 8,
		'supports'     => [ 'title', 'editor', 'custom-fields', 'revisions', 'page-attributes' ],
		'show_in_rest' => true,
	] );

	register_post_type( 'wc_answer', [
		'labels'              => cvc_labels( __( 'Answers', 'claudiavalsells' ), __( 'Answer', 'claudiavalsells' ), [
			'name'       => __( 'Answers', 'claudiavalsells' ),
			'add_new'    => __( 'Add a person', 'claudiavalsells' ),
			'add_new_item' => __( 'Add a person and their answer', 'claudiavalsells' ),
		] ),
		'description'         => __( 'One person’s answer to “What’s color?”, filed under the edition they answered in.', 'claudiavalsells' ),
		'public'              => false,
		'show_ui'             => true,
		'show_in_menu'        => 'edit.php?post_type=wc_edition',
		'publicly_queryable'  => false,
		'exclude_from_search' => true,
		'rewrite'             => false,
		'supports'            => [ 'title', 'editor', 'custom-fields', 'revisions', 'page-attributes' ],
		'show_in_rest'        => true,
		'taxonomies'          => [ 'cv_edition' ],
		'template'            => [
			[ 'core/paragraph', [ 'placeholder' => __( 'Their answer, as they gave it. Leave empty if they gave none.', 'claudiavalsells' ) ] ],
		],
	] );

	register_taxonomy( 'commissioned_group', [ 'commissioned' ], [
		// Every label the editor's panel and the Groups screen show, or WordPress
		// fills the gaps with its own words for categories ("Add Category").
		'labels'            => [
			'name'              => __( 'Groups', 'claudiavalsells' ),
			'singular_name'     => __( 'Group', 'claudiavalsells' ),
			'menu_name'         => __( 'Groups', 'claudiavalsells' ),
			'all_items'         => __( 'All groups', 'claudiavalsells' ),
			'edit_item'         => __( 'Edit group', 'claudiavalsells' ),
			'view_item'         => __( 'View group', 'claudiavalsells' ),
			'update_item'       => __( 'Update group', 'claudiavalsells' ),
			'add_new_item'      => __( 'Add a new group', 'claudiavalsells' ),
			'new_item_name'     => __( 'New group name', 'claudiavalsells' ),
			'parent_item'       => __( 'Inside the group', 'claudiavalsells' ),
			'parent_item_colon' => __( 'Inside the group:', 'claudiavalsells' ),
			'search_items'      => __( 'Search groups', 'claudiavalsells' ),
			'not_found'         => __( 'No groups yet.', 'claudiavalsells' ),
			'back_to_items'     => __( '← Back to the groups', 'claudiavalsells' ),
		],
		'description'       => __( 'The headings of the Commissioned page: Commissioned, Education, Solidary.', 'claudiavalsells' ),
		'hierarchical'      => true,
		'public'            => false,
		'show_ui'           => true,
		'show_admin_column' => true,
		'show_in_rest'      => true,
		'rewrite'           => false,
	] );

	register_taxonomy( 'cv_edition', [ 'wc_answer' ], [
		'labels'            => [
			'name'              => __( 'Editions', 'claudiavalsells' ),
			'singular_name'     => __( 'Edition', 'claudiavalsells' ),
			'menu_name'         => __( 'Edition', 'claudiavalsells' ),
			'all_items'         => __( 'All editions', 'claudiavalsells' ),
			'edit_item'         => __( 'Edit edition', 'claudiavalsells' ),
			'view_item'         => __( 'View edition', 'claudiavalsells' ),
			'update_item'       => __( 'Update edition', 'claudiavalsells' ),
			'add_new_item'      => __( 'Add a new edition', 'claudiavalsells' ),
			'new_item_name'     => __( 'New edition name', 'claudiavalsells' ),
			'parent_item'       => __( 'Inside the edition', 'claudiavalsells' ),
			'parent_item_colon' => __( 'Inside the edition:', 'claudiavalsells' ),
			'search_items'      => __( 'Search editions', 'claudiavalsells' ),
			'not_found'         => __( 'No editions yet.', 'claudiavalsells' ),
			'back_to_items'     => __( '← Back to the editions', 'claudiavalsells' ),
		],
		'description'       => __( 'Which edition of What’s Color? this person answered in.', 'claudiavalsells' ),
		'hierarchical'      => true,
		'public'            => false,
		'show_ui'           => true,
		'show_admin_column' => true,
		'show_in_rest'      => true,
		'rewrite'           => false,
		// An edition's term is made with the edition itself (below), and a
		// person shows only under an edition whose term it is; one made by hand
		// would match no edition and hide whoever was filed under it. So terms
		// are the administrator's to touch, and anyone who edits can file.
		'capabilities'      => [
			'manage_terms' => 'manage_options',
			'edit_terms'   => 'manage_options',
			'delete_terms' => 'manage_options',
			'assign_terms' => 'edit_posts',
		],
	] );
}

/**
 * One field. Every field is a single value, readable by the editor, and only
 * writable by someone who may edit the entry.
 */
function cvc_field( string $type, string $key, string $kind, $default = '', ?callable $sanitize = null ): void {
	register_post_meta( $type, $key, [
		'single'            => true,
		'type'              => $kind,
		'default'           => $default,
		'show_in_rest'      => true,
		'sanitize_callback' => $sanitize ?? ( $kind === 'integer' ? 'absint' : ( $kind === 'boolean' ? 'rest_sanitize_boolean' : 'cvc_sanitize_text' ) ),
		'auth_callback'     => fn() => current_user_can( 'edit_posts' ),
	] );
}

function cvc_sanitize_text( $value ): string {
	return is_string( $value ) ? sanitize_text_field( $value ) : '';
}

function cvc_sanitize_lines( $value ): string {
	if ( ! is_string( $value ) ) {
		return '';
	}
	$lines = array_map( 'sanitize_text_field', preg_split( '/\r\n|\r|\n/', $value ) );
	return implode( "\n", $lines );
}

function cvc_sanitize_html( $value ): string {
	return is_string( $value ) ? wp_kses_post( $value ) : '';
}

function cvc_sanitize_kind( $value ): string {
	return in_array( $value, [ 'solo', 'group', 'fair' ], true ) ? $value : '';
}

function cvc_register_meta(): void {
	// A work.
	cvc_field( 'artwork', '_cv_year', 'integer', 0 );
	cvc_field( 'artwork', '_cv_dimensions', 'string' );
	cvc_field( 'artwork', '_cv_materials', 'string' );
	cvc_field( 'artwork', '_cv_reference', 'string' );
	cvc_field( 'artwork', '_cv_available', 'boolean', false );
	cvc_field( 'artwork', '_cv_plate', 'boolean', true );
	cvc_field( 'artwork', '_cv_photo_id', 'integer', 0 );
	cvc_field( 'artwork', '_cv_source_url', 'string' );
	cvc_field( 'artwork', '_cv_source_title', 'string' );

	// Commissioned work. The last three are the masthead of its own page, which
	// the designer words apart from its line on the index: "Color Chart" over
	// "Bofill Taller d’Arquitectura" there, one line on the index.
	cvc_field( 'commissioned', '_cv_year', 'integer', 0 );
	cvc_field( 'commissioned', '_cv_when', 'string' );
	cvc_field( 'commissioned', '_cv_client', 'string' );
	cvc_field( 'commissioned', '_cv_source_url', 'string' );
	cvc_field( 'commissioned', '_cv_heading', 'string' );
	cvc_field( 'commissioned', '_cv_lines', 'string', '', 'cvc_sanitize_lines' );
	cvc_field( 'commissioned', '_cv_page_when', 'string' );

	// An exhibition.
	cvc_field( 'exhibition', '_cv_year', 'integer', 0 );
	cvc_field( 'exhibition', '_cv_year_end', 'integer', 0 );
	cvc_field( 'exhibition', '_cv_venue', 'string' );
	cvc_field( 'exhibition', '_cv_from', 'string' );
	cvc_field( 'exhibition', '_cv_to', 'string' );
	cvc_field( 'exhibition', '_cv_kind', 'string', '', 'cvc_sanitize_kind' );
	cvc_field( 'exhibition', '_cv_note', 'string', '', 'cvc_sanitize_lines' );

	// An edition of What's Color?, and a person who answered.
	cvc_field( 'wc_edition', '_cv_numeral', 'string' );
	cvc_field( 'wc_edition', '_cv_intro', 'string', '', 'cvc_sanitize_html' );
	cvc_field( 'wc_edition', '_cv_source_title', 'string' );
	cvc_field( 'wc_edition', '_cv_opening_cut', 'string' );
	cvc_field( 'wc_edition', '_cv_opening_align', 'string', 'left' );
	cvc_field( 'wc_answer', '_cv_role', 'string' );
	cvc_field( 'wc_answer', '_cv_alias', 'string' );
	cvc_field( 'wc_answer', '_cv_code', 'string' );
	cvc_field( 'wc_answer', '_cv_colour_name', 'string' );
	cvc_field( 'wc_answer', '_cv_swatch', 'string' );
	cvc_field( 'wc_answer', '_cv_in_images', 'boolean', false );

	// About (the red card and the record) and the Colour Chart, which are pages.
	cvc_field( 'page', '_cv_city', 'string' );
	cvc_field( 'page', '_cv_born', 'string' );
	cvc_field( 'page', '_cv_phone', 'string' );
	cvc_field( 'page', '_cv_emails', 'string', '', 'cvc_sanitize_lines' );
	cvc_field( 'page', '_cv_collections', 'string', '', 'cvc_sanitize_lines' );
	cvc_field( 'page', '_cv_copyright', 'string' );
	cvc_field( 'page', '_cv_price', 'string' );
	cvc_field( 'page', '_cv_bands', 'string', '', 'cvc_sanitize_lines' );
}

/**
 * The year beside each entry in the admin lists, so a list of 181 works reads.
 */
add_filter( 'manage_artwork_posts_columns', 'cvc_year_column' );
add_filter( 'manage_exhibition_posts_columns', 'cvc_year_column' );
add_filter( 'manage_commissioned_posts_columns', 'cvc_year_column' );
function cvc_year_column( array $columns ): array {
	$out = [];
	foreach ( $columns as $key => $label ) {
		$out[ $key ] = $label;
		if ( 'title' === $key ) {
			$out['cv_year'] = __( 'Year', 'claudiavalsells' );
		}
	}
	return $out;
}

add_action( 'manage_posts_custom_column', function ( string $column, int $post_id ) {
	if ( 'cv_year' === $column ) {
		$year = (int) get_post_meta( $post_id, '_cv_year', true );
		echo $year ? esc_html( (string) $year ) : '—';
	}
}, 10, 2 );

add_filter( 'manage_edit-artwork_sortable_columns', fn( $c ) => $c + [ 'cv_year' => 'cv_year' ] );
add_filter( 'manage_edit-exhibition_sortable_columns', fn( $c ) => $c + [ 'cv_year' => 'cv_year' ] );

add_action( 'pre_get_posts', function ( WP_Query $q ) {
	if ( is_admin() && $q->is_main_query() && 'cv_year' === $q->get( 'orderby' ) ) {
		$q->set( 'meta_key', '_cv_year' );
		$q->set( 'orderby', 'meta_value_num' );
	}
} );

/**
 * Every published edition has its term — the one its people are filed under,
 * with the edition's own address as its slug, which is how the edition finds
 * them (cvc_answers). Made here so that a fourth edition added in the admin
 * is ready to receive people the moment it is published, with nothing to set
 * up by hand.
 */
add_action( 'wp_after_insert_post', function ( int $post_id, WP_Post $post, bool $update, ?WP_Post $before ) {
	if ( 'wc_edition' !== $post->post_type || 'publish' !== $post->post_status || '' === $post->post_name ) {
		return;
	}
	if ( term_exists( $post->post_name, 'cv_edition' ) ) {
		return;
	}
	// The edition's address changed: its term follows, with everyone filed
	// under it, rather than a new and empty one taking its place.
	if ( $before && '' !== $before->post_name && $before->post_name !== $post->post_name ) {
		$old = get_term_by( 'slug', $before->post_name, 'cv_edition' );
		if ( $old instanceof WP_Term ) {
			wp_update_term( $old->term_id, 'cv_edition', [ 'slug' => $post->post_name ] );
			return;
		}
	}
	// Named by its numeral: the field, or the "(IV)" at the end of its title
	// (the field may not be saved yet when this runs), or else its title.
	$numeral = trim( (string) get_post_meta( $post_id, '_cv_numeral', true ) );
	if ( '' === $numeral && preg_match( '/\(\s*([IVXLC]+)\s*\)\s*$/i', $post->post_title, $m ) ) {
		$numeral = strtoupper( $m[1] );
	}
	wp_insert_term( '' !== $numeral ? $numeral : $post->post_title, 'cv_edition', [ 'slug' => $post->post_name ] );
}, 10, 4 );
