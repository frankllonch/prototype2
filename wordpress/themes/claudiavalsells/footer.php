<?php
/**
 * Everything after `main` — the second half of `layout()`: the page's own
 * overlays and controls, the cue, the cursor, the veil, About, the lightbox,
 * and the one script that boots the rest.
 */
$cv_page = cv_page();
?>
</main>
<?php echo $cv_page['overlays']; ?>
<?php echo $cv_page['controls']; ?>
<?php echo $cv_page['cue'] ? cv_scroll_cue( $cv_page['cue'] ) : ''; ?>
<div class="cursor" data-cursor aria-hidden="true"><span class="cursor-label"></span></div>
<div class="panel-veil<?php echo $cv_page['open'] ? ' is-open' : ''; ?>" data-panel-veil<?php echo $cv_page['root'] ? ' data-panel-root="' . esc_attr( $cv_page['root'] ) . '"' : ''; ?>></div>
<?php echo cv_about_overlay( 'about' === $cv_page['open'] ); ?>
<?php echo cv_lightbox(); ?>
<script type="module" src="<?php echo esc_url( cv_asset( 'js/index.js' ) ); ?>"></script>
<?php wp_footer(); ?>
</body>
</html>
