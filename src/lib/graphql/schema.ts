/**
 * GraphQL Schema Definition (string-based, no external deps)
 */

export const typeDefs = `
  type Widget {
    _id: String!
    clientId: String!
    name: String
    status: String
    createdAt: String
    updatedAt: String
  }

  type ChatLog {
    _id: String!
    clientId: String!
    visitorId: String
    role: String!
    content: String!
    createdAt: String
  }

  type Contact {
    _id: String!
    clientId: String!
    name: String
    email: String
    phone: String
    createdAt: String
  }

  type KnowledgeChunk {
    _id: String!
    clientId: String!
    content: String!
    category: String
    createdAt: String
  }

  type Analytics {
    totalChats: Int!
    totalContacts: Int!
    totalMessages: Int!
    avgMessagesPerChat: Float!
  }

  type AgentPersona {
    _id: String!
    clientId: String!
    name: String!
    role: String!
    tone: String!
    isActive: Boolean!
    isDefault: Boolean!
  }

  type Query {
    widgets: [Widget!]!
    widget(id: String!): Widget
    chatLogs(widgetId: String!): [ChatLog!]!
    contacts(widgetId: String!): [Contact!]!
    analytics(widgetId: String!): Analytics!
    personas(widgetId: String!): [AgentPersona!]!
  }

  type Mutation {
    updateWidget(id: String!, input: WidgetInput!): Widget
    createContact(input: ContactInput!): Contact
    deleteKnowledgeChunk(id: String!): Boolean
  }

  input WidgetInput {
    name: String
    status: String
  }

  input ContactInput {
    clientId: String!
    name: String!
    email: String!
    phone: String
  }
`;

export interface FieldDefinition {
  type: 'Query' | 'Mutation';
  name: string;
  args: string[];
  returnType: string;
}

export function getSchemaFields(): FieldDefinition[] {
  return [
    { type: 'Query', name: 'widgets', args: [], returnType: '[Widget!]!' },
    { type: 'Query', name: 'widget', args: ['id'], returnType: 'Widget' },
    { type: 'Query', name: 'chatLogs', args: ['widgetId'], returnType: '[ChatLog!]!' },
    { type: 'Query', name: 'contacts', args: ['widgetId'], returnType: '[Contact!]!' },
    { type: 'Query', name: 'analytics', args: ['widgetId'], returnType: 'Analytics!' },
    { type: 'Query', name: 'personas', args: ['widgetId'], returnType: '[AgentPersona!]!' },
    { type: 'Mutation', name: 'updateWidget', args: ['id', 'input'], returnType: 'Widget' },
    { type: 'Mutation', name: 'createContact', args: ['input'], returnType: 'Contact' },
    { type: 'Mutation', name: 'deleteKnowledgeChunk', args: ['id'], returnType: 'Boolean' },
  ];
}
