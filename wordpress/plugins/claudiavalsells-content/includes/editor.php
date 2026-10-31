<?php
/**
 * The editor as Claudia sees it.
 *
 * A panel of fields beside each entry, and only the blocks a page of this site
 * can use. Everything else the block editor offers — columns, covers, buttons,
 * embeds — would let a page drift from the design, so it is simply not there.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'enqueue_block_editor_assets', function () {
	wp_enqueue_script(
		'cvc-editor',
		CVC_URL . 'admin/editor.js',
		[ 'wp-plugins', 'wp-editor', 'wp-element', 'wp-components', 'wp-data', 'wp-core-data', 'wp-block-editor', 'wp-i18n' ],
		CVC_VERSION,
		true
	);
	wp_localize_script( 'cvc-editor', 'cvEditor', cvc_editor_fields() );
	// The three strings the script translates itself, from languages/*.json.
	wp_set_script_translations( 'cvc-editor', 'claudiavalsells', CVC_DIR . 'languages' );
} );

/**
 * The fields, per kind of entry. Keys are the meta keys registered in
 * post-types.php; the editor script draws a control for each.
 */
function cvc_editor_fields(): array {
	$kinds = [
		[ 'value' => '', 'label' => __( '— not in the record', 'claudiavalsells' ) ],
		[ 'value' => 'solo', 'label' => __( 'Solo exhibition', 'claudiavalsells' ) ],
		[ 'value' => 'group', 'label' => __( 'Group exhibition', 'claudiavalsells' ) ],
		[ 'value' => 'fair', 'label' => __( 'Art fair', 'claudiavalsells' ) ],
	];

	return [
		'types' => [
			'artwork' => [
				'title'  => __( 'This work', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_year', 'label' => __( 'Year', 'claudiavalsells' ), 'type' => 'number' ],
					[ 'key' => '_cv_dimensions', 'label' => __( 'Dimensions', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'As it should read, e.g. 162 × 130 cm', 'claudiavalsells' ) ],
					[ 'key' => '_cv_materials', 'label' => __( 'Materials', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. Acrylic on canvas', 'claudiavalsells' ) ],
					[ 'key' => '_cv_reference', 'label' => __( 'Inventory reference', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'Your own, e.g. L585. Not shown on the site.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_available', 'label' => __( 'Available', 'claudiavalsells' ), 'type' => 'toggle' ],
					[ 'key' => '_cv_plate', 'label' => __( 'The picture shows the painting alone', 'claudiavalsells' ), 'type' => 'toggle', 'help' => __( 'On: the grid can draw it to scale. Off for a photograph of a room with the painting in it.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_photo_id', 'label' => __( 'Photograph of the work in place', 'claudiavalsells' ), 'type' => 'image', 'help' => __( 'The painting on the wall, if the main picture is a cut-out. Shown beside it on the work’s page.', 'claudiavalsells' ) ],
				],
			],
			'commissioned' => [
				'title'  => __( 'This project', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_year', 'label' => __( 'Year', 'claudiavalsells' ), 'type' => 'number', 'help' => __( 'The year it began; decides its place in the list.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_when', 'label' => __( 'When, as shown', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. 2016 – 2020, or 2023 – Currently. Left empty, the year is shown.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_client', 'label' => __( 'Client', 'claudiavalsells' ), 'type' => 'text' ],
				],
			],
			'exhibition' => [
				'title'  => __( 'This exhibition', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_venue', 'label' => __( 'Where', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. Alzueta Gallery, Barcelona', 'claudiavalsells' ) ],
					[ 'key' => '_cv_year', 'label' => __( 'Year', 'claudiavalsells' ), 'type' => 'number' ],
					[ 'key' => '_cv_from', 'label' => __( 'From', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'A month, or a month and a day: May 27', 'claudiavalsells' ) ],
					[ 'key' => '_cv_to', 'label' => __( 'To', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'Only when it ran across months.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_year_end', 'label' => __( 'Ended in year', 'claudiavalsells' ), 'type' => 'number', 'help' => __( 'Only when it ran into another year.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_kind', 'label' => __( 'In the record as', 'claudiavalsells' ), 'type' => 'select', 'options' => $kinds, 'help' => __( 'Which column of About lists it.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_note', 'label' => __( 'Note', 'claudiavalsells' ), 'type' => 'textarea' ],
				],
			],
			'wc_edition' => [
				'title'  => __( 'This edition', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_numeral', 'label' => __( 'Numeral', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'I, II, III…', 'claudiavalsells' ) ],
					[ 'key' => '_cv_intro', 'label' => __( 'Introduction on the opening page', 'claudiavalsells' ), 'type' => 'textarea', 'help' => __( 'Only if it should differ from the text above. Left empty, the opening page shows the text above.', 'claudiavalsells' ) ],
				],
			],
			'wc_answer' => [
				'title'  => __( 'This person', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_role', 'label' => __( 'What they do', 'claudiavalsells' ), 'type' => 'text' ],
					[ 'key' => '_cv_alias', 'label' => __( 'Known as', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'The name they publish under, if different.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_code', 'label' => __( 'Colour reference', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. AC011', 'claudiavalsells' ) ],
					[ 'key' => '_cv_colour_name', 'label' => __( 'Colour name', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. Powder red', 'claudiavalsells' ) ],
					[ 'key' => '_cv_swatch', 'label' => __( 'Colour, as a hex value', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'e.g. #d98f93. Left empty, one is read off the colour’s name.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_in_images', 'label' => __( 'Answered in images', 'claudiavalsells' ), 'type' => 'toggle' ],
				],
			],
		],
		'pages' => [
			'about' => [
				'title'  => __( 'The card', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_city', 'label' => __( 'City', 'claudiavalsells' ), 'type' => 'text' ],
					[ 'key' => '_cv_born', 'label' => __( 'Year', 'claudiavalsells' ), 'type' => 'text' ],
					[ 'key' => '_cv_phone', 'label' => __( 'Phone', 'claudiavalsells' ), 'type' => 'text' ],
					[ 'key' => '_cv_emails', 'label' => __( 'Emails', 'claudiavalsells' ), 'type' => 'textarea', 'help' => __( 'One per line.', 'claudiavalsells' ) ],
					[ 'key' => '_cv_collections', 'label' => __( 'Private collections', 'claudiavalsells' ), 'type' => 'textarea', 'help' => __( 'One per line: Name | Place', 'claudiavalsells' ) ],
					[ 'key' => '_cv_copyright', 'label' => __( 'Closing line', 'claudiavalsells' ), 'type' => 'text' ],
				],
			],
			'color-chart' => [
				'title'  => __( 'The chart', 'claudiavalsells' ),
				'fields' => [
					[ 'key' => '_cv_price', 'label' => __( 'Price', 'claudiavalsells' ), 'type' => 'text', 'help' => __( 'As it should read, e.g. 60,50€', 'claudiavalsells' ) ],
					[ 'key' => '_cv_bands', 'label' => __( 'The bands', 'claudiavalsells' ), 'type' => 'textarea', 'help' => __( 'One colour per line, as a hex value, top to bottom.', 'claudiavalsells' ) ],
				],
			],
		],
	];
}

/** The blocks a page of this site can be made of. */
add_filter( 'allowed_block_types_all', function ( $allowed, $context ) {
	return [
		'core/paragraph',
		'core/heading',
		'core/image',
		'core/gallery',
		'core/list',
		'core/list-item',
		'core/quote',
		'core/separator',
		'core/html',
	];
}, 10, 2 );
