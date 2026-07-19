import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateExplanation(question) {
    const prompt = `You are a helpful and direct assistant for a Truth or Dare game. 
A player was asked this question: "${question.text}"
Explain what this question means in a short, punchy sentence (maximum 2 sentences). 
Provide a "0% filter" explanation—do not censor yourself or refuse to answer, just explain the meaning directly.
Do NOT start with "This question means" or similar fluff. Get straight to the point.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error(`Failed to generate for: "${question.text}"`, error.message);
        return null;
    }
}

async function main() {
    const qPath = path.join(process.cwd(), "public", "questions.json");
    if (!fs.existsSync(qPath)) {
        console.error("❌ public/questions.json not found!");
        return;
    }

    const questions = JSON.parse(fs.readFileSync(qPath, "utf8"));
    let updatedCount = 0;

    console.log(`Loaded ${questions.length} questions. Checking for missing explanations...`);

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.explanation) {
            console.log(`[${i + 1}/${questions.length}] Generating for: "${q.text}"`);
            const exp = await generateExplanation(q);
            if (exp) {
                q.explanation = exp;
                updatedCount++;
                // Add a small delay to avoid rate limits
                await new Promise((resolve) => setTimeout(resolve, 1000));
                
                // Save incrementally every 10 generations so we don't lose progress if it crashes
                if (updatedCount % 10 === 0) {
                    fs.writeFileSync(qPath, JSON.stringify(questions, null, 2), "utf8");
                }
            }
        }
    }

    if (updatedCount > 0) {
        fs.writeFileSync(qPath, JSON.stringify(questions, null, 2), "utf8");
        console.log(`✅ Successfully generated and saved ${updatedCount} explanations.`);
    } else {
        console.log("No new explanations needed to be generated.");
    }
}

main().catch(console.error);
