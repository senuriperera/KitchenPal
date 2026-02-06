const vision = require('@google-cloud/vision');

// Creates a client
const client = new vision.ImageAnnotatorClient();

/**
 * Normalizes text by removing non-alphanumeric characters (except key delimiters) and lowercasing.
 * @param {string} text 
 * @returns {string}
 */
const normalizeText = (text) => {
    return text.toLowerCase();
};

/**
 * Extracts potential dates from text using regex.
 * Supports: DD/MM/YYYY, MM/YY, YYYY-MM-DD, DD-MMM-YYYY, etc.
 * @param {string} text 
 * @returns {Array<{dateStr: string, index: number, original: string}>}
 */
const extractDates = (text) => {
    // Regex patterns for different date formats
    const patterns = [
        // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
        /\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[012])[-/.](\d{4}|\d{2})\b/g,
        // YYYY-MM-DD
        /\b(\d{4})[-/.](0?[1-9]|1[012])[-/.](0?[1-9]|[12][0-9]|3[01])\b/g,
        // DD MMM YYYY (e.g., 12 Jan 2023)
        /\b(0?[1-9]|[12][0-9]|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}|\d{2})\b/gi,
        // MMM YYYY (e.g., Jan 2023) - less precise but common for expiry
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}|\d{2})\b/gi,
        // MM/YYYY (e.g., 12/2023)
        /\b(0?[1-9]|1[012])[-/.](\d{4})\b/g
    ];

    let matches = [];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            matches.push({
                dateStr: match[0],
                index: match.index,
                original: match[0]
            });
        }
    });

    return matches;
};

/**
 * Parse date strings into JavaScript Date objects.
 * Simple parser validation to avoid invalid dates.
 * @param {string} dateStr 
 * @returns {Date|null}
 */
const parseDate = (dateStr) => {
    // try to handle DD/MM/YYYY or DD-MM-YYYY specifically first
    // Regex for DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmy = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
    if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1; // 0-indexed
        let year = parseInt(dmy[3], 10);
        if (year < 100) year += 2000; // Assume 20xx

        // Simple validation
        if (month >= 0 && month <= 11 && day > 0 && day <= 31) {
            return new Date(year, month, day);
        }
    }

    // Try standard JS Date parsing (handles YYYY-MM-DD, MMM DD YYYY)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Fallback for MM/YYYY
    const parts = dateStr.match(/^(\d{1,2})[-/.](\d{4})$/);
    if (parts) {
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (month >= 0 && month <= 11) {
            return new Date(year, month, 1); // First of the month
        }
    }

    return null;
};

/**
 * Finds the date closest to a specific keyword.
 * @param {Array} dates - List of found dates
 * @param {string} text - Full text
 * @param {Array<string>} keywords - Keywords to search for (e.g., 'exp', 'expiry')
 * @returns {Date|null}
 */
const findClosestDate = (dates, text, keywords) => {
    if (!dates || dates.length === 0) return null;

    let closestDate = null;
    let minDistance = Infinity;

    // Normalize text for keyword search (case-insensitive)
    const normalizedText = text.toLowerCase();

    keywords.forEach(keyword => {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        let match;
        while ((match = regex.exec(normalizedText)) !== null) {
            const keywordIndex = match.index;

            dates.forEach(date => {
                const distance = Math.abs(date.index - keywordIndex);
                // Prefer dates that are AFTER the keyword within a reasonable range (e.g. 50 chars)
                // But generally "closest" works well.
                if (distance < minDistance && distance < 100) { // Added max distance check
                    minDistance = distance;
                    closestDate = parseDate(date.dateStr);
                }
            });
        }
    });

    return closestDate;
};

exports.extractDatesFromUrl = async (imageUrl) => {
    try {
        const [result] = await client.textDetection(imageUrl);
        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            return { expiryDate: null, manufactureDate: null };
        }

        // The first annotation is the entire text block
        const fullText = detections[0].description;
        const normalizedText = normalizeText(fullText);
        const foundDates = extractDates(fullText); // Use original text for regex to preserve case if needed (though regex handles it)

        if (foundDates.length === 0) {
            return { expiryDate: null, manufactureDate: null };
        }

        // Keywords
        const expiryKeywords = ['exp', 'expiry', 'best before', 'bb', 'use by', 'best by', 'expires', 'exp date', 'valid until', 'EXP'];
        const mfgKeywords = ['mfg', 'manufacture', 'packed', 'pkd', 'mfd', 'prod', 'production', 'manf', 'fab', 'date of mfg', 'packed on', 'MFD'];

        let expiryDate = findClosestDate(foundDates, fullText, expiryKeywords);
        let manufactureDate = findClosestDate(foundDates, fullText, mfgKeywords);

        // Fallback: If only one date is found and no keywords match, assume it's Expiry (safer for food)
        if (!expiryDate && !manufactureDate && foundDates.length > 0) {
            expiryDate = parseDate(foundDates[0].dateStr);
        }

        return {
            expiryDate,
            manufactureDate,
            rawText: fullText // Optional: return raw text for debugging
        };

    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to process image');
    }
};
