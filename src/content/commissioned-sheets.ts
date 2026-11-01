/**
 * The commissioned details as the designer set them.
 *
 * The source pages carry the same words, but not in this order and not in this
 * shape: a heading typed into the first paragraph, credits in the middle, a run
 * of hashtags at the end. The designer read each one and set a masthead — the
 * name of the thing, who it was for, when — and then the text, opening on a
 * statement in capitals and closing on its credits in a smaller hand. That
 * editing is the design, so it is written down here rather than inferred.
 *
 * Where the sheets show only the first screen, the rest of the text is the
 * source's, carried on in the same manner.
 *
 * Classes in the bodies are the paragraph styles the WordPress editor offers
 * (the content plugin registers them), so a paragraph Claudia styles there and
 * one written here come out the same:
 *   `is-style-lead` — the statement, set in capitals.
 *   `is-style-note` — credits and links, smaller, set apart from the text above.
 *   `is-style-cta`  — a call to act, as large as the text and leaning.
 *   `apart`         — a second empty line before it; an extra class, not a style.
 *
 * Dates follow the index where a sheet disagrees with it. Four did (Siete Sillas
 * 2022, Edges "2023 – on going", Silences 2017, Kamanar 2017) and the index is
 * the one that agrees with the source; a reader who clicks "2020" should not
 * land on "2022".
 */
export interface Sheet {
  readonly title: string;
  /** Who it was for or with — one entry per line, cased as the sheet sets it. */
  readonly lines: readonly string[];
  readonly when: string;
  /** Trusted markup, authored here. */
  readonly body: string;
}

export const SHEETS: Readonly<Record<string, Sheet>> = {
  'terra-rossa-milan-design-week-2024': {
    title: 'Terra Rossa',
    lines: ['CURATED BY JÚLIA ESQUÉ WITH A', 'CONCEPT BY APARTAMENTO STUDIOS'],
    when: '2024',
    body: `
      <p class="is-style-lead">“Terra Rossa” is a group exhibition inspired by the use of clay as a primordial and universal element for the creation of the first design artefacts, especially common in the Mediterranean region. Curated by <em>Júlia Esqué</em> with a concept by Apartamento Studios, the centrepiece of the installation is a monumental pyramid with 80 jugs made by 16 creatives.</p>
      <p>In the words of the curator Júlia Esqué “Exploring the symbiotic relationship between earth and clay in relation to food we uncover a profound narrative of sustenance and nourishment. Earth provides raw ingredients and clay transforms them into vessels that elevate the experience. These objects become conduits that bridge our connection to the land and the artisans. They become vessels for cultural and artistic significance, reflecting the creativity and craftsmanship of societies throughout history.”</p>
      <p>My intervention examined the meaning related to the ‘readymade’ color: the color purchased in the store instead of hand-mixed.<br>‘’Color of red clay, rich with red iron oxides. Clay is a Mediterranean element, very characteristic…»<br>Words that describe the color ‘brown earth’ and invite you to touche it. Descriptions that help us to perceive and understand color, to feel it. Words that are also the name of the color itself.<br>So what happens when colors are described by codes, numbers?<br>Is the emotional part of the color lost?<br>Does the perception we have of that color change?</p>
      <p>I had chosen 5 colors with a reference to explore the impact of mass-produced color on contemporary art. References that openly testify to the status of painting as a product manufactured in series and standardized.</p>
      <p>The dialogue is precisely between the natural clay color base with the almost provocative color sample and its reference.</p>
      <p class="is-style-note">Photos by <b>FRANCESCO STELITANO</b><br>Concept by <b>APARTAMENTO STUDIOS</b><br>Curated by <a href="https://www.juliaesque.com"><b>JÚLIA ESQUÉ</b></a><br>Creative partners <b>ELOI BONADONA, CARLES LLARCH AND MAX MILÀ</b></p>`,
  },

  'color-chart-el-taller-de-arquitectura-rbta': {
    title: 'Color Chart',
    lines: ['BOFILL TALLER D’ARQUITECTURA'],
    when: '2024',
    body: `
      <p class="is-style-lead">The use of colors in RBTA’s projects is never an anecdote and there are no arbitrary nuances. All colors are the result of an artistically and urbanistically conceived design.</p>
      <p>It is specifically in this chromatic context that I was asked to make a colour chart based on the use of colour by RBTA throughout its history.</p>
      <p>For the last two years I have been observing, gathering and creating a colour guide that aims to be a chromatic tool for the studio’s projects.</p>
      <p>The Color Chart, composed of 100 colors and is divided into 21 color families, is an effort of chromatic synthesis to delimit and guide the colour prescriptions of the studio and has been developed as a framework of action for the color prescriptions of the materials involved in a project.</p>
      <p class="is-style-note">Interview at <a href="https://www.bofill.com/journal/to-work-with-certainty/"><em>bofill.com</em></a></p>`,
  },

  'santa-cole-color-palette-2023': {
    title: 'Color Palette',
    lines: ['FOR SANTA & COLE'],
    when: '2023 - ON GOING',
    body: `
      <p class="is-style-lead"><a href="https://www.santacole.com/es/m64/"><strong><em>Santa &amp; Cole</em></strong></a> is a Spanish global editor of design products whose quality is recognizable at the touch of a hand, and that enriches people’s lives.</p>
      <p>A while ago I started a collaboration with Santa&amp;cole, a love color story!</p>
      <p class="is-style-lead apart">In their own words the project consisted in:</p>
      <p>Santa &amp; Cole has presented eight new colours for the M64 lamp, result of the chromatic study developed by colourist Claudia Valsells</p>
      <p>Claudia Valsells defines a chromatic universe that will give a new vision to the timelessness of Santa &amp; Cole’s catalogue. A new visual and emotional perception of the M64</p>
      <p>The collaboration between Santa &amp; Cole and Claudia Valsells presents a careful selection of eight new colours that reveal a new visual and emotional perception of the M64 lamp, designed in 1964 by maestro Miguel Milá. Maintaining the formal timelessness characteristic of this design icon, the new palette is born from Valsells’ intuition and her profound understanding on how colours interact.</p>
      <p class="is-style-lead">The interplay of colour:</p>
      <p>As a colourist, I approached my chromatic studies through a constant juxtaposition of colours. The key lies in placing one colour next to another, so as to influence their perception and achieve the desired visual experience. Rather than simply an individual selection of colours, the new palette represents a careful study of their combination. Demonstrating the close relationship between light and colour, the inside of the screens is covered in white, a detail that softens the light reflection.</p>
      <p>This collaboration seeks to add another layer of meaning to an existing product by emphasising the light interaction between the colours of the screens and how they engage with the space they are placed in.</p>
      <p>During the colour study, I developed the interaction of the selected colours to present the collection as chromatic harmonies. From this exercise, six new Neoseries, the art editions of Santa &amp; Cole were born.</p>
      <p class="is-style-note">More info at <a href="https://www.santacole.com/es/neoseries/colour-scheme-i-n-00240/"><em>Claudia Valsells ‘Color Schemes’</em></a><br>Campaign images © <b>JARA VARELA</b><br>Studio images © <b>ENRIC BADRINAS</b></p>`,
  },

  'artist-residence-2022': {
    title: 'Artist Residency',
    lines: ['BRAVA ARTS WITH ALZUETA GALLERY'],
    when: '2022',
    body: `
      <p>At @brava_arts<br>With @alzuetagallery</p>
      <p>BRAVA! is where @alzueta_gallery has its creation center where develops its artistic residency program to support the creativity and work of contemporary artist of our time. I was so glad to be there, 500m industrial building to work in the heart of Costa Brava.</p>
      <p class="is-style-note">Photography by <a href="https://www.juditbou.com"><b>JUDIT BOU</b></a></p>`,
  },

  'tones-collection-2022': {
    title: 'Tones Collection',
    lines: ['FOR NANI MARQUINA'],
    when: '2022',
    body: `
      <p class="is-style-lead">Tones collection for Nani Marquina consists of four carpet models with color as a central tool.</p>
      <p>The Tones rugs arise from the exploration and subsequent reinterpretation of the traditional way of constructing a rug, where an outer frame with a series of central elements has always predominated. With the Pieces model, the exercise is the opposite, in it I distribute the remnants in the center, I compose it in a melodic way showing my creative process.</p>
      <p>The collection boasts an infinite richness of tonalities, highlighting the chromatic harmony that in a certain way refers to musical notes.</p>
      <p>The colors of the Tones collection are born from the instruments of an orchestra, the tan colors of the stringed instruments, the colors of the wind instruments, the grays and blues, the ochers of the percussion, etc. From this chromatic universe the forms appeared and then I only had to play to compose them in a way that was reproducible in different scales and harmonies.</p>
      <p>Going from my usual medium, painting, to the nuances and textures provided by fibers and wool has been a very interesting challenge.</p>
      <p class="is-style-note">To discover the collection link <a href="https://nanimarquina.com/es/"><em>Nani Marquina</em></a></p>`,
  },

  'dada-workshops-2017-2': {
    title: 'Colour Atlas',
    lines: ['FOR LA MURALLA ROJA'],
    when: '2016 - 2020',
    body: `
      <p>Architect <b>RICARDO BOFILL</b><br>Year <b>1973</b><br>Location <b>CALPE, ALICANTE, SPAIN</b></p>
      <p class="is-style-lead apart">Research and realization of the restored color scheme from Ricardo Bofill’s building, ‘La Muralla Roja’.</p>
      <p class="apart">Within the context of La Manzanera, La Muralla Roja (The Red Wall) asks to be considered as a case apart. It embodies a clear reference to the popular architecture of the Arab Mediterranean, in particular to the adobe towers of North Africa. The Red Wall is like a fortress which marks a vertical silhouette following the contour lines of the rocky cliff.</p>
      <p>With this building, RBTA wanted to break the post-Renaissance division between public and private spaces reinterpreting the Mediterranean tradition of the Kasbah. The labyrinth of this recreated Kasbah corresponds to a precise geometric plan based on the typology of…</p>
      <p class="is-style-note"><a href="https://ricardobofill.com/projects/la-muralla-roja/"><em>Read the full article</em></a><br>Photos by <b>@GREGORICIVERA</b> and <b>@GARATEHAUSMANN</b></p>`,
  },

  'silla-8-aoo-2019-2020': {
    title: 'Siete Sillas 8',
    lines: ['an AOO EXERCISE IN “COLORING”', 'WITH CLAUDIA VALSELLS'],
    when: '2020',
    body: `
      <p class="is-style-lead">A project with AOO where I created and designed the different colour combinations for ‘8 Chair’.</p>
      <p>The 8 Chair is the result of an AOO exercise where flat sheets of plywood are bent, under pressure and in a simple way, using different structures as support, achieving instantaneously and without moulds to generate what ends up being seats and backs. The resulting piece is formed by two frames joined together and stripped of any decorative element that, together with the backrest and seat, generate a comfortable, lightweight and plastically unique chair.</p>
      <p>To enhance its visual uniqueness, the artist Claudia Valsells has developed a series of colour combinations that denote her exploration of beauty. The chair transmits us the tactility of the work through the palette; because what can be touched is tangible and brings us closer to its reality. Each chair is painted in more than one color to emphasize the meaning of each one when it enters in contrast with the others.</p>
      <p>This proposal is the result of a collaboration that normally does not occur in the world of art and design, is a dialogue between disciplines that converge in a common and unlikely end point for each of the participants and also an excuse between two professionals that ends with a good friendship.</p>
      <p>If we had to design a chair we would talk about the conceptual and formal process of an object. If we had to talk about colour we would talk about texture and paint, about tones and shades. And here we talk about adding two languages and a single idea: a series of chairs shaped in a plastic exercise and the chromatic development that enhances, perhaps, their uniqueness. The object is raised piece by piece and is given a different value: the sense is decontextualized and a new proposal grows.</p>
      <p class="is-style-note">Material <b>STRUCTURE IN SOLID POPLAR, SEAT AND BACK IN POPLAR PLYWOOD</b><br>Finish <b>PIGMENT APPLIED BY BRUSH, SEMI-MATT WATER-BASED VARNISH</b><br>Images © <a href="http://www.yosigo.es"><em>yosigoyosigo</em></a><br><a href="http://aoobarcelona.com"><em>aoobarcelona.com</em></a></p>`,
  },

  'edges-collection-for-within-reach': {
    title: 'Edges Collection',
    lines: ['FOR NANI MARQUINA'],
    when: '2019',
    body: `
      <p class="is-style-lead">An exclusive collection I designed for Design Within Reach, edited by Nani Marquina<br>«The abstract forms of this piece ‘Edges’ have significant value, a dichotomy between structure and form, a singular balance.» Claudia Valsells</p>
      <p class="is-style-note">To discover the collection link <a href="https://nanimarquina.com/es/"><em>Nani Marquina</em></a></p>`,
  },

  'uterque-art-essays': {
    title: 'Uterqüe Art Essays',
    lines: ['AW2017'],
    when: '2017',
    body: `
      <p class="is-style-lead">“Creativity, Art and Fashion. Synonyms of a search for beauty, the effort to tell a unique and personal story. Disciplines that have joined in history, that have mixed and created together; they can’t be understood separately. Style is architecture. Creativity is a second skin. And fashion is, always, art.”</p>
      <p>Uterqüe Art Essays was a project I carried out in 2017 for Inditex company during the autumn and winter collection.<br>Two big artworks sized 250x200m each in acrylic on canvas reproducing color harmonies. This two big artworks were used as background for the photo shoot and at the same time as a color palette for the collection.</p>
      <p>Creative direction and design by Play&amp;Type Studio. Edited by Uterqüe.</p>
      <p>All the artworks are made by Claudia Valsells</p>
      <p class="is-style-note">Images © <b>CESC NOGUERES</b></p>`,
  },

  'trainings_silences': {
    title: 'Silences Trainings',
    lines: ['AT DADA BARCELONA PROJECT AT MAMT'],
    when: '2021',
    body: `
      <p class="is-style-lead">Workshops for adults structured along these four axis.<br>Movement / Sonority / Presence<br>Otherness</p>
      <p>We believe that establishing links between different disciplines and enjoying the silence in each of them brings clarity, calm and well-being. With this project we would like to shed some light, to feel that there is another possibility, to offer a new horizon: we want to teach everyone to stop! To find alternative paths in the noise and speed – of society – that avoids reflection in favour of constant evasion.</p>
      <p>We also want to leave a useful mark: to read the silence of others or of spaces and to be able to interpret them, to communicate without the need for speech or to create silence through presence.</p>
      <p>And finally, to set ourselves a challenge: to learn to take the time to do things, to know how to waste time and to find our own silences!</p>
      <p class="is-style-lead">Otherness</p>
      <p>We face silence from our creation and transform it into a dialogue with ourselves. We consider silence as part of the creative processes and we generate a moment of connection with ourselves and with others; we try to generate a new value in our daily life, through our actions, in the little things that form our self.</p>
      <p class="is-style-lead">Podcast 62<br><em>Silence when contemplating</em></p>
      <p>Silence for me… is the space that surrounds us when there is no hurry, no effort, nor expectations: a beginning. Silence would be a beginning. This silence understood as a state of calm – a slow and leisurely state – is not a sign of our time and should be a universal right.</p>
      <p>To my work… When I work in the studio, when I don’t do, I am in silence and this silence gives me a lot of strength.</p>
      <p>An image of silence… would be to contemplate a desert landscape, to contemplate a blank sheet of paper, to contemplate!</p>
      <p class="is-style-note"><a href="http://www.silencis.org"><em>@silencis</em></a>, a <a href="http://www.dadabarcelona.com"><em>dadabarcelona</em></a> project at <a href="https://www.dipta.cat/mamt"><em>MAMT</em></a><br>Photos <b>@HLEB_MASHA</b></p>`,
  },

  'dada-workshops-2018': {
    title: 'Dadà Barcelona',
    lines: ['Art to build', 'Idea & project', 'Esther Rovira Carbonell'],
    when: '2018',
    body: `
      <p class="is-style-lead">To build is to create what we inhabit and what inhabits us.</p>
      <p>We want to be building in new ways without forgetting that we are constantly building ourselves.</p>
      <p>Dada Barcelona summer workshops, always collaborates with a social project that can open children to other realities and help them build a new consciousness of the world that surrounds them.</p>
      <p>This year, Marc Morro, who, through his NGO Foundation, has worked to build furniture for schools in Senegal. My role was to color the pieces that were built. I decide the black and white color palette and let children paint free different shapes with just this two colors. As the pieces were painted separately, once the chairs were assembled got different identities, letting each one a little bit of all.</p>
      <p class="is-style-note">Images © <em>Iris Humm</em></p>`,
  },

  'dada-workshops-2017': {
    title: 'Dadà Barcelona',
    lines: ['Idea & Project', 'Esther Rovira Carbonell'],
    when: '2017',
    body: `
      <p class="is-style-lead">“To look is an act of choice”<br>John Berger</p>
      <p>I had the opportunity to collaborate for two consecutive years at DadàBarcelona workshops, artistic summer projects developed around an important topic and divided into two weeks: one to discover creative languages and the other to produce an artistic project.</p>
      <p>The workshops are triangulated into movement sound and art.</p>
      <p class="is-style-note">Images © <em>Iris Humm</em></p>`,
  },

  'kamanar-10-chairs-10-artists-2022': {
    title: 'Kamanar',
    lines: ['10 ARTISTS, 10 CHAIRS'],
    when: '2024',
    body: `
      <p class="is-style-lead">A collective exhibition, a choral and solidarity action.</p>
      <p>10 chairs intervened by 10 artists. The intervention of each artist is inspired by anecdotes and stories, which help us to explain the pillars of the project, to understand the context of this rural area of Senegal and to know better its people.</p>
      <p><a href="https://foundawtion.org"><em>Foundawtion,</em></a> was born between the architecture studio Dawoffice, in Barcelona, and the Senegalese population of Thionck Essyl. A non-profit organization to carry out projects that meet architectural needs in economically disadvantaged areas.</p>
      <p><em>Chaise S</em> is the chair for the students of the CEM <em>Kamanar School</em>. It is part of a collection of school furniture that has sought the most optimal relationship between efficiency and comfort, prioritizing making things as easy as possible for every step of the process: from design, choice of materials, construction and/or maintenance.</p>
      <p>Designed between Barcelona and Thionck Essyl by <a href="http://marcmorro.com"><em>Marc Morro</em></a> for <em>Foundawtion and CEM Kamanar</em>. And just like the architecture of the school, the production of these pieces has been carried out with local materials and workers.</p>
      <p class="is-style-note">Photos <a href="https://yosigo.es"><em>yosigo</em></a></p>`,
  },

  'solidary-fulard': {
    title: 'Solidary Fulard Design',
    lines: ['for VALL D’HEBRON CAMPUS'],
    when: 'since 2017 to 2026',
    body: `
      <p class="is-style-lead">There have been 7 designs for 9 consecutive years collaborating in the campaign for women’s cancer research.</p>
      <p>I was invited to participate in this project by the Top model and friend Judit Mascó who, together with other personalities, allows the campaign to reach more audiences. Sale and distribution in Natura stores throughout Spain or online at <em>@naturaselection.</em></p>
      <p class="is-style-cta"><a href="https://naturaselection.com/collections/productos-solidarios/products/panuelo-contra-el-cancer">Click here to buy solidary fulard.</a></p>`,
  },
};
