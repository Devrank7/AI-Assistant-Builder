import connectDB from './mongodb';
import AgentStoreItem from '@/models/AgentStoreItem';

export interface AgentStoreFilters {
  category?: string;
  niche?: string;
  search?: string;
  status?: string;
  sort?: 'newest' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export async function listAgents(filters: AgentStoreFilters) {
  await connectDB();

  const query: Record<string, unknown> = {};

  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = 'approved';
  }

  if (filters.category) query.category = filters.category;
  if (filters.niche) query.niche = filters.niche;
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (filters.sort === 'popular') sortObj = { installs: -1 };
  if (filters.sort === 'rating') sortObj = { rating: -1 };

  const [items, total] = await Promise.all([
    AgentStoreItem.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit),
    AgentStoreItem.countDocuments(query),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function submitAgent(
  authorId: string,
  data: {
    name: string;
    description: string;
    niche: string;
    category: string;
    systemPrompt: string;
    sampleResponses?: string[];
    modelPreference?: string;
    tags?: string[];
    icon?: string;
    authorName?: string;
  }
) {
  await connectDB();
  return AgentStoreItem.create({ ...data, authorId, status: 'pending' });
}

export async function getAgentById(id: string) {
  await connectDB();
  return AgentStoreItem.findById(id);
}

export async function installAgent(agentId: string) {
  await connectDB();
  return AgentStoreItem.findByIdAndUpdate(agentId, { $inc: { installs: 1 } }, { new: true });
}

export async function reviewAgent(agentId: string, rating: number, _review: string) {
  await connectDB();
  const agent = await AgentStoreItem.findById(agentId);
  if (!agent) throw new Error('Agent not found');

  const newReviewCount = agent.reviewCount + 1;
  const newRating = (agent.rating * agent.reviewCount + rating) / newReviewCount;

  return AgentStoreItem.findByIdAndUpdate(
    agentId,
    { $set: { rating: Math.round(newRating * 10) / 10, reviewCount: newReviewCount } },
    { new: true }
  );
}
