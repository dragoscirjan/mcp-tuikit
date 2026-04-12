import { describe, expect, it } from 'vitest';
import { parseResolutions } from './utils.js';

describe('parseResolutions', () => {
  it('should parse valid resolution strings', () => {
    const result = parseResolutions('640x480, 1024x768');
    expect(result).toEqual([
      { resolution: '640x480', width: 640, height: 480, cols: 64, rows: 24 },
      { resolution: '1024x768', width: 1024, height: 768, cols: 102, rows: 38 },
    ]);
  });

  it('should handle single resolution', () => {
    const result = parseResolutions('1280x720');
    expect(result).toEqual([{ resolution: '1280x720', width: 1280, height: 720, cols: 128, rows: 36 }]);
  });

  it('should clamp cols and rows to a minimum of 1', () => {
    const result = parseResolutions('8x16');
    expect(result).toEqual([{ resolution: '8x16', width: 8, height: 16, cols: 1, rows: 1 }]);
  });

  it('should handle empty or whitespace strings', () => {
    expect(parseResolutions('')).toEqual([]);
    expect(parseResolutions('   ')).toEqual([]);
    expect(parseResolutions(', ,')).toEqual([]);
  });

  it('should ignore empty segments', () => {
    expect(parseResolutions('640x480,,1024x768')).toEqual([
      { resolution: '640x480', width: 640, height: 480, cols: 64, rows: 24 },
      { resolution: '1024x768', width: 1024, height: 768, cols: 102, rows: 38 },
    ]);
  });

  it('should throw on invalid format', () => {
    expect(() => parseResolutions('invalid')).toThrowError("Invalid resolution format: 'invalid'");
    expect(() => parseResolutions('800')).toThrowError("Invalid resolution format: '800'");
    expect(() => parseResolutions('800 x 600')).toThrowError("Invalid resolution format: '800 x 600'");
  });

  it('should throw on zero or negative dimensions', () => {
    expect(() => parseResolutions('0x480')).toThrowError("Invalid resolution dimensions: '0x480'");
    expect(() => parseResolutions('640x-1')).toThrowError("Invalid resolution format: '640x-1'");
  });

  it('should handle case-insensitive x separator', () => {
    const result = parseResolutions('800X600');
    expect(result).toEqual([{ resolution: '800X600', width: 800, height: 600, cols: 80, rows: 30 }]);
  });
});
