"""Seed car brands and models + default categories."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import Brand, CarModel, Category

BRANDS_DATA = [
    # (name, slug, country, is_popular, [models...])
    ("Toyota", "toyota", "Japan", True, ["Camry", "Corolla", "RAV4", "Land Cruiser", "Prius", "Highlander", "Yaris", "Avalon", "4Runner", "Sequoia", "Tundra", "Tacoma", "Sienna", "Venza", "C-HR", "GR86", "Supra"]),
    ("BMW", "bmw", "Germany", True, ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "X7", "M3", "M5", "1 Series", "2 Series", "4 Series", "6 Series", "8 Series", "Z4", "i3", "i4", "i7", "iX"]),
    ("Mercedes-Benz", "mercedes-benz", "Germany", True, ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "A-Class", "B-Class", "CLA", "CLS", "AMG GT", "G-Class", "EQC", "EQS", "Maybach S-Class"]),
    ("Audi", "audi", "Germany", True, ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "e-tron", "RS3", "RS6", "S3", "S5"]),
    ("Hyundai", "hyundai", "South Korea", True, ["Sonata", "Elantra", "Tucson", "Santa Fe", "Palisade", "Kona", "Accent", "Veloster", "i30", "i20", "Creta", "Venue", "Ioniq 5", "Ioniq 6"]),
    ("Kia", "kia", "South Korea", True, ["Sportage", "Sorento", "Telluride", "Forte", "K5", "Stinger", "Soul", "Carnival", "Niro", "EV6", "Rio", "Seltos", "Picanto"]),
    ("Honda", "honda", "Japan", True, ["Civic", "Accord", "CR-V", "Pilot", "HR-V", "Passport", "Odyssey", "Ridgeline", "Fit", "Insight", "Jazz"]),
    ("Chevrolet", "chevrolet", "USA", True, ["Malibu", "Impala", "Camaro", "Corvette", "Equinox", "Traverse", "Tahoe", "Suburban", "Silverado", "Colorado", "Blazer", "Trailblazer", "Spark", "Sonic", "Cruze"]),
    ("Daewoo", "daewoo", "South Korea", True, ["Nexia", "Matiz", "Lacetti", "Gentra", "Cobalt", "Lanos", "Nubira", "Leganza", "Tosca"]),
    ("Nissan", "nissan", "Japan", True, ["Altima", "Maxima", "Sentra", "Versa", "Rogue", "Murano", "Pathfinder", "Armada", "Frontier", "Titan", "370Z", "GT-R", "Leaf", "Kicks", "Juke", "X-Trail", "Qashqai"]),
    ("Volkswagen", "volkswagen", "Germany", True, ["Golf", "Jetta", "Passat", "Tiguan", "Atlas", "Arteon", "Polo", "Touareg", "Taos", "ID.4", "ID.3", "Phaeton", "CC"]),
    ("Ford", "ford", "USA", True, ["Mustang", "F-150", "Explorer", "Escape", "Edge", "Expedition", "Bronco", "Maverick", "Ranger", "Focus", "Fusion", "Fiesta", "EcoSport"]),
    ("Lexus", "lexus", "Japan", True, ["ES", "IS", "GS", "LS", "NX", "RX", "GX", "LX", "UX", "RC", "LC", "CT"]),
    ("Subaru", "subaru", "Japan", False, ["Outback", "Forester", "Impreza", "Legacy", "Crosstrek", "Ascent", "WRX", "BRZ", "Solterra"]),
    ("Mazda", "mazda", "Japan", False, ["Mazda3", "Mazda6", "CX-3", "CX-5", "CX-9", "CX-30", "CX-50", "MX-5 Miata", "MX-30"]),
    ("Mitsubishi", "mitsubishi", "Japan", False, ["Outlander", "Eclipse Cross", "Galant", "Lancer", "Montero", "Pajero", "ASX", "L200"]),
    ("Porsche", "porsche", "Germany", False, ["911", "Cayenne", "Macan", "Panamera", "Boxster", "Cayman", "Taycan"]),
    ("Land Rover", "land-rover", "UK", False, ["Range Rover", "Range Rover Sport", "Range Rover Evoque", "Discovery", "Discovery Sport", "Defender", "Freelander"]),
    ("Jeep", "jeep", "USA", False, ["Grand Cherokee", "Cherokee", "Wrangler", "Compass", "Renegade", "Gladiator", "Wagoneer"]),
    ("Volvo", "volvo", "Sweden", False, ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "C40"]),
    ("Skoda", "skoda", "Czech Republic", False, ["Octavia", "Superb", "Kodiaq", "Karoq", "Scala", "Rapid", "Fabia", "Kamiq"]),
    ("SEAT", "seat", "Spain", False, ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco", "Mii", "Alhambra"]),
    ("Renault", "renault", "France", False, ["Clio", "Megane", "Laguna", "Duster", "Captur", "Kadjar", "Koleos", "Arkana", "Talisman", "Zoe"]),
    ("Peugeot", "peugeot", "France", False, ["208", "308", "408", "508", "2008", "3008", "5008", "Rifter"]),
    ("Citroen", "citroen", "France", False, ["C3", "C4", "C5 X", "Berlingo", "C3 Aircross", "C5 Aircross"]),
    ("Opel", "opel", "Germany", False, ["Astra", "Corsa", "Insignia", "Mokka", "Crossland", "Grandland", "Zafira"]),
    ("Fiat", "fiat", "Italy", False, ["500", "Punto", "Bravo", "Tipo", "Panda", "Doblo", "Ducato"]),
    ("Alfa Romeo", "alfa-romeo", "Italy", False, ["Giulia", "Giulietta", "Stelvio", "Tonale", "4C", "MiTo"]),
    ("Ferrari", "ferrari", "Italy", False, ["488", "F8 Tributo", "SF90", "Roma", "Portofino", "812 Superfast", "296 GTB"]),
    ("Lamborghini", "lamborghini", "Italy", False, ["Huracan", "Urus", "Aventador", "Revuelto"]),
    ("Maserati", "maserati", "Italy", False, ["Ghibli", "Quattroporte", "Levante", "GranTurismo", "Grecale"]),
    ("Tesla", "tesla", "USA", False, ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Roadster"]),
    ("Rivian", "rivian", "USA", False, ["R1T", "R1S"]),
    ("Lucid", "lucid", "USA", False, ["Air"]),
    ("Genesis", "genesis", "South Korea", False, ["G70", "G80", "G90", "GV70", "GV80", "GV60"]),
    ("Infiniti", "infiniti", "Japan", False, ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"]),
    ("Acura", "acura", "Japan", False, ["ILX", "TLX", "RLX", "MDX", "RDX", "NSX"]),
    ("Cadillac", "cadillac", "USA", False, ["CT4", "CT5", "Escalade", "XT4", "XT5", "XT6", "LYRIQ"]),
    ("Buick", "buick", "USA", False, ["Enclave", "Encore", "Encore GX", "Envision", "LaCrosse"]),
    ("Lincoln", "lincoln", "USA", False, ["Navigator", "Aviator", "Corsair", "Nautilus", "Continental"]),
    ("Chrysler", "chrysler", "USA", False, ["300", "Pacifica", "Voyager"]),
    ("Dodge", "dodge", "USA", False, ["Charger", "Challenger", "Durango", "Journey", "Viper"]),
    ("Ram", "ram", "USA", False, ["1500", "2500", "3500", "ProMaster"]),
    ("GMC", "gmc", "USA", False, ["Sierra", "Yukon", "Terrain", "Acadia", "Canyon", "Envoy"]),
    ("Bentley", "bentley", "UK", False, ["Bentayga", "Continental GT", "Flying Spur", "Mulsanne"]),
    ("Rolls-Royce", "rolls-royce", "UK", False, ["Ghost", "Phantom", "Cullinan", "Wraith", "Dawn", "Spectre"]),
    ("Aston Martin", "aston-martin", "UK", False, ["DB11", "Vantage", "DBS", "DBX", "Valkyrie"]),
    ("McLaren", "mclaren", "UK", False, ["720S", "570S", "GT", "Artura", "765LT"]),
    ("MINI", "mini", "UK", False, ["Cooper", "Clubman", "Countryman", "Convertible", "Paceman"]),
    ("Smart", "smart", "Germany", False, ["ForTwo", "ForFour"]),
    ("Dacia", "dacia", "Romania", False, ["Logan", "Sandero", "Duster", "Jogger", "Spring"]),
    ("Lada", "lada", "Russia", False, ["Vesta", "XRAY", "Granta", "Niva", "Priora", "Kalina", "Largus"]),
    ("UAZ", "uaz", "Russia", False, ["Patriot", "Hunter", "Pickup", "Bukhanka"]),
    ("GAZ", "gaz", "Russia", False, ["Gazelle", "Valdai"]),
    ("BYD", "byd", "China", False, ["Atto 3", "Han", "Tang", "Song", "Dolphin", "Seal", "Seagull"]),
    ("Geely", "geely", "China", False, ["Atlas", "Coolray", "Emgrand", "Monjaro", "Preface"]),
    ("Chery", "chery", "China", False, ["Tiggo 7 Pro", "Tiggo 8", "Arrizo 5", "Tiggo 4 Pro"]),
    ("Haval", "haval", "China", False, ["H6", "H9", "Jolion", "F7", "Dargo"]),
    ("Great Wall", "great-wall", "China", False, ["Wingle", "Hover H5", "Poer"]),
    ("JAC", "jac", "China", False, ["S3", "S5", "T6", "T8", "iEV7S"]),
    ("Changan", "changan", "China", False, ["CS35 Plus", "CS55 Plus", "CS75 Plus", "UNI-T", "UNI-K"]),
    ("MG", "mg", "UK/China", False, ["MG3", "MG5", "MG6", "ZS", "HS", "RX5", "4 EV"]),
    ("Suzuki", "suzuki", "Japan", False, ["Swift", "Vitara", "S-Cross", "Jimny", "Baleno", "Ertiga", "Grand Vitara"]),
    ("Isuzu", "isuzu", "Japan", False, ["D-Max", "MU-X", "Trooper"]),
    ("Ssangyong", "ssangyong", "South Korea", False, ["Rexton", "Tivoli", "Korando", "Musso"]),
]

DEFAULT_CATEGORIES = [
    {
        "name_ru": "Седаны",
        "name_tj": "Седанхо",
        "slug": "sedans",
        "icon_url": None,
        "description_ru": "Классические седаны для города и трассы",
        "description_tj": "Седанхои классики барои шахр ва рох",
        "filter_config": {"type": "sale"},
        "display_order": 1,
    },
    {
        "name_ru": "Внедорожники",
        "name_tj": "Внедорожникхо",
        "slug": "suvs",
        "icon_url": None,
        "description_ru": "SUV и внедорожники для любых дорог",
        "description_tj": "SUV барои хама намуди рох",
        "filter_config": {"type": "sale"},
        "display_order": 2,
    },
    {
        "name_ru": "В рассрочку",
        "name_tj": "Бо карз",
        "slug": "installment",
        "icon_url": None,
        "description_ru": "Автомобили с возможностью рассрочки",
        "description_tj": "Мошинахо бо имконияти карз",
        "filter_config": {"installment_available": True},
        "display_order": 3,
    },
    {
        "name_ru": "Аренда",
        "name_tj": "Кирояи",
        "slug": "rent",
        "icon_url": None,
        "description_ru": "Автомобили в аренду",
        "description_tj": "Мошинахо ба кирoя",
        "filter_config": {"type": "rent"},
        "display_order": 4,
    },
    {
        "name_ru": "Электромобили",
        "name_tj": "Электромобилхо",
        "slug": "electric",
        "icon_url": None,
        "description_ru": "Электрические автомобили",
        "description_tj": "Мошинахои барки",
        "filter_config": {"fuel": "Электро"},
        "display_order": 5,
    },
    {
        "name_ru": "Бюджетные",
        "name_tj": "Арзон",
        "slug": "budget",
        "icon_url": None,
        "description_ru": "Доступные авто до $10,000",
        "description_tj": "Мошинахои то $10,000",
        "filter_config": {"max_price": 10000},
        "display_order": 6,
    },
    {
        "name_ru": "Премиум",
        "name_tj": "Премиум",
        "slug": "premium",
        "icon_url": None,
        "description_ru": "Премиальные автомобили",
        "description_tj": "Мошинахои премиум",
        "filter_config": {"min_price": 50000},
        "display_order": 7,
    },
    {
        "name_ru": "До 2020 года",
        "name_tj": "То соли 2020",
        "slug": "pre-2020",
        "icon_url": None,
        "description_ru": "Автомобили выпуска до 2020 года",
        "description_tj": "Мошинахои то соли 2020",
        "filter_config": {"max_year": 2020},
        "display_order": 8,
    },
]

def seed():
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(Brand).count() > 0:
            print("Brands already seeded, skipping.")
            return

        print("Seeding brands and models...")
        total_models = 0
        for name, slug, country, is_popular, models in BRANDS_DATA:
            brand = Brand(name=name, slug=slug, country=country, is_popular=is_popular)
            db.add(brand)
            db.flush()
            for model_name in models:
                db.add(CarModel(brand_id=brand.id, name=model_name))
                total_models += 1

        print("Seeding categories...")
        for cat_data in DEFAULT_CATEGORIES:
            db.add(Category(**cat_data))

        db.commit()
        print(f"Done! Seeded {len(BRANDS_DATA)} brands, {total_models} models, and {len(DEFAULT_CATEGORIES)} categories.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
