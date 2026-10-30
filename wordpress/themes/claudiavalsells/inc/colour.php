<?php
/**
 * The site's colour arithmetic, after src/content/palette.ts and
 * src/content/whats-color.ts.
 *
 * Everything that answers in colour — a row under the pointer, the page you
 * are on in the bar, a name on What's Color? — draws from the year palette
 * sampled from the paintings, each brought up to where it reads as a hue on
 * paper. The list is handed to the browser once, as custom properties on the
 * document, and client/hues.js is the one way of choosing from it.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cv_hex_rgb( string $hex ): array {
	$n = (int) hexdec( substr( ltrim( $hex, '#' ), 0, 6 ) );
	return [ ( ( $n >> 16 ) & 255 ) / 255, ( ( $n >> 8 ) & 255 ) / 255, ( $n & 255 ) / 255 ];
}

function cv_rgb_hex( array $rgb ): string {
	$to = fn( float $v ) => str_pad( dechex( (int) round( min( 1, max( 0, $v ) ) * 255 ) ), 2, '0', STR_PAD_LEFT );
	return '#' . $to( $rgb[0] ) . $to( $rgb[1] ) . $to( $rgb[2] );
}

function cv_channel( float $v ): float {
	return $v <= 0.03928 ? $v / 12.92 : ( ( $v + 0.055 ) / 1.055 ) ** 2.4;
}

function cv_luminance( array $rgb ): float {
	return 0.2126 * cv_channel( $rgb[0] ) + 0.7152 * cv_channel( $rgb[1] ) + 0.0722 * cv_channel( $rgb[2] );
}

/**
 * The same colour, brought up to where it reads as one.
 *
 * Several of the year colours are very dark — a ground, a deep red — which on
 * the rail is right. As a line of type on white, `#2b2d15` is not an olive, it
 * is black. Lightness and saturation are moved into a band where a hue is
 * legible as that hue, then lightness comes down from its brightest until the
 * contrast clears 4.5:1. The hue itself is never changed.
 */
function cv_vivid( string $hex ): string {
	[ $r, $g, $b ] = cv_hex_rgb( $hex );
	$max = max( $r, $g, $b );
	$min = min( $r, $g, $b );
	$d   = $max - $min;

	$h = 0.0;
	if ( $d != 0 ) {
		if ( $max == $r ) {
			$h = ( ( $g - $b ) / $d + ( $g < $b ? 6 : 0 ) ) / 6;
		} elseif ( $max == $g ) {
			$h = ( ( $b - $r ) / $d + 2 ) / 6;
		} else {
			$h = ( ( $r - $g ) / $d + 4 ) / 6;
		}
	}
	$l0 = ( $max + $min ) / 2;
	$s  = max( 0.62, $d == 0 ? 0 : ( $l0 > 0.5 ? $d / ( 2 - $max - $min ) : $d / ( $max + $min ) ) );
	$hh = $h * 12;
	$k  = fn( float $t ) => fmod( $t + 12, 12 );
	$at = function ( float $l ) use ( $s, $k, $hh ): array {
		$a = $s * min( $l, 1 - $l );
		$f = fn( float $t ) => $l - $a * max( -1, min( $k( $t ) - 3, min( 9 - $k( $t ), 1 ) ) );
		return [ $f( $hh ), $f( $hh + 8 ), $f( $hh + 4 ) ];
	};

	$best = $at( min( 0.5, max( 0.4, ( $max + $min ) / 2 ) ) );
	for ( $l = 0.5; $l >= 0.16; $l -= 0.01 ) {
		$best = $at( $l );
		if ( 1.05 / ( cv_luminance( $best ) + 0.05 ) >= 4.5 ) {
			break;
		}
	}
	return cv_rgb_hex( $best );
}

/**
 * The same colour as the bar has to be told it. The bar is drawn as the
 * difference of whatever passes under it, so to arrive at a colour there, its
 * negative is what is set.
 */
function cv_negative( string $hex ): string {
	[ $r, $g, $b ] = cv_hex_rgb( $hex );
	return sprintf( 'rgb(%d, %d, %d)', 255 - round( $r * 255 ), 255 - round( $g * 255 ), 255 - round( $b * 255 ) );
}

/** The list as custom properties for the document: `--hues`, `--hue-N`, `--neg-N`. */
function cv_hue_vars(): string {
	$hues = array_map( fn( $y ) => cv_vivid( $y['colour'] ), cv_years() );
	$out  = [ '--hues:' . count( $hues ) ];
	foreach ( $hues as $i => $hue ) {
		$out[] = "--hue-$i:$hue";
		$out[] = "--neg-$i:" . cv_negative( $hue );
	}
	return implode( ';', $out );
}

/** Which of ink or paper to set on top of a swatch. */
function cv_ink_on( string $hex ): string {
	return cv_luminance( cv_hex_rgb( $hex ) ) > 0.42 ? 'ink' : 'paper';
}

/** The same colour, dark enough to read as type on white; a legible one untouched. */
function cv_readable( string $hex, float $ratio = 4.5 ): string {
	$rgb = cv_hex_rgb( $hex );
	if ( 1.05 / ( cv_luminance( $rgb ) + 0.05 ) >= $ratio ) {
		return $hex;
	}
	for ( $k = 0.95; $k > 0; $k -= 0.02 ) {
		$scaled = array_map( fn( $v ) => $v * $k, $rgb );
		if ( 1.05 / ( cv_luminance( $scaled ) + 0.05 ) >= $ratio ) {
			return cv_rgb_hex( $scaled );
		}
	}
	return '#242528';
}

/**
 * A stand-in colour for a participant's swatch, read off the colour's name in
 * the two languages the source writes them in. Claudia's chart has the real
 * values and a hex typed into the entry replaces this.
 */
const CV_SWATCH_WORDS = [
	[ '/off\s*white|blanco|white|crudo/iu', '#efebe3' ],
	[ '/powder\s*red|rosa|pink/iu', '#d98f93' ],
	[ '/pompeian|rouge|rojo|\bred\b/iu', '#b23a2e' ],
	[ '/burdeos|granate|wine/iu', '#7d2a35' ],
	[ '/naranja|orange|teja/iu', '#d2762f' ],
	[ '/ocre\s*rojizo/iu', '#c07a3e' ],
	[ '/ocre|ocher|ochre|mostaza|amarillo|yellow/iu', '#e3b23c' ],
	[ '/rojizo/iu', '#b23a2e' ],
	[ '/arena|sand|beige|nude|crema/iu', '#dcc9a8' ],
	[ '/marr[oó]n|brown|tierra/iu', '#8a5a3b' ],
	[ '/verde\s*oscuro|dark\s*green/iu', '#2f4b35' ],
	[ '/verde|green/iu', '#5f7f4f' ],
	[ '/azul\s*celeste|celeste|sky/iu', '#8fb3cc' ],
	[ '/azul\s*piscina|turquesa|turquoise|cyan/iu', '#3f9aa6' ],
	[ '/azul\s*oscuro|navy|marino/iu', '#2b3a58' ],
	[ '/azul|blue/iu', '#4a6b96' ],
	[ '/violeta|morado|purple|lila/iu', '#6b4a78' ],
	[ '/gris|grey|gray/iu', '#8d8d87' ],
	[ '/negro|black/iu', '#2b2b2b' ],
	[ '/fresa|strawberry/iu', '#c4455c' ],
	[ '/mandarina|tangerine/iu', '#e08a3c' ],
	[ '/blau\s*verd|verd\s*blau|teal/iu', '#2f7a74' ],
	[ '/blau/iu', '#4a6b96' ],
	[ '/verd\b/iu', '#5f7f4f' ],
	[ '/vermell|carmes[ií]/iu', '#b23a2e' ],
	[ '/groc/iu', '#e3b23c' ],
	[ '/plom|lead/iu', '#6e7681' ],
];

/** When the source names no colour, a steady sweep so neighbours differ. */
const CV_SWATCH_SWEEP = [ '#c96a3f', '#4a6b96', '#5f7f4f', '#b23a2e', '#8d8d87', '#e3b23c', '#6b4a78', '#3f9aa6' ];

function cv_swatch_for( array $participant, int $index ): string {
	if ( ! empty( $participant['swatch'] ) && preg_match( '/^#[0-9a-f]{6}$/i', $participant['swatch'] ) ) {
		return strtolower( $participant['swatch'] );
	}
	if ( ! empty( $participant['colourName'] ) ) {
		foreach ( CV_SWATCH_WORDS as [ $pattern, $hex ] ) {
			if ( preg_match( $pattern, $participant['colourName'] ) ) {
				return $hex;
			}
		}
	}
	return CV_SWATCH_SWEEP[ $index % count( CV_SWATCH_SWEEP ) ];
}

/** A name reduced to something that can live in a URL fragment. */
function cv_id_for( string $name ): string {
	$plain = strtolower( remove_accents( $name ) );
	return 'wc-' . trim( preg_replace( '/[^a-z0-9]+/', '-', $plain ), '-' );
}
