const vision = require('@google-cloud/vision');

// Lazy client initialization to prevent crashes on startup
let client = null;

// Load credentials as object (avoids OpenSSL 3 key-format issues with keyFilename)
let CREDENTIALS = null;

try {
    CREDENTIALS = require('../../google-credentials.json');
} catch {
    console.warn('Google Vision credentials not found. OCR disabled in this environment.');
}

const getClient = () => {
    if (!client) {
        try {
            client = new vision.ImageAnnotatorClient(
                CREDENTIALS ? { credentials: CREDENTIALS } : {}
            );
        } catch (error) {
            console.warn('Google Vision client initialization failed:', error.message);
            return null;
        }
    }
    return client;
};

// ─── Month name helpers ───────────────────────────────────────────────────────
const MONTH_MAP = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const monthNameToNum = (name) => MONTH_MAP[name.toLowerCase().slice(0, 3)] || null;

// ─── Date parser ──────────────────────────────────────────────────────────────
/**
 * Parse a raw date string into a Date object.
 * Handles:
 *   DD/MM/YYYY   DD-MM-YYYY   DD.MM.YYYY
 *   MM/YYYY      MM-YYYY
 *   YYYY-MM-DD   YYYY/MM/DD
 *   DD MMM YYYY  DD MMM YY
 *   MMM YYYY     MMM YY
 */
const parseDate = (raw) => {
    if (!raw) return null;
    const s = raw.trim();

    // YYYY-MM-DD  or  YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) {
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d) ? null : d;
    }

    // DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
    if (m) {
        let yr = +m[3];
        if (yr < 100) yr += 2000;
        const d = new Date(yr, +m[2] - 1, +m[1]);
        return isNaN(d) ? null : d;
    }

    // MM/YYYY  or  MM-YYYY  (no day — use 1st)
    m = s.match(/^(\d{1,2})[-/](\d{4})$/);
    if (m && +m[1] >= 1 && +m[1] <= 12) {
        const d = new Date(+m[2], +m[1] - 1, 1);
        return isNaN(d) ? null : d;
    }

    // DD MMM YYYY  or  DD MMM YY  (e.g. 12 Jan 2025  /  12 JAN 25)
    m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/);
    if (m) {
        const mo = monthNameToNum(m[2]);
        if (mo) {
            let yr = +m[3];
            if (yr < 100) yr += 2000;
            const d = new Date(yr, mo - 1, +m[1]);
            return isNaN(d) ? null : d;
        }
    }

    // MMM YYYY  or  MMM YY  (e.g. Jan 2025 / JAN 25)
    m = s.match(/^([A-Za-z]{3,})\s+(\d{2,4})$/);
    if (m) {
        const mo = monthNameToNum(m[1]);
        if (mo) {
            let yr = +m[2];
            if (yr < 100) yr += 2000;
            const d = new Date(yr, mo - 1, 1);
            return isNaN(d) ? null : d;
        }
    }

    // MMM-YYYY  or  MMM/YYYY  (e.g. JAN/2025)
    m = s.match(/^([A-Za-z]{3,})[-/](\d{2,4})$/);
    if (m) {
        const mo = monthNameToNum(m[1]);
        if (mo) {
            let yr = +m[2];
            if (yr < 100) yr += 2000;
            const d = new Date(yr, mo - 1, 1);
            return isNaN(d) ? null : d;
        }
    }

    return null;
};

// ─── Regex patterns that capture raw date strings ─────────────────────────────
const DATE_PATTERNS = [
    // YYYY-MM-DD
    /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g,
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY  (2 or 4 digit year)
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g,
    // MM/YYYY or MM-YYYY
    /\b(\d{1,2})[-/](\d{4})\b/g,
    // DD MMM YYYY  /  DD MMM YY
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi,
    // MMM YYYY  /  MMM YY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi,
    // MMM-YYYY  /  MMM/YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/](\d{2,4})\b/gi,
];

/**
 * Extract all candidate date strings and their character offsets from text.
 * @param {string} text
 * @returns {{ raw: string, index: number }[]}
 */
const extractAllDates = (text) => {
    const hits = [];
    const seen = new Set();

    DATE_PATTERNS.forEach((pattern) => {
        // reset lastIndex for global patterns
        const re = new RegExp(pattern.source, pattern.flags);
        let m;
        while ((m = re.exec(text)) !== null) {
            const raw = m[0];
            const key = `${m.index}:${raw}`;
            if (!seen.has(key)) {
                seen.add(key);
                hits.push({ raw, index: m.index });
            }
        }
    });

    return hits;
};

// ─── Keyword lists ─────────────────────────────────────────────────────────────
const EXPIRY_KEYWORDS = [
    'best before', 'best by', 'use by', 'use before',
    'valid until', 'valid thru', 'sell by',
    'exp date', 'expiry date', 'expiry', 'exp',
    'bb', 'bbd', 'bd',
];

const MFG_KEYWORDS = [
    'manufacture date', 'manufactured on', 'manufactured',
    'date of manufacture', 'date of mfg', 'date of mfd',
    'mfg date', 'mfg', 'mfd',
    'production date', 'prod date', 'prod',
    'packed on', 'packing date', 'packed date', 'pkd',
    'dom',
];

/**
 * Build a single regex that matches any keyword from the list,
 * then captures up to ~60 chars after it.
 */
const buildKeywordRegex = (keywords) => {
    const escaped = keywords
        .slice()
        .sort((a, b) => b.length - a.length) // longest first so "best before" wins over "best"
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(?:${escaped.join('|')})\\s*[:\\-.]?\\s*(.{0,60})`, 'gi');
};

const EXPIRY_RE = buildKeywordRegex(EXPIRY_KEYWORDS);
const MFG_RE = buildKeywordRegex(MFG_KEYWORDS);

/**
 * Find the first parseable date in raw text after each keyword match.
 * @param {RegExp} keywordRe
 * @param {string} text
 * @returns {Date|null}
 */
const extractDateAfterKeyword = (keywordRe, text) => {
    keywordRe.lastIndex = 0;
    let m;
    while ((m = keywordRe.exec(text)) !== null) {
        const snippet = m[1];
        // try each date pattern on the snippet
        for (const pat of DATE_PATTERNS) {
            const re = new RegExp(pat.source, pat.flags);
            const dm = re.exec(snippet);
            if (dm) {
                const d = parseDate(dm[0]);
                if (d) return d;
            }
        }
    }
    return null;
};

/**
 * Fallback: proximity-based matching when no keyword found on same line.
 * Finds date whose position in the full text is closest to the nearest keyword occurrence.
 */
const proximityMatch = (keywordsRe, allDates, text) => {
    keywordsRe.lastIndex = 0;
    const keywordPositions = [];
    let m;
    while ((m = keywordsRe.exec(text)) !== null) {
        keywordPositions.push(m.index);
    }
    if (keywordPositions.length === 0 || allDates.length === 0) return null;

    let best = null;
    let bestDist = Infinity;

    for (const kp of keywordPositions) {
        for (const { raw, index } of allDates) {
            const dist = Math.abs(index - kp);
            if (dist < bestDist && dist < 120) {
                const d = parseDate(raw);
                if (d) {
                    bestDist = dist;
                    best = d;
                }
            }
        }
    }

    return best;
};

// ─── Main export ──────────────────────────────────────────────────────────────
exports.extractDatesFromUrl = async (imageUrl) => {
    const visionClient = getClient();
    if (!visionClient) {
        throw new Error('Google Vision API is not configured. Please provide valid credentials.');
    }

    const [result] = await visionClient.textDetection(imageUrl);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
        return { expiryDate: null, manufactureDate: null };
    }

    const fullText = detections[0].description;
    const allDates = extractAllDates(fullText);

    if (allDates.length === 0) {
        return { expiryDate: null, manufactureDate: null };
    }

    // Pass 1 — strict keyword-adjacent extraction
    let expiryDate = extractDateAfterKeyword(new RegExp(EXPIRY_RE.source, 'gi'), fullText);
    let manufactureDate = extractDateAfterKeyword(new RegExp(MFG_RE.source, 'gi'), fullText);

    // Pass 2 — proximity fallback if one or both are still null
    if (!expiryDate) {
        expiryDate = proximityMatch(new RegExp(EXPIRY_RE.source, 'gi'), allDates, fullText);
    }
    if (!manufactureDate) {
        manufactureDate = proximityMatch(new RegExp(MFG_RE.source, 'gi'), allDates, fullText);
    }

    // Pass 3 — if still only one date found and no keywords matched at all, treat it as expiry
    if (!expiryDate && !manufactureDate && allDates.length > 0) {
        expiryDate = parseDate(allDates[0].raw);
    }

    // Sanity check: manufacture must be before expiry
    if (expiryDate && manufactureDate && manufactureDate >= expiryDate) {
        // swap them — OCR matched labels backwards
        [expiryDate, manufactureDate] = [manufactureDate, expiryDate];
    }

    return {
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        manufactureDate: manufactureDate ? manufactureDate.toISOString() : null,
    };
};
