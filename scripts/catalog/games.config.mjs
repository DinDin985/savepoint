// Curated seed list for the Savepoint catalog.
//
// Each entry is either a Steam game (`steamAppId`) or a Wikipedia-sourced game
// (`wikipediaTitle`, used for Nintendo first-party and Epic-exclusive titles).
// Live metadata is fetched by build-catalog.mjs; everything below is curated by hand.
//
// Entry fields:
//   title           canonical display title (Steam names are only used to verify the app id)
//   slug            optional explicit slug (default: kebab-case of title)
//   steamAppId      Steam app id                          (source "steam")
//   wikipediaTitle  exact English Wikipedia article title (source "wikipedia")
//   wikidataId      optional Wikidata Q-id override (e.g. when the article covers several releases)
//   epic            true to look the game up on the Epic Games Store
//   tier            "aaa" | "aa" | "indie"
//   platforms       curated platform families
//   genres          1-4 slugs from GENRES
//   artStyles       1-2 slugs from ART_STYLES
//   featured        true for the home page hero rotation (~12 games)
//   aboutFrom       'wikipedia' to use the article lead instead of Steam's (promo-only) about text
//   shortDescription / releaseDate / developers / publishers
//                   optional curated overrides when the source data is wrong or misleading

export const GENRES = [
  'action', 'adventure', 'rpg', 'soulslike', 'roguelike', 'metroidvania', 'platformer',
  'shooter', 'strategy', 'simulation', 'survival', 'horror', 'puzzle', 'open-world',
  'racing', 'fighting', 'sandbox', 'narrative', 'deckbuilder', 'party',
]

export const ART_STYLES = [
  'pixel-art', 'hand-drawn', 'cel-shaded', 'photorealistic', 'stylized-3d',
  'low-poly', 'painterly', 'voxel', 'anime', 'minimalist',
]

export const TIERS = ['aaa', 'aa', 'indie']

export const PLATFORMS = ['pc', 'nintendo', 'playstation', 'xbox']

const ALL = ['pc', 'nintendo', 'playstation', 'xbox']
const PC_PS = ['pc', 'playstation']
const PC_PS_XB = ['pc', 'playstation', 'xbox']
const NINTENDO = ['nintendo']

export const GAMES = [
  // ---------------------------------------------------------------- Steam AAA / AA
  { title: 'Elden Ring', steamAppId: 1245620, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'rpg', 'soulslike', 'open-world'], artStyles: ['photorealistic', 'painterly'], featured: true },
  { title: "Baldur's Gate 3", steamAppId: 1086940, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['rpg', 'strategy', 'narrative', 'adventure'], artStyles: ['photorealistic'], featured: true },
  { title: 'Cyberpunk 2077', steamAppId: 1091500, epic: true, tier: 'aaa', platforms: ALL,
    genres: ['rpg', 'shooter', 'open-world', 'action'], artStyles: ['photorealistic'], featured: true },
  { title: 'Red Dead Redemption 2', steamAppId: 1174180, epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'adventure', 'open-world', 'narrative'], artStyles: ['photorealistic'], featured: true },
  { title: 'The Witcher 3: Wild Hunt', steamAppId: 292030, epic: true, tier: 'aaa', platforms: ALL,
    genres: ['rpg', 'open-world', 'action', 'narrative'], artStyles: ['photorealistic'] },
  { title: 'God of War', steamAppId: 1593500, epic: true, tier: 'aaa', platforms: PC_PS,
    genres: ['action', 'adventure', 'narrative'], artStyles: ['photorealistic'] },
  { title: "Ghost of Tsushima Director's Cut", slug: 'ghost-of-tsushima', steamAppId: 2215430, epic: true, tier: 'aaa', platforms: PC_PS,
    genres: ['action', 'adventure', 'open-world'], artStyles: ['photorealistic', 'painterly'], featured: true },
  { title: "Marvel's Spider-Man Remastered", steamAppId: 1817070, epic: true, tier: 'aaa', platforms: PC_PS,
    genres: ['action', 'adventure', 'open-world'], artStyles: ['photorealistic'] },
  { title: 'Black Myth: Wukong', steamAppId: 2358720, epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'rpg', 'soulslike'], artStyles: ['photorealistic'], featured: true },
  { title: 'Monster Hunter Wilds', steamAppId: 2246340, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'rpg', 'open-world'], artStyles: ['photorealistic'] },
  { title: 'Final Fantasy VII Remake Intergrade', steamAppId: 1462040, epic: true, tier: 'aaa', platforms: ALL,
    genres: ['rpg', 'action', 'narrative'], artStyles: ['stylized-3d', 'anime'] },
  { title: 'Hogwarts Legacy', steamAppId: 990080, epic: true, tier: 'aaa', platforms: ALL,
    genres: ['rpg', 'action', 'open-world', 'adventure'], artStyles: ['photorealistic'] },
  { title: 'Sekiro: Shadows Die Twice', steamAppId: 814380, aboutFrom: 'wikipedia', tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'soulslike', 'adventure'], artStyles: ['photorealistic'] },
  { title: "Death Stranding Director's Cut", steamAppId: 1850570, epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['adventure', 'open-world', 'action', 'narrative'], artStyles: ['photorealistic'] },
  { title: 'Resident Evil 4', slug: 'resident-evil-4-remake', steamAppId: 2050650, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['horror', 'action', 'shooter', 'survival'], artStyles: ['photorealistic'] },
  { title: 'Persona 5 Royal', steamAppId: 1687950, tier: 'aa', platforms: ALL,
    genres: ['rpg', 'narrative', 'simulation'], artStyles: ['anime', 'cel-shaded'] },
  { title: 'Helldivers 2', steamAppId: 553850, tier: 'aa', platforms: PC_PS_XB,
    genres: ['shooter', 'action'], artStyles: ['photorealistic'] },
  // App 730 keeps CS:GO's 2012 store date; CS2 replaced it on 27 Sep 2023.
  { title: 'Counter-Strike 2', steamAppId: 730, releaseDate: '2023-09-27', tier: 'aaa', platforms: ['pc'],
    genres: ['shooter', 'action'], artStyles: ['photorealistic'] },
  { title: 'Dota 2', steamAppId: 570, tier: 'aaa', platforms: ['pc'],
    genres: ['strategy', 'action'], artStyles: ['stylized-3d'] },
  { title: 'Kingdom Come: Deliverance II', steamAppId: 1771300, epic: true, tier: 'aa', platforms: PC_PS_XB,
    genres: ['rpg', 'open-world', 'action', 'narrative'], artStyles: ['photorealistic'], featured: true },
  { title: 'Clair Obscur: Expedition 33', steamAppId: 1903340, epic: true, tier: 'aa', platforms: PC_PS_XB,
    genres: ['rpg', 'narrative', 'adventure'], artStyles: ['photorealistic', 'painterly'], featured: true },
  { title: 'Grand Theft Auto V', slug: 'grand-theft-auto-v', steamAppId: 3240220, epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['action', 'open-world', 'shooter', 'racing'], artStyles: ['photorealistic'] },
  { title: 'Lies of P', steamAppId: 1627720, tier: 'aa', platforms: PC_PS_XB,
    genres: ['action', 'soulslike', 'rpg'], artStyles: ['photorealistic'] },
  { title: 'It Takes Two', steamAppId: 1426210, epic: true, tier: 'aa', platforms: ALL,
    genres: ['adventure', 'platformer', 'puzzle', 'action'], artStyles: ['stylized-3d'] },
  { title: 'Sifu', steamAppId: 2138710, epic: true, tier: 'aa', platforms: ALL,
    genres: ['action', 'fighting', 'roguelike'], artStyles: ['stylized-3d', 'painterly'] },
  { title: 'Hi-Fi Rush', steamAppId: 1817230, tier: 'aa', platforms: PC_PS_XB,
    genres: ['action', 'platformer'], artStyles: ['cel-shaded', 'anime'] },
  { title: 'Okami HD', steamAppId: 587620, tier: 'aa', platforms: ALL,
    genres: ['action', 'adventure'], artStyles: ['painterly', 'cel-shaded'] },
  { title: 'Borderlands 3', steamAppId: 397540, epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['shooter', 'rpg', 'action'], artStyles: ['cel-shaded'] },

  // ---------------------------------------------------------------- Steam indie
  { title: 'Hades', steamAppId: 1145360, epic: true, tier: 'indie', platforms: ALL,
    genres: ['roguelike', 'action'], artStyles: ['hand-drawn', 'painterly'] },
  { title: 'Hades II', steamAppId: 1145350, epic: true, tier: 'indie', platforms: ['pc', 'nintendo'],
    genres: ['roguelike', 'action'], artStyles: ['hand-drawn', 'painterly'], featured: true },
  { title: 'Hollow Knight', steamAppId: 367520, aboutFrom: 'wikipedia', tier: 'indie', platforms: ALL,
    genres: ['metroidvania', 'soulslike', 'platformer', 'action'], artStyles: ['hand-drawn'] },
  { title: 'Hollow Knight: Silksong', steamAppId: 1030300, tier: 'indie', platforms: ALL,
    genres: ['metroidvania', 'soulslike', 'platformer', 'action'], artStyles: ['hand-drawn'], featured: true },
  { title: 'Celeste', steamAppId: 504230, epic: true, tier: 'indie', platforms: ALL,
    genres: ['platformer', 'narrative'], artStyles: ['pixel-art'] },
  { title: 'Stardew Valley', steamAppId: 413150, tier: 'indie', platforms: ALL,
    genres: ['simulation', 'rpg', 'sandbox'], artStyles: ['pixel-art'] },
  { title: 'Terraria', steamAppId: 105600, tier: 'indie', platforms: ALL,
    genres: ['sandbox', 'survival', 'action', 'adventure'], artStyles: ['pixel-art'] },
  { title: 'Dead Cells', steamAppId: 588650, epic: true, tier: 'indie', platforms: ALL,
    genres: ['roguelike', 'metroidvania', 'action'], artStyles: ['pixel-art'] },
  { title: 'Cuphead', steamAppId: 268910, tier: 'indie', platforms: ALL,
    genres: ['action', 'platformer'], artStyles: ['hand-drawn'] },
  { title: 'Slay the Spire', steamAppId: 646570, epic: true, tier: 'indie', platforms: ALL,
    genres: ['deckbuilder', 'roguelike', 'strategy'], artStyles: ['hand-drawn'] },
  { title: 'Balatro', steamAppId: 2379780, tier: 'indie', platforms: ALL,
    genres: ['deckbuilder', 'roguelike', 'strategy'], artStyles: ['pixel-art'], featured: true },
  { title: 'Outer Wilds', steamAppId: 753640, epic: true, tier: 'indie', platforms: ALL,
    genres: ['adventure', 'puzzle', 'narrative'], artStyles: ['stylized-3d'], featured: true },
  { title: 'Disco Elysium', steamAppId: 632470, epic: true, tier: 'indie', platforms: ALL,
    genres: ['rpg', 'narrative'], artStyles: ['painterly'] },
  { title: 'Undertale', steamAppId: 391540, tier: 'indie', platforms: ALL,
    genres: ['rpg', 'narrative'], artStyles: ['pixel-art'] },
  { title: 'Inside', steamAppId: 304430, epic: true, tier: 'indie', platforms: ALL,
    genres: ['puzzle', 'platformer', 'adventure'], artStyles: ['minimalist', 'stylized-3d'] },
  { title: 'Tunic', steamAppId: 553420, epic: true, tier: 'indie', platforms: ALL,
    genres: ['action', 'adventure', 'puzzle'], artStyles: ['low-poly', 'stylized-3d'] },
  { title: 'Vampire Survivors', steamAppId: 1794680, epic: true, tier: 'indie', platforms: ALL,
    genres: ['roguelike', 'action'], artStyles: ['pixel-art'] },
  { title: 'Return of the Obra Dinn', steamAppId: 653530, aboutFrom: 'wikipedia', tier: 'indie', platforms: ALL,
    genres: ['puzzle', 'narrative', 'adventure'], artStyles: ['minimalist'] },
  { title: 'Hotline Miami', steamAppId: 219150, tier: 'indie', platforms: ALL,
    genres: ['action', 'shooter'], artStyles: ['pixel-art'] },
  { title: 'Animal Well', steamAppId: 813230, epic: true, tier: 'indie', platforms: ['pc', 'nintendo', 'playstation'],
    genres: ['metroidvania', 'puzzle', 'platformer'], artStyles: ['pixel-art'] },
  { title: 'Sea of Stars', steamAppId: 1244090, tier: 'indie', platforms: ALL,
    genres: ['rpg', 'adventure'], artStyles: ['pixel-art'] },
  { title: 'Ori and the Will of the Wisps', steamAppId: 1057090, aboutFrom: 'wikipedia', tier: 'indie', platforms: ['pc', 'nintendo', 'xbox'],
    genres: ['metroidvania', 'platformer', 'action'], artStyles: ['painterly'] },
  { title: 'Subnautica', steamAppId: 264710, epic: true, tier: 'indie', platforms: ALL,
    genres: ['survival', 'adventure', 'open-world'], artStyles: ['stylized-3d'] },
  { title: 'Lethal Company', steamAppId: 1966720, tier: 'indie', platforms: ['pc'],
    genres: ['horror', 'survival', 'party'], artStyles: ['low-poly'] },
  { title: 'Valheim', steamAppId: 892970, tier: 'indie', platforms: ['pc', 'xbox'],
    genres: ['survival', 'sandbox', 'open-world'], artStyles: ['low-poly'] },
  { title: 'Rain World', steamAppId: 312520, tier: 'indie', platforms: ['pc', 'nintendo', 'playstation'],
    genres: ['survival', 'platformer', 'adventure'], artStyles: ['pixel-art'] },
  { title: 'Gris', steamAppId: 683320, tier: 'indie', platforms: ['pc', 'nintendo', 'playstation'],
    genres: ['platformer', 'puzzle', 'adventure'], artStyles: ['hand-drawn', 'painterly'] },
  { title: 'Firewatch', steamAppId: 383870, tier: 'indie', platforms: ALL,
    genres: ['narrative', 'adventure'], artStyles: ['stylized-3d', 'painterly'] },
  { title: 'Cult of the Lamb', steamAppId: 1313140, tier: 'indie', platforms: ALL,
    genres: ['roguelike', 'simulation', 'action'], artStyles: ['hand-drawn'] },
  { title: 'Dave the Diver', steamAppId: 1868140, tier: 'indie', platforms: ['pc', 'nintendo', 'playstation'],
    genres: ['adventure', 'simulation'], artStyles: ['pixel-art'] },
  { title: 'Pizza Tower', steamAppId: 2231450, tier: 'indie', platforms: ['pc', 'nintendo'],
    genres: ['platformer', 'action'], artStyles: ['pixel-art', 'hand-drawn'] },
  { title: 'Ultrakill', steamAppId: 1229490, tier: 'indie', platforms: ['pc'],
    genres: ['shooter', 'action'], artStyles: ['low-poly'] },
  { title: 'Teardown', steamAppId: 1167630, tier: 'indie', platforms: PC_PS_XB,
    genres: ['sandbox', 'puzzle', 'simulation'], artStyles: ['voxel'] },
  { title: 'Cloudpunk', steamAppId: 746850, tier: 'indie', platforms: ALL,
    genres: ['narrative', 'adventure', 'open-world'], artStyles: ['voxel'] },

  // ---------------------------------------------------------------- Epic-only (Wikipedia + Epic)
  { title: 'Alan Wake 2', wikipediaTitle: 'Alan Wake 2', epic: true, tier: 'aaa', platforms: PC_PS_XB,
    genres: ['horror', 'survival', 'narrative'], artStyles: ['photorealistic'] },
  // The "Fortnite" article has no box art or en-wiki screenshots; the Battle Royale
  // article does, so use it for media and pin Wikidata to the main Fortnite item.
  { title: 'Fortnite', wikipediaTitle: 'Fortnite Battle Royale', wikidataId: 'Q349375', epic: true, tier: 'aaa', platforms: ALL,
    genres: ['shooter', 'sandbox', 'party'], artStyles: ['stylized-3d'] },

  // ---------------------------------------------------------------- Nintendo (Wikipedia)
  { title: 'The Legend of Zelda: Breath of the Wild', wikipediaTitle: 'The Legend of Zelda: Breath of the Wild', tier: 'aaa', platforms: NINTENDO,
    genres: ['open-world', 'adventure', 'action'], artStyles: ['cel-shaded', 'painterly'] },
  { title: 'The Legend of Zelda: Tears of the Kingdom', wikipediaTitle: 'The Legend of Zelda: Tears of the Kingdom', tier: 'aaa', platforms: NINTENDO, featured: true,
    genres: ['open-world', 'adventure', 'action', 'sandbox'], artStyles: ['cel-shaded', 'painterly'] },
  { title: 'Super Mario Odyssey', wikipediaTitle: 'Super Mario Odyssey', tier: 'aaa', platforms: NINTENDO, featured: true,
    genres: ['platformer', 'adventure'], artStyles: ['stylized-3d'] },
  { title: 'Super Mario Bros. Wonder', wikipediaTitle: 'Super Mario Bros. Wonder', tier: 'aaa', platforms: NINTENDO,
    genres: ['platformer', 'party'], artStyles: ['stylized-3d'] },
  // The Wikipedia article for Deluxe is "Mario Kart 8" (whose lead describes the 2014 Wii U original);
  // Wikidata has a separate item for the 2017 Switch release, and the short description is curated.
  { title: 'Mario Kart 8 Deluxe', wikipediaTitle: 'Mario Kart 8', wikidataId: 'Q28321447', tier: 'aaa', platforms: NINTENDO,
    shortDescription: 'Mario Kart 8 Deluxe is the 2017 Nintendo Switch edition of Nintendo\'s kart racer Mario Kart 8, bundling all of the original\'s downloadable tracks and characters with a revamped battle mode. Players race Mario series characters around anti-gravity tracks themed on Nintendo locales, using power-ups to gain an edge.',
    genres: ['racing', 'party'], artStyles: ['stylized-3d'] },
  { title: 'Mario Kart World', wikipediaTitle: 'Mario Kart World', tier: 'aaa', platforms: NINTENDO, featured: true,
    genres: ['racing', 'open-world', 'party'], artStyles: ['stylized-3d'] },
  { title: 'Donkey Kong Bananza', wikipediaTitle: 'Donkey Kong Bananza', tier: 'aaa', platforms: NINTENDO,
    genres: ['platformer', 'adventure', 'sandbox'], artStyles: ['stylized-3d'] },
  { title: 'Animal Crossing: New Horizons', wikipediaTitle: 'Animal Crossing: New Horizons', tier: 'aaa', platforms: NINTENDO,
    genres: ['simulation', 'sandbox'], artStyles: ['stylized-3d'] },
  { title: 'Super Smash Bros. Ultimate', wikipediaTitle: 'Super Smash Bros. Ultimate', tier: 'aaa', platforms: NINTENDO,
    genres: ['fighting', 'party'], artStyles: ['stylized-3d'] },
  { title: 'Splatoon 3', wikipediaTitle: 'Splatoon 3', tier: 'aaa', platforms: NINTENDO,
    genres: ['shooter', 'action', 'party'], artStyles: ['stylized-3d'] },
  { title: 'Metroid Dread', wikipediaTitle: 'Metroid Dread', tier: 'aaa', platforms: NINTENDO,
    genres: ['metroidvania', 'action', 'platformer'], artStyles: ['stylized-3d'] },
  { title: 'Metroid Prime 4: Beyond', wikipediaTitle: 'Metroid Prime 4: Beyond', tier: 'aaa', platforms: NINTENDO,
    genres: ['action', 'adventure', 'shooter'], artStyles: ['stylized-3d'] },
  { title: 'Kirby and the Forgotten Land', wikipediaTitle: 'Kirby and the Forgotten Land', tier: 'aaa', platforms: NINTENDO,
    genres: ['platformer', 'adventure'], artStyles: ['stylized-3d'] },
  { title: 'Xenoblade Chronicles 3', wikipediaTitle: 'Xenoblade Chronicles 3', tier: 'aaa', platforms: NINTENDO,
    genres: ['rpg', 'open-world', 'action'], artStyles: ['anime', 'stylized-3d'] },
  { title: 'Fire Emblem: Three Houses', wikipediaTitle: 'Fire Emblem: Three Houses', tier: 'aaa', platforms: NINTENDO,
    genres: ['strategy', 'rpg', 'narrative'], artStyles: ['anime'] },
  // Wikidata has no developer (P178) claim for Pikmin 4.
  { title: 'Pikmin 4', wikipediaTitle: 'Pikmin 4', developers: ['Nintendo Entertainment Planning & Development', 'Eighting'], tier: 'aaa', platforms: NINTENDO,
    genres: ['strategy', 'puzzle', 'adventure'], artStyles: ['photorealistic', 'stylized-3d'] },
  { title: "Luigi's Mansion 3", wikipediaTitle: "Luigi's Mansion 3", tier: 'aaa', platforms: NINTENDO,
    genres: ['adventure', 'puzzle', 'action'], artStyles: ['stylized-3d'] },
  { title: 'Pokémon Legends: Z-A', wikipediaTitle: 'Pokémon Legends: Z-A', tier: 'aaa', platforms: NINTENDO,
    genres: ['rpg', 'action', 'adventure'], artStyles: ['anime', 'stylized-3d'] },
]
