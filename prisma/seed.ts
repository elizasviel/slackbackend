import { PrismaClient, UserStatus, MemberRole } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

async function main() {
  // Clean the database
  await prisma.directMessage.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  await prisma.file.deleteMany();

  // Create users
  const john = await prisma.user.create({
    data: {
      email: "john@example.com",
      username: "john",
      password: hashPassword("hashedpassword123"),
      fullName: "John Doe",
      status: UserStatus.ONLINE,
    },
  });

  const jane = await prisma.user.create({
    data: {
      email: "jane@example.com",
      username: "jane",
      password: hashPassword("hashedpassword123"),
      fullName: "Jane Smith",
      status: UserStatus.ONLINE,
    },
  });

  // Create a workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Corp",
      members: {
        create: [
          {
            userId: john.id,
            role: MemberRole.OWNER,
          },
          {
            userId: jane.id,
            role: MemberRole.MEMBER,
          },
        ],
      },
    },
  });

  // Create channels
  const generalChannel = await prisma.channel.create({
    data: {
      name: "general",
      workspaceId: workspace.id,
      description: "General discussion",
      members: {
        create: [{ userId: john.id }, { userId: jane.id }],
      },
    },
  });

  const randomChannel = await prisma.channel.create({
    data: {
      name: "random",
      workspaceId: workspace.id,
      description: "Random stuff",
      members: {
        create: [{ userId: john.id }, { userId: jane.id }],
      },
    },
  });

  // Create some messages
  const message1 = await prisma.message.create({
    data: {
      content: "Hello everyone! Welcome to Acme Corp workspace! 👋",
      channelId: generalChannel.id,
      userId: john.id,
    },
  });

  const message2 = await prisma.message.create({
    data: {
      content: "Thanks for the welcome! Excited to be here! 🎉",
      channelId: generalChannel.id,
      userId: jane.id,
    },
  });

  // Add some reactions
  await prisma.messageReaction.create({
    data: {
      messageId: message1.id,
      userId: jane.id,
      emoji: "👋",
    },
  });

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
