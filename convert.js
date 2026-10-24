const VOLUME = {     //base unit: milliliters
    tsp: 4.92892,
    tbsp: 14.7868,
    'fl oz': 29.5735,
    cup: 236.588,
    ml: 1,
    l: 1000,
};

const WEIGHT = {     //base unit: grams;
    oz: 28.3495,
    lb: 453.592,
    g: 1,
    kg: 1000,
};

export function convert(amount, from, to) {
    let table = null;

    if (from in VOLUME && to in VOLUME) {
        table = VOLUME;
    } else if (from in WEIGHT && to in WEIGHT) {
        table = WEIGHT;
    }

    if (table === null) {
        return null;
    }

    return amount * table[from]/table[to];
}