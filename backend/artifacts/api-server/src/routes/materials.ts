import { Router, type IRouter } from "express";
import { db, materialsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/materials", async (_req, res) => {
  try {
    const materials = await db.select().from(materialsTable);
    res.json(materials.map(m => ({
      ...m,
      pricePerUnit: parseFloat(m.pricePerUnit),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

router.get("/materials/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    const [material] = await db
      .select()
      .from(materialsTable)
      .where(eq(materialsTable.barcode, barcode));
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    res.json({ ...material, pricePerUnit: parseFloat(material.pricePerUnit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to lookup material" });
  }
});

router.post("/materials/identify-photo", async (req, res) => {
  try {
    const { imageBase64 } = req.body as { imageBase64?: string };
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a construction materials expert. When given a photo, identify the construction material shown and respond ONLY with a JSON object in this exact format:
{
  "identified": true,
  "materialName": "name of the material",
  "category": "one of: Solar, Electrical, Plumbing, Drywall, Paint, Screws & Nails",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": "high|medium|low",
  "description": "brief 1-sentence description of what you see"
}
If you cannot identify a construction material, respond with: {"identified": false, "description": "what you see instead"}`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: "What construction material is this? Respond with the JSON format specified.",
            },
          ],
        },
      ],
    });

    const content = visionResponse.choices[0]?.message?.content ?? "";

    let parsed: any = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    if (!parsed?.identified) {
      return res.json({ identified: false, description: parsed?.description ?? "Could not identify material" });
    }

    const allMaterials = await db.select().from(materialsTable);
    const keywords: string[] = [
      parsed.materialName?.toLowerCase() ?? "",
      ...(parsed.keywords ?? []).map((k: string) => k.toLowerCase()),
    ].filter(Boolean);

    const scored = allMaterials
      .map(m => {
        const haystack = `${m.name} ${m.description} ${m.category}`.toLowerCase();
        const score = keywords.reduce((acc, kw) => {
          if (haystack.includes(kw)) acc += kw.length > 4 ? 3 : 1;
          if (m.category.toLowerCase() === parsed.category?.toLowerCase()) acc += 2;
          return acc;
        }, 0);
        return { material: m, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ material: m }) => ({ ...m, pricePerUnit: parseFloat(m.pricePerUnit) }));

    res.json({
      identified: true,
      materialName: parsed.materialName,
      category: parsed.category,
      confidence: parsed.confidence,
      description: parsed.description,
      matches: scored,
    });
  } catch (err) {
    console.error("identify-photo error:", err);
    res.status(500).json({ error: "Failed to identify material" });
  }
});

export default router;
