"""
GET /vin/check/{vin} — VIN decode, no auth required.

Strategy (hybrid):
1. Validate format + check digit locally (instant, no I/O).
2. Call the free NHTSA vPIC API for rich data (make, model, year, body, engine).
3. If NHTSA returns nothing useful (common for CIS/Chinese brands), fall back to
   the local WMI table which covers Lada, UzAvto/Nexia, BYD, Haval, Geely, etc.

NHTSA vPIC: https://vpic.nhtsa.dot.gov/api/ — free, no key, no rate limit published.
"""
import re
from typing import Optional

import httpx
from fastapi import APIRouter

from pydantic import BaseModel

router = APIRouter(prefix="/vin", tags=["vin"])

# ---------------------------------------------------------------------------
# Character transliteration values used in check-digit calculation
# ---------------------------------------------------------------------------
_CHAR_VALUES: dict[str, int] = {
    'A': 1,  'B': 2,  'C': 3,  'D': 4,  'E': 5,  'F': 6,  'G': 7,  'H': 8,
    'J': 1,  'K': 2,  'L': 3,  'M': 4,  'N': 5,  'P': 7,  'R': 9,
    'S': 2,  'T': 3,  'U': 4,  'V': 5,  'W': 6,  'X': 7,  'Y': 8,  'Z': 9,
    '0': 0,  '1': 1,  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,
    '8': 8,  '9': 9,
}

_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

# ---------------------------------------------------------------------------
# Model year codes (VIN position 10, index 9)
# ---------------------------------------------------------------------------
_YEAR_CYCLE1: dict[str, int] = {
    'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984,
    'F': 1985, 'G': 1986, 'H': 1987, 'J': 1988, 'K': 1989,
    'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994,
    'S': 1995, 'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999,
    'Y': 2000,
}
_YEAR_CYCLE2: dict[str, int] = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030,
}
_YEAR_DIGITS: dict[str, int] = {
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009,
}


def _decode_year(code: str) -> Optional[int]:
    if code in _YEAR_DIGITS:
        return _YEAR_DIGITS[code]
    return _YEAR_CYCLE2.get(code) or _YEAR_CYCLE1.get(code)


# ---------------------------------------------------------------------------
# WMI table — covers brands common in Tajikistan not well-served by NHTSA
# (CIS, Chinese, Uzbek/Kazakh, and others)
# ---------------------------------------------------------------------------
_WMI: dict[str, tuple[str, str]] = {
    # ── Japan ──
    "JT1": ("Toyota", "Japan"),  "JT2": ("Toyota", "Japan"),
    "JT3": ("Toyota", "Japan"),  "JT4": ("Toyota", "Japan"),
    "JT5": ("Toyota", "Japan"),  "JT6": ("Toyota", "Japan"),
    "JT8": ("Toyota", "Japan"),  "JTD": ("Toyota", "Japan"),
    "JTE": ("Toyota", "Japan"),  "JTG": ("Toyota", "Japan"),
    "JTH": ("Lexus", "Japan"),   "JTJ": ("Toyota", "Japan"),
    "JTK": ("Toyota", "Japan"),  "JTL": ("Toyota", "Japan"),
    "JTM": ("Toyota", "Japan"),  "JTN": ("Toyota", "Japan"),
    "JTP": ("Toyota", "Japan"),
    "JHM": ("Honda", "Japan"),   "JHL": ("Honda", "Japan"),
    "JH4": ("Acura", "Japan"),
    "JN1": ("Nissan", "Japan"),  "JN6": ("Nissan", "Japan"),
    "JN8": ("Nissan", "Japan"),
    "JM1": ("Mazda", "Japan"),   "JM3": ("Mazda", "Japan"),
    "JA3": ("Mitsubishi", "Japan"), "JA4": ("Mitsubishi", "Japan"),
    "JMY": ("Mitsubishi", "Japan"),
    "JF1": ("Subaru", "Japan"),  "JF2": ("Subaru", "Japan"),
    "JFA": ("Subaru", "Japan"),
    "JS1": ("Suzuki", "Japan"),  "JS2": ("Suzuki", "Japan"),
    "JS3": ("Suzuki", "Japan"),  "JS4": ("Suzuki", "Japan"),
    "JAA": ("Isuzu", "Japan"),   "JAB": ("Isuzu", "Japan"),
    "JDA": ("Daihatsu", "Japan"),

    # ── South Korea ──
    "KMH": ("Hyundai", "South Korea"), "KM8": ("Hyundai", "South Korea"),
    "KME": ("Hyundai", "South Korea"),
    "KNA": ("Kia", "South Korea"),  "KNB": ("Kia", "South Korea"),
    "KND": ("Kia", "South Korea"),  "KNE": ("Kia", "South Korea"),
    "KNJ": ("Kia", "South Korea"),
    "KL1": ("Chevrolet (Korea)", "South Korea"),
    "KL3": ("Chevrolet (Korea)", "South Korea"),
    "KL4": ("Chevrolet (Korea)", "South Korea"),
    "KL5": ("Chevrolet (Korea)", "South Korea"),
    "KL7": ("Daewoo", "South Korea"),
    "KL8": ("Chevrolet (Korea)", "South Korea"),
    "KPA": ("SsangYong", "South Korea"),

    # ── Germany ──
    "WBA": ("BMW", "Germany"),   "WBS": ("BMW M", "Germany"),
    "WBX": ("BMW", "Germany"),   "WBY": ("BMW i", "Germany"),
    "WDB": ("Mercedes-Benz", "Germany"), "WDD": ("Mercedes-Benz", "Germany"),
    "WDC": ("Mercedes-Benz", "Germany"), "WDF": ("Mercedes-Benz", "Germany"),
    "WAU": ("Audi", "Germany"),  "WA1": ("Audi", "Germany"),
    "WAP": ("Porsche", "Germany"), "WP0": ("Porsche", "Germany"),
    "WP1": ("Porsche", "Germany"),
    "WVW": ("Volkswagen", "Germany"), "WV1": ("Volkswagen", "Germany"),
    "WV2": ("Volkswagen", "Germany"), "WV3": ("Volkswagen", "Germany"),
    "W0L": ("Opel", "Germany"),  "W0V": ("Opel", "Germany"),

    # ── UK ──
    "SAL": ("Land Rover", "UK"), "SAJ": ("Jaguar", "UK"),

    # ── Russia ──
    "XTA": ("Lada (AvtoVAZ)", "Russia"), "XTT": ("UAZ", "Russia"),
    "X9L": ("GAZ", "Russia"),    "X89": ("Lada", "Russia"),
    "XUF": ("GAZ", "Russia"),    "X7L": ("Lada", "Russia"),

    # ── Uzbekistan / Kazakhstan ──
    "Y6D": ("Daewoo / UzAvto", "Uzbekistan"),
    "XWE": ("Chevrolet (UzAvto)", "Uzbekistan"),
    "XWB": ("Chevrolet (UzAvto)", "Uzbekistan"),

    # ── China ──
    "LGX": ("Haval / Great Wall", "China"),
    "LFP": ("Great Wall", "China"),
    "L5N": ("Haval", "China"),
    "L6T": ("BYD", "China"),     "LFV": ("BYD", "China"),
    "LSG": ("Geely", "China"),   "LB3": ("Geely", "China"),
    "LSJ": ("Chery", "China"),   "LNB": ("Chery", "China"),
    "LVV": ("Changan", "China"), "LFN": ("Changan", "China"),
    "LSY": ("SAIC / MG", "China"),
    "LHB": ("Lifan", "China"),   "LJD": ("JAC", "China"),
    "LAN": ("BAIC", "China"),    "LFB": ("FAW", "China"),
    "LNY": ("Wuling", "China"),  "LHG": ("Honda (China)", "China"),

    # ── USA ──
    "1G1": ("Chevrolet", "USA"), "1G2": ("Pontiac", "USA"),
    "1GC": ("Chevrolet Truck", "USA"),
    "1FA": ("Ford", "USA"),      "1FB": ("Ford", "USA"),
    "1FC": ("Ford", "USA"),      "1FT": ("Ford Truck", "USA"),
    "1C3": ("Chrysler", "USA"),  "1C4": ("Chrysler", "USA"),
}

# Single-character country code fallback
_COUNTRY_PREFIX: dict[str, str] = {
    "J": "Japan",               "K": "South Korea",
    "L": "China",               "W": "Germany",
    "S": "UK / Sweden",         "V": "France / Spain",
    "X": "Russia / CIS",        "Y": "Sweden / Finland",
    "Z": "Italy",               "1": "USA",
    "2": "Canada",              "3": "Mexico",
    "4": "USA",                 "5": "USA",
    "6": "Australia",           "9": "Brazil",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_VIN_RE = re.compile(r'^[A-HJ-NPR-Z0-9]{17}$', re.IGNORECASE)

NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{}?format=json"

# Fields we extract from NHTSA response; key = NHTSA "Variable" string
_NHTSA_FIELDS = {
    "Make": "manufacturer",
    "Model": "model",
    "Model Year": "year",
    "Body Class": "body_class",
    "Engine Displacement (L)": "engine_displacement_l",
    "Fuel Type - Primary": "fuel_type",
    "Plant Country": "country",
    "Manufacturer Name": "_manufacturer_long",
}


def _validate_format(vin: str) -> bool:
    return bool(_VIN_RE.match(vin.upper()))


def _check_digit_valid(vin: str) -> bool:
    vin = vin.upper()
    try:
        total = sum(_CHAR_VALUES[c] * _WEIGHTS[i] for i, c in enumerate(vin))
    except KeyError:
        return False
    remainder = total % 11
    expected = 'X' if remainder == 10 else str(remainder)
    return vin[8] == expected


def _decode_wmi(vin: str) -> tuple[Optional[str], Optional[str]]:
    vin = vin.upper()
    wmi3 = vin[:3]
    if wmi3 in _WMI:
        return _WMI[wmi3]
    country = _COUNTRY_PREFIX.get(vin[0])
    return None, country


def _parse_nhtsa(results: list[dict]) -> dict:
    """Extract useful fields from the NHTSA results array."""
    data: dict = {}
    for item in results:
        variable = item.get("Variable", "")
        value = item.get("Value") or ""
        value = value.strip()
        if not value or value in ("Not Applicable", "null", "0"):
            continue
        key = _NHTSA_FIELDS.get(variable)
        if key:
            data[key] = value

    # Normalise year to int
    if "year" in data:
        try:
            data["year"] = int(data["year"])
        except (ValueError, TypeError):
            data.pop("year", None)

    # Use long manufacturer name only as fallback if short "Make" is absent
    long_name = data.pop("_manufacturer_long", None)
    if "manufacturer" not in data and long_name:
        data["manufacturer"] = long_name

    return data


def _is_nhtsa_useful(data: dict) -> bool:
    """Return True if NHTSA gave us at least manufacturer or model."""
    return bool(data.get("manufacturer") or data.get("model"))


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------
class VinDecodeResult(BaseModel):
    vin: str
    is_valid: bool
    check_digit_valid: bool
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    country: Optional[str] = None
    year: Optional[int] = None
    body_class: Optional[str] = None
    engine_displacement_l: Optional[str] = None
    fuel_type: Optional[str] = None
    wmi: str
    source: str = "local"          # "nhtsa" | "local"
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.get("/check/{vin}", response_model=VinDecodeResult)
async def check_vin(vin: str) -> VinDecodeResult:
    """
    Hybrid VIN decode — public endpoint, no auth required.

    Calls NHTSA vPIC for rich data first; falls back to the local WMI table
    when NHTSA returns nothing (CIS/Chinese/Uzbek brands).
    """
    vin_upper = vin.upper().strip()

    if not _validate_format(vin_upper):
        return VinDecodeResult(
            vin=vin_upper,
            is_valid=False,
            check_digit_valid=False,
            wmi=vin_upper[:3] if len(vin_upper) >= 3 else vin_upper,
            error=(
                "VIN должен содержать ровно 17 символов. "
                "Буквы I, O, Q не используются."
            ),
        )

    check_ok = _check_digit_valid(vin_upper)
    year_local = _decode_year(vin_upper[9])
    wmi = vin_upper[:3]

    # ── 1. Try NHTSA ──────────────────────────────────────────────────────────
    nhtsa_data: dict = {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(NHTSA_URL.format(vin_upper))
            resp.raise_for_status()
            payload = resp.json()
            nhtsa_data = _parse_nhtsa(payload.get("Results", []))
    except Exception:
        # Network error or timeout — fall through to local table silently
        pass

    # ── 2. Use NHTSA if useful, otherwise fall back to local WMI ─────────────
    if _is_nhtsa_useful(nhtsa_data):
        return VinDecodeResult(
            vin=vin_upper,
            is_valid=True,
            check_digit_valid=check_ok,
            manufacturer=nhtsa_data.get("manufacturer"),
            model=nhtsa_data.get("model"),
            country=nhtsa_data.get("country"),
            year=nhtsa_data.get("year") or year_local,
            body_class=nhtsa_data.get("body_class"),
            engine_displacement_l=nhtsa_data.get("engine_displacement_l"),
            fuel_type=nhtsa_data.get("fuel_type"),
            wmi=wmi,
            source="nhtsa",
        )

    # Local fallback
    manufacturer, country = _decode_wmi(vin_upper)
    return VinDecodeResult(
        vin=vin_upper,
        is_valid=True,
        check_digit_valid=check_ok,
        manufacturer=manufacturer,
        country=country,
        year=year_local,
        wmi=wmi,
        source="local",
    )
