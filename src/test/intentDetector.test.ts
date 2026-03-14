import { describe, it, expect } from 'vitest';
import { detectIntent } from '@/lib/intentDetector';

describe('intentDetector', () => {
  describe('booking intent', () => {
    it('should detect "book" keyword', () => {
      const result = detectIntent('I would like to book a session');
      expect(result.intent).toBe('booking');
    });

    it('should detect "schedule" keyword', () => {
      const result = detectIntent('Can I schedule a meeting?');
      expect(result.intent).toBe('booking');
    });

    it('should detect "appointment" keyword', () => {
      const result = detectIntent('I need an appointment for tomorrow');
      expect(result.intent).toBe('booking');
    });

    it('should detect "calendar" keyword', () => {
      const result = detectIntent('Check my calendar availability');
      expect(result.intent).toBe('booking');
    });

    it('should detect "reserve" keyword', () => {
      const result = detectIntent('I want to reserve a time slot');
      expect(result.intent).toBe('booking');
    });

    it('should be case insensitive', () => {
      const result = detectIntent('BOOK a Meeting please');
      expect(result.intent).toBe('booking');
    });
  });

  describe('contact info intent', () => {
    it('should detect email addresses', () => {
      const result = detectIntent('My email is john@example.com');
      expect(result.intent).toBe('contact_info');
      expect(result.data?.email).toBe('john@example.com');
    });

    it('should detect phone numbers', () => {
      const result = detectIntent('Call me at +1-555-123-4567');
      expect(result.intent).toBe('contact_info');
      expect(result.data?.phone).toBeDefined();
    });

    it('should detect name with "my name is"', () => {
      const result = detectIntent('My name is John Smith');
      expect(result.intent).toBe('contact_info');
      expect(result.data?.name).toBe('John Smith');
    });

    it('should detect name with "I\'m"', () => {
      const result = detectIntent("I'm Jane Doe and I need help");
      expect(result.intent).toBe('contact_info');
      expect(result.data?.name).toBe('Jane Doe');
    });

    it('should detect "contact me" phrase', () => {
      const result = detectIntent('Please contact me about your services');
      expect(result.intent).toBe('contact_info');
    });

    it('should extract multiple contact fields', () => {
      const result = detectIntent('My name is John Smith, email john@test.com, call 555-123-4567');
      expect(result.intent).toBe('contact_info');
      expect(result.data?.name).toBe('John Smith');
      expect(result.data?.email).toBe('john@test.com');
      expect(result.data?.phone).toBeDefined();
    });
  });

  describe('no intent', () => {
    it('should return none for regular messages', () => {
      const result = detectIntent('What are your business hours?');
      expect(result.intent).toBe('none');
    });

    it('should return none for generic questions', () => {
      const result = detectIntent('Tell me about your products');
      expect(result.intent).toBe('none');
    });

    it('should return none for empty string', () => {
      const result = detectIntent('');
      expect(result.intent).toBe('none');
    });
  });
});
