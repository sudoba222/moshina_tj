// Comprehensive brand → models list for Tajikistan market
// Used as the primary source for the post form brand/model selects.

export interface VehicleBrand {
  name: string
  models: string[]
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  {
    name: 'Toyota',
    models: ['Camry', 'Corolla', 'Land Cruiser 200', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander', 'RAV4', 'Venza', 'Fortuner', 'HiAce', 'Hilux', 'Yaris', 'Avensis', 'Mark II', 'Crown', 'Alphard', 'Vellfire', 'Prius', 'Vitz', 'Rush', 'Innova', 'Sienna', 'Tacoma', 'Tundra', 'Sequoia', 'CHR', '4Runner'],
  },
  {
    name: 'Chevrolet',
    models: ['Cobalt', 'Nexia', 'Nexia 3', 'Lacetti', 'Malibu', 'Malibu 2', 'Captiva', 'Equinox', 'Spark', 'Aveo', 'Cruze', 'Tahoe', 'Suburban', 'TrailBlazer', 'Blazer', 'Silverado', 'Traverse', 'Trax', 'Blazer EV', 'Gentra', 'Onix'],
  },
  {
    name: 'Hyundai',
    models: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta', 'Accent', 'Kona', 'Palisade', 'i30', 'i10', 'i20', 'Starex', 'Porter', 'Staria', 'Ioniq 5', 'Ioniq 6', 'Venue', 'Veloster', 'Genesis', 'Azera'],
  },
  {
    name: 'Kia',
    models: ['Rio', 'Cerato', 'Sportage', 'Sorento', 'Carnival', 'Stinger', 'K5', 'K8', 'Seltos', 'Niro', 'Telluride', 'EV6', 'Picanto', 'Soul', 'Stonic', 'Mohave', 'Cadenza'],
  },
  {
    name: 'Mercedes-Benz',
    models: ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'B-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'CLA', 'CLS', 'Vito', 'Sprinter', 'V-Class', 'EQS', 'EQE', 'EQC'],
  },
  {
    name: 'BMW',
    models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'iX', 'i4', 'M3', 'M5', 'Z4'],
  },
  {
    name: 'Audi',
    models: ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'e-tron'],
  },
  {
    name: 'Volkswagen',
    models: ['Polo', 'Golf', 'Jetta', 'Passat', 'Tiguan', 'Touareg', 'T-Roc', 'Touran', 'ID.4', 'ID.6', 'Sharan', 'Phaeton', 'Arteon', 'Caddy', 'Transporter'],
  },
  {
    name: 'Lada',
    models: ['Vesta', 'Granta', 'XRAY', 'Largus', 'Niva', 'Niva Legend', 'Niva Travel', 'Priora', '2101', '2102', '2103', '2104', '2105', '2106', '2107', '2109', '2110', '2112', '2114', '2115', 'Kalina'],
  },
  {
    name: 'Daewoo',
    models: ['Nexia', 'Nexia 3', 'Matiz', 'Lanos', 'Espero', 'Tico', 'Gentra', 'Cobalt'],
  },
  {
    name: 'Nissan',
    models: ['Juke', 'Qashqai', 'X-Trail', 'Patrol', 'Pathfinder', 'Murano', 'Tiida', 'Sentra', 'Almera', 'Note', 'Micra', 'Navara', 'Armada', 'Altima', 'Maxima', 'Kicks', 'Terra', 'Leaf'],
  },
  {
    name: 'Mazda',
    models: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-7', 'CX-8', 'CX-9', 'MX-5', 'BT-50'],
  },
  {
    name: 'Honda',
    models: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Odyssey', 'Fit', 'Jazz', 'City', 'Legend', 'Element', 'Passport', 'Ridgeline', 'e:NS1'],
  },
  {
    name: 'Mitsubishi',
    models: ['Outlander', 'Outlander PHEV', 'Pajero', 'Pajero Sport', 'Lancer', 'Eclipse Cross', 'ASX', 'L200', 'Galant', 'Carisma', 'Colt', 'Space Star', 'Delica'],
  },
  {
    name: 'Lexus',
    models: ['ES', 'IS', 'GS', 'LS', 'NX', 'RX', 'GX', 'LX', 'UX', 'RC', 'LC', 'RZ'],
  },
  {
    name: 'Subaru',
    models: ['Outback', 'Forester', 'XV', 'Impreza', 'Legacy', 'BRZ', 'WRX', 'Ascent', 'Crosstrek', 'Tribeca', 'Baja'],
  },
  {
    name: 'Skoda',
    models: ['Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Rapid', 'Scala', 'Kamiq', 'Fabia', 'Enyaq'],
  },
  {
    name: 'Peugeot',
    models: ['206', '207', '208', '306', '307', '308', '406', '407', '408', '2008', '3008', '5008', '508', 'Partner', 'Boxer', 'Expert'],
  },
  {
    name: 'Renault',
    models: ['Logan', 'Sandero', 'Duster', 'Megane', 'Clio', 'Laguna', 'Scenic', 'Kadjar', 'Koleos', 'Arkana', 'Captur', 'Trafic', 'Master', 'Kangoo'],
  },
  {
    name: 'Ford',
    models: ['Focus', 'Mondeo', 'Explorer', 'Expedition', 'Ranger', 'F-150', 'Transit', 'Kuga', 'Edge', 'Escape', 'Mustang', 'EcoSport', 'Puma', 'Bronco', 'Maverick'],
  },
  {
    name: 'Opel',
    models: ['Astra', 'Vectra', 'Zafira', 'Corsa', 'Insignia', 'Mokka', 'Grandland', 'Crossland', 'Antara', 'Meriva', 'Omega'],
  },
  {
    name: 'Geely',
    models: ['Coolray', 'Atlas', 'Atlas Pro', 'Emgrand', 'Tugella', 'Monjaro', 'Azkarra', 'Okavango', 'Boyue', 'GX3', 'LC', 'MK'],
  },
  {
    name: 'Chery',
    models: ['Tiggo 4', 'Tiggo 7', 'Tiggo 7 Pro', 'Tiggo 8', 'Tiggo 8 Pro', 'Arrizo 5', 'Arrizo 6', 'Arrizo 8', 'QQ', 'Amulet'],
  },
  {
    name: 'Haval',
    models: ['F7', 'F7x', 'H6', 'H9', 'Jolion', 'Dargo', 'Big Dog'],
  },
  {
    name: 'Changan',
    models: ['CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'UNI-T', 'UNI-K', 'UNI-V', 'Alsvin', 'Eado', 'Oshan X7'],
  },
  {
    name: 'BYD',
    models: ['Han', 'Tang', 'Song Plus', 'Yuan Plus', 'Atto 3', 'Seal', 'Dolphin', 'Seagull', 'F3'],
  },
  {
    name: 'GAC',
    models: ['GS4', 'GS5', 'GS8', 'GN8', 'Trumpchi M8', 'Aion S', 'Aion V'],
  },
  {
    name: 'Great Wall',
    models: ['Poer', 'Cannon', 'Hover H5', 'Hover H6', 'Tank 300', 'Tank 500'],
  },
  {
    name: 'Lifan',
    models: ['X60', 'X70', 'X80', '620', '720', 'Solano', 'Murman'],
  },
  {
    name: 'JAC',
    models: ['S3', 'S4', 'S7', 'T8', 'JS4', 'T6', 'Sei 2', 'Sei 3'],
  },
  {
    name: 'Porsche',
    models: ['Cayenne', 'Macan', 'Panamera', '911', 'Taycan', 'Cayman', 'Boxster'],
  },
  {
    name: 'Land Rover',
    models: ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Discovery', 'Discovery Sport', 'Defender'],
  },
  {
    name: 'Jeep',
    models: ['Grand Cherokee', 'Cherokee', 'Wrangler', 'Compass', 'Renegade', 'Gladiator', 'Commander'],
  },
  {
    name: 'Volvo',
    models: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'V90', 'C40'],
  },
  {
    name: 'Infiniti',
    models: ['Q50', 'Q60', 'Q70', 'QX50', 'QX60', 'QX70', 'QX80', 'FX35', 'FX37', 'G35'],
  },
  {
    name: 'Acura',
    models: ['MDX', 'RDX', 'TLX', 'ILX', 'NSX'],
  },
  {
    name: 'Cadillac',
    models: ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'Eldorado', 'SRX'],
  },
  {
    name: 'Lincoln',
    models: ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'MKZ'],
  },
  {
    name: 'Chrysler',
    models: ['300', 'Pacifica', 'Voyager'],
  },
  {
    name: 'Dodge',
    models: ['Challenger', 'Charger', 'Durango', 'Ram 1500', 'Journey'],
  },
  {
    name: 'Buick',
    models: ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Verano'],
  },
  {
    name: 'GMC',
    models: ['Yukon', 'Suburban', 'Sierra', 'Terrain', 'Acadia', 'Canyon', 'Envoy'],
  },
  {
    name: 'Seat',
    models: ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Alhambra'],
  },
  {
    name: 'Fiat',
    models: ['Punto', 'Bravo', 'Tipo', 'Ducato', '500', 'Doblo', 'Panda'],
  },
  {
    name: 'Alfa Romeo',
    models: ['Giulia', 'Stelvio', 'Tonale', '147', '156', '159'],
  },
  {
    name: 'Suzuki',
    models: ['Vitara', 'Grand Vitara', 'Swift', 'Ignis', 'Jimny', 'Baleno', 'Ertiga', 'SX4', 'Carry'],
  },
  {
    name: 'Isuzu',
    models: ['D-Max', 'MU-X', 'Trooper', 'NPR', 'NQR', 'Forward'],
  },
  {
    name: 'Ssangyong',
    models: ['Rexton', 'Actyon', 'Tivoli', 'Korando', 'Musso'],
  },
  {
    name: 'Genesis',
    models: ['G70', 'G80', 'G90', 'GV70', 'GV80'],
  },
  {
    name: 'Tesla',
    models: ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
  },
  {
    name: 'Zeekr',
    models: ['001', '009', 'X'],
  },
  {
    name: 'Omoda',
    models: ['C5', 'S5'],
  },
  {
    name: 'Jaecoo',
    models: ['J7', 'J8'],
  },
  // Trucks / Commercial
  {
    name: 'KamAZ',
    models: ['5490', '65115', '6520', '43118', '54115', '65220'],
  },
  {
    name: 'MAZ',
    models: ['5340', '5440', '6312', '4371', '5551'],
  },
  {
    name: 'ZIL',
    models: ['130', '131', '4331', '5301'],
  },
  {
    name: 'GAZ',
    models: ['Gazelle', 'Gazelle Next', 'Valdai', 'Sadko', 'Sobol'],
  },
  {
    name: 'UAZ',
    models: ['Patriot', 'Hunter', 'Bukhanka', 'Pickup', '469', '3151', '452'],
  },
  {
    name: 'MAN',
    models: ['TGX', 'TGS', 'TGM', 'TGL', 'TGE', 'Lion'],
  },
  {
    name: 'Scania',
    models: ['R 450', 'R 500', 'R 580', 'S 500', 'S 580', 'G 360', 'P 280'],
  },
  {
    name: 'Volvo Trucks',
    models: ['FH', 'FM', 'FMX', 'FE', 'FL'],
  },
  {
    name: 'DAF',
    models: ['XF', 'CF', 'LF'],
  },
  {
    name: 'Iveco',
    models: ['Daily', 'Stralis', 'S-Way', 'Eurocargo'],
  },
  {
    name: 'Другое',
    models: ['Другое'],
  },
]

// Sort alphabetically except "Другое" goes last
export const SORTED_BRANDS = [
  ...VEHICLE_BRANDS.filter((b) => b.name !== 'Другое').sort((a, b) => a.name.localeCompare(b.name)),
  ...VEHICLE_BRANDS.filter((b) => b.name === 'Другое'),
]
