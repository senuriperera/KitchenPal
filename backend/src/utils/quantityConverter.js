/**
 * Convert base quantity to display format with appropriate unit
 * @param {number} baseQty - Quantity in base units (g, ml, or unit)
 * @param {string} unitFamily - 'weight', 'volume', or 'count'
 * @param {boolean} forceUnit - If true, always show larger units (kg for weight, L for volume)
 * @returns {object} { value, unit, display }
 */
function convertToDisplay(baseQty, unitFamily, forceUnit = false) {
  if (unitFamily === 'weight') {
    if (baseQty >= 1000 || forceUnit) {
      return {
        value: parseFloat((baseQty / 1000).toFixed(2)),
        unit: 'kg',
        display: `${(baseQty / 1000).toFixed(2)} kg`
      };
    }
    return {
      value: parseFloat(baseQty.toFixed(0)),
      unit: 'g',
      display: `${baseQty.toFixed(0)} g`
    };
  }

  if (unitFamily === 'volume') {
    if (baseQty >= 1000 || forceUnit) {
      return {
        value: parseFloat((baseQty / 1000).toFixed(2)),
        unit: 'L',
        display: `${(baseQty / 1000).toFixed(2)} L`
      };
    }
    return {
      value: parseFloat(baseQty.toFixed(0)),
      unit: 'ml',
      display: `${baseQty.toFixed(0)} ml`
    };
  }

  if (unitFamily === 'count') {
    return {
      value: parseFloat(baseQty.toFixed(0)),
      unit: 'units',
      display: `${baseQty.toFixed(0)} units`
    };
  }

  // fallback
  return {
    value: parseFloat(baseQty.toFixed(2)),
    unit: 'g',
    display: `${baseQty.toFixed(2)} g`
  };
}

/**
 * Build family totals from query results
 * @param {array} rows - Query result rows
 * @returns {object} { weight, volume, count }
 */
function buildFamilyTotals(rows) {
  const result = { weight: 0, volume: 0, count: 0 };
  rows.forEach(row => {
    const family = row.unit_family;
    if (family && result.hasOwnProperty(family)) {
      result[family] += parseFloat(row.total_wasted || row.total_saved || 0);
    }
  });
  return result;
}

/**
 * Convert family totals to display format
 * @param {object} familyTotals - { weight, volume, count }
 * @param {boolean} forceUnit - If true, always show larger units (kg, L)
 * @returns {object} Display format for each family
 */
function convertFamilyTotals(familyTotals, forceUnit = false) {
  return {
    weight: convertToDisplay(familyTotals.weight, 'weight', forceUnit),
    volume: convertToDisplay(familyTotals.volume, 'volume', forceUnit),
    count: convertToDisplay(familyTotals.count, 'count', forceUnit)
  };
}

module.exports = {
  convertToDisplay,
  buildFamilyTotals,
  convertFamilyTotals
};
