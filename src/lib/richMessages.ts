/**
 * Rich Messages Parser
 *
 * Parses special fenced block syntax from AI responses into structured rich blocks.
 *
 * Syntax examples:
 *   :::card
 *   title: Product Name
 *   image: https://example.com/img.jpg
 *   description: Product description here
 *   button: Buy Now | https://example.com/buy
 *   :::
 *
 *   :::buttons
 *   FAQ | /faq
 *   Pricing | /pricing
 *   Contact Us | /contact
 *   :::
 *
 *   :::carousel
 *   ---
 *   title: Item 1
 *   image: https://example.com/1.jpg
 *   description: First item
 *   button: View | https://example.com/1
 *   ---
 *   title: Item 2
 *   image: https://example.com/2.jpg
 *   description: Second item
 *   button: View | https://example.com/2
 *   :::
 */

export interface CardBlock {
  type: 'card';
  title: string;
  image?: string;
  description?: string;
  button?: { label: string; url: string };
}

export interface ButtonGroupBlock {
  type: 'button_group';
  buttons: Array<{ label: string; url: string }>;
}

export interface CarouselBlock {
  type: 'carousel';
  items: CardBlock[];
}

export type RichBlock = CardBlock | ButtonGroupBlock | CarouselBlock;

export interface ParseResult {
  cleanText: string;
  richBlocks: RichBlock[];
}

function parseCardContent(content: string): CardBlock {
  const card: CardBlock = { type: 'card', title: '' };
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('title:')) {
      card.title = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('image:')) {
      card.image = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('description:')) {
      card.description = trimmed.slice(12).trim();
    } else if (trimmed.startsWith('button:')) {
      const parts = trimmed
        .slice(7)
        .trim()
        .split('|')
        .map((p) => p.trim());
      if (parts.length >= 2) {
        card.button = { label: parts[0], url: parts[1] };
      }
    }
  }

  return card;
}

function parseButtonGroup(content: string): ButtonGroupBlock {
  const buttons: Array<{ label: string; url: string }> = [];
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const parts = line
      .trim()
      .split('|')
      .map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      buttons.push({ label: parts[0], url: parts[1] });
    }
  }

  return { type: 'button_group', buttons };
}

function parseCarousel(content: string): CarouselBlock {
  const items: CardBlock[] = [];
  const sections = content.split('---').filter((s) => s.trim());

  for (const section of sections) {
    const card = parseCardContent(section);
    if (card.title) {
      items.push(card);
    }
  }

  return { type: 'carousel', items };
}

/**
 * Parse rich blocks from AI response text.
 * Extracts :::card, :::buttons, :::carousel fenced blocks.
 * Returns clean text (without rich blocks) and parsed structured blocks.
 */
export function parseRichBlocks(text: string): ParseResult {
  const richBlocks: RichBlock[] = [];
  const blockRegex = /:::(card|buttons|carousel)\n([\s\S]*?):::/g;

  const cleanText = text
    .replace(blockRegex, (_, blockType: string, content: string) => {
      switch (blockType) {
        case 'card':
          richBlocks.push(parseCardContent(content));
          break;
        case 'buttons':
          richBlocks.push(parseButtonGroup(content));
          break;
        case 'carousel':
          richBlocks.push(parseCarousel(content));
          break;
      }
      return ''; // Remove block from text
    })
    .trim();

  return { cleanText, richBlocks };
}
