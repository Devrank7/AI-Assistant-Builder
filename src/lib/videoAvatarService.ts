import connectDB from './mongodb';
import VideoAvatar from '@/models/VideoAvatar';

export async function createAvatar(
  clientId: string,
  config: {
    name: string;
    provider: 'heygen' | 'did' | 'custom';
    style: 'professional' | 'casual' | 'friendly';
    gender: 'male' | 'female' | 'neutral';
    language?: string;
    voiceId?: string;
    avatarUrl?: string;
    apiConfig?: { apiKey?: string; avatarId?: string; voiceSettings?: Record<string, unknown> };
  }
) {
  await connectDB();
  return VideoAvatar.create({ clientId, ...config });
}

export async function listAvatars(clientId: string) {
  await connectDB();
  return VideoAvatar.find({ clientId }).sort({ createdAt: -1 });
}

export async function getAvatarById(id: string) {
  await connectDB();
  return VideoAvatar.findById(id);
}

export async function updateAvatar(id: string, data: Record<string, unknown>) {
  await connectDB();
  return VideoAvatar.findByIdAndUpdate(id, { $set: data }, { new: true });
}

export async function deleteAvatar(id: string) {
  await connectDB();
  return VideoAvatar.findByIdAndDelete(id);
}

export async function generateVideoResponse(
  avatarId: string,
  text: string
): Promise<{ videoUrl: string; duration: number }> {
  await connectDB();
  const avatar = await VideoAvatar.findById(avatarId);
  if (!avatar) throw new Error('Avatar not found');

  if (avatar.provider === 'heygen') {
    const apiKey = avatar.apiConfig?.apiKey;
    if (!apiKey) throw new Error('HeyGen API key not configured');

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: avatar.apiConfig.avatarId },
            voice: { type: 'text', input_text: text, voice_id: avatar.voiceId },
          },
        ],
      }),
    });

    const result = await response.json();
    return {
      videoUrl: result.data?.video_url || '',
      duration: result.data?.duration || 0,
    };
  }

  if (avatar.provider === 'did') {
    const apiKey = avatar.apiConfig?.apiKey;
    if (!apiKey) throw new Error('D-ID API key not configured');

    const response = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        source_url: avatar.avatarUrl,
        script: {
          type: 'text',
          input: text,
          provider: { type: 'microsoft', voice_id: avatar.voiceId },
        },
      }),
    });

    const result = await response.json();
    return {
      videoUrl: result.result_url || '',
      duration: result.duration || 0,
    };
  }

  return { videoUrl: '', duration: 0 };
}
