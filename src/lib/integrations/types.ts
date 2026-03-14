export interface CRMContact {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMAdapter {
  provider: string;
  createContact(contact: CRMContact, accessToken: string): Promise<{ id: string }>;
  getContacts(accessToken: string, limit?: number): Promise<CRMContact[]>;
  refreshToken?(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;
}

export interface CalendarAdapter {
  provider: string;
  getAvailability(accessToken: string, startDate: string, endDate: string): Promise<CalendarSlot[]>;
  createBooking(accessToken: string, booking: BookingRequest): Promise<{ id: string; link?: string }>;
}

export interface CalendarSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BookingRequest {
  startTime: string;
  endTime: string;
  title: string;
  attendeeEmail: string;
  attendeeName?: string;
}
