import express, { Request, Response } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://notion-api-backend-f22di13eq-neungdongs-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

app.use(express.json());

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

app.get("/todos", async (req: Request, res: Response) => {
  const response = await notion.databases.query({ database_id: databaseId });
  const results = response.results.map((page: any) => ({
    id: page.id,
    text: page.properties.text.title[0]?.plain_text || "",
    checked: page.properties.checked.checkbox,
  }));
  res.json(results);
});

app.post("/todos", async (req: Request, res: Response) => {
  const { text } = req.body;
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      text: {
        title: [{ text: { content: text } }],
      },
      checked: {
        checkbox: false,
      },
    },
  });
  res.json({ id: response.id });
});

app.patch("/todos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { checked } = req.body;
  await notion.pages.update({
    page_id: id,
    properties: {
      checked: {
        checkbox: checked,
      },
    },
  });
  res.json({ success: true });
});

app.delete("/todos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await notion.pages.update({
    page_id: id,
    archived: true,
  });
  res.json({ success: true });
});

export default app;
