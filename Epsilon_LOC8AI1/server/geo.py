def get_geo_multiplier(country):
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
    c = country.strip().title() if isinstance(country, str) else ''
    if c in _FTA_PARTNERS:
        return (1.12, 'FTA_BONUS')
    elif c in _TENSION_COUNTRIES:
        return (0.88, 'TENSION_PENALTY')
    else:
        return (1.0, 'NEUTRAL')
