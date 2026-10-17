export interface CollageAlbum {
  id: number | string;
  title: string;
  artist: string;
  cover: string;
}

const cover = (hash: string): string =>
  `https://cdn-images.dzcdn.net/images/cover/${hash}/250x250-000000-80-0-0.jpg`;

/**
 * Curated Deezer albums so the home collage is full from day one,
 * before the community has rated enough albums to build a chart.
 */
export const FEATURED_ALBUMS: CollageAlbum[] = [
  { id: 1261474, title: 'The Queen Is Dead', artist: 'The Smiths', cover: cover('7ca9c4c9988765720bf3b722e101d2c3') },
  { id: 14880317, title: 'The Bends', artist: 'Radiohead', cover: cover('0d2ccaf5f7b35af57f3d9c8f4504a6e6') },
  { id: 708674, title: 'Ten', artist: 'Pearl Jam', cover: cover('00ee8c40862fb4e258fcbeaa17d7199e') },
  { id: 6575789, title: 'Random Access Memories', artist: 'Daft Punk', cover: cover('311bba0fc112d15f72c8b5a65f0456c1') },
  { id: 192713382, title: '21', artist: 'Adele', cover: cover('dc1ce848d830ecc93521be5a78350364') },
  { id: 47131362, title: 'The Miseducation of Lauryn Hill', artist: 'Ms. Lauryn Hill', cover: cover('79ea9d5f45c41d82e511c59f0bd8fc5a') },
  { id: 14879699, title: 'OK Computer', artist: 'Radiohead', cover: cover('05a186e0a859a36f9cd51cdae2158fe1') },
  { id: 12047952, title: 'Abbey Road', artist: 'The Beatles', cover: cover('aa94ab293730bb7845d2aa8c672b2c29') },
  { id: 6237061, title: 'Rumours', artist: 'Fleetwood Mac', cover: cover('9732751ce91d786dcf30069853697078') },
  { id: 96126, title: 'Thriller', artist: 'Michael Jackson', cover: cover('f01e09ceb8ad1e96707c1b4aadb5911b') },
  { id: 12114240, title: 'The Dark Side of the Moon', artist: 'Pink Floyd', cover: cover('e635a8510c1a74bc089b3566ebbb9cb8') },
  { id: 344137457, title: 'Blonde', artist: 'Frank Ocean', cover: cover('aa7e6de00b0810f5051aa60b489f58d8') },
  { id: 9896728, title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', cover: cover('00dd0da365a94b1829302d6b7fec70e6') },
  { id: 217795, title: 'Back to Black', artist: 'Amy Winehouse', cover: cover('5772b495f0dcdf660d0fc88c4c38a3fa') },
  { id: 1441464, title: 'Kind of Blue', artist: 'Miles Davis', cover: cover('88aec77a2c4a8ed8dd3c709a9fe418bc') },
  { id: 587849692, title: 'Purple Rain', artist: 'Prince', cover: cover('526d2d27a16da94b6f46fa4e786a34c9') },
  { id: 302127, title: 'Discovery', artist: 'Daft Punk', cover: cover('5718f7c81c27e0b2417e2a4c45224f8a') },
  { id: 94528282, title: 'Lemonade', artist: 'Beyoncé', cover: cover('bb119e6869e38e386abf276eef6fe1c2') },
  { id: 10709540, title: 'Currents', artist: 'Tame Impala', cover: cover('de5b9b704cd4ec36f8bf49beb3e17ba2') },
  { id: 6899610, title: 'AM', artist: 'Arctic Monkeys', cover: cover('64e54e307bd5e2bdb27ffeb662fd910d') },
  { id: 6856704, title: 'London Calling', artist: 'The Clash', cover: cover('1dbb7d7bee08ed2b18deabffd675bd36') },
  { id: 436186197, title: 'Pet Sounds', artist: 'The Beach Boys', cover: cover('ddfe7ab3d0a960099debb0bf56c70460') },
  { id: 3095471, title: 'Graceland', artist: 'Paul Simon', cover: cover('8a8c3843f9daf46b8a660b26ef56cb4d') },
  { id: 101618, title: 'Is This It', artist: 'The Strokes', cover: cover('700f0375d5ac8570f16a2c7eb128303f') }
];
