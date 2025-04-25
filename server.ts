import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const corsOptions: CorsOptions = {
  origin: "*", 
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

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

    res.status(201).json({
      id,
      text,
      checked,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// app.patch("/todos/:id", async (req: Request, res: Response) => {
//   const { id: pageId } = req.params;
//   const { id, text, checked } = req.body;

//   try {
//     await notion.pages.update({
//       page_id: pageId,
//       properties: {
//         id: {
//           title: [
//             {
//               text: { content: id },
//             },
//           ],
//         },
//         text: {
//           rich_text: [
//             {
//               text: { content: text },
//             },
//           ],
//         },
//         checked: {
//           checkbox: checked,
//         },
//       },
//     });

//     res.status(200).json({ message: "Updated successfully" });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });
app.patch("/todos/:id", async (req: Request, res: Response) => {
  const clientId = req.params.id; 
  const { text, checked } = req.body;

  try {
    const { results } = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "id",
        title: { equals: clientId }
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const notionPageId = results[0].id;

    await notion.pages.update({
      page_id: notionPageId,
      properties: {
        text: { rich_text: [{ text: { content: text } }] },
        checked: { checkbox: checked }
      }
    });

    res.status(200).json({ message: "Updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// app.delete("/todos/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;

//   try {
//     await notion.pages.update({
//       page_id: id,
//       archived: true,
//     });

//     res.status(200).json({ message: "Deleted successfully" });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });
app.delete("/todos/:id", async (req: Request, res: Response) => {
  const clientId = req.params.id;

  try {
    const { results } = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "id",
        title: { equals: clientId }
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const notionPageId = results[0].id;

    await notion.pages.update({
      page_id: notionPageId,
      archived: true
    });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});