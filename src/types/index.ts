import { User, Workspace, Channel, Message } from "@prisma/client";

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface CreateWorkspaceDto {
  name: string;
  ownerId: string;
  iconUrl?: string;
}

export interface CreateChannelDto {
  name: string;
  workspaceId: string;
  description?: string;
  isPrivate?: boolean;
}

export interface CreateMessageDto {
  content: string;
  channelId: string;
  userId: string;
  threadParentId?: string;
}
