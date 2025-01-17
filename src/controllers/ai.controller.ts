import { Request, Response } from "express";
import { prisma } from "../app";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const aiController = {
  async summarizeThread(req: Request, res: Response) {
    try {
      const { messageId } = req.params;

      // Get thread messages
      const messages = await prisma.message.findMany({
        where: {
          OR: [{ id: messageId }, { threadParentId: messageId }],
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          user: true,
        },
      });

      // Create thread content
      const threadContent = messages
        .map((m) => `${m.user?.username || "User"}: ${m.content}`)
        .join("\n");

      // Get summary from OpenAI
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Summarize the following chat thread concisely and analyze its sentiment:",
          },
          {
            role: "user",
            content: threadContent,
          },
        ],
        model: "gpt-3.5-turbo",
      });

      const summary = completion.choices[0].message.content || "";

      // Simple sentiment analysis based on the summary
      const sentiment = summary.toLowerCase().includes("positive")
        ? "positive"
        : summary.toLowerCase().includes("negative")
        ? "negative"
        : "neutral";

      res.json({ summary, sentiment });
    } catch (error) {
      res.status(500).json({ error: "Failed to summarize thread" });
    }
  },

  async getSmartReplies(req: Request, res: Response) {
    try {
      const { messageContent } = req.body;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Generate 3 short, natural chat responses to the following message. Format as JSON array with 'text' and 'confidence' properties.",
          },
          {
            role: "user",
            content: messageContent,
          },
        ],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" },
      });

      const suggestions = JSON.parse(
        completion.choices[0].message.content || "[]"
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate smart replies" });
    }
  },
};
