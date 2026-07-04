// Same dataset as frontend/lib/vehicleData.ts — keep in sync.

class VehicleBrand {
  final String name;
  final List<String> models;
  const VehicleBrand(this.name, this.models);
}

const List<VehicleBrand> kVehicleBrands = [
  // ── Japanese ──────────────────────────────────────────────────────────────
  VehicleBrand('Toyota', ['Camry', 'Corolla', 'Land Cruiser 200', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander', 'RAV4', 'Venza', 'Fortuner', 'HiAce', 'Hilux', 'Yaris', 'Avensis', 'Mark II', 'Crown', 'Alphard', 'Vellfire', 'Prius', 'Vitz', 'Rush', 'Innova', 'Sienna', 'Tacoma', 'Tundra', 'Sequoia', 'CHR', '4Runner', 'Century', 'Avanza', 'Previa', 'Noah', 'Voxy', 'Esquire', 'Estima', 'Harrier', 'Mark X', 'Allion', 'Premio', 'Aqua', 'Passo', 'Raize', 'Supra', '86', 'GR86', 'Corolla Cross', 'Yaris Cross', 'bZ4X', 'Dyna', 'LiteAce', 'TownAce']),
  VehicleBrand('Lexus', ['ES', 'IS', 'GS', 'LS', 'NX', 'RX', 'GX', 'LX', 'UX', 'RC', 'LC', 'RZ', 'LBX', 'LM', 'HS', 'CT', 'SC', 'LFA']),
  VehicleBrand('Nissan', ['Juke', 'Qashqai', 'X-Trail', 'Patrol', 'Pathfinder', 'Murano', 'Tiida', 'Sentra', 'Almera', 'Note', 'Micra', 'Navara', 'Armada', 'Altima', 'Maxima', 'Kicks', 'Terra', 'Leaf', 'Ariya', 'Sakura', 'Z', 'GT-R', 'Skyline', 'Serena', 'Elgrand', 'Caravan', 'NV200', 'NV350', 'Fuga', 'Teana', 'Sylphy', 'Bluebird', 'Sunny', 'Terrano']),
  VehicleBrand('Infiniti', ['Q50', 'Q60', 'Q70', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80', 'FX35', 'FX37', 'FX50', 'G35', 'G37', 'EX35', 'JX35', 'M35', 'M37', 'M45']),
  VehicleBrand('Honda', ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Odyssey', 'Fit', 'Jazz', 'City', 'Legend', 'Element', 'Passport', 'Ridgeline', 'Vezel', 'ZR-V', 'CR-Z', 'Insight', 'Stepwgn', 'Freed', 'N-Box', 'NSX']),
  VehicleBrand('Acura', ['MDX', 'RDX', 'TLX', 'ILX', 'NSX', 'ZDX', 'Integra', 'RLX', 'TSX', 'RSX']),
  VehicleBrand('Mazda', ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-7', 'CX-8', 'CX-9', 'CX-50', 'CX-60', 'CX-90', 'MX-5', 'MX-30', 'BT-50', 'RX-7', 'RX-8', 'Demio', 'MPV']),
  VehicleBrand('Mitsubishi', ['Outlander', 'Outlander PHEV', 'Pajero', 'Pajero Sport', 'Lancer', 'Eclipse Cross', 'ASX', 'L200', 'Galant', 'Carisma', 'Colt', 'Delica', 'Grandis', 'Montero', 'Montero Sport', 'Triton', 'Mirage', 'Xpander']),
  VehicleBrand('Subaru', ['Outback', 'Forester', 'XV', 'Impreza', 'Legacy', 'BRZ', 'WRX', 'Ascent', 'Crosstrek', 'Levorg', 'Solterra', 'Exiga']),
  VehicleBrand('Suzuki', ['Vitara', 'Grand Vitara', 'Swift', 'Ignis', 'Jimny', 'Baleno', 'Ertiga', 'SX4', 'Carry', 'Alto', 'Dzire', 'Celerio', 'Ciaz']),
  VehicleBrand('Daihatsu', ['Terios', 'Mira', 'Move', 'Hijet', 'Rocky', 'Sirion', 'Tanto', 'Sigra', 'Xenia']),
  VehicleBrand('Isuzu', ['D-Max', 'MU-X', 'Trooper', 'NPR', 'NQR', 'Elf']),

  // ── Korean ────────────────────────────────────────────────────────────────
  VehicleBrand('Hyundai', ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta', 'Accent', 'Kona', 'Palisade', 'i30', 'i10', 'i20', 'i40', 'Starex', 'Porter', 'Staria', 'Ioniq 5', 'Ioniq 6', 'Venue', 'Veloster', 'Genesis', 'Azera', 'Grandeur', 'Bayon', 'Casper']),
  VehicleBrand('Kia', ['Rio', 'Cerato', 'Sportage', 'Sorento', 'Carnival', 'Stinger', 'K5', 'K8', 'K3', 'K7', 'K9', 'Seltos', 'Niro', 'Telluride', 'EV6', 'EV9', 'Picanto', 'Morning', 'Soul', 'Stonic', 'Mohave', 'Cadenza', 'Bongo', 'Carens']),
  VehicleBrand('Genesis', ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'GV90']),
  VehicleBrand('Ssangyong', ['Rexton', 'Actyon', 'Tivoli', 'Korando', 'Musso', 'Torres', 'Kyron', 'Chairman']),
  VehicleBrand('Daewoo', ['Nexia', 'Nexia 3', 'Matiz', 'Lanos', 'Espero', 'Tico', 'Gentra', 'Cobalt', 'Lacetti', 'Leganza', 'Nubira', 'Damas', 'Labo']),

  // ── German ────────────────────────────────────────────────────────────────
  VehicleBrand('Mercedes-Benz', ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'B-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'V-Class', 'Vito', 'Sprinter', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'AMG GT', 'SL', 'ML', 'GL', 'GLK', 'Maybach S-Class', 'Maybach GLS']),
  VehicleBrand('BMW', ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i3', 'i4', 'i5', 'i7', 'i8', 'iX', 'M2', 'M3', 'M4', 'M5', 'M8', 'X3 M', 'X5 M', 'X6 M']),
  VehicleBrand('Audi', ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'Q8 e-tron', 'TT', 'R8', 'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']),
  VehicleBrand('Volkswagen', ['Polo', 'Golf', 'Jetta', 'Passat', 'Tiguan', 'Touareg', 'T-Roc', 'Touran', 'Arteon', 'ID.3', 'ID.4', 'ID.5', 'ID.6', 'ID.7', 'Sharan', 'Phaeton', 'Caddy', 'Transporter', 'Multivan', 'Crafter', 'Amarok', 'T-Cross', 'Taigo', 'Teramont', 'Atlas', 'Scirocco', 'Beetle']),
  VehicleBrand('Porsche', ['Cayenne', 'Macan', 'Panamera', '911', '718 Cayman', '718 Boxster', 'Taycan']),
  VehicleBrand('Opel', ['Astra', 'Insignia', 'Corsa', 'Mokka', 'Grandland', 'Crossland', 'Zafira', 'Combo', 'Vivaro', 'Adam', 'Cascada', 'Antara', 'Meriva', 'Vectra', 'Omega']),

  // ── Chinese ───────────────────────────────────────────────────────────────
  VehicleBrand('BYD', ['Han', 'Han EV', 'Tang', 'Tang EV', 'Song', 'Song Plus', 'Song Pro', 'Yuan', 'Yuan Plus', 'Atto 3', 'Seal', 'Seal U', 'Dolphin', 'Seagull', 'F3', 'Qin Plus']),
  VehicleBrand('Chery', ['Tiggo 4', 'Tiggo 4 Pro', 'Tiggo 7', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max', 'Tiggo 9', 'Arrizo 5', 'Arrizo 5 Pro', 'Arrizo 6', 'Arrizo 8', 'Omoda 5']),
  VehicleBrand('Geely', ['Coolray', 'Atlas', 'Atlas Pro', 'Emgrand', 'Tugella', 'Monjaro', 'Azkarra', 'Okavango', 'Boyue', 'Icon', 'Preface', 'Xingyue L']),
  VehicleBrand('Haval', ['F7', 'F7x', 'H6', 'H6 GT', 'H9', 'Jolion', 'Dargo', 'Big Dog', 'Raptor', 'M6']),
  VehicleBrand('Tank', ['300', '400', '500', '700', '800']),
  VehicleBrand('Changan', ['CS15', 'CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'CS95', 'UNI-T', 'UNI-K', 'UNI-V', 'Alsvin', 'Oshan X5', 'Oshan X7', 'Hunter']),
  VehicleBrand('GAC', ['GS3', 'GS4', 'GS5', 'GS8', 'GN8', 'M8', 'Aion S', 'Aion V', 'Aion LX', 'Aion Y']),
  VehicleBrand('Great Wall', ['Poer', 'Cannon', 'Hover H5', 'Hover H6', 'Hover H9', 'M4', 'Wingle 7']),
  VehicleBrand('MG', ['3', '5', '6', 'ZS', 'HS', 'RX5', 'RX8', 'EHS', 'Marvel R', 'GT', 'MG4 EV']),
  VehicleBrand('BAIC', ['X3', 'X5', 'X7', 'BJ40', 'BJ60', 'BJ80', 'BJ212', 'EU5', 'EC3']),
  VehicleBrand('JAC', ['S3', 'S4', 'S7', 'T6', 'T8', 'JS4', 'JS6', 'J7', 'JS2']),
  VehicleBrand('Lifan', ['X60', 'X70', 'X80', '620', '720', '820', 'Solano', 'Myway', 'Smily']),
  VehicleBrand('Foton', ['Tunland', 'Sauvana', 'Aumark', 'Auman', 'Tunland G7']),
  VehicleBrand('Jetour', ['X70', 'X70 Plus', 'X90 Plus', 'X95', 'T2', 'Dashing']),
  VehicleBrand('Omoda', ['C5', 'C9', 'S5', 'E5']),
  VehicleBrand('Jaecoo', ['J7', 'J8', 'J6']),
  VehicleBrand('Hongqi', ['H5', 'H6', 'H9', 'HS5', 'HS7', 'E-HS9', 'EH7', 'LS7', 'HQ9']),
  VehicleBrand('Nio', ['ET5', 'ET7', 'EC6', 'ES6', 'ES7', 'ES8', 'EL6', 'EL7', 'EL8', 'ET9']),
  VehicleBrand('Li Auto', ['L6', 'L7', 'L8', 'L9', 'Li ONE', 'Mega']),
  VehicleBrand('Xpeng', ['P5', 'P7', 'G3', 'G6', 'G9', 'X9']),
  VehicleBrand('Wuling', ['Hongguang MINI EV', 'Binguo', 'Cloud', 'Air EV', 'Hongguang S', 'Hongguang V']),
  VehicleBrand('Zeekr', ['001', '007', '009', 'X', 'MIX']),
  VehicleBrand('Neta', ['Neta V', 'Neta U', 'Neta S', 'Neta GT', 'Neta L']),
  VehicleBrand('Lynk & Co', ['01', '02', '03', '05', '06', '07', '08', '09']),
  VehicleBrand('Aion', ['Aion S', 'Aion S Plus', 'Aion V', 'Aion V Plus', 'Aion LX', 'Aion Y', 'Aion Y Plus', 'Hyper GT']),
  VehicleBrand('DFSK', ['Glory 500', 'Glory 580', 'Glory 580 Pro', 'Fengon 500', 'Fengon ix5', 'Fengon ix7']),
  VehicleBrand('Dong Feng', ['AX4', 'AX7', 'S30', 'H30', 'Glory', 'Box', 'Nammi 01']),
  VehicleBrand('FAW', ['Bestune T77', 'Bestune T99', 'Bestune B70', 'Bestune T33', 'Bestune M9', 'Hongqi H5']),
  VehicleBrand('Exeed', ['TXL', 'VX', 'RX', 'LX', 'TX']),
  VehicleBrand('Ora', ['Good Cat', 'Ballet Cat', 'Lightning Cat', 'Funky Cat']),
  VehicleBrand('Wey', ['Coffee 01', 'Coffee 02', 'Mocha', 'Latte', 'Blue Mountain']),
  VehicleBrand('Maxus', ['G10', 'G20', 'G50', 'G70', 'G90', 'T60', 'T70', 'Mifa 9', 'Territory', 'V80', 'V90']),

  // ── American ──────────────────────────────────────────────────────────────
  VehicleBrand('Chevrolet', ['Cobalt', 'Nexia', 'Nexia 3', 'Lacetti', 'Malibu', 'Captiva', 'Equinox', 'Spark', 'Aveo', 'Cruze', 'Tahoe', 'Suburban', 'TrailBlazer', 'Blazer', 'Silverado', 'Traverse', 'Trax', 'Gentra', 'Camaro', 'Corvette', 'Colorado', 'Impala']),
  VehicleBrand('Ford', ['Focus', 'Mondeo', 'Explorer', 'Expedition', 'Ranger', 'F-150', 'Transit', 'Kuga', 'Edge', 'Escape', 'Mustang', 'EcoSport', 'Puma', 'Bronco', 'Maverick', 'Mach-E', 'F-250', 'F-350', 'Everest', 'Territory']),
  VehicleBrand('Tesla', ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster']),
  VehicleBrand('Jeep', ['Grand Cherokee', 'Cherokee', 'Wrangler', 'Compass', 'Renegade', 'Gladiator', 'Commander', 'Grand Wagoneer', 'Avenger']),
  VehicleBrand('Cadillac', ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'SRX', 'Lyriq']),
  VehicleBrand('Lincoln', ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'MKZ', 'Continental']),
  VehicleBrand('Chrysler', ['300', '300C', 'Pacifica', 'Voyager', 'Sebring']),
  VehicleBrand('Dodge', ['Challenger', 'Charger', 'Durango', 'Ram 1500', 'Journey', 'Dart', 'Hornet']),
  VehicleBrand('Buick', ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Verano', 'Regal', 'Electra']),
  VehicleBrand('GMC', ['Yukon', 'Suburban', 'Sierra', 'Terrain', 'Acadia', 'Canyon', 'Envoy', 'Hummer EV']),
  VehicleBrand('Hummer', ['H1', 'H2', 'H3', 'EV']),
  VehicleBrand('Ram', ['1500', '2500', '3500', 'ProMaster', 'TRX']),

  // ── European ──────────────────────────────────────────────────────────────
  VehicleBrand('Skoda', ['Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Rapid', 'Scala', 'Kamiq', 'Fabia', 'Enyaq', 'Kushaq']),
  VehicleBrand('Peugeot', ['206', '207', '208', '301', '306', '307', '308', '406', '407', '408', '508', '2008', '3008', '4008', '5008', 'Partner', 'Boxer', 'Expert', 'Rifter']),
  VehicleBrand('Renault', ['Logan', 'Sandero', 'Duster', 'Megane', 'Clio', 'Laguna', 'Scenic', 'Kadjar', 'Koleos', 'Arkana', 'Captur', 'Trafic', 'Master', 'Kangoo', 'Austral', 'Talisman', 'Kwid']),
  VehicleBrand('Seat', ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Alhambra', 'Toledo']),
  VehicleBrand('Fiat', ['Punto', 'Bravo', 'Tipo', 'Ducato', '500', 'Doblo', 'Panda', '500X', '500L', 'Cronos']),
  VehicleBrand('Alfa Romeo', ['Giulia', 'Stelvio', 'Tonale', '147', '156', '159', 'Brera', 'Spider', 'Giulietta', 'Mito']),
  VehicleBrand('Volvo', ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V40', 'V60', 'V90', 'C40', 'EX30', 'EX90']),
  VehicleBrand('Land Rover', ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Discovery', 'Discovery Sport', 'Defender', 'Freelander']),
  VehicleBrand('Jaguar', ['F-Pace', 'E-Pace', 'I-Pace', 'XE', 'XF', 'XJ', 'F-Type', 'S-Type']),
  VehicleBrand('Mini', ['Cooper', 'Cooper S', 'Countryman', 'Clubman', 'Paceman', 'Convertible', 'Aceman']),
  VehicleBrand('Bentley', ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne', 'Bacalar']),
  VehicleBrand('Rolls-Royce', ['Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre']),
  VehicleBrand('Ferrari', ['Roma', 'Portofino', 'SF90', 'F8 Tributo', '296 GTB', '812 Superfast', 'Purosangue', '458', '488', 'F12']),
  VehicleBrand('Lamborghini', ['Urus', 'Huracan', 'Aventador', 'Revuelto', 'Gallardo', 'Murcielago', 'Diablo']),
  VehicleBrand('Maserati', ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'Grecale', 'MC20']),
  VehicleBrand('McLaren', ['720S', '765LT', 'GT', 'Artura', '570S', 'P1', '750S', 'Senna']),
  VehicleBrand('Aston Martin', ['DB11', 'DB12', 'Vantage', 'DBS', 'DBX', 'Valkyrie', 'Rapide', 'Vanquish']),
  VehicleBrand('Polestar', ['1', '2', '3', '4', '5']),
  VehicleBrand('Bugatti', ['Chiron', 'Veyron', 'Divo', 'Mistral', 'Bolide']),
  VehicleBrand('Citroen', ['C3', 'C4', 'C5', 'C5 X', 'Berlingo', 'Jumper', 'Picasso', 'C-Elysee', 'DS3', 'DS4', 'DS5', 'DS7']),
  VehicleBrand('Dacia', ['Duster', 'Logan', 'Sandero', 'Jogger', 'Spring', 'Bigster']),
  VehicleBrand('Saab', ['9-3', '9-5', '9-7X', '900']),

  // ── CIS / Russian ─────────────────────────────────────────────────────────
  VehicleBrand('Lada', ['Vesta', 'Granta', 'XRAY', 'Largus', 'Niva', 'Niva Legend', 'Niva Travel', 'Priora', 'Kalina', '2107', '2106', '2105', '2109', '2110', '2112', '2114', '2115']),
  VehicleBrand('GAZ', ['Gazelle', 'Gazelle Next', 'Valdai', 'Sadko', 'Sobol', 'Volga', 'Volga Siber', '3110', '31105']),
  VehicleBrand('UAZ', ['Patriot', 'Hunter', 'Bukhanka', 'Pickup', '469', '3151', '452', 'Profi']),
  VehicleBrand('Moskvich', ['3', '3e', '6', '2141', '2140', '412']),
  VehicleBrand('Aurus', ['Senat', 'Komendant', 'Arsenal']),

  // ── Trucks / Commercial ───────────────────────────────────────────────────
  VehicleBrand('KamAZ', ['5490', '65115', '6520', '43118', '54901', 'Compass']),
  VehicleBrand('MAZ', ['5340', '5440', '6312', '4371', '5551', '6430']),
  VehicleBrand('Scania', ['R-series', 'S-series', 'G-series', 'P-series', 'V8']),
  VehicleBrand('Volvo Trucks', ['FH', 'FM', 'FMX', 'FL', 'FE', 'FH16', 'VNL']),
  VehicleBrand('Iveco', ['Daily', 'EuroCargo', 'Stralis', 'Trakker', 'S-Way', 'X-Way']),
  VehicleBrand('Hino', ['300', '500', '700', 'Dutro', 'Profia', 'Ranger']),
  VehicleBrand('Sinotruk', ['HOWO', 'HOWO A7', 'HOWO T7H', 'HOWO T5G', 'HOWO TX']),
  VehicleBrand('Shacman', ['F2000', 'F3000', 'X3000', 'X5000', 'M3000', 'X6000']),

  VehicleBrand('Другое', ['Другое']),
];

// Sorted alphabetically, "Другое" last — mirrors SORTED_BRANDS from frontend.
final List<VehicleBrand> kSortedBrands = [
  ...kVehicleBrands.where((b) => b.name != 'Другое').toList()
    ..sort((a, b) => a.name.compareTo(b.name)),
  kVehicleBrands.firstWhere((b) => b.name == 'Другое'),
];

// Quick lookup map: brand name → models list.
final Map<String, List<String>> kBrandModels = {
  for (final b in kVehicleBrands) b.name: b.models,
};
