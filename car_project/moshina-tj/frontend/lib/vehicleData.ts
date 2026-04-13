// Comprehensive brand → models list for Tajikistan, Asian, and European markets
// Used as the primary source for the post form brand/model selects.

export interface VehicleBrand {
  name: string
  models: string[]
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  // ── Japanese brands ────────────────────────────────────────────────────────
  {
    name: 'Toyota',
    models: [
      'Camry', 'Corolla', 'Land Cruiser 200', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander', 'RAV4', 'Venza', 'Fortuner', 'HiAce', 'Hilux', 'Yaris', 'Avensis', 'Mark II', 'Crown', 'Alphard', 'Vellfire', 'Prius', 'Vitz', 'Rush', 'Innova', 'Sienna', 'Tacoma', 'Tundra', 'Sequoia', 'CHR', '4Runner', 'Century', 'Avanza', 'Previa', 'Noah', 'Voxy', 'Esquire', 'Estima', 'Harrier', 'Mark X', 'Allion', 'Premio', 'Aqua', 'Passo', 'Raize', 'Supra', '86', 'GR86', 'Corolla Cross', 'Yaris Cross', 'bZ4X', 'Dyna', 'LiteAce', 'TownAce'
    ],
  },
  {
    name: 'Lexus',
    models: ['ES', 'IS', 'GS', 'LS', 'NX', 'RX', 'GX', 'LX', 'UX', 'RC', 'LC', 'RZ', 'LBX', 'LM', 'HS', 'CT', 'SC', 'LFA'],
  },
  {
    name: 'Nissan',
    models: [
      'Juke', 'Qashqai', 'X-Trail', 'Patrol', 'Pathfinder', 'Murano', 'Tiida', 'Sentra', 'Almera', 'Note', 'Micra', 'Navara', 'Armada', 'Altima', 'Maxima', 'Kicks', 'Terra', 'Leaf', 'Ariya', 'Sakura', 'Z', 'GT-R', 'Skyline', 'Serena', 'Elgrand', 'Caravan', 'NV200', 'NV350', 'Fuga', 'Teana', 'Sylphy', 'Bluebird', 'Sunny', 'Terrano'
    ],
  },
  {
    name: 'Infiniti',
    models: ['Q50', 'Q60', 'Q70', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80', 'FX35', 'FX37', 'FX50', 'G35', 'G37', 'EX35', 'JX35', 'M35', 'M37', 'M45'],
  },
  {
    name: 'Honda',
    models: [
      'Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Odyssey', 'Fit', 'Jazz', 'City', 'Legend', 'Element', 'Passport', 'Ridgeline', 'e:NS1', 'e:NP1', 'Vezel', 'ZR-V', 'CR-Z', 'Insight', 'Stepwgn', 'Freed', 'N-Box', 'N-WGN', 'N-One', 'S660', 'NSX'
    ],
  },
  {
    name: 'Acura',
    models: ['MDX', 'RDX', 'TLX', 'ILX', 'NSX', 'ZDX', 'Integra', 'RLX', 'TSX', 'RSX'],
  },
  {
    name: 'Mazda',
    models: [
      'Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-7', 'CX-8', 'CX-9', 'CX-50', 'CX-60', 'CX-70', 'CX-80', 'CX-90', 'MX-5', 'MX-30', 'BT-50', 'RX-7', 'RX-8', 'Familia', 'Demio', 'MPV', 'Bongo'
    ],
  },
  {
    name: 'Mitsubishi',
    models: [
      'Outlander', 'Outlander PHEV', 'Pajero', 'Pajero Sport', 'Lancer', 'Eclipse Cross', 'ASX', 'L200', 'Galant', 'Carisma', 'Colt', 'Space Star', 'Delica', 'Delica D:5', 'Grandis', 'Montero', 'Montero Sport', 'Triton', 'Mirage', 'Xpander', 'Xforce', 'eK Wagon'
    ],
  },
  {
    name: 'Subaru',
    models: ['Outback', 'Forester', 'XV', 'Impreza', 'Legacy', 'BRZ', 'WRX', 'Ascent', 'Crosstrek', 'Tribeca', 'Baja', 'Levorg', 'Solterra', 'Exiga', 'Justy', 'Chiffon', 'Stella'],
  },
  {
    name: 'Suzuki',
    models: ['Vitara', 'Grand Vitara', 'Swift', 'Ignis', 'Jimny', 'Baleno', 'Ertiga', 'SX4', 'Carry', 'Alto', 'Dzire', 'S-Presso', 'Celerio', 'Ciaz', 'Across', 'Swace', 'Spacia', 'Hustler'],
  },
  {
    name: 'Daihatsu',
    models: ['Terios', 'Mira', 'Move', 'Hijet', 'Rocky', 'Sirion', 'Tanto', 'Atrai', 'Sigra', 'Xenia', 'Thor', 'Cast', 'Copen'],
  },
  {
    name: 'Isuzu',
    models: ['D-Max', 'MU-X', 'Trooper', 'NPR', 'NQR', 'Forward', 'Elf', 'Giga', 'VehiCROSS'],
  },

  // ── Korean brands ──────────────────────────────────────────────────────────
  {
    name: 'Hyundai',
    models: [
      'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta', 'Accent', 'Kona', 'Palisade', 'i30', 'i10', 'i20', 'i40', 'Starex', 'Porter', 'Staria', 'Ioniq 5', 'Ioniq 6', 'Ioniq 7', 'Venue', 'Veloster', 'Genesis', 'Azera', 'Grandeur', 'Bayon', 'Casper', 'Custin', 'Alcazar', 'Mighty', 'County', 'Universe'
    ],
  },
  {
    name: 'Kia',
    models: [
      'Rio', 'Cerato', 'Sportage', 'Sorento', 'Carnival', 'Stinger', 'K5', 'K8', 'K3', 'K7', 'K9', 'Seltos', 'Niro', 'Telluride', 'EV6', 'EV9', 'EV3', 'EV5', 'Picanto', 'Morning', 'Soul', 'Stonic', 'Mohave', 'Cadenza', 'Quoris', 'Bongo', 'Ray', 'Venga', 'Carens'
    ],
  },
  {
    name: 'Genesis',
    models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'GV90'],
  },
  {
    name: 'Ssangyong',
    models: ['Rexton', 'Actyon', 'Tivoli', 'Korando', 'Musso', 'Torres', 'Kyron', 'Chairman', 'Stavic', 'Rodius'],
  },
  {
    name: 'KG Mobility',
    models: ['Torres', 'Torres EVX', 'Tivoli', 'Korando', 'Rexton', 'Musso'],
  },
  {
    name: 'Daewoo',
    models: ['Nexia', 'Nexia 3', 'Matiz', 'Lanos', 'Espero', 'Tico', 'Gentra', 'Cobalt', 'Magnus', 'Tosca', 'Lacetti', 'Leganza', 'Nubira', 'Damas', 'Labo'],
  },
  {
    name: 'Samsung',
    models: ['SM3', 'SM5', 'SM6', 'SM7', 'QM3', 'QM5', 'QM6', 'XM3'],
  },

  // ── German brands ──────────────────────────────────────────────────────────
  {
    name: 'Mercedes-Benz',
    models: [
      'C-Class', 'E-Class', 'S-Class', 'A-Class', 'B-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'V-Class', 'Vito', 'Sprinter', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'EQV', 'AMG GT', 'SL', 'SLC', 'SLK', 'ML', 'GL', 'GLK', 'R-Class', 'X-Class', 'Maybach S-Class', 'Maybach GLS'
    ],
  },
  {
    name: 'BMW',
    models: [
      '1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i3', 'i4', 'i5', 'i7', 'i8', 'iX1', 'iX2', 'iX3', 'iX', 'M2', 'M3', 'M4', 'M5', 'M8', 'X3 M', 'X4 M', 'X5 M', 'X6 M'
    ],
  },
  {
    name: 'Audi',
    models: [
      'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q6 e-tron', 'Q7', 'Q8', 'Q8 e-tron', 'TT', 'R8', 'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q3', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ2', 'SQ5', 'SQ7', 'SQ8'
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      'Polo', 'Golf', 'Jetta', 'Passat', 'Tiguan', 'Touareg', 'T-Roc', 'Touran', 'Arteon', 'ID.3', 'ID.4', 'ID.5', 'ID.6', 'ID.7', 'ID. Buzz', 'Sharan', 'Phaeton', 'Caddy', 'Transporter', 'Multivan', 'California', 'Crafter', 'Amarok', 'T-Cross', 'Taigo', 'Teramont', 'Atlas', 'Vento', 'Scirocco', 'Beetle'
    ],
  },
  {
    name: 'Porsche',
    models: ['Cayenne', 'Macan', 'Panamera', '911', '718 Cayman', '718 Boxster', 'Taycan'],
  },
  {
    name: 'Opel',
    models: ['Astra', 'Insignia', 'Corsa', 'Mokka', 'Grandland', 'Crossland', 'Zafira', 'Combo', 'Vivaro', 'Movano', 'Adam', 'Karl', 'Cascada', 'Antara', 'Meriva', 'Vectra', 'Omega'],
  },
  {
    name: 'Smart',
    models: ['Fortwo', 'Forfour', '#1', '#3', '#5'],
  },
  {
    name: 'MAN',
    models: ['TGX', 'TGS', 'TGM', 'TGL', 'TGE', 'Lion', 'Neoplan'],
  },

  // ── Chinese brands ──────────────────────────────────────────────────────────
  {
    name: 'Geely',
    models: ['Coolray', 'Atlas', 'Atlas Pro', 'Emgrand', 'Tugella', 'Monjaro', 'Azkarra', 'Okavango', 'Boyue', 'GX3', 'GX6', 'Icon', 'Preface', 'Xingyue', 'Xingyue L', 'Jiyu 6 Pro', 'LC', 'MK', 'Galaxy L7', 'Galaxy E8', 'Geometry C', 'Geometry A', 'Okavango L'],
  },
  {
    name: 'Chery',
    models: ['Tiggo 4', 'Tiggo 4 Pro', 'Tiggo 7', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max', 'Tiggo 9', 'Arrizo 5', 'Arrizo 5 Pro', 'Arrizo 6', 'Arrizo 8', 'QQ', 'Amulet', 'Omoda 5', 'Fulwin T9', 'Fulwin A8'],
  },
  {
    name: 'iCAR',
    models: ['03', 'V23', 'GT'],
  },
  {
    name: 'Exeed',
    models: ['TXL', 'VX', 'RX', 'LX', 'TX', 'LX Plus', 'Sterra ES', 'Sterra ET'],
  },
  {
    name: 'Jetour',
    models: ['X70', 'X70 Plus', 'X90 Plus', 'X95', 'T2', 'Dashing', 'X-1', 'Shanhai L9', 'Ice Cream'],
  },
  {
    name: 'Haval',
    models: ['F7', 'F7x', 'H6', 'H6 GT', 'H9', 'Jolion', 'Dargo', 'Big Dog', 'Raptor', 'M6', 'Xiaolong Max', 'Chitu', 'Shenshou'],
  },
  {
    name: 'Tank',
    models: ['300', '400', '500', '700', '800'],
  },
  {
    name: 'BYD',
    models: ['Han', 'Han EV', 'Tang', 'Tang EV', 'Song', 'Song Plus', 'Song Pro', 'Yuan', 'Yuan Plus', 'Atto 3', 'Seal', 'Seal U', 'Dolphin', 'Seagull', 'Sea Lion 6', 'F3', 'F0', 'E2', 'E5', 'Qin Plus', 'Frigate 07', 'Corvette 07', 'Destroyer 05'],
  },
  {
    name: 'Denza',
    models: ['D9', 'N7', 'N8', 'Z9', 'Z9 GT'],
  },
  {
    name: 'Yangwang',
    models: ['U8', 'U9', 'U7'],
  },
  {
    name: 'Fangchengbao',
    models: ['Bao 5', 'Bao 8', 'Bao 3'],
  },
  {
    name: 'Xiaomi',
    models: ['SU7', 'SU7 Ultra', 'SU7 Pro', 'SU7 Max'],
  },
  {
    name: 'Wuling',
    models: ['Hongguang MINI EV', 'Binguo', 'Cloud', 'Air EV', 'GameBoy', 'Starlight', 'Xingchi', 'Xingchen', 'Victory', 'Hongguang S', 'Hongguang V'],
  },
  {
    name: 'Baojun',
    models: ['Yep', 'Yep Plus', 'Cloud (Yunduo)', 'KiWi EV', 'RC-5', 'RS-3', 'RS-5', 'RS-7', '510', '530', '730', 'RM-5'],
  },
  {
    name: 'Maxus',
    models: ['G10', 'G20', 'G50', 'G70', 'G90', 'D60', 'D90', 'T60', 'T70', 'T90', 'Mifa 9', 'Mifa 7', 'Territory', 'V80', 'V90'],
  },
  {
    name: 'Aion',
    models: ['Aion S', 'Aion S Plus', 'Aion S Max', 'Aion V', 'Aion V Plus', 'Aion LX', 'Aion LX Plus', 'Aion Y', 'Aion Y Plus', 'Hyper GT', 'Hyper SSR', 'Hyper HT'],
  },
  {
    name: 'IM Motors',
    models: ['L7', 'LS7', 'LS6', 'L6'],
  },
  {
    name: 'Rising Auto',
    models: ['R7', 'F7', 'ER6', 'MARVEL R'],
  },
  {
    name: 'Arcfox',
    models: ['α-T', 'α-S', 'α-S HI', 'Kaola', 'α-T5', 'α-S5'],
  },
  {
    name: 'Seres',
    models: ['Seres 3', 'Seres 5', 'Seres 7'],
  },
  {
    name: 'Aiways',
    models: ['U5', 'U6', 'U7 ion'],
  },
  {
    name: 'Jiyue',
    models: ['01', '07'],
  },
  {
    name: 'Lotus',
    models: ['Eletre', 'Emeya', 'Evija', 'Emira'],
  },
  {
    name: 'Polestones',
    models: ['01'],
  },
  {
    name: 'Luxeed',
    models: ['S7'],
  },
  {
    name: 'Stelato',
    models: ['S9'],
  },
  {
    name: 'Changan',
    models: ['CS15', 'CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'CS95', 'UNI-T', 'UNI-K', 'UNI-V', 'UNI-Z', 'Alsvin', 'Eado Plus', 'Oshan X5', 'Oshan X7', 'Lamore', 'Hunter', 'Deepal S7', 'Deepal SL03', 'Avatr 11', 'Avatr 12'],
  },
  {
    name: 'Deepal',
    models: ['S7', 'L07', 'G318', 'SL03'],
  },
  {
    name: 'Neta',
    models: ['Neta V', 'Neta U', 'Neta S', 'Neta GT', 'Neta L', 'AYA'],
  },
  {
    name: 'Leapmotor',
    models: ['T03', 'C11', 'C01', 'C10', 'C16'],
  },
  {
    name: 'HiPhi',
    models: ['HiPhi X', 'HiPhi Z', 'HiPhi Y'],
  },
  {
    name: 'Skywell',
    models: ['ET5', 'HT-i', 'EV6'],
  },
  {
    name: 'Kaiyi',
    models: ['E5', 'X3', 'X3 Pro', 'X7 Kunlun'],
  },
  {
    name: 'Jetta',
    models: ['VA3', 'VS5', 'VS7'],
  },
  {
    name: 'Venucia',
    models: ['V-Online', 'D60', 'T60', 'Star', 'V-Online DD-i'],
  },
  {
    name: 'Avatr',
    models: ['11', '12', '07'],
  },
  {
    name: 'GAC',
    models: ['GS3', 'GS4', 'GS5', 'GS8', 'GN8', 'M8', 'Aion S', 'Aion V', 'Aion LX', 'Aion Y', 'Trumpchi GM8', 'Empow'],
  },
  {
    name: 'Great Wall',
    models: ['Poer', 'Cannon', 'Hover H5', 'Hover H6', 'Hover H9', 'M4', 'Wingle 7', 'Steed', 'Ora Good Cat'],
  },
  {
    name: 'MG',
    models: ['3', '5', '6', 'ZS', 'HS', 'RX5', 'RX8', 'EHS', 'Marvel R', 'Cyberster', 'One', 'GT', 'MG4 EV'],
  },
  {
    name: 'Roewe',
    models: ['RX5', 'RX8', 'i5', 'i6', '550', '750', 'D7', 'ERX5', 'Marvel X'],
  },
  {
    name: 'BAIC',
    models: ['X3', 'X5', 'X7', 'BJ40', 'BJ60', 'BJ80', 'BJ212', 'Senova D50', 'Senova D70', 'EU5', 'EC3', 'U5 Plus'],
  },
  {
    name: 'Dongfeng',
    models: ['AX4', 'AX7', 'Fengshen A60', 'Fengshen E70', 'S30', 'H30', 'Glory', 'Box', 'Nammi 01', 'M-Hero 917', 'Huge', 'T5 EVO', 'Forthing Thunder'],
  },
  {
    name: 'Voyah',
    models: ['Free', 'Dream', 'Courage', 'Passion'],
  },
  {
    name: 'FAW',
    models: ['Bestune T77', 'Bestune T99', 'Bestune B70', 'Bestune NAT', 'Oley', 'Xenia', 'Bestune T33', 'Bestune M9', 'Hongqi H5'],
  },
  {
    name: 'Hongqi',
    models: ['H5', 'H6', 'H9', 'HS5', 'HS7', 'E-HS9', 'EH7', 'LS7', 'HQ9', 'HS3'],
  },
  {
    name: 'Nio',
    models: ['ET5', 'ET7', 'EC6', 'ES6', 'ES7', 'ES8', 'EL6', 'EL7', 'EL8', 'ET9'],
  },
  {
    name: 'Li Auto',
    models: ['L6', 'L7', 'L8', 'L9', 'Li ONE', 'Mega'],
  },
  {
    name: 'Xpeng',
    models: ['P5', 'P7', 'G3', 'G6', 'G9', 'X9', 'P7i', 'Mona M03'],
  },
  {
    name: 'Lynk & Co',
    models: ['01', '02', '03', '05', '06', '07', '08', '09'],
  },
  {
    name: 'AITO',
    models: ['M5', 'M7', 'M9'],
  },
  {
    name: 'Lifan',
    models: ['X60', 'X70', 'X80', '620', '720', '820', 'Solano', 'Murman', 'Myway', 'Smily'],
  },
  {
    name: 'JAC',
    models: ['S3', 'S4', 'S7', 'T6', 'T8', 'JS4', 'JS6', 'Sei 2', 'Sei 3', 'E10X', 'J7', 'JS2', 'iEVA50'],
  },
  {
    name: 'Foton',
    models: ['Tunland', 'View C2', 'Sauvana', 'Aumark', 'Auman', 'Gratour', 'Tunland G7'],
  },
  {
    name: 'DFSK',
    models: ['Glory 500', 'Glory 580', 'Glory 580 Pro', 'EC35', 'C71', 'Fengon 500', 'Seres 3', 'Fengon ix5', 'Fengon ix7'],
  },
  {
    name: 'Brilliance',
    models: ['V5', 'V6', 'H230', 'H320', 'H530', 'V3', 'V7'],
  },
  {
    name: 'Zotye',
    models: ['T600', 'T700', 'T800', 'Z300', 'Z500', 'SR9', 'E200', 'T300'],
  },
  {
    name: 'Zeekr',
    models: ['001', '007', '009', 'X', 'MIX', '001 FR'],
  },
  {
    name: 'Omoda',
    models: ['C5', 'C9', 'S5', 'E5'],
  },
  {
    name: 'Jaecoo',
    models: ['J7', 'J8', 'J6'],
  },
  {
    name: 'Ora',
    models: ['Good Cat', 'Ballet Cat', 'Lightning Cat', 'Funky Cat', 'Cherry Cat', 'Punk Cat'],
  },
  {
    name: 'Wey',
    models: ['Coffee 01', 'Coffee 02', 'Mocha', 'Latte', 'Lanshan', 'Blue Mountain', 'Gaoshan'],
  },
  {
    name: 'Hycan',
    models: ['007', 'Z03', 'A06', 'V09'],
  },
  {
    name: 'WM Motor',
    models: ['EX5', 'EX6', 'W6', 'M7'],
  },
  {
    name: 'Soueast',
    models: ['DX3', 'DX5', 'DX7', 'DX8', 'DX9', 'A5'],
  },
  {
    name: 'SWM',
    models: ['G01', 'G05', 'Tiger', 'Iron', 'X3', 'X7'],
  },
  {
    name: 'Livan',
    models: ['RL9', '7', '9', 'Maple 80V', 'Maple 60S'],
  },
  {
    name: 'Radar',
    models: ['RD6'],
  },
  {
    name: 'Forthing',
    models: ['T5', 'T5 EVO', 'Yacht', 'Friday', 'Thunder', 'M7', 'Joyear'],
  },
  {
    name: 'JMC',
    models: ['Vigus', 'Yusheng S330', 'Yusheng S350', 'Baodian'],
  },
  {
    name: 'ZX Auto',
    models: ['GrandTiger', 'Terralord', 'Weishi'],
  },
  {
    name: 'Dayun',
    models: ['Yuanzhi M1', 'Yuehu', 'Yuanhang Y6', 'Yuanhang H8'],
  },
  {
    name: 'Qoros',
    models: ['Qoros 3', 'Qoros 5', 'Qoros 7'],
  },
  {
    name: 'Leopaard',
    models: ['CS9', 'CS10', 'Mattu'],
  },
  {
    name: 'Borgward',
    models: ['BX3', 'BX5', 'BX6', 'BX7'],
  },
  {
    name: 'Hanteng',
    models: ['X5', 'X7', 'X8'],
  },
  {
    name: 'Landwind',
    models: ['X2', 'X5', 'X7', 'Xiaoyao'],
  },
  {
    name: 'Traum',
    models: ['S70', 'SEEK 5'],
  },

  // ── American brands ────────────────────────────────────────────────────────
  {
    name: 'Chevrolet',
    models: ['Cobalt', 'Nexia', 'Nexia 3', 'Lacetti', 'Malibu', 'Malibu 2', 'Captiva', 'Equinox', 'Spark', 'Aveo', 'Cruze', 'Tahoe', 'Suburban', 'TrailBlazer', 'Blazer', 'Silverado', 'Traverse', 'Trax', 'Blazer EV', 'Gentra', 'Onix', 'Volt', 'Bolt EV', 'Camaro', 'Corvette', 'Colorado', 'Impala', 'Orlando'],
  },
  {
    name: 'Ford',
    models: ['Focus', 'Mondeo', 'Explorer', 'Expedition', 'Ranger', 'F-150', 'Transit', 'Kuga', 'Edge', 'Escape', 'Mustang', 'EcoSport', 'Puma', 'Bronco', 'Maverick', 'Mach-E', 'F-250', 'F-350', 'Everest', 'Territory'],
  },
  {
    name: 'Tesla',
    models: ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'],
  },
  {
    name: 'Jeep',
    models: ['Grand Cherokee', 'Cherokee', 'Wrangler', 'Compass', 'Renegade', 'Gladiator', 'Commander', 'Grand Wagoneer', 'Avenger'],
  },
  {
    name: 'Cadillac',
    models: ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'Eldorado', 'SRX', 'Lyriq', 'Celestiq', 'Optiq'],
  },
  {
    name: 'Lincoln',
    models: ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'MKZ', 'Continental', 'MKC', 'MKT', 'Zephyr'],
  },
  {
    name: 'Chrysler',
    models: ['300', 'Pacifica', 'Voyager', 'Aspen', 'Sebring', 'Grand Voyager'],
  },
  {
    name: 'Dodge',
    models: ['Challenger', 'Charger', 'Durango', 'Ram 1500', 'Journey', 'Dart', 'Hornet', 'Avenger', 'Nitro', 'Caliber'],
  },
  {
    name: 'Buick',
    models: ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Verano', 'Regal', 'Electra', 'E5', 'E4'],
  },
  {
    name: 'GMC',
    models: ['Yukon', 'Suburban', 'Sierra', 'Terrain', 'Acadia', 'Canyon', 'Envoy', 'Hummer EV', 'Savana'],
  },
  {
    name: 'Hummer',
    models: ['H1', 'H2', 'H3', 'EV'],
  },
  {
    name: 'Lucid',
    models: ['Air', 'Gravity'],
  },
  {
    name: 'Rivian',
    models: ['R1T', 'R1S', 'R2', 'R3'],
  },
  {
    name: 'Fisker',
    models: ['Ocean', 'Pear', 'Ronin', 'Karma', 'Alaska'],
  },
  {
    name: 'Saleen',
    models: ['S7', 'S1', 'S302', 'Sportruck'],
  },
  {
    name: 'Shelby',
    models: ['Cobra', 'GT350', 'GT500', 'Super Snake', 'Series 1', 'F-150 Shelby'],
  },
  {
    name: 'Ram',
    models: ['1500', '2500', '3500', 'ProMaster', '1200', 'TRX'],
  },

  // ── European brands ────────────────────────────────────────────────────────
  {
    name: 'Skoda',
    models: ['Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Rapid', 'Scala', 'Kamiq', 'Fabia', 'Enyaq', 'Elroq', 'Kushaq', 'Slavia'],
  },
  {
    name: 'Peugeot',
    models: ['206', '207', '208', '301', '306', '307', '308', '406', '407', '408', '508', '2008', '3008', '4008', '5008', 'Partner', 'Boxer', 'Expert', 'Rifter', 'Traveller'],
  },
  {
    name: 'Renault',
    models: ['Logan', 'Sandero', 'Duster', 'Megane', 'Clio', 'Laguna', 'Scenic', 'Kadjar', 'Koleos', 'Arkana', 'Captur', 'Trafic', 'Master', 'Kangoo', 'Austral', 'Rafale', 'Espace', 'Talisman', 'Kwid', 'Triber', 'Kiger'],
  },
  {
    name: 'Alpine',
    models: ['A110', 'A290', 'A390'],
  },
  {
    name: 'Seat',
    models: ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Alhambra', 'Toledo', 'Exeo', 'Mii'],
  },
  {
    name: 'Fiat',
    models: ['Punto', 'Bravo', 'Tipo', 'Ducato', '500', 'Doblo', 'Panda', '500X', '500L', 'Fullback', 'Talento', 'Cronos', 'Pulse', 'Fastback'],
  },
  {
    name: 'Alfa Romeo',
    models: ['Giulia', 'Stelvio', 'Tonale', 'Milano', 'Junior', '147', '156', '159', 'Brera', 'Spider', 'Giulietta', 'Mito'],
  },
  {
    name: 'Volvo',
    models: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V40', 'V60', 'V90', 'C40', 'EX30', 'EX90', 'EM90', 'Polestar 2'],
  },
  {
    name: 'Land Rover',
    models: ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Discovery', 'Discovery Sport', 'Defender', 'Freelander'],
  },
  {
    name: 'Jaguar',
    models: ['F-Pace', 'E-Pace', 'I-Pace', 'XE', 'XF', 'XJ', 'F-Type', 'S-Type', 'X-Type'],
  },
  {
    name: 'Mini',
    models: ['Cooper', 'Cooper S', 'Countryman', 'Clubman', 'Paceman', 'Roadster', 'Convertible', 'Aceman'],
  },
  {
    name: 'Bentley',
    models: ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne', 'Azure', 'Bacalar', 'Batur'],
  },
  {
    name: 'Rolls-Royce',
    models: ['Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre'],
  },
  {
    name: 'Ferrari',
    models: ['Roma', 'Portofino', 'SF90', 'F8 Tributo', '296 GTB', '812 Superfast', 'Purosangue', 'LaFerrari', 'Enzo', '458', '488', 'F12', 'GTC4Lusso'],
  },
  {
    name: 'Lamborghini',
    models: ['Urus', 'Huracan', 'Aventador', 'Revuelto', 'Temerario', 'Gallardo', 'Murcielago', 'Diablo'],
  },
  {
    name: 'Bugatti',
    models: ['Chiron', 'Veyron', 'Divo', 'Mistral', 'Bolide', 'EB110'],
  },
  {
    name: 'Koenigsegg',
    models: ['Jesko', 'Regera', 'Gemera', 'Agera', 'CCX', 'One:1'],
  },
  {
    name: 'Pagani',
    models: ['Huayra', 'Zonda', 'Utopia'],
  },
  {
    name: 'Maserati',
    models: ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'Grecale', 'MC20', 'GranCabrio'],
  },
  {
    name: 'McLaren',
    models: ['720S', '765LT', 'GT', 'Artura', '570S', 'P1', '750S', 'Senna', 'Speedtail'],
  },
  {
    name: 'Aston Martin',
    models: ['DB11', 'DB12', 'Vantage', 'DBS', 'DBX', 'Valkyrie', 'Valhalla', 'Rapide', 'Vanquish'],
  },
  {
    name: 'Polestar',
    models: ['1', '2', '3', '4', '5'],
  },
  {
    name: 'Saab',
    models: ['9-3', '9-5', '9-7X', '900', '9000'],
  },
  {
    name: 'Pontiac',
    models: ['Grand Prix', 'Firebird', 'Trans Am', 'GTO', 'Vibe', 'Solstice', 'Sunfire'],
  },
  {
    name: 'Citroen',
    models: ['C3', 'C4', 'C5', 'C5 X', 'Berlingo', 'Jumper', 'SpaceTourer', 'Picasso', 'C-Elysee', 'DS3', 'DS4', 'DS5', 'DS7'],
  },
  {
    name: 'Dacia',
    models: ['Duster', 'Logan', 'Sandero', 'Jogger', 'Spring', 'Bigster'],
  },
  {
    name: 'Lancia',
    models: ['Ypsilon', 'Delta', 'Thesis', 'Stratos', 'Thema', 'Phedra'],
  },

  // ── Other Asian brands ─────────────────────────────────────────────────────
  {
    name: 'Ravon',
    models: ['R2', 'R3', 'R4', 'Gextra', 'Nexia R3'],
  },
  {
    name: 'Tata',
    models: ['Nexon', 'Harrier', 'Safari', 'Tiago', 'Tigor', 'Punch', 'Altroz', 'Indica', 'Nano', 'Curvv', 'Sierra'],
  },
  {
    name: 'Mahindra',
    models: ['Scorpio', 'Thar', 'XUV700', 'XUV300', 'Bolero', 'XUV500', 'KUV100', 'Marazzo', 'Alturas G4'],
  },
  {
    name: 'VinFast',
    models: ['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'Lux A2.0', 'Lux SA2.0', 'Fadil'],
  },
  {
    name: 'Iran Khodro',
    models: ['Samand', 'Tara', 'Dena', 'Runna', 'Soren', 'Paykan', 'Arisun', 'Sahra', 'Ray'],
  },
  {
    name: 'Saipa',
    models: ['Tiba', 'Saina', 'Quik', 'Shahin', 'Pride', 'Aria', 'Atlas', 'Sahand'],
  },
  {
    name: 'Proton',
    models: ['X50', 'X70', 'X90', 'Saga', 'Persona', 'Iriz', 'S70', 'Wira', 'Waja', 'Exora', 'Preve'],
  },
  {
    name: 'Perodua',
    models: ['Myvi', 'Bezza', 'Axia', 'Ativa', 'Alza', 'Aruz', 'Kelisa', 'Kancil', 'Kenari'],
  },

  // ── CIS / Russian brands ───────────────────────────────────────────────────
  {
    name: 'Lada',
    models: ['Vesta', 'Granta', 'XRAY', 'Largus', 'Niva', 'Niva Legend', 'Niva Travel', 'Priora', 'Kalina', '2107', '2106', '2105', '2109', '2110', '2112', '2114', '2115', 'Aura', 'Iskra'],
  },
  {
    name: 'GAZ',
    models: ['Gazelle', 'Gazelle Next', 'Valdai', 'Sadko', 'Sobol', 'Gazelle NN', 'Vektor', 'Volga', 'Volga Siber', '3110', '31105'],
  },
  {
    name: 'UAZ',
    models: ['Patriot', 'Hunter', 'Bukhanka', 'Pickup', '469', '3151', '452', 'Profi'],
  },
  {
    name: 'Moskvich',
    models: ['3', '3e', '6', '2141', '2140', '412'],
  },
  {
    name: 'Aurus',
    models: ['Senat', 'Komendant', 'Arsenal'],
  },
  {
    name: 'ZAZ',
    models: ['Chance', 'Sens', 'Lanos', 'Vida', 'Forza', 'Slavuta', 'Tavria', '968'],
  },
  {
    name: 'IZH',
    models: ['2126 Oda', '2717', '2125 Kombi', '21175', 'Oda'],
  },
  {
    name: 'LuAZ',
    models: ['969', '1302', 'Proto'],
  },
  {
    name: 'PAZ',
    models: ['3205', '4234', 'Vector Next', '3204', '3206'],
  },
  {
    name: 'LiAZ',
    models: ['5256', '5292', '6213', '4292', '5293'],
  },

  // Trucks / Commercial / Buses
  {
    name: 'KamAZ',
    models: ['5490', '65115', '6520', '43118', '54115', '65220', '54901', 'Compass', 'Ataman'],
  },
  {
    name: 'MAZ',
    models: ['5340', '5440', '6312', '4371', '5551', '6430'],
  },
  {
    name: 'ZIL',
    models: ['130', '131', '4331', '5301', '133'],
  },
  {
    name: 'Sinotruk / HOWO',
    models: ['HOWO', 'HOWO A7', 'HOWO T7H', 'HOWO T5G', 'HOWO TX', 'HOWO V7G', 'HOWO Light Truck'],
  },
  {
    name: 'Shacman',
    models: ['F2000', 'F3000', 'X3000', 'X5000', 'M3000', 'X6000', 'L3000'],
  },
  {
    name: 'Hino',
    models: ['300', '500', '700', 'Dutro', 'Profia', 'Ranger'],
  },
  {
    name: 'Higer',
    models: ['KLQ6119', 'KLQ6129', 'KLQ6856', 'KLQ6896', 'KLQ6127'],
  },
  {
    name: 'Yutong',
    models: ['ZK6118', 'ZK6122', 'ZK6129', 'ZK6852', 'ZK6899', 'ZK6121'],
  },
  {
    name: 'King Long',
    models: ['XMQ6127', 'XMQ6129', 'XMQ6800', 'XMQ6900'],
  },
  {
    name: 'Beiben',
    models: ['V3', 'NG80', '2638'],
  },
  {
    name: 'CAMC',
    models: ['H7', 'H9', 'M7'],
  },
  {
    name: 'Chenglong',
    models: ['H5', 'H7', 'T5', 'T7'],
  },
  {
    name: 'Sany',
    models: ['SY412', 'Electric Trucks'],
  },
  {
    name: 'FAW Truck',
    models: ['J6P', 'J7', 'J6L', 'Tiger V'],
  },
  {
    name: 'Scania',
    models: ['R-series', 'S-series', 'G-series', 'P-series', 'L-series', 'V8'],
  },
  {
    name: 'Volvo Trucks',
    models: ['FH', 'FM', 'FMX', 'FL', 'FE', 'FH16', 'VNL'],
  },
  {
    name: 'Iveco',
    models: ['Daily', 'EuroCargo', 'Stralis', 'Trakker', 'S-Way', 'X-Way', 'T-Way'],
  },
  {
    name: 'Mercedes-Benz Trucks',
    models: ['Actros', 'Arocs', 'Atego', 'Unimog', 'Econic', 'Zetros'],
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
