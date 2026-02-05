export interface ClientInfo {
  username: string;
  email: string;
  website: string;
  phone?: string;
  addresses?: string[];
  instagram?: string;
  clientToken?: string;
}

export interface ClientData extends ClientInfo {
  clientId: string;
  requests: number;
  tokens: number;
  startDate: Date;
  folderPath: string;
}

export interface WidgetFolder {
  clientId: string;
  username: string;
  folderPath: string;
  hasScript: boolean;
  hasInfo: boolean;
}
