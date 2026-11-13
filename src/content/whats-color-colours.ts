/**
 * The colour of each person in What's Color?, as Claudia signed them off.
 *
 * Two sources, and an order between them. Claudia's own three sheets
 * (PRIMERA, SEGONA and TERCERA ENTREGA, November 2026) give a swatch and its
 * HEX for the people whose colour she corrected, and they rule: each value
 * here marked `client` is the HEX printed under her swatch, checked against
 * the swatch's own pixels. Everyone her sheets leave out had already been
 * guessed right on the designer's sheet (WHATS COLOR COLORS), so theirs is
 * the fill of the designer's bar, read from the drawing itself: `designer`.
 *
 * Keyed by name, not by edition: Oscar Tusquets answered twice, and the
 * colour Claudia gave him on the first edition's sheet is his in both, over
 * the designer's bar for him in the second.
 *
 * Two values are not the sheet's letter for letter. María Prats is printed
 * #000000F4 — black at 96% — which on the white page is #0a0a0a, the colour
 * of her swatch; Carlota Guerrero's #F7E9B200 carries a stray alpha of zero
 * on a swatch that is plainly opaque, so it is #f7e9b2.
 *
 * Cierto Estudio is on neither sheet, and keeps a colour from the site's
 * palette until Claudia names one.
 */
export interface FinalColour {
  readonly edition: 'I' | 'II' | 'III';
  /** The name as the site's roster writes it. */
  readonly name: string;
  readonly hex: string;
  readonly from: 'client' | 'designer';
}

export const FINAL_COLOURS: readonly FinalColour[] = [
  // I
  { edition: 'I', name: 'Marina Garcés', hex: '#b15f60', from: 'designer' },
  { edition: 'I', name: 'Olafur Eliasson', hex: '#fbc644', from: 'designer' },
  { edition: 'I', name: 'Li Edelkoort', hex: '#f1d7ae', from: 'designer' },
  { edition: 'I', name: 'Rupi Kaur', hex: '#efc7ab', from: 'client' },
  { edition: 'I', name: 'Ramón Andrés', hex: '#164f41', from: 'client' },
  { edition: 'I', name: 'Victoria Cirlot', hex: '#8d252f', from: 'designer' },
  { edition: 'I', name: 'Tortell Poltrona', hex: '#e83a41', from: 'designer' },
  { edition: 'I', name: 'Angelica Dass', hex: '#da7f2e', from: 'client' },
  { edition: 'I', name: 'Jaume Funes', hex: '#5aba9f', from: 'designer' },
  { edition: 'I', name: 'Oscar Tusquets', hex: '#b9593f', from: 'client' },
  { edition: 'I', name: 'David Bueno i Torrens', hex: '#cdddcb', from: 'client' },
  { edition: 'I', name: 'Flavia Company', hex: '#fbbe41', from: 'designer' },
  { edition: 'I', name: 'Siri Hustvedt', hex: '#e19645', from: 'client' },
  { edition: 'I', name: 'Henry Giroux', hex: '#eb5d41', from: 'designer' },
  { edition: 'I', name: 'Carolin Emcke', hex: '#a8a594', from: 'designer' },
  { edition: 'I', name: 'Valeria Luiselli', hex: '#244e9d', from: 'designer' },
  { edition: 'I', name: 'David Attenborough', hex: '#006780', from: 'designer' },
  { edition: 'I', name: 'Judy Wajcmann', hex: '#6d69a4', from: 'designer' },
  { edition: 'I', name: 'Alessandro Baricco', hex: '#d59a2b', from: 'designer' },
  { edition: 'I', name: 'Arno Stern', hex: '#ec692b', from: 'designer' },
  { edition: 'I', name: 'Fina Birulés', hex: '#85709d', from: 'designer' },
  { edition: 'I', name: 'Stefano Mancuso', hex: '#5c7e52', from: 'designer' },
  { edition: 'I', name: 'David Le Breton', hex: '#a9a2a1', from: 'designer' },
  { edition: 'I', name: 'Noah Harari', hex: '#a1d2cb', from: 'designer' },
  { edition: 'I', name: 'Himali Singh Soin', hex: '#9abad6', from: 'client' },
  { edition: 'I', name: 'César Bona', hex: '#056e59', from: 'client' },
  { edition: 'I', name: 'Kristine McDivitt Tompkins', hex: '#b9975b', from: 'designer' },
  { edition: 'I', name: 'Francesco Tonucci', hex: '#008abd', from: 'client' },
  // II
  { edition: 'II', name: 'Plantea Estudio', hex: '#8d4c3b', from: 'designer' },
  { edition: 'II', name: 'Kal-a', hex: '#4b4e5a', from: 'designer' },
  { edition: 'II', name: 'Elii', hex: '#134270', from: 'client' },
  { edition: 'II', name: 'HANGHAR', hex: '#a8a691', from: 'client' },
  { edition: 'II', name: 'Nomos arquitectos', hex: '#3e1912', from: 'designer' },
  { edition: 'II', name: 'Montse Vicens', hex: '#fff0db', from: 'client' },
  { edition: 'II', name: 'Isabel Francoy', hex: '#bf7d19', from: 'client' },
  { edition: 'II', name: 'Tomás López Amat', hex: '#411e1f', from: 'designer' },
  { edition: 'II', name: 'Stefano Colli', hex: '#779fbf', from: 'client' },
  { edition: 'II', name: 'ContiCert', hex: '#763027', from: 'designer' },
  { edition: 'II', name: 'Un parell d’arquitectes', hex: '#829ba4', from: 'designer' },
  { edition: 'II', name: 'Naso ++', hex: '#ab9789', from: 'client' },
  { edition: 'II', name: 'Isla arquitectos', hex: '#ac6758', from: 'designer' },
  { edition: 'II', name: 'Auxi Gálvez', hex: '#7a6e7d', from: 'client' },
  { edition: 'II', name: 'Escobedo Soliz', hex: '#155472', from: 'designer' },
  { edition: 'II', name: 'Antoni Arola', hex: '#a55117', from: 'designer' },
  { edition: 'II', name: 'Barbara Aurell', hex: '#e05f09', from: 'client' },
  { edition: 'II', name: 'Laura Castanya', hex: '#d7943b', from: 'designer' },
  { edition: 'II', name: 'Andrea Batlló y Adrià Escolano', hex: '#be8e88', from: 'designer' },
  { edition: 'II', name: 'Marc Morro', hex: '#97432c', from: 'designer' },
  { edition: 'II', name: 'Anna Vidal', hex: '#2250b3', from: 'client' },
  { edition: 'II', name: 'Gema Sach', hex: '#be8e88', from: 'designer' },
  { edition: 'II', name: 'Mariona Espinet', hex: '#87222c', from: 'client' },
  { edition: 'II', name: 'Isabel Sendra', hex: '#c29a97', from: 'client' },
  { edition: 'II', name: 'AMOO', hex: '#592222', from: 'designer' },
  { edition: 'II', name: 'Loca Studio', hex: '#eb7373', from: 'client' },
  { edition: 'II', name: 'Paula Arroyo', hex: '#fab75f', from: 'client' },
  { edition: 'II', name: 'Oscar Tusquets', hex: '#b9593f', from: 'client' },
  // III — all of it is on Claudia's sheet
  { edition: 'III', name: 'Álvaro Galmés', hex: '#ebad02', from: 'client' },
  { edition: 'III', name: 'Marta D. Riezu', hex: '#82ad7b', from: 'client' },
  { edition: 'III', name: 'María Prats', hex: '#0a0a0a', from: 'client' },
  { edition: 'III', name: 'Carlota Guerrero', hex: '#f7e9b2', from: 'client' },
  { edition: 'III', name: 'Lucia Boned', hex: '#16396e', from: 'client' },
  { edition: 'III', name: 'Albert Riera Galcerán', hex: '#ff85a9', from: 'client' },
  { edition: 'III', name: 'Guillermo Santomà', hex: '#2b6db6', from: 'client' },
  { edition: 'III', name: 'Cristina Stolhe', hex: '#023831', from: 'client' },
  { edition: 'III', name: 'José Quintanar', hex: '#ffe270', from: 'client' },
  { edition: 'III', name: 'Luís Cerveró', hex: '#00034d', from: 'client' },
  { edition: 'III', name: 'Irene Royo', hex: '#f2b391', from: 'client' },
  { edition: 'III', name: 'Adrià Cañameras', hex: '#86a7b8', from: 'client' },
  { edition: 'III', name: 'Isabel Martinez', hex: '#f23d67', from: 'client' },
  { edition: 'III', name: 'Salva López', hex: '#b84300', from: 'client' },
  { edition: 'III', name: 'Berta Blanca Ivanow', hex: '#d4916a', from: 'client' },
  { edition: 'III', name: 'Marc Gómez del Moral', hex: '#edd3b2', from: 'client' },
  { edition: 'III', name: 'Jose Javier Serrano', hex: '#00a3cc', from: 'client' },
  { edition: 'III', name: 'Raquel Quevedo', hex: '#daded7', from: 'client' },
  { edition: 'III', name: 'Xavi Mañosa', hex: '#d2cecd', from: 'client' },
  { edition: 'III', name: 'Arnau Blanch', hex: '#779fbf', from: 'client' },
  { edition: 'III', name: 'María Medem', hex: '#85497b', from: 'client' },
  { edition: 'III', name: 'Ana Cuba', hex: '#ffb08f', from: 'client' },
  { edition: 'III', name: 'Belén Gayán', hex: '#00899e', from: 'client' },
  { edition: 'III', name: 'Juan Diego Valera', hex: '#cdddcb', from: 'client' },
  { edition: 'III', name: 'Julia Ruiz Cabello', hex: '#c24700', from: 'client' },
];
