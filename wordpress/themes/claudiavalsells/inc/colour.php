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
 * The colour Claudia signed off for each person — FINAL_COLOURS in
 * src/content/whats-color-colours.ts, keyed by cv_id_for() of the name. The
 * import writes the same value into each entry's own colour field, which is
 * where she sees and changes it; this table is what an entry falls back to
 * when that field is empty, so a cleared field returns to her colour rather
 * than to a guess from the reference or the name.
 */
const CV_SWATCH_FINAL = [
	'wc-marina-garces'                  => '#b15f60',
	'wc-olafur-eliasson'                => '#fbc644',
	'wc-li-edelkoort'                   => '#f1d7ae',
	'wc-rupi-kaur'                      => '#efc7ab',
	'wc-ramon-andres'                   => '#164f41',
	'wc-victoria-cirlot'                => '#8d252f',
	'wc-tortell-poltrona'               => '#e83a41',
	'wc-angelica-dass'                  => '#da7f2e',
	'wc-jaume-funes'                    => '#5aba9f',
	'wc-oscar-tusquets'                 => '#b9593f',
	'wc-david-bueno-i-torrens'          => '#cdddcb',
	'wc-flavia-company'                 => '#fbbe41',
	'wc-siri-hustvedt'                  => '#e19645',
	'wc-henry-giroux'                   => '#eb5d41',
	'wc-carolin-emcke'                  => '#a8a594',
	'wc-valeria-luiselli'               => '#244e9d',
	'wc-david-attenborough'             => '#006780',
	'wc-judy-wajcmann'                  => '#6d69a4',
	'wc-alessandro-baricco'             => '#d59a2b',
	'wc-arno-stern'                     => '#ec692b',
	'wc-fina-birules'                   => '#85709d',
	'wc-stefano-mancuso'                => '#5c7e52',
	'wc-david-le-breton'                => '#a9a2a1',
	'wc-noah-harari'                    => '#a1d2cb',
	'wc-himali-singh-soin'              => '#9abad6',
	'wc-cesar-bona'                     => '#056e59',
	'wc-kristine-mcdivitt-tompkins'     => '#b9975b',
	'wc-francesco-tonucci'              => '#008abd',
	'wc-plantea-estudio'                => '#8d4c3b',
	'wc-kal-a'                          => '#4b4e5a',
	'wc-elii'                           => '#134270',
	'wc-hanghar'                        => '#a8a691',
	'wc-nomos-arquitectos'              => '#3e1912',
	'wc-montse-vicens'                  => '#fff0db',
	'wc-isabel-francoy'                 => '#bf7d19',
	'wc-tomas-lopez-amat'               => '#411e1f',
	'wc-stefano-colli'                  => '#779fbf',
	'wc-conticert'                      => '#763027',
	'wc-un-parell-d-arquitectes'        => '#829ba4',
	'wc-naso'                           => '#ab9789',
	'wc-isla-arquitectos'               => '#ac6758',
	'wc-auxi-galvez'                    => '#7a6e7d',
	'wc-escobedo-soliz'                 => '#155472',
	'wc-antoni-arola'                   => '#a55117',
	'wc-barbara-aurell'                 => '#e05f09',
	'wc-laura-castanya'                 => '#d7943b',
	'wc-andrea-batllo-y-adria-escolano' => '#be8e88',
	'wc-marc-morro'                     => '#97432c',
	'wc-anna-vidal'                     => '#2250b3',
	'wc-gema-sach'                      => '#be8e88',
	'wc-mariona-espinet'                => '#87222c',
	'wc-isabel-sendra'                  => '#c29a97',
	'wc-amoo'                           => '#592222',
	'wc-loca-studio'                    => '#eb7373',
	'wc-paula-arroyo'                   => '#fab75f',
	'wc-alvaro-galmes'                  => '#ebad02',
	'wc-marta-d-riezu'                  => '#82ad7b',
	'wc-maria-prats'                    => '#0a0a0a',
	'wc-carlota-guerrero'               => '#f7e9b2',
	'wc-lucia-boned'                    => '#16396e',
	'wc-albert-riera-galceran'          => '#ff85a9',
	'wc-guillermo-santoma'              => '#2b6db6',
	'wc-cristina-stolhe'                => '#023831',
	'wc-jose-quintanar'                 => '#ffe270',
	'wc-luis-cervero'                   => '#00034d',
	'wc-irene-royo'                     => '#f2b391',
	'wc-adria-canameras'                => '#86a7b8',
	'wc-isabel-martinez'                => '#f23d67',
	'wc-salva-lopez'                    => '#b84300',
	'wc-berta-blanca-ivanow'            => '#d4916a',
	'wc-marc-gomez-del-moral'           => '#edd3b2',
	'wc-jose-javier-serrano'            => '#00a3cc',
	'wc-raquel-quevedo'                 => '#daded7',
	'wc-xavi-manosa'                    => '#d2cecd',
	'wc-arnau-blanch'                   => '#779fbf',
	'wc-maria-medem'                    => '#85497b',
	'wc-ana-cuba'                       => '#ffb08f',
	'wc-belen-gayan'                    => '#00899e',
	'wc-juan-diego-valera'              => '#cdddcb',
	'wc-julia-ruiz-cabello'             => '#c24700',
];

/**
 * The colour behind a participant's name, when it is hovered — the colour the
 * entry says. A port of swatchFor() in src/content/whats-color.ts, with one
 * step ahead of it: a hex typed into the answer in WordPress wins. After that
 * the colour Claudia signed off, by name; then the paint photographed in the book, by code; then a value per colour name;
 * and for nobody-named-a-colour, the site's palette, at random but the same
 * every time for the same person. The tables are the static site's, kept in
 * step by hand: a change there is a change here.
 */
const CV_SWATCH_PAINTED = [
	'AC001' => '#dfcb6c',
	'AC009' => '#642625',
	'AC016' => '#af8385',
	'AC032' => '#051352',
	'AC035' => '#183b81',
	'AC071' => '#2b0803',
	'AC206' => '#c0aa8b',
	'AC219' => '#66605a',
	'AC250' => '#11151f',
];

const CV_SWATCH_NAMED = [
	'powder red'              => '#c4706a',
	'yellow'                  => '#e6c33f',
	'natural off white'       => '#ece5d3',
	'soft nude'               => '#c0aa8b',
	'dark green'              => '#2f4b35',
	'rouge'                   => '#8e2a33',
	'red'                     => '#b5302a',
	'beautiful sand'          => '#d8c3a0',
	'green blue'              => '#2f7a74',
	'pompeian red'            => '#2b0803',
	'grey green'              => '#8a9a85',
	'ocher green'             => '#8f8a3c',
	'dark orange'             => '#c4581f',
	'warm red'                => '#c8402e',
	'deep blue'               => '#1f3466',
	'lilac'                   => '#b7a3c9',
	'ocher red'               => '#b5562f',
	'orange'                  => '#e07a2b',
	'green'                   => '#5f8a4f',
	'gris'                    => '#8d8d87',
	'blue to green'           => '#2f7f86',
	'ice blue'                => '#c9dde6',
	'deep green'              => '#1f4a35',
	'sand colour'             => '#d6c29c',
	'ocre amarillo'           => '#d1a03a',
	'verde'                   => '#5f8a4f',
	'negre'                   => '#1e1e1e',
	'vainilla'                => '#dfcb6c',
	'azul celeste oscuro'     => '#5f8fb3',
	'rosa intens'             => '#af8385',
	'azul'                    => '#2f5ea8',
	'verde oscuro casi negro' => '#1d2a20',
	'amarillo'                => '#e6c33f',
	'azul profundo'           => '#11151f',
	'rosa salmon'             => '#e8a08a',
	'fresa'                   => '#c4455c',
	'terracota'               => '#b5582f',
	'arena'                   => '#d6c4a3',
	'azul piscina'            => '#3fa3b5',
	'gris perla'              => '#c4c4be',
	'gris pols'               => '#a39f98',
	'azul plomo'              => '#4f6070',
	'lila magenta'            => '#b0577f',
	'mandarina'               => '#e8823a',
	'blau casi verd'          => '#2f7a7c',
	'verde gris'              => '#7f9284',
	'ocre rojizo'             => '#b8693a',
];

function cv_swatch_for( array $participant ): string {
	if ( ! empty( $participant['swatch'] ) && preg_match( '/^#[0-9a-f]{6}$/i', $participant['swatch'] ) ) {
		return strtolower( $participant['swatch'] );
	}
	$final = CV_SWATCH_FINAL[ cv_id_for( (string) ( $participant['name'] ?? '' ) ) ] ?? '';
	if ( '' !== $final ) {
		return $final;
	}
	if ( ! empty( $participant['code'] ) && preg_match( '/\bAC\s*0*(\d{1,3})\b/i', $participant['code'], $m ) ) {
		$key = 'AC' . str_pad( $m[1], 3, '0', STR_PAD_LEFT );
		if ( isset( CV_SWATCH_PAINTED[ $key ] ) ) {
			return CV_SWATCH_PAINTED[ $key ];
		}
	}
	if ( ! empty( $participant['colourName'] ) ) {
		$key = trim( preg_replace( '/\s+/', ' ', strtolower( remove_accents( $participant['colourName'] ) ) ) );
		if ( isset( CV_SWATCH_NAMED[ $key ] ) ) {
			return CV_SWATCH_NAMED[ $key ];
		}
	}
	$hues = array_map( fn( $y ) => cv_vivid( $y['colour'] ), cv_years() );
	if ( ! $hues ) {
		return '#8d8d87';
	}
	$h = 0;
	foreach ( str_split( cv_id_for( (string) $participant['name'] ) ) as $c ) {
		$h = ( $h * 31 + ord( $c ) ) % 1000003;
	}
	return $hues[ $h % count( $hues ) ];
}

/** A name reduced to something that can live in a URL fragment. */
function cv_id_for( string $name ): string {
	$plain = strtolower( remove_accents( $name ) );
	return 'wc-' . trim( preg_replace( '/[^a-z0-9]+/', '-', $plain ), '-' );
}
