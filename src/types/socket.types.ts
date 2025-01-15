export interface ThreadReplyData {
  channelId: string;
  parentId: string;
  content: string;
}

export interface ReactionData {
  channelId: string;
  messageId: string;
  emoji: string;
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  threadParentId?: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    fullName: string | null;
  };
  parentMessage?: Message | null;
  files?: {
    id: string;
    filename: string;
    path: string;
    mimeType: string;
    size: number;
  }[];
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    fullName: string | null;
  };
}

export interface FileData {
  channelId: string;
  file: Express.Multer.File;
  messageId?: string;
}
