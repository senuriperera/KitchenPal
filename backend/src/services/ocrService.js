const vision = require('@google-cloud/vision');

// Initialize the Vision client lazily to avoid crashes if credentials are missing at startup
let client = null;

const getClient = () => {
    if (!client) {
        try {
            const CREDENTIALS = require('../../google-credentials.json');
            client = new vision.ImageAnnotatorClient({
                credentials: CREDENTIALS,
            });
        } catch (error) {
            console.warn('Google Vision client initialization failed:', error.message);
            return null;
        }
    }
    return client;
};

// ─── Month name helpers ───────────────────────────────────────────────────────

// Maps both full and abbreviated month names to their numeric equivalent
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
 * Supported formats:
 *   DD/MM/YYYY   DD-MM-YYYY   DD.MM.YYYY
 *   MM/YYYY      MM-YYYY
 *   YYYY-MM-DD   YYYY/MM/DD
 *   DD MMM YYYY  DD MMM YY
 *   MMM YYYY     MMM YY
 *   DD/MM        (no year — defaults to current year)
 */
const parseDate = (raw) => {
    if (!raw) return null;
    const s = raw.trim();

    // Reject years outside the expected product date range to filter out lot codes and serial numbers
    const validYear = (yr) => yr >= 2000 && yr <= 2040;

    // YYYY-MM-DD  or  YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) {
        const yr = +m[1];
        if (!validYear(yr)) return null;
        const d = new Date(yr, +m[2] - 1, +m[3]);
        return isNaN(d) ? null : d;
    }

    // DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
    if (m) {
        let yr = +m[3];
        if (yr < 100) yr += 2000;
        if (!validYear(yr)) return null;
        const d = new Date(yr, +m[2] - 1, +m[1]);
        return isNaN(d) ? null : d;
    }

    // MM/YYYY  or  MM-YYYY  (no day — use 1st of month)
    m = s.match(/^(\d{1,2})[-/](\d{4})$/);
    if (m && +m[1] >= 1 && +m[1] <= 12) {
        const yr = +m[2];
        if (!validYear(yr)) return null;
        const d = new Date(yr, +m[1] - 1, 1);
        return isNaN(d) ? null : d;
    }

    // MM/YY  or  MM-YY  (zero-padded month required to reduce false positives from lot codes)
    m = s.match(/^(0[1-9]|1[0-2])[-/](\d{2})$/);
    if (m) {
        let yr = +m[2];
        if (yr < 100) yr += 2000;
        if (!validYear(yr)) return null;
        const d = new Date(yr, +m[1] - 1, 1);
        return isNaN(d) ? null : d;
    }

    // DD MMM YYYY  or  DD MMM YY  (e.g. 12 Jan 2025  /  12 JAN 25)
    m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/);
    if (m) {
        const mo = monthNameToNum(m[2]);
        if (mo) {
            let yr = +m[3];
            if (yr < 100) yr += 2000;
            if (!validYear(yr)) return null;
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
            if (!validYear(yr)) return null;
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
            if (!validYear(yr)) return null;
            const d = new Date(yr, mo - 1, 1);
            return isNaN(d) ? null : d;
        }
    }

    // DD/MM  (no year — defaults to current year; common on Asian and EU packaging)
    m = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12) {
        const yr = new Date().getFullYear();
        const d = new Date(yr, +m[2] - 1, +m[1]);
        return isNaN(d) ? null : d;
    }

    return null;
};

// ─── Date regex patterns ──────────────────────────────────────────────────────
// Each pattern targets a specific date format found on product packaging.
// MM/YY uses a strict zero-padded month (01–12) to avoid matching lot codes or version numbers.
const DATE_PATTERNS = [
    /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g,                                               // YYYY-MM-DD
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g,                                         // DD/MM/YYYY or DD-MM-YYYY (2 or 4 digit year)
    /\b(\d{1,2})[-/](\d{4})\b/g,                                                               // MM/YYYY or MM-YYYY
    /\b(0[1-9]|1[0-2])[-/](\d{2})\b/g,                                                         // MM/YY (zero-padded month only)
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi,  // DD MMM YYYY / DD MMM YY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi,              // MMM YYYY / MMM YY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/](\d{2,4})\b/gi,             // MMM-YYYY / MMM/YYYY
];

/**
 * Scan the full OCR text and return all valid date matches with their positions.
 * Deduplicates by position and pre-filters candidates through parseDate
 * so only real dates enter the extraction pipeline.
 * @param {string} text
 * @returns {{ raw: string, index: number, parsed: Date }[]}
 */
const extractAllDates = (text) => {
    const hits = [];
    const seen = new Set();

    DATE_PATTERNS.forEach((pattern) => {
        const re = new RegExp(pattern.source, pattern.flags);
        let m;
        while ((m = re.exec(text)) !== null) {
            const raw = m[0];
            const key = `${m.index}:${raw}`;
            if (!seen.has(key)) {
                seen.add(key);
                const parsed = parseDate(raw);
                if (parsed) {
                    hits.push({ raw, index: m.index, parsed });
                }
            }
        }
    });

    return hits;
};

// ─── Keyword lists ─────────────────────────────────────────────────────────────

// Common labels found on packaging that indicate an expiry date
const EXPIRY_KEYWORDS = [
    'best before', 'best by', 'use by', 'use before',
    'valid until', 'valid thru', 'sell by',
    'exp date', 'expiry date', 'expiry',
    'exp', 'bb', 'bbd', 'bd',
];

// Common labels found on packaging that indicate a manufacture date
const MFG_KEYWORDS = [
    'manufacture date', 'manufactured on', 'manufactured',
    'date of manufacture', 'date of mfg', 'date of mfd',
    'mfg date', 'mfg', 'mfd',
    'production date', 'prod date', 'prod',
    'packed on', 'packing date', 'packed date', 'pkd',
    'dom', 'MFD', 'M.F.D',
];

/**
 * Compile a keyword list into a single regex.
 * Keywords are deduplicated (case-insensitive) and sorted longest-first
 * so multi-word phrases like "best before" match before "best".
 * Captures up to 60 characters after each keyword for date extraction.
 */
const buildKeywordRegex = (keywords) => {
    const escaped = keywords
        .slice()
        .filter((k, i, arr) => arr.findIndex(x => x.toLowerCase() === k.toLowerCase()) === i)
        .sort((a, b) => b.length - a.length)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(?:${escaped.join('|')})\\s*[:\\-.]?\\s*(.{0,60})`, 'gi');
};

const EXPIRY_RE = buildKeywordRegex(EXPIRY_KEYWORDS);
const MFG_RE = buildKeywordRegex(MFG_KEYWORDS);

/**
 * Pass 1 — Line-aware extraction.
 * Searches each line individually for a keyword and a date on the same line.
 * This is the highest-confidence strategy as OCR preserves newlines per label field.
 * @param {RegExp} keywordRe
 * @param {string} text
 * @returns {Date|null}
 */
const extractDateLineAware = (keywordRe, text) => {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        keywordRe.lastIndex = 0;
        if (!keywordRe.test(line)) continue;
        keywordRe.lastIndex = 0;

        for (const pat of DATE_PATTERNS) {
            const re = new RegExp(pat.source, pat.flags);
            const dm = re.exec(line);
            if (dm) {
                const d = parseDate(dm[0]);
                if (d) return d;
            }
        }
    }
    return null;
};

/**
 * Pass 2 — Keyword-adjacent extraction across the full text.
 * For each keyword match, scans the captured snippet for a parseable date.
 * Iterates through all keyword matches rather than stopping at the first miss.
 * @param {RegExp} keywordRe
 * @param {string} text
 * @returns {Date|null}
 */
const extractDateAfterKeyword = (keywordRe, text) => {
    keywordRe.lastIndex = 0;
    let m;
    while ((m = keywordRe.exec(text)) !== null) {
        const snippet = m[1];
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
 * Pass 3 — Proximity-based fallback.
 * When no keyword-adjacent date is found, picks the date candidate
 * whose character position is closest to any keyword occurrence.
 * maxDist controls how far apart a keyword and date can be (in characters).
 * @param {RegExp} keywordsRe
 * @param {{ raw: string, index: number, parsed: Date }[]} allDates
 * @param {string} text
 * @param {number} maxDist
 * @returns {Date|null}
 */
const proximityMatch = (keywordsRe, allDates, text, maxDist = 120) => {
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
        for (const { index, parsed } of allDates) {
            const dist = Math.abs(index - kp);
            if (dist < bestDist && dist < maxDist && parsed) {
                bestDist = dist;
                best = parsed;
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

    // The first annotation contains the full concatenated text from the image
    const fullText = detections[0].description;

    // Log raw OCR output in development to help debug mismatches without re-calling the API
    if (process.env.NODE_ENV !== 'production') {
        console.debug('[OCRService] Raw OCR text:\n', fullText);
    }

    const allDates = extractAllDates(fullText);

    if (allDates.length === 0) {
        return { expiryDate: null, manufactureDate: null };
    }

    // Pass 1 — keyword and date on the same line (highest confidence)
    let expiryDate = extractDateLineAware(new RegExp(EXPIRY_RE.source, 'gi'), fullText);
    let manufactureDate = extractDateLineAware(new RegExp(MFG_RE.source, 'gi'), fullText);

    // Pass 2 — keyword-adjacent search across the full text
    if (!expiryDate) {
        expiryDate = extractDateAfterKeyword(new RegExp(EXPIRY_RE.source, 'gi'), fullText);
    }
    if (!manufactureDate) {
        manufactureDate = extractDateAfterKeyword(new RegExp(MFG_RE.source, 'gi'), fullText);
    }

    // Pass 3 — nearest date to a keyword by character distance
    if (!expiryDate) {
        expiryDate = proximityMatch(new RegExp(EXPIRY_RE.source, 'gi'), allDates, fullText);
    }
    if (!manufactureDate) {
        manufactureDate = proximityMatch(new RegExp(MFG_RE.source, 'gi'), allDates, fullText);
    }

    // Pass 4 — no keywords found at all; treat the first detected date as expiry
    if (!expiryDate && !manufactureDate && allDates.length > 0) {
        expiryDate = allDates[0].parsed;
    }

    // If manufacture date is not earlier than expiry, the labels were likely matched in reverse — swap them
    if (expiryDate && manufactureDate && manufactureDate >= expiryDate) {
        [expiryDate, manufactureDate] = [manufactureDate, expiryDate];
    }

    return {
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        manufactureDate: manufactureDate ? manufactureDate.toISOString() : null,
    };
};