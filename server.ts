import express, { Request, Response } from "express";
import cors from "cors"
import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json());

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

// ✅ GET: 전체 할 일 조회
app.get("/todos", async (req: Request, res: Response) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    const todos = response.results
      .filter((page): page is any => "properties" in page)
      .map((page: any) => ({
        id: page.properties.id.title?.[0]?.text?.content || "",
        text: page.properties.text.rich_text?.[0]?.text?.content || "",
        checked: page.properties.checked.checkbox || false,
      }));

    res.json(todos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST: 새 할 일 추가
app.post("/todos", async (req: Request, res: Response) => {
  const { id, text, checked } = req.body;

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        id: {
          title: [
            {
              text: { content: id },
            },
          ],
        },
        text: {
          rich_text: [
            {
              text: { content: text },
            },
          ],
        },
        checked: {
          checkbox: checked,
        },
      },
    });

    // 생성한 todo를 JSON 형태로 반환
    res.status(201).json({
      id,
      text,
      checked,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ PATCH: 할 일 수정
app.patch("/todos/:id", async (req: Request, res: Response) => {
  const { id: pageId } = req.params;
  const { id, text, checked } = req.body;

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        id: {
          title: [
            {
              text: { content: id },
            },
          ],
        },
        text: {
          rich_text: [
            {
              text: { content: text },
            },
          ],
        },
        checked: {
          checkbox: checked,
        },
      },
    });

    res.status(200).json({ message: "Updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ DELETE: 할 일 삭제 (Notion에서는 아카이브 처리)
app.delete("/todos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
