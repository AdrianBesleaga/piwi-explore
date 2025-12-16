/**
 * @jest-environment jsdom
 */

import { Float16Array } from '@petamoriken/float16';

// Test int64ToFloat16 and float16ToInt64 helper functions
function int64ToFloat16(int64Value) {
    const float64Value = Number(int64Value);
    if (!isFinite(float64Value)) return float64Value > 0 ? 0x7c00 : 0xfc00;
    if (float64Value === 0) return 0;
    const sign = float64Value < 0 ? 1 : 0;
    const absValue = Math.abs(float64Value);
    const exponent = Math.floor(Math.log2(absValue));
    const mantissa = absValue / Math.pow(2, exponent) - 1;
    const float16Exponent = exponent + 15;
    const float16Mantissa = Math.round(mantissa * 1024);
    if (float16Exponent <= 0) {
        return (sign << 15) | (float16Mantissa >> 1);
    } else if (float16Exponent >= 31) {
        return (sign << 15) | 0x7c00;
    } else {
        return (sign << 15) | (float16Exponent << 10) | (float16Mantissa & 0x3ff);
    }
}

function float16ToInt64(float16Value) {
    const sign = (float16Value & 0x8000) >> 15;
    const exponent = (float16Value & 0x7c00) >> 10;
    const mantissa = float16Value & 0x03ff;
    if (exponent === 0 && mantissa === 0) return BigInt(0);
    if (exponent === 0x1f) return sign ? BigInt("-Infinity") : BigInt("Infinity");
    let value;
    if (exponent === 0) {
        value = Math.pow(2, -14) * (mantissa / 1024);
    } else {
        value = Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }
    value = sign ? -value : value;
    return BigInt(Math.round(value));
}

describe('Float16Array Tensor Support', () => {
    describe('Float16Array Polyfill', () => {
        it('should create Float16Array instances', () => {
            const arr = new Float16Array(10);
            expect(arr).toBeInstanceOf(Float16Array);
            expect(arr.length).toBe(10);
        });

        it('should initialize Float16Array with values', () => {
            const arr = new Float16Array([1.5, 2.5, 3.5]);
            expect(arr.length).toBe(3);
            expect(arr[0]).toBeCloseTo(1.5, 1);
            expect(arr[1]).toBeCloseTo(2.5, 1);
            expect(arr[2]).toBeCloseTo(3.5, 1);
        });

        it('should support fill() method', () => {
            const arr = new Float16Array(5).fill(0);
            expect(Array.from(arr)).toEqual([0, 0, 0, 0, 0]);
        });

        it('should handle hex values', () => {
            const arr = new Float16Array([0xfbff]);
            expect(arr.length).toBe(1);
            expect(arr[0]).toBeDefined();
        });
    });

    describe('int64ToFloat16 Helper', () => {
        it('should convert zero correctly', () => {
            expect(int64ToFloat16(0n)).toBe(0);
        });

        it('should convert positive integers', () => {
            const result = int64ToFloat16(10n);
            expect(result).toBeGreaterThan(0);
        });

        it('should convert negative integers', () => {
            const result = int64ToFloat16(-10n);
            expect(result).toBeGreaterThan(0x8000); // Sign bit set
        });

        it('should handle large values', () => {
            const result = int64ToFloat16(65504n); // Max float16 value
            expect(result).toBeDefined();
        });

        it('should handle infinity', () => {
            const posInf = int64ToFloat16(BigInt(Number.MAX_SAFE_INTEGER));
            const negInf = int64ToFloat16(BigInt(-Number.MAX_SAFE_INTEGER));
            expect(posInf).toBe(0x7c00);
            expect(negInf).toBe(0xfc00);
        });
    });

    describe('float16ToInt64 Helper', () => {
        it('should convert zero correctly', () => {
            expect(float16ToInt64(0)).toBe(0n);
        });

        it('should round-trip with int64ToFloat16', () => {
            const original = 42n;
            const float16 = int64ToFloat16(original);
            const converted = float16ToInt64(float16);
            expect(converted).toBe(original);
        });

        it('should handle positive values', () => {
            const result = float16ToInt64(0x4200); // Approximately 3.0
            expect(result).toBeGreaterThan(0n);
        });

        it('should handle negative values', () => {
            const result = float16ToInt64(0xc200); // Approximately -3.0
            expect(result).toBeLessThan(0n);
        });
    });

    describe('Tensor Compatibility', () => {
        it('should create large Float16Array for tensor data', () => {
            const size = 28 * 2 * 1024 * 64; // Similar to past_key_states dimensions
            const arr = new Float16Array(size).fill(0);
            expect(arr.length).toBe(size);
            expect(arr[0]).toBe(0);
            expect(arr[size - 1]).toBe(0);
        });

        it('should handle float16 conversion in tensor updates', () => {
            const posFactorValue = int64ToFloat16(10n);
            const arr = new Float16Array([posFactorValue]);
            expect(arr.length).toBe(1);

            const converted = float16ToInt64(arr[0]);
            expect(converted).toBe(10n);
        });

        it('should support sequential updates', () => {
            let value = 1n;
            const float16 = int64ToFloat16(value);
            let arr = new Float16Array([float16]);

            // Simulate increment
            const currentValue = float16ToInt64(arr[0]);
            const newValue = currentValue + 1n;
            const newFloat16 = int64ToFloat16(newValue);
            arr = new Float16Array([newFloat16]);

            expect(float16ToInt64(arr[0])).toBe(2n);
        });
    });
});
