/**
 * What's Color?, as Claudia's own document of the three editions has it.
 *
 * Everything else on this site is read out of WordPress. This is not: it is a
 * document she supplied — "RESPOSTES DE LES 3 EDICIONS WHATS COLOR" — and for
 * this project it outranks the website, because the website never had most of
 * it. The second edition's page names twenty-eight studios in a thank-you
 * sentence and prints not one of their answers; the document has twenty-seven.
 * The third edition's page shows only the seventeen who answered; the document
 * names all twenty-five who were asked.
 *
 * So the roster below is the roster. Anyone the document does not name is not
 * on the page, which is what was asked for and is the only way two sources can
 * be reconciled without picking favourites per name.
 *
 * What is NOT here: the answers for editions I and III. Those are already read
 * out of the site, they agree with the document, and re-typing several thousand
 * words to say the same thing would only create somewhere for the two to drift
 * apart. The second edition's answers are here because they exist nowhere else.
 *
 * `aka` exists because the site spells a few of these differently — Attenborugh
 * for Attenborough, Plantea Estudi for Plantea Estudio — and the two have to be
 * matched before either can be corrected. The document's spelling wins.
 */

export interface DocumentEntry {
  /** As the document writes it. This is the name the page shows. */
  readonly name: string;
  /** What they do, where the document says. */
  readonly role?: string;
  /** The colour reference, as written: AC011, AC16, AC0033. */
  readonly code?: string;
  /** The colour's name, where the document gives one. */
  readonly colourName?: string;
  /** The name they publish under, where the document gives both. */
  readonly alias?: string;
  /** Edition II only — these answers are in no other source. */
  readonly answer?: string;
  /** Answered with pictures rather than words. */
  readonly inImages?: boolean;
  /** How the site's own pages spell them, where that differs. */
  readonly aka?: readonly string[];
}

/*
 * December 2020, Barcelona. Twenty-eight guests, fourteen of whom answered.
 * The fourteen answers are on the site already and are not repeated here.
 */
export const EDITION_I: readonly DocumentEntry[] = [
  { name: 'Marina Garcés', role: 'Filòsofa / Philosopher', code: 'AC011', colourName: 'Vermell pols / Powder red' },
  { name: 'Olafur Eliasson', role: 'Artist', code: 'AC002', colourName: 'Yellow' },
  { name: 'Li Edelkoort', role: 'Trend forecaster', code: 'AC119', colourName: 'Natural off white' },
  { name: 'Rupi Kaur', role: 'Poet', code: 'AC206', colourName: 'Soft nude' },
  { name: 'Ramón Andrés', role: 'Ensayista, pensador / Essayist and thinker', code: 'AC052', colourName: 'Verde oscuro / Dark green' },
  { name: 'Victoria Cirlot', role: 'Catedrática de Filología Románica / Professor of Romanic Philology', code: 'AC019' },
  { name: 'Tortell Poltrona', role: 'Pallasso / Clown', code: 'AC009', colourName: 'Vermell / Rouge' },
  { name: 'Angelica Dass', role: 'Fotògrafa / Photographer — Humanae project', code: 'AC073', colourName: 'Beautiful sand' },
  { name: 'Jaume Funes', role: 'Psicòleg, educador i periodista / Psychologist, educator and journalist', code: 'AC048' },
  { name: 'Oscar Tusquets', role: 'Arquitecto, pintor y escritor / Architect, painter and writer', code: 'AC071', colourName: 'Pompeian red' },
  { name: 'David Bueno i Torrens', role: 'Biòleg especialitzat en neurociència aplicada a l’educació / Biologist, education and neuroscience', code: 'AC098', colourName: 'Grey green' },
  { name: 'Flavia Company', role: 'Escriptora i periodista / Writer and journalist', code: 'AC062' },
  { name: 'Siri Hustvedt', role: 'Essayist, novelist and poet', code: 'AC074' },
  { name: 'Henry Giroux', role: 'Writer and cultural critic, founder of critical pedagogy / Escriptor i crític cultural', code: 'AC008', colourName: 'Warm red' },
  { name: 'Carolin Emcke', role: 'Filósofa, escritora i periodista', code: 'AC101' },
  { name: 'Valeria Luiselli', role: 'Escritora y ensayista', code: 'AC035' },
  { name: 'David Attenborough', role: 'Científic divulgador naturista', code: 'AC044', colourName: 'Deep blue', aka: ['David Attenborugh'] },
  { name: 'Judy Wajcmann', role: 'Socióloga', code: 'AC023', colourName: 'Lilac' },
  { name: 'Alessandro Baricco', role: 'Novelista, dramaturg i periodista', code: 'AC065', colourName: 'Ocher red' },
  { name: 'Arno Stern', role: 'Pedagog investigador', code: 'AC004', colourName: 'Orange' },
  { name: 'Fina Birulés', role: 'Philosopher / Filòsofa', code: 'AC022' },
  { name: 'Stefano Mancuso', role: 'Plant neurobiologist', code: 'AC055', colourName: 'Green' },
  { name: 'David Le Breton', role: 'Antropòleg, sociòleg i professor', code: 'AC128', colourName: 'Gris' },
  { name: 'Noah Harari', role: 'Historian and writer / Historiador i escriptor', code: 'AC042', colourName: 'Blue to green' },
  { name: 'Himali Singh Soin', role: 'Artist and writer / Artista i escriptora', code: 'AC036', colourName: 'Ice blue' },
  { name: 'César Bona', role: 'Pedagog i escriptor / Writer and professor', code: 'AC047', colourName: 'Deep green', aka: ['Cesar Bona'] },
  { name: 'Kristine McDivitt Tompkins', role: 'Environmental conservationist and activist', code: 'AC089', colourName: 'Sand colour', aka: ['Kristine Mcdivitt Tompkins'] },
  { name: 'Francesco Tonucci', role: 'Educator and cartoonist', code: 'AC040' },
];

/*
 * March 2024, Llibreria Terranova, Barcelona. Twenty-five guests, seventeen of
 * whom answered. The site holds only those seventeen; the eight without an
 * answer are here for the first time.
 *
 * Albert Riera Galcerán's reference is written AC16 and María Medem's AC016,
 * and they are not the same colour — rosa intens against lila magenta. Written
 * as the document writes them.
 */
export const EDITION_III: readonly DocumentEntry[] = [
  { name: 'Álvaro Galmés', role: 'Arquitecto, escritor y artista plástico', code: 'AC065', colourName: 'Ocre amarillo' },
  { name: 'Marta D. Riezu', role: 'Escritora', code: 'AC263', colourName: 'Verde', aka: ['Marta D.Riezu'] },
  { name: 'María Prats', role: 'Artista', code: 'AC142', colourName: 'Negre' },
  { name: 'Carlota Guerrero', role: 'Fotógrafa y artista', code: 'AC001', colourName: 'Vainilla' },
  { name: 'Lucia Boned', role: 'Librera', code: 'AC033', colourName: 'Azul celeste oscuro' },
  { name: 'Albert Riera Galcerán', role: 'Artista', code: 'AC16', colourName: 'Rosa intens' },
  { name: 'Guillermo Santomà', role: 'Arquitecto y artista', code: 'AC034', colourName: 'Azul' },
  { name: 'Cristina Stolhe', role: 'Fotógrafa', code: 'AC39', colourName: 'Verde oscuro casi negro' },
  { name: 'José Quintanar', role: 'Artista y editor', code: 'AC267', colourName: 'Amarillo' },
  { name: 'Luís Cerveró', role: 'Realizador y librero', code: 'AC250', colourName: 'Azul profundo' },
  { name: 'Irene Royo', role: 'Fotógrafa y pintora', code: 'AC23', colourName: 'Rosa salmón' },
  { name: 'Adrià Cañameras', role: 'Fotógrafo', code: 'AC233', colourName: 'Azul' },
  { name: 'Isabel Martinez', alias: 'isabelitavirtual', role: 'Directora creativa', code: 'AC193', colourName: 'Fresa' },
  { name: 'Salva López', role: 'Fotógrafo', code: 'AC258', colourName: 'Terracota' },
  { name: 'Berta Blanca Ivanow', role: 'Realitzadora audiovisual i escultora', code: 'AC223' },
  { name: 'Marc Gómez del Moral', role: 'Director de fotografía', code: 'AC320', colourName: 'Arena' },
  { name: 'Jose Javier Serrano', alias: 'Yosigo', role: 'Fotógrafo', code: 'AC259', colourName: 'Azul piscina' },
  { name: 'Raquel Quevedo', role: 'Diseñadora y artista', code: 'AC299', colourName: 'Gris perla' },
  { name: 'Xavi Mañosa', role: 'Ceramista', code: 'AC125', colourName: 'Gris pols' },
  { name: 'Arnau Blanch', role: 'Fotógrafo', code: 'AC037', colourName: 'Azul plomo' },
  { name: 'María Medem', role: 'Ilustradora y dibujante de cómic', code: 'AC016', colourName: 'Lila magenta', aka: ['Maria Medem'] },
  { name: 'Ana Cuba', role: 'Fotógrafa', code: 'AC80', colourName: 'Mandarina' },
  { name: 'Belén Gayán', role: 'Productora ejecutiva', code: 'AC049', colourName: 'Blau casi verd', aka: ['Belen Gayán'] },
  { name: 'Juan Diego Valera', role: 'Fotógrafo', code: 'AC096', colourName: 'Verde gris' },
  { name: 'Julia Ruiz Cabello', role: 'Arquitecta', code: 'AC075', colourName: 'Ocre rojizo' },
];
