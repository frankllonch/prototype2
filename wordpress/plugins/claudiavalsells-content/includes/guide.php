<?php
/**
 * Claudia's guide: the things she does most, a few steps each — first on the
 * dashboard, and on a page of its own (Dashboard → Guide) that prints as the
 * handover's PDF.
 *
 * Every name the steps give to something of this site's — a menu, a panel, a
 * field, a button the plugin labels — is read from where the admin reads it:
 * the post types, the fields of includes/editor.php, the paragraph styles. So
 * the guide says what the screen says, in whichever language the admin is in,
 * and a field renamed there is renamed here. WordPress's own menus come from
 * WordPress's own translations, by the same calls its menu makes. The editor's
 * buttons (Publish, Save draft, Preview in new tab…) live in its scripts, out
 * of reach from here, so they are written into the sentences in bold, for each
 * translation to give as the editor does in that language.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'wp_dashboard_setup', 'cvc_guide_dashboard' );
add_action( 'admin_menu', 'cvc_guide_menu' );

/** The panel, at the top of the dashboard of anyone who edits the site. */
function cvc_guide_dashboard(): void {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	wp_add_dashboard_widget( 'cvc_guide', esc_html__( 'How to…', 'claudiavalsells' ), 'cvc_guide_widget', null, null, 'normal', 'high' );
}

/** The same guide on a page under Dashboard, to read whole or print. */
function cvc_guide_menu(): void {
	add_dashboard_page( esc_html__( 'Guide', 'claudiavalsells' ), esc_html__( 'Guide', 'claudiavalsells' ), 'edit_posts', 'cvc-guide', 'cvc_guide_page' );
}

function cvc_guide_widget(): void {
	echo cvc_guide_render(); // Escaped as it is built, piece by piece.
}

function cvc_guide_page(): void {
	echo '<div class="wrap cvc-guide-page"><h1>' . esc_html__( 'How to…', 'claudiavalsells' ) . '</h1>'
		. '<p class="cvc-guide-print"><button type="button" class="button" onclick="window.print()">' . esc_html__( 'Print, or save as PDF', 'claudiavalsells' ) . '</button></p>'
		. cvc_guide_render( true )
		. '</div>';
}

/**
 * The guide, for the dashboard — each task folded under its name, so the panel
 * stays short — or for its own page, where everything is open and laid out
 * across the width in columns, no task split between two, and prints whole.
 */
function cvc_guide_render( bool $page = false ): string {
	$out = cvc_guide_style( $page ) . '<div class="cvc-guide">';
	foreach ( cvc_guide_intro() as $paragraph ) {
		$out .= '<p class="cvc-guide__intro">' . $paragraph . '</p>';
	}
	$out .= '<div class="cvc-guide__tasks">';
	foreach ( cvc_guide_sections() as $task ) {
		$body = '';
		foreach ( $task['lead'] as $paragraph ) {
			$body .= '<p class="cvc-guide__note">' . $paragraph . '</p>';
		}
		$body .= '<ol>';
		foreach ( $task['steps'] as $step ) {
			$body .= '<li>' . $step . '</li>';
		}
		$body .= '</ol>';
		foreach ( $task['after'] as $paragraph ) {
			$body .= '<p class="cvc-guide__note">' . $paragraph . '</p>';
		}
		$id    = esc_attr( 'cvc-guide-' . $task['id'] );
		$title = esc_html( $task['title'] );
		$out  .= $page
			? '<section class="cvc-guide__task" id="' . $id . '"><h2>' . $title . '</h2>' . $body . '</section>'
			: '<details class="cvc-guide__task" id="' . $id . '" name="cvc-guide"><summary>' . $title . '</summary>' . $body . '</details>';
	}
	$out .= '</div>';
	if ( ! $page ) {
		$out .= '<p class="cvc-guide__more">' . cvc_guide_say(
			/* translators: 1: the Dashboard menu, 2: the guide's own page in it, a link to it. */
			__( 'The whole guide is also under %1$s → %2$s, to read on one page or to print.', 'claudiavalsells' ),
			// WordPress's own name for the menu, from WordPress's translations.
			cvc_guide_b( __( 'Dashboard' ) ),
			cvc_guide_a( __( 'Guide', 'claudiavalsells' ), admin_url( 'index.php?page=cvc-guide' ) )
		) . '</p>';
	}
	return $out . '</div>';
}

/** What to know before any of it: bold is the screen's own word, and where the fields are. */
function cvc_guide_intro(): array {
	return [
		cvc_guide_step(
			esc_html__( 'The things you will do most often, a few steps each.', 'claudiavalsells' ),
			esc_html__( 'Words in bold are what the screen says: a menu, a button or a field.', 'claudiavalsells' )
		),
		cvc_guide_step(
			esc_html__( 'In the editor, the fields of an entry are in the panel on the right.', 'claudiavalsells' ),
			cvc_guide_say(
				/* translators: “Settings” is the editor's own button that opens its side panel; write it as the editor shows it in this language. */
				__( 'If it is closed, press <strong>Settings</strong> at the top right to open it.', 'claudiavalsells' )
			)
		),
	];
}

/**
 * The tasks, each with the steps that do it and, where it helps, a word
 * before (what to have ready) or after (what the site then does with it). A
 * task only shows to someone who can do it.
 */
function cvc_guide_sections(): array {
	$tasks = [];

	if ( current_user_can( 'edit_posts' ) ) {
		$picture = cvc_guide_type( 'artwork', 'set_featured_image' );
		$tasks[] = [
			'id'    => 'painting',
			'title' => __( 'Add a painting', 'claudiavalsells' ),
			'lead'  => [
				cvc_guide_step(
					esc_html__( 'Have the picture ready first: the painting alone, cut out of its photograph and saved as a PNG with a transparent background, so that it sits on the page with nothing around it.', 'claudiavalsells' ),
					esc_html__( 'A photograph with the wall around it looks wrong in the grid.', 'claudiavalsells' )
				),
			],
			'steps' => [
				cvc_guide_go( cvc_guide_type( 'artwork', 'menu_name' ), cvc_guide_type( 'artwork', 'add_new_item' ), admin_url( 'post-new.php?post_type=artwork' ) ),
				cvc_guide_say(
					/* translators: “Add title” is what the editor shows in an empty title; write it as the editor shows it in this language. */
					__( 'Type the painting’s title where it says <strong>Add title</strong>.', 'claudiavalsells' )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: the tab of the editor's side panel that holds the entry's own fields, 2: a button on it. */
						__( 'In the panel on the right, on the %1$s tab, press %2$s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_type( 'artwork', 'singular_name' ) ),
						cvc_guide_b( $picture )
					),
					cvc_guide_say(
						/* translators: %s: the same button, which the window that opens repeats. */
						__( 'Drag the PNG into the window that opens, then press %s again at its bottom right.', 'claudiavalsells' ),
						cvc_guide_b( $picture )
					)
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: a panel of fields in the editor, 2–5: four of its fields. */
						__( 'Further down, under %1$s, fill in %2$s, %3$s, %4$s and %5$s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'artwork' ) ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_year' ) ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_dimensions' ) ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_materials' ) ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_reference' ) )
					),
					esc_html__( 'Write the dimensions with × or x between the two sides, as in 100 × 80 cm: the grid reads them to draw the painting to scale.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: %s: a switch in the editor's side panel. */
					__( 'Switch %s on if the painting is for sale.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'artwork', '_cv_available' ) )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: %s: a switch in the editor's side panel. */
						__( 'Leave %s switched on: it lets the grid draw the painting to scale.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_plate' ) )
					),
					esc_html__( 'Switch it off only if the picture is a photograph of a room with the painting in it.', 'claudiavalsells' )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: a field in the editor's side panel, 2: its button. “Select” is the button of WordPress's media window; write it as WordPress shows it in this language. */
						__( 'Under %1$s, press %2$s, choose or upload the photograph of the painting on the wall, and press <strong>Select</strong>.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'artwork', '_cv_photo_id' ) ),
						// The button the fields panel draws for it (admin/editor.js), in the same words.
						cvc_guide_b( __( 'Choose photograph', 'claudiavalsells' ) )
					),
					esc_html__( 'It is shown with the cut-out on the painting’s page.', 'claudiavalsells' )
				),
				cvc_guide_publish(),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: %s: the button the editor offers once the entry is published. */
						__( 'To see it on the site, press %s in the panel that follows.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_type( 'artwork', 'view_item' ) )
					),
					cvc_guide_say(
						/* translators: %s: the address of the site's Artwork page. */
						__( 'It is also on <a href="%s">the artwork page</a>, among the works of its year.', 'claudiavalsells' ),
						esc_url( (string) get_post_type_archive_link( 'artwork' ) )
					)
				),
			],
		];

		$tasks[] = [
			'id'    => 'available',
			'title' => __( 'Mark a painting available or sold', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_go( cvc_guide_type( 'artwork', 'menu_name' ), cvc_guide_type( 'artwork', 'all_items' ), admin_url( 'edit.php?post_type=artwork' ) ),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: %s: the search button above the list of works. */
						__( 'Find the painting: type its title in the box at the top right and press %s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_type( 'artwork', 'search_items' ) )
					),
					esc_html__( 'Click its title to open it.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: 1: a panel of fields in the editor, 2: a switch in it. */
					__( 'In the panel on the right, under %1$s, switch %2$s on while the painting is for sale and off once it has sold.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'artwork' ) ),
					cvc_guide_b( cvc_guide_field( 'artwork', '_cv_available' ) )
				),
				cvc_guide_save(),
			],
			'after' => [
				esc_html__( 'A sold painting stays on the site with all the others.', 'claudiavalsells' ),
			],
		];

		$main = cvc_guide_type( 'exhibition', 'set_featured_image' );
		$tasks[] = [
			'id'    => 'exhibition',
			'title' => __( 'Add an exhibition', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_go( cvc_guide_type( 'exhibition', 'menu_name' ), cvc_guide_type( 'exhibition', 'add_new_item' ), admin_url( 'post-new.php?post_type=exhibition' ) ),
				cvc_guide_say(
					/* translators: “Add title” is what the editor shows in an empty title; write it as the editor shows it in this language. */
					__( 'Type the exhibition’s title where it says <strong>Add title</strong>.', 'claudiavalsells' )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: a panel of fields in the editor, 2–4: three of its fields. */
						__( 'In the panel on the right, under %1$s, fill in %2$s, %3$s and %4$s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'exhibition' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_venue' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_year' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_from' ) )
					),
					cvc_guide_say(
						/* translators: 1, 2: fields in the editor's side panel. */
						__( 'Fill in %1$s only if it ran across months, and %2$s only if it ran into another year.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_to' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_year_end' ) )
					)
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: a field in the editor's side panel, 2–4: its choices. */
						__( '%1$s decides which column of About lists the show: %2$s, %3$s or %4$s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind', 'solo' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind', 'group' ) ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind', 'fair' ) )
					),
					cvc_guide_say(
						/* translators: %s: the choice that keeps a show off the About page. */
						__( 'Choose %s to leave it out of About.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind', '' ) )
					)
				),
				esc_html__( 'If there is a text about the show, write it in the large space below the title.', 'claudiavalsells' ),
				cvc_guide_step( cvc_guide_main_photograph( $main ), cvc_guide_more_photographs() ),
				cvc_guide_step( cvc_guide_publish(), esc_html__( 'A new exhibition goes to the top of the list.', 'claudiavalsells' ) ),
			],
			'after' => [
				cvc_guide_step(
					esc_html__( 'A show with a text opens on the reading sheet, the text beside its photographs.', 'claudiavalsells' ),
					esc_html__( 'A show with photographs and no text opens on the photographs sheet, the photographs alone.', 'claudiavalsells' ),
					esc_html__( 'A show with neither stays a line in the list, with nothing to open.', 'claudiavalsells' )
				),
			],
		];

		$styles  = WP_Block_Styles_Registry::get_instance()->get_registered_styles_for_block( 'core/paragraph' );
		$style   = fn( string $name ) => cvc_guide_b( (string) ( $styles[ $name ]['label'] ?? '' ) );
		$tasks[] = [
			'id'    => 'project',
			'title' => __( 'Add a commissioned project', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_go( cvc_guide_type( 'commissioned', 'menu_name' ), cvc_guide_type( 'commissioned', 'add_new_item' ), admin_url( 'post-new.php?post_type=commissioned' ) ),
				cvc_guide_say(
					/* translators: “Add title” is what the editor shows in an empty title; write it as the editor shows it in this language. */
					__( 'Type the project’s title, as its line in the list should read, where it says <strong>Add title</strong>.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: 1: a panel in the editor's side panel, 2: the groups it offers, as a list. */
					__( 'In the panel on the right, under %1$s, tick the group it belongs to: %2$s.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_taxonomy( 'commissioned_group' ) ),
					cvc_guide_b( cvc_guide_terms( 'commissioned_group' ) )
				),
				cvc_guide_say(
					/* translators: 1: a panel of fields in the editor, 2, 3: two of its fields. */
					__( 'Under %1$s, fill in %2$s, the year it began, and %3$s, the dates as the list shows them.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'commissioned' ) ),
					cvc_guide_b( cvc_guide_field( 'commissioned', '_cv_year' ) ),
					cvc_guide_b( cvc_guide_field( 'commissioned', '_cv_when' ) )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1–3: fields in the editor's side panel. */
						__( 'Its own page opens with a heading that can differ from the list: %1$s, %2$s and %3$s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'commissioned', '_cv_heading' ) ),
						cvc_guide_b( cvc_guide_field( 'commissioned', '_cv_lines' ) ),
						cvc_guide_b( cvc_guide_field( 'commissioned', '_cv_page_when' ) )
					),
					esc_html__( 'Write each as it should read there, the lines under the name one per line: FOR NANI MARQUINA.', 'claudiavalsells' ),
					esc_html__( 'Left empty, the page uses the title and the dates of the list.', 'claudiavalsells' )
				),
				cvc_guide_step( cvc_guide_main_photograph( cvc_guide_type( 'commissioned', 'set_featured_image' ) ), cvc_guide_more_photographs() ),
				cvc_guide_step(
					esc_html__( 'Write the text below the title.', 'claudiavalsells' ),
					cvc_guide_say(
						/* translators: 1–3: the names of the paragraph styles. “Block” and “Styles” are the editor's own words for its side panel; write them as the editor shows them in this language. */
						__( 'To set a paragraph as the designer does, click it, then in the panel on the right, on the <strong>Block</strong> tab, under <strong>Styles</strong>, choose %1$s, %2$s or %3$s.', 'claudiavalsells' ),
						$style( 'lead' ),
						$style( 'note' ),
						$style( 'cta' )
					),
					esc_html__( 'A project’s text usually opens with a statement in capitals and ends with its credits, set smaller.', 'claudiavalsells' )
				),
				cvc_guide_step( cvc_guide_publish(), esc_html__( 'A new project goes to the top of its group.', 'claudiavalsells' ) ),
			],
		];

		$tasks[] = [
			'id'    => 'person',
			'title' => __( 'Add a person to What’s Color?', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_say(
					/* translators: 1: a menu in the column on the left of the admin, 2: one of its items, a link to it, 3: the button above the list it opens, a link to it. */
					__( 'In the menu on the left, go to %1$s → %2$s and press %3$s at the top.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_type( 'wc_edition', 'menu_name' ) ),
					cvc_guide_a( cvc_guide_type( 'wc_answer', 'all_items' ), admin_url( 'edit.php?post_type=wc_answer' ) ),
					cvc_guide_a( cvc_guide_type( 'wc_answer', 'add_new_item' ), admin_url( 'post-new.php?post_type=wc_answer' ) )
				),
				cvc_guide_say(
					/* translators: “Add title” is what the editor shows in an empty title; write it as the editor shows it in this language. */
					__( 'Type their name where it says <strong>Add title</strong>.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: 1: a panel in the editor's side panel, 2: the editions it offers, as a list. */
					__( 'In the panel on the right, under %1$s, tick the edition they answered in: %2$s.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_taxonomy( 'cv_edition' ) ),
					cvc_guide_b( cvc_guide_terms( 'cv_edition' ) )
				),
				cvc_guide_say(
					/* translators: 1: a panel of fields in the editor, 2, 3: two of its fields. */
					__( 'Under %1$s, fill in %2$s, and %3$s if they publish under another name.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'wc_answer' ) ),
					cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_role' ) ),
					cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_alias' ) )
				),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1, 2: fields in the editor's side panel. */
						__( 'Fill in %1$s and %2$s with the colour of their answer, for example AC011 and Powder red.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_code' ) ),
						cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_colour_name' ) )
					),
					cvc_guide_say(
						/* translators: %s: a field in the editor's side panel. */
						__( '%s can stay empty: the site then finds the colour from the reference or the name.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_swatch' ) )
					)
				),
				cvc_guide_step(
					esc_html__( 'Write their answer, as they gave it, in the large space below the name.', 'claudiavalsells' ),
					cvc_guide_say(
						/* translators: %s: a switch in the editor's side panel. */
						__( 'If they answered in pictures rather than words, switch on %s.', 'claudiavalsells' ),
						cvc_guide_b( cvc_guide_field( 'wc_answer', '_cv_in_images' ) )
					)
				),
				cvc_guide_publish(),
			],
			'after' => [
				cvc_guide_step(
					esc_html__( 'Once published with an answer, their name joins the edition’s names on the home page and on the edition’s own page.', 'claudiavalsells' ),
					esc_html__( 'On the edition’s page they come after the people the designer has placed, until the page is redrawn.', 'claudiavalsells' ),
					esc_html__( 'The people already on the page are placed by their names, so keep their names as they are.', 'claudiavalsells' )
				),
			],
		];
	}

	// About and the Colour Chart are pages: their tasks need the page, and
	// someone who may edit it.
	$about = get_page_by_path( 'about' );
	if ( $about && current_user_can( 'edit_post', $about->ID ) ) {
		$tasks[] = [
			'id'    => 'about',
			'title' => __( 'Edit About', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_page_step( $about ),
				cvc_guide_say(
					/* translators: 1: a panel of fields in the editor, 2–5: its fields. */
					__( 'The card is in the panel on the right, under %1$s: %2$s, %3$s, %4$s and %5$s, one email per line.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'about' ) ),
					cvc_guide_b( cvc_guide_field( 'about', '_cv_city' ) ),
					cvc_guide_b( cvc_guide_field( 'about', '_cv_born' ) ),
					cvc_guide_b( cvc_guide_field( 'about', '_cv_phone' ) ),
					cvc_guide_b( cvc_guide_field( 'about', '_cv_emails' ) )
				),
				cvc_guide_say(
					/* translators: %s: a field in the editor's side panel. */
					__( 'The collections are there too, under %s: one per line, the name and the place with a vertical bar between them, as in Fundació Vilacases | Barcelona.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'about', '_cv_collections' ) )
				),
				cvc_guide_step(
					esc_html__( 'The biography is the text of the page: click into a paragraph to change it.', 'claudiavalsells' ),
					cvc_guide_say(
						/* translators: “Replace” is the editor's own button above a selected image; write it as the editor shows it in this language. */
						__( 'The studio photographs are images between the paragraphs: click one and press <strong>Replace</strong> to change it.', 'claudiavalsells' )
					)
				),
				cvc_guide_say(
					/* translators: 1: the Exhibitions menu, 2: a field of each exhibition. */
					__( 'The exhibitions on About are not typed here: they come from %1$s, each in the column its %2$s says.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_type( 'exhibition', 'menu_name' ) ),
					cvc_guide_b( cvc_guide_field( 'exhibition', '_cv_kind' ) )
				),
				cvc_guide_save(),
			],
		];
	}

	$chart = get_page_by_path( 'color-chart' );
	if ( $chart && current_user_can( 'edit_post', $chart->ID ) ) {
		$tasks[] = [
			'id'    => 'chart',
			'title' => __( 'Change the Color Chart’s price and texts', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_page_step( $chart ),
				cvc_guide_say(
					/* translators: 1: a panel of fields in the editor, 2: one of its fields. */
					__( 'In the panel on the right, under %1$s, change %2$s, written as it should read: 60,50€.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'color-chart' ) ),
					cvc_guide_b( cvc_guide_field( 'color-chart', '_cv_price' ) )
				),
				esc_html__( 'The text beside the chart is the text of the page: click into it to change it.', 'claudiavalsells' ),
				cvc_guide_say(
					/* translators: %s: a field in the editor's side panel. */
					__( '%s are the chart’s colours, top to bottom: leave them as they are unless the chart itself changes.', 'claudiavalsells' ),
					cvc_guide_b( cvc_guide_field( 'color-chart', '_cv_bands' ) )
				),
				cvc_guide_save(),
			],
		];
	}

	// Settings → Site texts is an administrator's page (settings.php); anyone
	// else is told where the messages go and who can change it. The names
	// below are that page's own strings, so they translate as they do there.
	// WordPress's own name for the Settings menu, from WordPress's translations.
	$settings = __( 'Settings' );
	$texts    = __( 'Site texts', 'claudiavalsells' );
	if ( current_user_can( 'manage_options' ) ) {
		$tasks[] = [
			'id'    => 'orders',
			'title' => __( 'Where the order form’s messages go', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_go( $settings, $texts, admin_url( 'options-general.php?page=cvc-site' ) ),
				cvc_guide_step(
					cvc_guide_say(
						/* translators: 1: a part of the Site texts page, 2: its field. */
						__( 'Under %1$s, %2$s is the address every message from the Color Chart’s order form is sent to.', 'claudiavalsells' ),
						cvc_guide_b( __( 'The order desk', 'claudiavalsells' ) ),
						cvc_guide_b( __( 'Send inquiries to', 'claudiavalsells' ) )
					),
					esc_html__( 'It never appears on the site.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: %s: a field of the Site texts page. */
					__( '%s is the most messages the form sends in a day, a guard against a flood.', 'claudiavalsells' ),
					cvc_guide_b( __( 'At most, per day', 'claudiavalsells' ) )
				),
				cvc_guide_say(
					/* translators: “Save Changes” is WordPress's own button at the foot of a settings page; write it as WordPress shows it in this language. */
					__( 'Press <strong>Save Changes</strong> at the foot of the page.', 'claudiavalsells' )
				),
			],
			'after' => [
				cvc_guide_step(
					esc_html__( 'Each message arrives as an email, and nothing of it is kept on the site.', 'claudiavalsells' ),
					esc_html__( 'Reply to it as to any email: the answer goes to the person who wrote.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: 1–3: fields of the Site texts page. */
					__( 'The same page holds the site’s other texts: %1$s, %2$s and %3$s.', 'claudiavalsells' ),
					cvc_guide_b( __( 'Description', 'claudiavalsells' ) ),
					cvc_guide_b( __( 'What’s Color? — the note above the names', 'claudiavalsells' ) ),
					cvc_guide_b( __( 'The opening screen', 'claudiavalsells' ) )
				),
			],
		];
	} else {
		$tasks[] = [
			'id'    => 'orders',
			'title' => __( 'Where the order form’s messages go', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_say(
					/* translators: 1: a menu in the column on the left of the admin, 2: one of its items. */
					__( 'Messages from the Color Chart’s order form arrive by email, at the address set in %1$s → %2$s.', 'claudiavalsells' ),
					cvc_guide_b( $settings ),
					cvc_guide_b( $texts )
				),
				esc_html__( 'Only an administrator can see that page and change the address.', 'claudiavalsells' ),
			],
		];
	}

	if ( current_user_can( 'edit_posts' ) ) {
		$tasks[] = [
			'id'    => 'before',
			'title' => __( 'Before you publish', 'claudiavalsells' ),
			'steps' => [
				cvc_guide_say(
					/* translators: “View” and “Preview in new tab” are the editor's own button and menu item; write them as the editor shows them in this language. */
					__( 'To see an entry as the site will show it, before anyone else can, press <strong>View</strong> at the top right and choose <strong>Preview in new tab</strong>.', 'claudiavalsells' )
				),
				cvc_guide_say(
					/* translators: “Save draft” is the editor's own button; write it as the editor shows it in this language. */
					__( '<strong>Save draft</strong> keeps your work without publishing it.', 'claudiavalsells' )
				),
				cvc_guide_step(
					esc_html__( 'A painting’s year and its picture decide where it appears.', 'claudiavalsells' ),
					esc_html__( 'The works run from the newest year to the oldest, so the year places it in the grid; a painting saved without a year is given the current one.', 'claudiavalsells' ),
					esc_html__( 'Without a picture, it is not shown in the grid at all.', 'claudiavalsells' )
				),
			],
		];
	}

	// A step whose every sentence fell away (see cvc_guide_say) goes, and a
	// task left with no steps goes with it.
	$kept = [];
	foreach ( $tasks as $task ) {
		$task['steps'] = array_values( array_filter( $task['steps'], fn( string $s ) => '' !== $s ) );
		$task['lead']  = array_values( array_filter( $task['lead'] ?? [], fn( string $s ) => '' !== $s ) );
		$task['after'] = array_values( array_filter( $task['after'] ?? [], fn( string $s ) => '' !== $s ) );
		if ( $task['steps'] ) {
			$kept[] = $task;
		}
	}
	return $kept;
}

/* ---------------------------------------------------------- the sentences */

/** "In the menu on the left, go to Artwork → Add a new work", the item a link to the screen it opens. */
function cvc_guide_go( string $menu, string $item, string $url ): string {
	return cvc_guide_say(
		/* translators: 1: a menu in the column on the left of the admin, 2: one of its items, a link to the screen it opens. */
		__( 'In the menu on the left, go to %1$s → %2$s.', 'claudiavalsells' ),
		cvc_guide_b( $menu ),
		cvc_guide_a( $item, $url )
	);
}

/** "Go to Pages → All Pages and click About", the page a link to its editor. */
function cvc_guide_page_step( WP_Post $page ): string {
	return cvc_guide_say(
		/* translators: 1: the Pages menu, 2: its first item, 3: the page to click, a link to it. */
		__( 'In the menu on the left, go to %1$s → %2$s and click %3$s.', 'claudiavalsells' ),
		cvc_guide_b( cvc_guide_type( 'page', 'menu_name' ) ),
		cvc_guide_b( cvc_guide_type( 'page', 'all_items' ) ),
		cvc_guide_a( get_the_title( $page ), admin_url( 'post.php?post=' . $page->ID . '&action=edit' ) )
	);
}

function cvc_guide_publish(): string {
	return cvc_guide_say(
		/* translators: “Publish” is the editor's own button, at the top right and again in the panel that asks to confirm; write it as the editor shows it in this language. */
		__( 'Press <strong>Publish</strong> at the top right, and <strong>Publish</strong> again to confirm.', 'claudiavalsells' )
	);
}

function cvc_guide_save(): string {
	return cvc_guide_say(
		/* translators: “Save” is the editor's own button for an entry already published; write it as the editor shows it in this language. */
		__( 'Press <strong>Save</strong> at the top right.', 'claudiavalsells' )
	);
}

/** The main photograph of a show or a project: the one the list brings up, and the first its page shows. */
function cvc_guide_main_photograph( string $button ): string {
	return cvc_guide_say(
		/* translators: %s: the button for the entry's main photograph, at the top of the editor's side panel. */
		__( 'At the top of the panel, press %s: the list shows that photograph, and its page opens on it.', 'claudiavalsells' ),
		cvc_guide_b( $button )
	);
}

function cvc_guide_more_photographs(): string {
	/* translators: /image and /gallery are typed on an empty line of the editor to add an Image or a Gallery block; give the blocks' names as the editor does in this language. */
	return esc_html__( 'Add more photographs in the text: on an empty line, type /image or /gallery and press Enter.', 'claudiavalsells' );
}

/** Whole sentences, already safe, run together into one step; the empty ones are left out. */
function cvc_guide_step( string ...$sentences ): string {
	return implode( ' ', array_filter( $sentences, fn( string $s ) => '' !== $s ) );
}

/**
 * One sentence, safe to print: the translation keeps only <strong> and links,
 * and the pieces it is given — bold labels and links, escaped already — go
 * into its placeholders. A piece that comes back empty means the field or
 * screen it names has gone, so the sentence goes too rather than read wrong.
 */
function cvc_guide_say( string $sentence, string ...$pieces ): string {
	foreach ( $pieces as $piece ) {
		if ( '' === $piece ) {
			return '';
		}
	}
	$sentence = wp_kses( $sentence, [ 'strong' => [], 'a' => [ 'href' => true ] ] );
	if ( ! $pieces ) {
		return $sentence;
	}
	try {
		return vsprintf( $sentence, $pieces );
	} catch ( ValueError $e ) {
		// A translation asking for more pieces than its sentence has: the
		// sentence without them is better than a dashboard that stops here.
		return $sentence;
	}
}

/** A label as the steps set every word the screen shows, in bold; nothing for no label. */
function cvc_guide_b( string $label ): string {
	return '' === trim( $label ) ? '' : '<strong>' . esc_html( $label ) . '</strong>';
}

/** A label in bold that is also the link to the screen it names. */
function cvc_guide_a( string $label, string $url ): string {
	return '' === trim( $label ) ? '' : '<a href="' . esc_url( $url ) . '"><strong>' . esc_html( $label ) . '</strong></a>';
}

/* ------------------------------------------------------------- the labels */

/** A label of one of the site's kinds of entry, as the admin shows it: menu_name, add_new_item, singular_name (the editor's tab)… */
function cvc_guide_type( string $type, string $label ): string {
	$object = get_post_type_object( $type );
	return isset( $object->labels->$label ) ? (string) $object->labels->$label : '';
}

/** A taxonomy's name as the editor heads its panel with it — its menu name. */
function cvc_guide_taxonomy( string $taxonomy ): string {
	$object = get_taxonomy( $taxonomy );
	return isset( $object->labels->menu_name ) ? (string) $object->labels->menu_name : '';
}

/** A taxonomy's terms, by name, as a list in the language's own way of writing one: "I, II, III". */
function cvc_guide_terms( string $taxonomy ): string {
	$names = get_terms( [ 'taxonomy' => $taxonomy, 'hide_empty' => false, 'fields' => 'names' ] );
	return is_array( $names ) ? implode( wp_get_list_item_separator(), $names ) : '';
}

/**
 * A label from the fields panel (includes/editor.php): with no key the
 * panel's own title, with a key that field's label, and with an option the
 * label of that one choice.
 */
function cvc_guide_field( string $group, string $key = '', ?string $option = null ): string {
	static $fields = null;
	if ( null === $fields ) {
		$fields = function_exists( 'cvc_editor_fields' ) ? cvc_editor_fields() : [];
	}
	$set = $fields['types'][ $group ] ?? $fields['pages'][ $group ] ?? null;
	if ( ! $set ) {
		return '';
	}
	if ( '' === $key ) {
		return (string) ( $set['title'] ?? '' );
	}
	foreach ( $set['fields'] ?? [] as $field ) {
		if ( ( $field['key'] ?? '' ) !== $key ) {
			continue;
		}
		if ( null === $option ) {
			return (string) ( $field['label'] ?? '' );
		}
		foreach ( $field['options'] ?? [] as $choice ) {
			if ( ( $choice['value'] ?? null ) === $option ) {
				return (string) ( $choice['label'] ?? '' );
			}
		}
	}
	return '';
}

/* -------------------------------------------------------------- the look */

/**
 * The guide's few rules, inline. On its page, the tasks fill the width in
 * columns a line can be read across, and printing leaves the admin around
 * them out — rules that reach outside the guide, so they are only ever on
 * that page, under the body class WordPress gives it.
 */
function cvc_guide_style( bool $page ): string {
	$css = '.cvc-guide{color:#1d2327}'
		. '.cvc-guide p{margin:0 0 8px}'
		. '.cvc-guide ol{margin:6px 0 12px 1.6em;padding:0;list-style:decimal}'
		. '.cvc-guide li{margin:0 0 6px;padding-left:2px}'
		. '.cvc-guide strong{font-weight:600}'
		. '.cvc-guide__intro,.cvc-guide__note{color:#50575e}'
		. '.cvc-guide details{border-top:1px solid #f0f0f1}'
		. '.cvc-guide summary{cursor:pointer;padding:10px 0;font-size:14px;font-weight:600}'
		. '.cvc-guide details[open]>summary{padding-bottom:4px}'
		. '.cvc-guide__more{border-top:1px solid #f0f0f1;padding-top:12px}';
	if ( $page ) {
		$css .= '.cvc-guide-page .cvc-guide{font-size:14px;line-height:1.6}'
			. '.cvc-guide-page .cvc-guide__intro{max-width:44em}'
			. '.cvc-guide-page .cvc-guide__tasks{columns:30em;column-gap:48px;margin-top:24px}'
			. '.cvc-guide-page .cvc-guide__task{break-inside:avoid;margin:0 0 28px}'
			. '.cvc-guide-page .cvc-guide__task h2{margin:0 0 6px;font-size:18px;line-height:1.3}'
			. '@media print{'
			. 'body.dashboard_page_cvc-guide #adminmenumain,body.dashboard_page_cvc-guide #wpadminbar,body.dashboard_page_cvc-guide #wpfooter,'
			. 'body.dashboard_page_cvc-guide #screen-meta-links,body.dashboard_page_cvc-guide .notice,.cvc-guide-print{display:none!important}'
			. 'html.wp-toolbar{padding-top:0!important}'
			. 'body.dashboard_page_cvc-guide #wpcontent{margin-left:0!important;padding-left:0!important}'
			. '.cvc-guide-page{margin:0!important}'
			. '.cvc-guide-page .cvc-guide{font-size:11pt}'
			. '.cvc-guide-page .cvc-guide__tasks{columns:auto}'
			. '.cvc-guide a{color:inherit;text-decoration:none}'
			. '}';
	}
	return '<style>' . $css . '</style>';
}
