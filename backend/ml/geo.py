_FTA_PARTNERS = {
    'Singapore', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia',
    'Philippines', 'Myanmar', 'Cambodia', 'Laos', 'Brunei',
    'Japan', 'South Korea', 'Australia', 'New Zealand',
    'UAE', 'Mauritius', 'Sri Lanka', 'Nepal', 'Bangladesh',
    'Chile', 'Peru',
}

_TENSION_COUNTRIES = {
    'China', 'Pakistan', 'Turkey', 'Iran', 'North Korea',
    'Russia', 'Belarus',
}


def get_geo_multiplier(country: str) -> tuple[float, str]:
    if not isinstance(country, str):
        return (1.0, 'NEUTRAL')
    # Country field may be 'City, Country' — extract last token
    parts = [p.strip() for p in country.split(',')]
    c = parts[-1].strip().title()
    if c in _FTA_PARTNERS:
        return (1.12, 'FTA_BONUS')
    elif c in _TENSION_COUNTRIES:
        return (0.88, 'TENSION_PENALTY')
    return (1.0, 'NEUTRAL')
