/**
 * WinBix TypeScript SDK Client
 * Communicates with the GraphQL API v2 endpoint.
 */

export interface WinBixWidget {
  _id: string;
  clientId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WinBixChatLog {
  _id: string;
  clientId: string;
  visitorId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface WinBixContact {
  _id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface WinBixAnalytics {
  totalChats: number;
  totalContacts: number;
  totalMessages: number;
  avgMessagesPerChat: number;
}

export interface WinBixAgentPersona {
  _id: string;
  clientId: string;
  name: string;
  role: string;
  tone: string;
  isActive: boolean;
  isDefault: boolean;
}

interface GraphQLResponse<T> {
  success: boolean;
  data?: {
    data: T;
    errors: Array<{ message: string }>;
  };
  error?: string;
}

export class WinBixClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://winbixai.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async execute<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v2/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WinBix-Key': this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json: GraphQLResponse<T> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.error || 'GraphQL request failed');
    }

    if (json.data.errors && json.data.errors.length > 0) {
      throw new Error(json.data.errors.map((e) => e.message).join(', '));
    }

    return json.data.data;
  }

  async getWidgets(): Promise<WinBixWidget[]> {
    const result = await this.execute<{ widgets: WinBixWidget[] }>(`
      query { widgets { _id clientId name status createdAt updatedAt } }
    `);
    return result.widgets;
  }

  async getWidget(id: string): Promise<WinBixWidget | null> {
    const result = await this.execute<{ widget: WinBixWidget | null }>(`
      query { widget(id: "${id}") { _id clientId name status createdAt updatedAt } }
    `);
    return result.widget;
  }

  async getChatLogs(widgetId: string): Promise<WinBixChatLog[]> {
    const result = await this.execute<{ chatLogs: WinBixChatLog[] }>(`
      query { chatLogs(widgetId: "${widgetId}") { _id clientId visitorId role content createdAt } }
    `);
    return result.chatLogs;
  }

  async getContacts(widgetId: string): Promise<WinBixContact[]> {
    const result = await this.execute<{ contacts: WinBixContact[] }>(`
      query { contacts(widgetId: "${widgetId}") { _id clientId name email phone createdAt } }
    `);
    return result.contacts;
  }

  async getAnalytics(widgetId: string): Promise<WinBixAnalytics> {
    const result = await this.execute<{ analytics: WinBixAnalytics }>(`
      query { analytics(widgetId: "${widgetId}") { totalChats totalContacts totalMessages avgMessagesPerChat } }
    `);
    return result.analytics;
  }

  async getPersonas(widgetId: string): Promise<WinBixAgentPersona[]> {
    const result = await this.execute<{ personas: WinBixAgentPersona[] }>(`
      query { personas(widgetId: "${widgetId}") { _id clientId name role tone isActive isDefault } }
    `);
    return result.personas;
  }
}
