<?php
/**
 * The head and the chrome above `main` — the first half of
 * src/components/layout.ts's `layout()`. Each template sets cv_page() first.
 */
$cv_page = cv_page();
$cv_desc = $cv_page['description'] ?: (string) cv_option( 'cv_tagline' );
?><!doctype html>
<html <?php language_attributes(); ?> style="<?php echo esc_attr( cv_hue_vars() ); ?>">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<?php if ( $cv_desc ) : ?>
<meta name="description" content="<?php echo esc_attr( mb_substr( $cv_desc, 0, 300 ) ); ?>" />
<?php endif; ?>
<link rel="preload" href="<?php echo esc_url( cv_asset( 'fonts/Switzer-Variable.woff2' ) ); ?>" as="font" type="font/woff2" crossorigin />
<?php foreach ( cv_modules() as $cv_module ) : ?>
<link rel="modulepreload" href="<?php echo esc_url( $cv_module ); ?>" />
<?php endforeach; ?>
<script>document.documentElement.classList.add('js');
// The loading screen belongs to arriving at the site, not to each page of it.
// Decided here, before the first paint, so pages after the first never show it.
try { if (sessionStorage.getItem('cv-seen')) document.documentElement.classList.add('loaded') } catch (e) {}</script>
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php echo cv_loading_screen(); ?>
<div class="page-veil" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>
<?php echo cv_top_bar(); ?>
<?php echo $cv_page['rail']; ?>
<main id="main">
