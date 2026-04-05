const WATCHLIST = [
  {
    title: "Black Swan",
    type: "movie",
    vibe: "Dark Feminine / Psychological",
    hint: "ballerina spirals into obsession and identity breakdown; perfection turns violent",
    year: 2010,
    favorite: true,
    poster: ""
  },
  {
    title: "The Handmaiden",
    type: "movie",
    vibe: "Dark Feminine / Psychological",
    hint: "con, romance, and betrayal; layered twists and intense desire",
    year: 2016,
    favorite: true,
    poster: ""
  },
  {
    title: "Portrait of a Lady on Fire",
    type: "movie",
    vibe: "WLW / Queer Romance",
    hint: "artist and subject fall in love; slow-burn, deeply intimate",
    year: 2019,
    favorite: true,
    poster: ""
  },
  {
    title: "Midsommar",
    type: "movie",
    vibe: "Dark Feminine / Psychological",
    hint: "grieving girl joins cult-like festival; daylight horror and emotional manipulation",
    year: 2019,
    favorite: true,
    poster: ""
  },
  {
    title: "Mulholland Drive",
    type: "movie",
    vibe: "Artsy / Weird",
    hint: "Hollywood dream dissolves into identity confusion; surreal mystery",
    year: 2001,
    favorite: true,
    poster: ""
  },
  {
    title: "Gone Girl",
    type: "movie",
    vibe: "Dark Feminine / Psychological",
    hint: "wife disappears, media frenzy erupts; marriage reveals something deeply twisted",
    year: 2014,
    favorite: false,
    poster: ""
  },
  {
    title: "Carol",
    type: "movie",
    vibe: "WLW / Queer Romance",
    hint: "forbidden love in 1950s; quiet longing and emotional restraint",
    year: 2015,
    favorite: false,
    poster: ""
  },
  {
    title: "Bound",
    type: "movie",
    vibe: "WLW / Queer Romance",
    hint: "criminal plot with lovers; tension, betrayal, and power shift",
    year: 1996,
    favorite: false,
    poster: ""
  },
  {
    title: "Donnie Darko",
    type: "movie",
    vibe: "Psychological / Mind-Bending",
    hint: "teen guided by strange visions; time loops and fate questions",
    year: 2001,
    favorite: false,
    poster: ""
  },
  {
    title: "Annihilation",
    type: "movie",
    vibe: "Psychological / Mind-Bending",
    hint: "scientists enter mysterious zone; nature, identity, transformation",
    year: 2018,
    favorite: false,
    poster: ""
  },
  {
    title: "The Witch",
    type: "movie",
    vibe: "Horror",
    hint: "family torn apart by paranoia; slow-burn religious horror",
    year: 2015,
    favorite: false,
    poster: ""
  },
  {
    title: "Talk to Me",
    type: "movie",
    vibe: "Horror",
    hint: "teens contact spirits for thrill; possession escalates quickly",
    year: 2022,
    favorite: false,
    poster: ""
  },
  {
    title: "Lady Bird",
    type: "movie",
    vibe: "Indie Girl / Soft Sad",
    hint: "teen navigates identity and family; messy, real coming-of-age",
    year: 2017,
    favorite: false,
    poster: ""
  },
  {
    title: "Booksmart",
    type: "movie",
    vibe: "Indie Girl / Soft Sad",
    hint: "overachievers party before graduation; chaos and friendship",
    year: 2019,
    favorite: false,
    poster: ""
  },
  {
    title: "Spring Breakers",
    type: "movie",
    vibe: "Fun / Chaotic",
    hint: "girls chase chaos and crime on vacation; neon stupidity and danger",
    year: 2012,
    favorite: false,
    poster: ""
  },
  {
    title: "Good Time",
    type: "movie",
    vibe: "Crime / Gritty",
    hint: "desperate man races through one cursed night; panic, grime, bad choices",
    year: 2017,
    favorite: false,
    poster: ""
  },
  {
    title: "Interstellar",
    type: "movie",
    vibe: "Sci-Fi",
    hint: "space mission to save humanity; grief, time, and cosmic scale",
    year: 2014,
    favorite: false,
    poster: ""
  },
  {
    title: "Everything Everywhere All At Once",
    type: "movie",
    vibe: "A24 Core",
    hint: "multiverse chaos meets family pain; absurd, emotional, explosive",
    year: 2022,
    favorite: false,
    poster: ""
  },
  {
    title: "Severance",
    type: "show",
    vibe: "Mind-Bending",
    hint: "workers split memories between office and real life; eerie corporate nightmare",
    year: 2022,
    favorite: true,
    poster: ""
  },
  {
    title: "Dark",
    type: "show",
    vibe: "Mind-Bending",
    hint: "missing children uncover tangled time loops; dense, bleak, brilliant",
    year: 2017,
    favorite: false,
    poster: ""
  },
  {
    title: "The OA",
    type: "show",
    vibe: "Mind-Bending",
    hint: "missing woman returns changed; mystery, belief, alternate realities",
    year: 2016,
    favorite: false,
    poster: ""
  },
  {
    title: "Mr. Robot",
    type: "show",
    vibe: "Mind-Bending",
    hint: "unstable hacker joins anti-corporate revolution; paranoia, identity, control",
    year: 2015,
    favorite: true,
    poster: ""
  },
  {
    title: "White Lotus",
    type: "show",
    vibe: "Drama / Chaotic People",
    hint: "rich people unravel at luxury resorts; satire, sex, class rot",
    year: 2021,
    favorite: false,
    poster: ""
  },
  {
    title: "Industry",
    type: "show",
    vibe: "Drama / Chaotic People",
    hint: "young finance workers destroy themselves climbing upward; ambition and damage",
    year: 2020,
    favorite: false,
    poster: ""
  },
  {
    title: "The Haunting of Hill House",
    type: "show",
    vibe: "Horror / Dark",
    hint: "family trauma echoes through haunted house; grief and ghosts intertwined",
    year: 2018,
    favorite: false,
    poster: ""
  },
  {
    title: "Silo",
    type: "show",
    vibe: "Sci-Fi Worlds",
    hint: "people live underground under strict rules; mystery builds around the truth outside",
    year: 2023,
    favorite: false,
    poster: ""
  },
  {
    title: "Ergo Proxy",
    type: "anime",
    vibe: "Psychological / Philosophical",
    hint: "post-apocalyptic mystery about identity and consciousness; cold, cerebral, atmospheric",
    year: 2006,
    favorite: true,
    poster: ""
  },
  {
    title: "Tatami Galaxy",
    type: "anime",
    vibe: "Psychological / Philosophical",
    hint: "student relives alternate college lives; rapid-fire, weird, existential",
    year: 2010,
    favorite: false,
    poster: ""
  },
  {
    title: "Parasyte",
    type: "anime",
    vibe: "Psychological / Philosophical",
    hint: "teen merges with alien parasite; body horror and ethics collide",
    year: 2014,
    favorite: false,
    poster: ""
  },
  {
    title: "ID: Invaded",
    type: "anime",
    vibe: "Psychological / Philosophical",
    hint: "detectives dive into killer minds; fractured mystery and identity puzzles",
    year: 2020,
    favorite: false,
    poster: ""
  },
  {
    title: "Hell’s Paradise",
    type: "anime",
    vibe: "Dark / Violent",
    hint: "death row criminals seek immortality on monster island; gore and survival",
    year: 2023,
    favorite: false,
    poster: ""
  },
  {
    title: "Nana",
    type: "anime",
    vibe: "Pretty / Emotional",
    hint: "two women named Nana build messy lives in Tokyo; love, music, heartbreak",
    year: 2006,
    favorite: true,
    poster: ""
  },
  {
    title: "Kaiju No. 8",
    type: "anime",
    vibe: "Hype / Action",
    hint: "man gains monster powers and joins defense force; fun, fast, punchy",
    year: 2024,
    favorite: false,
    poster: ""
  },
  {
    title: "Black Lagoon",
    type: "anime",
    vibe: "Hype / Action",
    hint: "salaryman joins mercenary smugglers; gunfire, crime, and pure attitude",
    year: 2006,
    favorite: false,
    poster: ""
  },
  {
    title: "I’m in Love with the Villainess",
    type: "anime",
    vibe: "WLW / Yuri",
    hint: "girl reincarnates into otome game and pursues the villainess; chaotic and gay",
    year: 2023,
    favorite: false,
    poster: ""
  }
];