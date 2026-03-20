import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import Contact from '@/models/Contact';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AgentPersona from '@/models/AgentPersona';

export interface ResolverContext {
  userId: string;
  organizationId: string;
}

export const resolvers = {
  Query: {
    widgets: async (_args: Record<string, string>, ctx: ResolverContext) => {
      await connectDB();
      return Client.find({ organizationId: ctx.organizationId }).lean();
    },

    widget: async (args: { id: string }, ctx: ResolverContext) => {
      await connectDB();
      return Client.findOne({ _id: args.id, organizationId: ctx.organizationId }).lean();
    },

    chatLogs: async (args: { widgetId: string }, _ctx: ResolverContext) => {
      await connectDB();
      return ChatLog.find({ clientId: args.widgetId }).sort({ createdAt: -1 }).limit(100).lean();
    },

    contacts: async (args: { widgetId: string }, _ctx: ResolverContext) => {
      await connectDB();
      return Contact.find({ clientId: args.widgetId }).sort({ createdAt: -1 }).limit(100).lean();
    },

    analytics: async (args: { widgetId: string }, _ctx: ResolverContext) => {
      await connectDB();
      const [totalChats, totalContacts, totalMessages] = await Promise.all([
        ChatLog.distinct('visitorId', { clientId: args.widgetId }).then((ids) => ids.length),
        Contact.countDocuments({ clientId: args.widgetId }),
        ChatLog.countDocuments({ clientId: args.widgetId }),
      ]);
      return {
        totalChats,
        totalContacts,
        totalMessages,
        avgMessagesPerChat: totalChats > 0 ? totalMessages / totalChats : 0,
      };
    },

    personas: async (args: { widgetId: string }, _ctx: ResolverContext) => {
      await connectDB();
      return AgentPersona.find({ clientId: args.widgetId, isActive: true }).lean();
    },
  },

  Mutation: {
    updateWidget: async (args: { id: string; input: Record<string, unknown> }, ctx: ResolverContext) => {
      await connectDB();
      return Client.findOneAndUpdate(
        { _id: args.id, organizationId: ctx.organizationId },
        { $set: args.input },
        { new: true }
      ).lean();
    },

    createContact: async (
      args: { input: { clientId: string; name: string; email: string; phone?: string } },
      _ctx: ResolverContext
    ) => {
      await connectDB();
      return Contact.create(args.input);
    },

    deleteKnowledgeChunk: async (args: { id: string }, _ctx: ResolverContext) => {
      await connectDB();
      const result = await KnowledgeChunk.findByIdAndDelete(args.id);
      return !!result;
    },
  },
};
