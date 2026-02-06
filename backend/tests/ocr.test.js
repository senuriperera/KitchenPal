const OCRService = require('../src/services/ocrService');

// Mock Google Cloud Vision
jest.mock('@google-cloud/vision', () => {
    return {
        ImageAnnotatorClient: jest.fn().mockImplementation(() => {
            return {
                textDetection: jest.fn().mockImplementation((imageUrl) => {
                    // Simulate different responses based on imageUrl
                    // Return format: [{ textAnnotations: [...] }]
                    if (imageUrl === 'valid_dates_url') {
                        return [{
                            textAnnotations: [
                                {
                                    description: "Product Name\nEXP 25/12/2025\nMFG 01 Jan 2025\nNet Wt 500g"
                                }
                            ]
                        }];
                    } else if (imageUrl === 'no_dates_url') {
                        return [{
                            textAnnotations: [
                                { description: "Just some random text without dates" }
                            ]
                        }];
                    } else if (imageUrl === 'mixed_dates_url') {
                        return [{
                            textAnnotations: [
                                {
                                    description: "Best Before: 2024-10-15\nPacked: 10.09.24"
                                }
                            ]
                        }];
                    }
                    else {
                        return [{ textAnnotations: [] }]; // No text found
                    }
                })
            };
        })
    };
});

describe('OCRService', () => {
    test('extracts expiry and manufacture dates correctly', async () => {
        const result = await OCRService.extractDatesFromUrl('valid_dates_url');

        expect(result.expiryDate).toBeDefined();
        expect(result.manufactureDate).toBeDefined();

        // Check specific dates (months are 0-indexed in JS Date, but check logic)
        // EXP 25/12/2025
        expect(result.expiryDate.getDate()).toBe(25);
        expect(result.expiryDate.getFullYear()).toBe(2025);

        // MFG 01 Jan 2025
        expect(result.manufactureDate.getDate()).toBe(1);
        expect(result.manufactureDate.getFullYear()).toBe(2025);
        expect(result.manufactureDate.getMonth()).toBe(0); // Jan
    });

    test('extracts dates with different formats', async () => {
        const result = await OCRService.extractDatesFromUrl('mixed_dates_url');

        // Best Before: 2024-10-15
        expect(result.expiryDate).toBeDefined();
        expect(result.expiryDate.getFullYear()).toBe(2024);
        expect(result.expiryDate.getMonth()).toBe(9); // Oct
        expect(result.expiryDate.getDate()).toBe(15);

        // Packed: 10.09.24 (DD.MM.YY)
        expect(result.manufactureDate).toBeDefined();
        expect(result.manufactureDate.getDate()).toBe(10);
        expect(result.manufactureDate.getMonth()).toBe(8); // Sep
        expect(result.manufactureDate.getFullYear()).toBe(2024);
    });

    test('returns nulls when no dates found', async () => {
        const result = await OCRService.extractDatesFromUrl('no_dates_url');
        expect(result.expiryDate).toBeNull();
        expect(result.manufactureDate).toBeNull();
    });
});
