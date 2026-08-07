"""
Location Mapper - Normalize building names and get coordinates
"""

import re

# UMass Amherst Building Coordinates (latitude, longitude)
BUILDING_COORDINATES = {
    # Academic Buildings - Exact coordinates from Google Maps
    "herter hall": (42.38784841928443, -72.52732134394387),  # 161 Presidents Drive
    "agricultural engineering building": (42.39194946191486, -72.5311233557469),  # 250 Natural Resources Road
    "agricultural engineering building north": (42.39194946191486, -72.5311233557469),  # 250 Natural Resources Road
    "agricultural engineering building south": (42.390194, -72.524484),
    "morrill science center": (42.392758, -72.528457),
    "lederle graduate research center": (42.394502, -72.526502),
    "thompson hall": (42.39012821099187, -72.5300968442176),  # 200 Hicks Way
    "bartlett hall": (42.38803096544023, -72.52884576483754),
    "machmer hall": (42.392002, -72.529502),
    "isenberg school of management": (42.389795, -72.525497),
    "engineering lab": (42.389502, -72.526502),
    "marcus hall": (42.389002, -72.527002),
    "hasbrouck laboratory": (42.39182084204257, -72.52593322645808),  # 130 Thatcher Road
    "hasbrouck": (42.39182084204257, -72.52593322645808),  # 130 Thatcher Road
    "worcester commons": (42.395502, -72.529002),
    "fine arts center": (42.38816889250196, -72.52618410346408),
    "fine arts center lobby": (42.38816889250196, -72.52618410346408),
    "bowker auditorium": (42.39225022904617, -72.52965526615847),
    "old chapel": (42.391002, -72.528502),
    "arnold hall": (42.39456652922402, -72.52574859606005),  # Northeast residential area
    "chenoweth laboratory": (42.39209307532977, -72.52999926537325),  # Chemistry building area
    
    # Student Unions & Centers - Exact coordinates from Google Maps
    "student union": (42.390860257046578, -72.52765600009641),  # 41 Campus Center Way
    "student union ballroom": (42.390860257046578, -72.52765600009641),  # 41 Campus Center Way
    "black box": (42.390860257046578, -72.52765600009641),  # Black Box Theater at Student Union
    "campus center": (42.39172623345291, -72.52695451838713),  # 1 Campus Center Way (Murray D. Lincoln)
    "campus center auditorium": (42.39172623345291, -72.52695451838713),  # 1 Campus Center Way
    "mullins center": (42.388502, -72.532002),
    "recreation center": (42.38894949788261, -72.53168901012216),
    "campus recreation center": (42.38894949788261, -72.53168901012216),
    "recwell": (42.38894949788261, -72.53168901012216),
    
    # Residential Areas
    "southwest residential area": (42.38650, -72.52900),
    "northeast residential area": (42.39750, -72.52600),
    "central residential area": (42.39350, -72.53100),
    "orchard hill residential area": (42.39500, -72.53350),
    "honors college": (42.39400, -72.53200),
    
    # Libraries - Verified coordinates
    "du bois library": (42.390518, -72.526758),
    "w.e.b. du bois library": (42.390518, -72.526758),
    "integrated learning center": (42.390002, -72.527502),
    "ilc": (42.390002, -72.527502),
    
    # Athletic Facilities
    "boyden gymnasium": (42.38900, -72.52850),
    "boyden": (42.38900, -72.52850),
    "totman building": (42.39611742467878, -72.52593670346366),
    "totman": (42.39611742467878, -72.52593670346366),
    "mcguirk alumni stadium": (42.38650, -72.52750),
    "garber field": (42.38750, -72.52650),
    
    # Cultural Centers & Community Spaces
    "new africa house": (42.389012388610695, -72.52071678997159),
    "stonewall center": (42.388718616350765, -72.52926370346404),
    "latinx american cultural center": (42.38263727103118, -72.52985501880781),
    "newman center": (42.387184658596915, -72.52179600161311),
    
    # Parking & Other Areas
    "lot 44": (42.398978962777456, -72.52450318997101),  # Sylvan Woods parking
    "sylvan woods": (42.398978962777456, -72.52450318997101),
    
    # Other Buildings
    "cape cod lounge": (42.39149, -72.52949),
    "goodell building": (42.38870276796792, -72.52928516113575),
    "goodell": (42.38870276796792, -72.52928516113575),
    "amherst room": (42.39149, -72.52949),
    "berkshire room": (42.39149, -72.52949),
    "franklin dining common": (42.38600, -72.52850),
    "hampshire dining common": (42.38620, -72.52950),
    "worcester dining common": (42.39550, -72.52900),
    "berkshire dining common": (42.38680, -72.53000),
}

# Default coordinates if building not found (center of campus - Old Chapel)
DEFAULT_COORDS = (42.39120, -72.52670)


def normalize_location(location: str) -> str:
    """
    Normalize location string by removing room numbers and standardizing names.
    
    Examples:
        "Herter 227" -> "herter hall"
        "Thompson 106" -> "thompson hall"
        "Campus Center 16275 / Auditorium" -> "campus center"
        "Student Union Ballroom" -> "student union ballroom"
        "Meet at Lot 44 (Sylvan Woods) sign." -> "lot 44"
    """
    if not location or location == "Unknown":
        return "unknown"
    
    # Convert to lowercase
    location = location.lower().strip()
    
    # Special case: "Meet at Lot 44" should become "lot 44"
    if "lot 44" in location or "lot44" in location:
        return "lot 44"
    
    # Remove common prefixes like "meet at"
    location = re.sub(r'^meet\s+at\s+', '', location)
    
    # Remove parenthetical notes and everything after
    location = re.sub(r'\s*\(.*?\).*$', '', location)
    
    # Remove trailing punctuation
    location = re.sub(r'[.,;!?]+$', '', location)
    
    # Remove common suffixes and room numbers
    # Pattern: Remove numbers, slashes, and extra words after building name
    # BUT preserve "lot 44" format
    if "lot " not in location:
        location = re.sub(r'\s+\d+.*$', '', location)  # Remove " 227", " 106", " 16275 / Auditorium"
    
    location = re.sub(r'\s*/\s*.*$', '', location)  # Remove "/ anything"
    location = re.sub(r'\s+room.*$', '', location, flags=re.IGNORECASE)  # Remove "room xyz"
    location = re.sub(r'\s+sign.*$', '', location, flags=re.IGNORECASE)  # Remove "sign"
    
    # Standardize common building abbreviations and add "hall" if needed
    replacements = {
        r'\bherter\b(?!\s+hall)': 'herter hall',
        r'\bthompson\b(?!\s+hall)': 'thompson hall',
        r'\bbartlett\b(?!\s+hall)': 'bartlett hall',
        r'\bmachmer\b(?!\s+hall)': 'machmer hall',
        r'\bmarcus\b(?!\s+hall)': 'marcus hall',
        r'\barnold\b(?!\s+hall)': 'arnold hall',
        r'\bgoodell\b(?!\s+building)': 'goodell building',
        r'\btotman\b(?!\s+building)': 'totman building',
        r'\bboyden\b(?!\s+gymnasium)': 'boyden gymnasium',
        r'\bchenoweth\b(?!\s+laboratory)': 'chenoweth laboratory',
        r'\bcampus center auditorium': 'campus center',
        r'\bstudent union ballroom': 'student union ballroom',
        r'\bilc\b': 'integrated learning center',
        r'\bdu ?bois\b': 'du bois library',
        r'\bdu bois library library\b': 'du bois library',
    }
    
    for pattern, replacement in replacements.items():
        location = re.sub(pattern, replacement, location)
    
    # Clean up extra whitespace
    location = re.sub(r'\s+', ' ', location).strip()
    
    return location


def get_coordinates(location: str) -> tuple:
    """
    Get latitude and longitude for a given location.
    
    Args:
        location: Building name or location string
        
    Returns:
        tuple: (latitude, longitude)
    """
    normalized = normalize_location(location)
    
    # Try exact match first
    if normalized in BUILDING_COORDINATES:
        return BUILDING_COORDINATES[normalized]
    
    # Try partial match (find if normalized name is contained in any key)
    for building_name, coords in BUILDING_COORDINATES.items():
        if normalized in building_name or building_name in normalized:
            return coords
    
    # Return default (center of campus) if not found
    print(f"Warning: Location not found: '{location}' (normalized: '{normalized}') - using default coords")
    return DEFAULT_COORDS


def get_location_info(location: str) -> dict:
    """
    Get complete location information including normalized name and coordinates.
    
    Args:
        location: Raw location string
        
    Returns:
        dict: {
            'original': str,
            'normalized': str,
            'latitude': float,
            'longitude': float
        }
    """
    normalized = normalize_location(location)
    lat, lng = get_coordinates(location)
    
    return {
        'original': location,
        'normalized': normalized,
        'latitude': lat,
        'longitude': lng
    }


# Test function
if __name__ == "__main__":
    test_locations = [
        "Herter 227",
        "Thompson 106",
        "Campus Center 16275 / Auditorium",
        "Student Union Ballroom",
        "Agricultural Engineering Building North",
        "Mullins Center",
        "Du Bois Library",
        "Southwest Residential Area",
        "Unknown Building 123",
    ]
    
    print("🧪 Testing Location Mapper:\n")
    for loc in test_locations:
        info = get_location_info(loc)
        print(f"📍 {info['original']}")
        print(f"   → {info['normalized']}")
        print(f"   → ({info['latitude']}, {info['longitude']})\n")

