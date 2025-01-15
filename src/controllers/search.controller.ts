import { Request, Response } from "express";
import { prisma } from "../app";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const searchController = {
  async semanticSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, channelId } = req.query;
      const limit = 5; // Number of similar messages to return

      if (!query) {
        res.status(400).json({ error: "Query is required" });
        return;
      }

      // Generate embedding for the search query
      const embedding = await openai.embeddings.create({
        input: query as string,
        model: "text-embedding-3-small",
      });

      // Perform similarity search using cosine similarity
      const similarMessages = await prisma.$queryRaw`
        SELECT 
          m.id,
          m.content,
          m."createdAt" as created_at,
          u.username,
          (m.vector <=> ${embedding.data[0].embedding}::vector) as similarity
        FROM messages m
        JOIN users u ON m."userId" = u.id
        WHERE m."channelId" = ${channelId as string}
        ORDER BY similarity ASC
        LIMIT ${limit}
      `;

      res.json(similarMessages);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  },
};
