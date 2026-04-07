/**
 * Car brand logo CDN mapping.
 * Source: filippofilip95/car-logos-dataset via jsDelivr CDN
 * All URLs verified to return valid PNG images.
 */

const CDN = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized'

/** Maps normalised brand name → CDN logo URL */
const BRAND_SLUG_MAP: Record<string, string> = {
  // Japanese
  toyota:      'toyota',
  lexus:       'lexus',
  honda:       'honda',
  nissan:      'nissan',
  mazda:       'mazda',
  subaru:      'subaru',
  mitsubishi:  'mitsubishi',
  suzuki:      'suzuki',
  isuzu:       'isuzu',
  infiniti:    'infiniti',
  acura:       'acura',
  daihatsu:    'daihatsu',

  // Korean
  hyundai:     'hyundai',
  kia:         'kia',
  genesis:     'genesis',
  ssangyong:   'ssangyong',

  // German
  bmw:         'bmw',
  mercedes:    'mercedes-benz',
  'mercedes-benz': 'mercedes-benz',
  audi:        'audi',
  volkswagen:  'volkswagen',
  vw:          'volkswagen',
  porsche:     'porsche',
  opel:        'opel',

  // American
  chevrolet:   'chevrolet',
  ford:        'ford',
  jeep:        'jeep',
  cadillac:    'cadillac',
  dodge:       'dodge',
  lincoln:     'lincoln',

  // Chinese
  byd:         'byd',
  geely:       'geely',
  haval:       'haval',
  chery:       'chery',
  great_wall:  'great-wall',
  'great wall': 'great-wall',
  zeekr:       'zeekr',
  changan:     'changan',
  dfsk:        'dfsk',
  faw:         'faw',
  gac:         'gac',
  jac:         'jac',
  mg:          'mg',
  nio:         'nio',
  li:          'li-auto',

  // Russian / Soviet
  lada:        'lada',
  uaz:         'uaz',
  gaz:         'gaz',

  // European
  volvo:       'volvo',
  skoda:       'skoda',
  renault:     'renault',
  peugeot:     'peugeot',
  citroen:     'citroen',
  fiat:        'fiat',
  alfa:        'alfa-romeo',
  'alfa romeo': 'alfa-romeo',
  'alfa-romeo': 'alfa-romeo',
  seat:        'seat',
  dacia:       'dacia',
  bmwalpha:    'bmwalpina',

  // British
  'land rover': 'land-rover',
  landrover:   'land-rover',
  jaguar:      'jaguar',
  mini:        'mini',
  bentley:     'bentley',
  rolls:       'rolls-royce',
  'rolls-royce': 'rolls-royce',

  // Electric / EV
  tesla:       'tesla',

  // Korean budget (CIS market)
  daewoo:      'daewoo',

  // Additional Chinese (popular in Tajikistan/CIS)
  exeed:       'exeed',
  omoda:       'omoda',
  jaecoo:      'jaecoo',
  tank:        'tank',
  wey:         'wey',
  voyah:       'voyah',
  avatr:       'avatr',
  xpeng:       'xpeng',
  hongqi:      'hongqi',
  baic:        'baic',
  soueast:     'soueast',
  zotye:       'zotye',
  lifan:       'lifan',
  dongfeng:    'dongfeng',

  // Additional European
  lamborghini: 'lamborghini',
  ferrari:     'ferrari',
  maserati:    'maserati',
  bugatti:     'bugatti',
  'aston martin': 'aston-martin',
  astonmartin: 'aston-martin',
  rivian:      'rivian',

  // Additional Russian/CIS
  moskvich:    'moskvich',
  kamaz:       'kamaz',

  // Spelling variants common in CIS
  merсedes:    'mercedes-benz',  // cyrillic с variant
  mersedes:    'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  toyotа:      'toyota',         // cyrillic а variant
  хyundai:     'hyundai',
  chevrolet:   'chevrolet',
  шевроле:     'chevrolet',
  тойота:      'toyota',
  хонда:       'honda',
  ниссан:      'nissan',
  мазда:       'mazda',
}

/**
 * Returns the CDN logo URL for a given car brand name.
 * Returns null if no logo is available — callers should render a text fallback.
 */
export function getCarBrandLogoUrl(brand: string): string | null {
  const key = brand.toLowerCase().trim()
  const slug = BRAND_SLUG_MAP[key]
  if (!slug) return null
  return `${CDN}/${slug}.png`
}

/**
 * Returns true if we have a logo for this brand.
 */
export function hasCarBrandLogo(brand: string): boolean {
  return !!BRAND_SLUG_MAP[brand.toLowerCase().trim()]
}
