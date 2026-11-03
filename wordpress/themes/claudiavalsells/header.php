<?php
/**
 * The head and the chrome above `main` — the first half of
 * src/components/layout.ts's `layout()`. Each template sets cv_page() first.
 */
$cv_page      = cv_page();
$cv_desc      = $cv_page['description'] ?: (string) cv_option( 'cv_tagline' );
$cv_canonical = cv_canonical_url();
// The pages are in English whatever language the admin is set to, and Site
// Language (Settings → General) is WordPress's locale for the public side
// too, so the language is stated here rather than read from it. data-hover is
// which hover the bar's words wear, as HOVER in src/components/layout.ts sets
// it; `npm run wp:diff` says when the two part.
?><!doctype html>
<html lang="en" data-hover="scramble" style="<?php echo esc_attr( cv_hue_vars() ); ?>">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<?php if ( $cv_desc ) : ?>
<meta name="description" content="<?php echo esc_attr( mb_substr( $cv_desc, 0, 300 ) ); ?>" />
<?php endif; ?>
<?php if ( $cv_canonical ) : ?>
<link rel="canonical" href="<?php echo esc_url( $cv_canonical ); ?>" />
<?php endif; ?>
<?php echo cv_share_tags( mb_substr( $cv_desc, 0, 300 ), $cv_canonical ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside ?>
<?php // The address the stylesheet itself asks for — unstamped — or the preload fetches a second copy. ?>
<link rel="preload" href="<?php echo esc_url( CV_THEME_URI . '/assets/fonts/Switzer-Variable.woff2' ); ?>" as="font" type="font/woff2" crossorigin />
<?php foreach ( cv_modules() as $cv_module ) : ?>
<link rel="modulepreload" href="<?php echo esc_url( $cv_module ); ?>" />
<?php endforeach; ?>
<script>document.documentElement.classList.add('js');
// The loading screen belongs to arriving at the site, not to each page of it.
// Decided here, before the first paint, so pages after the first never show it.
try { if (sessionStorage.getItem('cv-seen')) document.documentElement.classList.add('loaded') } catch (e) {}
// Arriving at What's Color by its link, the page is laid out at the top and
// moved down to the written sentence by script — so it is kept covered until
// it has been, and no frame is ever painted in the wrong place. The script
// uncovers it as soon as it lands (client/write.ts); this timer is the net if
// it never runs. Mirrors src/components/layout.ts.
// Only where that landing is made at all — the same tests client/write.ts
// makes — so a browser that keeps the plain anchor jump never waits for it.
try { var nav = performance.getEntriesByType('navigation')[0];
  if (location.hash === '#whats-color' && (!nav || nav.type === 'navigate')
    && CSS.supports('animation-timeline: view()')
    && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('wc-arriving', 'wc-swatch-drop');
    setTimeout(function () { document.documentElement.classList.remove('wc-arriving') }, 1500);
    setTimeout(function () { document.documentElement.classList.remove('wc-swatch-drop') }, 700);
  } } catch (e) {}</script>
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
