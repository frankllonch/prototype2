/**
 * What each exhibition's detail says at its head, from the designer's sheets,
 * and the wall texts for the shows that had none.
 */
export interface ShowSheet {
  readonly title?: string;
  readonly lines?: readonly string[];
  readonly when?: string;
  readonly lead?: number;
  readonly artists?: string;
  readonly text?: string;
  readonly note?: string;
  /** Exact replacements in the source's text, where the sheet sets it otherwise. */
  readonly edits?: readonly (readonly [string, string])[];
}

const p = (...paragraphs: string[]): string => paragraphs.map((t) => `<p>${t}</p>`).join('');

export const SHOW_SHEETS: Readonly<Record<string, ShowSheet>> = {
  // ------------------------------------------------------------- solo shows
  'moll-de-l-os': {
    lines: ['8 rue des Beaux-Arts, Paris'],
    when: 'From May 27 to June 26 2026',
  },
  'mira-m-no-deixis-de-mirar-me': {
    title: '‘Míra’m no deixis de mirar-me’',
    lines: ['Solo show at Alzueta Gallery,', 'Palau de Casavells'],
    when: 'From April to June 2025',
    // The sheet sets the English gloss on lines of its own, in italic.
    edits: [['“Look at Me, Don’t Stop Looking at Me”', '<br /><em class="lede-gloss">“Look at me, don’t stop looking at me”</em>']],
  },
  'painting-as-a-gift-of-color': {
    title: 'Painting as a gift from color',
    lines: ['Solo exhibition', 'at Gallery_BR', 'Tetbury, UK'],
    when: 'May 2024',
  },
  // The designer's sheet, text and all: the source has no page for this edition as a show.
  'whats-color-iii': {
    title: 'What’s Color III',
    lines: ['Terranova Bookstore'],
    when: 'April 2024',
    text: p(
      '<strong>"What’s Color?"</strong> is a personal project I started in 2020 where I assign a color to people who ' +
        'inspire and admire me and whom I ask about their personal relationship with color.<br />' +
        'I presented this third edition at Llibreria Terranova in Barcelona during April 2024.',
      'During the past months I have invited them to consider and answer the question: "What does color mean to you?"',
      'First of all, to open up a dialogue, to grasp new ways of seeing colors, other perspectives, but also to better ' +
        'understand the world. I wanted to think of color in a broader context, outside of the artistic view, and to ' +
        'discover the notion of color as it is thought of by others.',
      'Now, this whole journey has become a process of identifying and synthesizing knowledge, when possible, into ' +
        'color, with the wish to create and share a "Color Glossary" where color meets perception. For what purpose?',
      'Because to me, COLOR is a universal visual emotion, capable of reaching and inspiring every human being.',
    ),
  },
  transitions: {
    lines: ['Solo show at Alzueta Gallery,', 'Barcelona'],
    when: 'September 2023',
    // The sheet does not set the name apart in the lede.
    // The closing poem runs on as one paragraph inside single quotes.
    edits: [
      ['<strong>Transitions</strong>', 'Transitions'],
      ['<p><i>To rethinking,', '<p><i>‘To rethinking,'],
      ['is ENERGY.</i></p>', 'is ENERGY.’</i></p>'],
      ['<br> ', ' '],
    ],
  },
  // What's Color I and II: the text as the designer's sheets set it, in place of the source
  // page's, which ran on into the glossary and the participants (I) and the curators, the Download
  // PDF link and the edition note (II).
  'what-s-color-i': {
    text: p(
      '<span class="lede-open">Throughout the lockdown I was away from my studio and my art form – painting.</span>' +
        'I found great comfort reading pieces by philosophers, historians, thinkers, writers, and other artists. ' +
        'They helped me better understand humanity and its role in this globalized world.',
      'During the past months I have invited them to consider and answer the question: ‘What does color mean to you?’',
      'First of all, to open up a dialogue, to grasp new ways of seeing colors, other perspectives, but also to better ' +
        'understand the world.<br />I wanted to think of color in a broader context, outside of the artistic view, and ' +
        'to discover the notion of color as it is thought of by others.',
      '<span class="text-sign">Claudia Valsells</span>',
    ),
  },
  'what-s-color-ii-for-architects-and-designers': {
    title: 'What’s Color II',
    lines: ['Espacio Pavilon', 'Madrid'],
    text:
      p(
        '<span class="lede-open">‘The memory of one of my architecture teachers taking off one of his reddish-brown English shoes, rolling up ' +
          'the tour of his pants to show the navy blue color of his socks, and cutting out a piece of clothing from the ' +
          'striped Oxford shirt.</span>All this spectacle in the middle of a construction ' +
          'site to show respectively the color of the wood, the color of the carpet and the different shades of the ' +
          'walls, is an image that I remember with some nostalgia, but that cannot be repeated today.’',
        '<span class="lede-credit">Text commissioned by the architect Cristian Cirici on the occasion of my first ' +
          'color chart self edited in 2000.</span>',
        'From the scientific experiment to the artistic concern, from Munsell’s diagrams and Goethe’s studies to Le ' +
          'Corbusier’s Salubra and the almost infinite possible combinations of electronics, the color chart has always ' +
          'existed to facilitate the communication of color.<br />A mere organic, hierarchical and chromatic division in its origin, a method of plastic expression and ' +
          'aesthetic positioning in its development, this instrument, which came to democratize design and encourage ' +
          'the creative impulse, has seen in its years of life how the use of color by the architectural sector has ' +
          'been diminishing, limited perhaps because of certain social prejudices and canons encouraged by advertising ' +
          'and the market. The pristine white, the sad black, the nondescript gray, the garish red.',
        'Monopolized the business of colors available by the painting companies, relegated the work of the colorist ' +
          'to the background due to ignorance or fear of architects and clients to make a mistake or be branded as ' +
          'eccentric; it is in this context that the artist Claudia Valsells had an idea: to create a specific ' +
          'chromatic selection for this sector.',
        'In this exhibition we wanted to highlight the work of the colorist, the process of selecting and prescribing ' +
          'colors for a project and the color chart as a tool that facilitates and enables communication between ' +
          'architects and designers.<br />For this reason we have compiled in the exhibition a series of work tools that Claudia, an artist linked to ' +
          'color since her beginnings as a mural painter, used for the elaboration of her own chart: notebooks, mixers, ' +
          'spatulas, annotations, paint covers. It is therefore a retrospective, documentary and personal exhibition, ' +
          'where experiences, stories and testimonies are mixed.',
        'The result of more than twenty years of work by ' +
          'the artist, collaborating with architects and designers in the definition of colors, this color chart is ' +
          'composed of 142 colors applied with real paint, which allows to see the exact reproduction of the color as ' +
          'it will look once applied on the surface. This range of colors, developed for use in architecture, both exterior and interior, allows the colorist to ' +
          'demonstrate Valsells’ natural ability and chromatic instinct, the knowledge of the language that color ' +
          'implies.',
        'This color chart, and the work of its author, Claudia Valsells, is an invitation to explore, ' +
          'to play, and to dare to prescribe colors. Any color from this palette can be achieved, and it is worth the ' +
          'effort to see exactly what one is looking for. We want to reopen the dialogue on the use of color in architecture, to offer one more tool, among many ' +
          'others, that encourages that return to color, with knowledge, dialogue and vision.',
      ) +
      '<div class="is-style-thanks"><p>Photos © Julia Ruiz-Cabello and Gonzalo de Benito</p><p>THANKS TO:<br />' +
      'Plantea Estudi, Kal-a, Elii, HANGHAR, Nomos arquitectos, Montse Vicens (Int-sight), Isabel Francoy, ' +
      'Tomás López Design, Stefano Colli, Conti.Cert, Un parell d’arquitectes, Naso ++, Isla, Auxi Gálvez (PSAAP), ' +
      'Escobedo Soliz, Antoni Arola, Barbara Aurell, Laura Castanya, Andrea Batlló y Adrià Escolano, Marc Morro, ' +
      'Anna Vidal (Vis arquitectes), Gema Sach, Oscar Tusquets, Mariona Espinet, Isabel Sendra, AMOO, Loca Studio, ' +
      'Paula Arroyo, Cierto Estudio.</p></div>',
  },
  'color-dialogues': {
    lines: ['Solo show at Alzueta Gallery,', 'Madrid'],
    when: 'December 2021 to January 2022',
    edits: [['<span>© Flavia Company </span>', '<span class="quote-credit">© Flavia Company</span>']],
  },
  t10: {
    lines: ['Solo exhibition', 'at Alzueta Gallery', 'Barcelona'],
    when: 'November 2020',
  },
  'color-y-forma': {
    lines: ['Solo exhibition', 'at Alzueta Gallery,', 'Barcelona'],
    when: 'February 2017',
  },
  'el-color-no-existe': {
    title: 'El color no existe,\nexiste la luz',
    lines: ['Solo exhibition,', 'Sala Vinçon,', 'Barcelona'],
    when: 'April 2000',
    note: 'Individual exhibition where the interaction of the public with the installation was essential.',
  },

  // ------------------------------------------------------------ group shows
  'notas-al-pie': {
    lines: ['Group exhibition', 'at Barcelona'],
    when: 'December 2026',
  },
  'shift-towards-coincidence': {
    title: 'Shift towards coincidence',
    lines: ['Group exhibition at Alzueta Gallery,', 'Palau de Casavells'],
    when: 'June to July 2026',
    artists:
      'Aythamy Armas, Manolo Ballesteros, Berni Puig, Enrich.R, Claudia Valsells, Alexander Wertheim, Maria Yelletisch.',
    text: p(
      'Pictorial abstraction has shifted over time within the history of art, moving from the avant-gardes of the ' +
        '20th century to a broad and heterogeneous contemporary territory. More than a style, it has become a way of ' +
        'thinking painting: a field where the image is no longer dependent on representation but is activated through ' +
        'gesture, color, matter, and rhythm.',
      'In this shift, painting has steadily affirmed its autonomy. From early breaks with figuration to contemporary ' +
        'practices, abstraction has opened a field in which the pictorial surface becomes a site of experience, rather ' +
        'than a window onto an external world. In this sense, when Piet Mondrian stated that “abstract art is not the ' +
        'creation of another reality but the true version of reality,” he was not introducing an opposition between ' +
        'worlds, but rather a way of situating painting within a more essential experience, freed from the need to ' +
        'describe the visible.',
      'The works brought together in this exhibition participate in this expanded field. In them, painting is not ' +
        'fixed as a final image but unfolds as process, accumulation, or tension. Color acts as force, gesture as ' +
        'impulse, repetition as latent structure. Each artist articulates a different way of inhabiting this condition: ' +
        'from chromatic vibration, systemic construction, accumulated matter, or intuitive order.',
      'For Claudia Valsells (Barcelona, Spain, 1969), color is the core of her practice, understood as both structural ' +
        'and sensorial force. Her works arise from chromatic relationships in which intuition, action, and technical ' +
        'knowledge converge. In these subtle modulations, color becomes a presence that alters and guides perception.',
    ),
  },
  'abstract-paintings': {
    title: 'Abstract paintings',
    lines: ['Group exhibition', 'at New York'],
    when: 'June 2026',
  },
  'marco-limite-y-lugar': {
    lines: ['Group exhibition', 'Alzueta Gallery, Madrid'],
    when: 'March 2026',
    artists:
      'Jordi Alcaraz, Aythamy Armas, Max Cobalto, Enrich R, Iván Franco, Nuria Maria, Bruno Ollé, Maru Quiñonero, ' +
      'Guim Tió, Claudia Valsells, Maria Yelletisch',
    text: p(
      'For this exhibition, Miquel Alzueta, founder of the gallery, has selected and loaned eleven 16th- and ' +
        '17th-century Italian frames from his private collection, inviting each artist to illuminate one of these ' +
        'frames with their work. This process subverts the usual approach, where a frame is chosen to fit a piece; ' +
        'here, the artwork is instead created to adapt to the frame’s dimensions.',
      'Beyond being mere ornamentation, the frame defines the boundary and space of the artwork, becoming a place ' +
        'that not only encloses but actively participates in the composition. The exhibition presents the works ' +
        'separate from their traditional frames, prompting viewers to reconsider the frame as an independent ' +
        'entity—one as significant as the painting itself in shaping the interpretation of the work within the ' +
        'exhibition space.',
      'Between the almost four centuries that separate the oldest frame from the most recent painting, that both ' +
        'coexist and bring together ice and fire, not as opposing elements but as complementary ones: both necessary, ' +
        'both desirous of each other, coinciding for a time in a shared reality. Like love and desire.',
      'Here, paintings and frames nourish the mysterious path of something as complex, difficult, and almost ' +
        'impossible as capturing beauty in a moment, suspending it in time, and framing it for eternity”.<br />' +
        'Miquel Alzueta',
    ),
  },
  'what-abstract-art-means-to-me': {
    title: 'What abstract art means to me',
    lines: ['Group exhibition Alzueta Gallery', 'Séneca'],
    when: 'January 2024',
    artists:
      'Jin Angdoo, Aythamy Armas, Manolo Ballesteros, Lawrence Calver, Enrich. R, Daniel Jensen, Scott Licznerski, ' +
      'Guillermo Pfaff, Kes Richardson, Stan Van Steendam, Claudia Valsells',
    text: p(
      'The exhibition delves into the formal strategies of the participating artists, combining a variety of ' +
        'approaches to abstraction.',
      'Although in the early years of the twentieth century, pictorial abstraction was inevitably linked to a ' +
        'spiritual sense of searching for the invisible and the essence of nature that escapes the formal, today, ' +
        'beyond the dematerialization of the artistic object, abstraction is an exercise of perception that generates ' +
        'constant formal challenges. The search for the perfect plastic gesture, the connection with the world of the ' +
        'formal through the material, or the conscious manipulation of pictorial matter. In the center of all of this: ' +
        'Doubt. Doubt as a fundamental part of the process, as a starting point of any creative exercise. The doubt ' +
        'that falls on the formal strategies, the techniques, the discourses. Abstract painting is at the same time a ' +
        'finished work and an open reflection; there is no abstraction without understanding the experience of the ' +
        'artist who seeks to expand the field of visual perception. What to paint gives way to how to paint, and so ' +
        'often is in this pictorial process where artists find the starting point and the end of the road.',
      'Perhaps that is why abstract painting has been described as painting for painters. A form of expression that ' +
        'is not easy to access due to its component of artistic research that starts from reflection and knowledge of ' +
        'one’s own practice. Starting from nothing and beginning to build the painting. But just as abstract painting ' +
        'is created in an active way, this is how it should be observed. To abstract oneself is to move away from the ' +
        'reality of the body, let be carried away by the gaze, create rhythms between the figures, connect the ' +
        'different parts, accept the formal ambiguity and the chromatism as an articulating component, and understand ' +
        'that the material contains its own language.<br />Text by Carolina-Laia Puigdevall',
    ),
  },
  'la-terre-est-bleu': {
    title: 'La Terre est bleu comme un orange',
    lines: ['Group exhibition Alzueta Gallery,', 'Madrid'],
    when: 'November 2023',
    artists:
      'Cesc Abad, Hugo Alonso, Manolo Ballesteros, Sune Christiansen, Enrich R., Nacho Eterno, Sabine Finkenauer, ' +
      'Jon Koko, David Macho, Jan Monclús, Guillem Nadal, Juan Narowé, Maru Quiñonero, Kes Richardson, James Rielly, ' +
      'Xevi Solà, Mike Swaney, Guim Tió, Claudia Valsells, Maria Yelletisch',
    text: p(
      'In this exhibition we would like to look at works on paper from that perspective: as a blank surface with ' +
        'apparently no laws, which lead us to the title of this exhibition: “La Terre est bleue comme une orange”, in ' +
        'english “the earth is blue like an orange”.',
      'Paul Éluard, plays with words in a surrealistic exercise of conveying the absurd, writing illogical phrases in ' +
        'a game of fluent ideas without any apparent logic. Under the surrealist poetry all is possible and everything ' +
        'is admissible.',
      'We have invited a group of artists to immerse themselves in this same task, of creating an artwork as if they ' +
        'were playing, to create what doesn’t look for logic or reason, and that, without any pretension, shows itself ' +
        'for what it is: a preliminary idea, a masterpiece, a provocation. Whatever that artist feels this work should ' +
        'be at this moment in time.',
      'Paper is not only what you think it is, it is not just a surface, paper is the work itself, paper is that ' +
        'preliminary moment that holds all possibilities. As abstract as it might be, paper holds the idea of the earth ' +
        'being blue as an orange. Paper holds the most honest and playful topics without questioning their ' +
        'rationality, without putting yet to test the possibilities of an Idea, paper is, over all, a safe space for ' +
        'playing and finding a discourse.',
    ),
  },
  'galeria-axel-pairon': {
    lines: ['Group exhibition'],
    when: 'December 2016',
  },
};

/** The show's photographs with the one its sheet opens on brought to the front. */
export function leadWith<T>(images: readonly T[], lead: number | undefined): readonly T[] {
  if (!lead || lead < 0 || lead >= images.length) return images;
  return [images[lead]!, ...images.slice(0, lead), ...images.slice(lead + 1)];
}

/** The source's text with the sheet's corrections made, each only where it is found. */
export function applyEdits(html: string, sheet: ShowSheet | undefined): string {
  return (sheet?.edits ?? []).reduce((out, [from, to]) => out.split(from).join(to), html);
}

/**
 * The photograph each commissioned project's sheet opens on, as its index in the
 * project's own set.
 */
export const COMMISSION_LEADS: Readonly<Record<string, number>> = {
  'dada-workshops-2017-2': 4,       // Color Atlas: the red façade (Variant5)
  'dada-workshops-2018': 7,         // the chair with the zigzag back (Variant10)
};
