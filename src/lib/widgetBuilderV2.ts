import connectDB from './mongodb';
import WidgetComponent, { IWidgetComponent } from '@/models/WidgetComponent';

const DEFAULT_COMPONENTS: Array<{
  type: IWidgetComponent['type'];
  name: string;
  order: number;
  props: Record<string, unknown>;
  cssVariables: Record<string, string>;
}> = [
  {
    type: 'header',
    name: 'Header',
    order: 0,
    props: {
      title: 'Chat with us',
      subtitle: 'Online',
      showAvatar: true,
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
    },
    cssVariables: { '--header-bg': '#1a1a2e', '--header-text': '#ffffff', '--header-height': '60px' },
  },
  {
    type: 'chat_area',
    name: 'Chat Area',
    order: 1,
    props: {
      backgroundColor: '#0f0f1a',
      userBubbleColor: '#3b82f6',
      botBubbleColor: '#1e1e3a',
      fontSize: '14px',
      borderRadius: '12px',
    },
    cssVariables: {
      '--chat-bg': '#0f0f1a',
      '--user-bubble': '#3b82f6',
      '--bot-bubble': '#1e1e3a',
      '--chat-font-size': '14px',
    },
  },
  {
    type: 'input',
    name: 'Message Input',
    order: 2,
    props: {
      placeholder: 'Type a message...',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4e',
      sendButtonColor: '#3b82f6',
    },
    cssVariables: { '--input-bg': '#1a1a2e', '--input-border': '#2a2a4e', '--send-btn': '#3b82f6' },
  },
  {
    type: 'quick_replies',
    name: 'Quick Replies',
    order: 3,
    props: {
      replies: ['Pricing', 'Features', 'Contact'],
      backgroundColor: 'transparent',
      chipColor: '#1e1e3a',
      chipTextColor: '#8b8bb0',
    },
    cssVariables: { '--chip-bg': '#1e1e3a', '--chip-text': '#8b8bb0' },
  },
  {
    type: 'powered_by',
    name: 'Powered By',
    order: 4,
    props: { text: 'Powered by WinBix', visible: true },
    cssVariables: { '--powered-text': '#4a4a6a' },
  },
];

export async function getComponents(widgetId: string): Promise<IWidgetComponent[]> {
  await connectDB();
  const components = await WidgetComponent.find({ widgetId }).sort({ order: 1 }).lean();

  // If no components exist, initialize with defaults
  if (components.length === 0) {
    const created = await WidgetComponent.insertMany(
      DEFAULT_COMPONENTS.map((c) => ({ ...c, widgetId, clientId: widgetId }))
    );
    return created;
  }

  return components;
}

export async function updateComponent(
  componentId: string,
  props: Partial<IWidgetComponent>
): Promise<IWidgetComponent | null> {
  await connectDB();
  const allowedFields: Record<string, unknown> = {};
  if (props.props) allowedFields.props = props.props;
  if (props.cssVariables) allowedFields.cssVariables = props.cssVariables;
  if (props.name) allowedFields.name = props.name;
  if (props.isVisible !== undefined) allowedFields.isVisible = props.isVisible;

  return WidgetComponent.findByIdAndUpdate(componentId, { $set: allowedFields }, { new: true }).lean();
}

export async function reorderComponents(widgetId: string, orderMap: Record<string, number>): Promise<void> {
  await connectDB();
  const ops = Object.entries(orderMap).map(([id, order]) => ({
    updateOne: {
      filter: { _id: id, widgetId },
      update: { $set: { order } },
    },
  }));
  await WidgetComponent.bulkWrite(ops);
}

export function generateCSSVariables(components: IWidgetComponent[]): string {
  const vars: string[] = [':host {'];
  for (const comp of components) {
    if (!comp.isVisible) continue;
    for (const [key, value] of Object.entries(comp.cssVariables || {})) {
      vars.push(`  ${key}: ${value};`);
    }
  }
  vars.push('}');
  return vars.join('\n');
}

export async function exportToThemeJson(widgetId: string): Promise<Record<string, unknown>> {
  const components = await getComponents(widgetId);
  const theme: Record<string, unknown> = { widgetId, version: 2, components: {} };

  for (const comp of components) {
    (theme.components as Record<string, unknown>)[comp.type] = {
      name: comp.name,
      order: comp.order,
      props: comp.props,
      cssVariables: comp.cssVariables,
      isVisible: comp.isVisible,
    };
  }

  return theme;
}

export async function importFromThemeJson(
  widgetId: string,
  themeJson: Record<string, unknown>
): Promise<IWidgetComponent[]> {
  await connectDB();

  // Delete existing components
  await WidgetComponent.deleteMany({ widgetId });

  const componentsData = themeJson.components as Record<string, Record<string, unknown>> | undefined;
  if (!componentsData) return [];

  const docs = Object.entries(componentsData).map(([type, config]) => ({
    widgetId,
    clientId: widgetId,
    type,
    name: config.name || type,
    order: config.order || 0,
    props: config.props || {},
    cssVariables: config.cssVariables || {},
    isVisible: config.isVisible !== false,
  }));

  const created = await WidgetComponent.insertMany(docs);
  return created;
}
