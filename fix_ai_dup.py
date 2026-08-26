import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the duplicate import
content = content.replace('import { GoogleGenAI } from "@google/genai";\\n\\nconst ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });', 'const genericAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });')
# There might be no double newline
content = content.replace('import { GoogleGenAI } from "@google/genai";\\nconst ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });', 'const genericAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });')

# If I couldn't match exactly:
content = re.sub(r'import \{ GoogleGenAI \} from "@google/genai";\s*const ai = new GoogleGenAI\(\{ apiKey: process.env.GEMINI_API_KEY \}\);', 'const genericAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });', content)

content = content.replace('await ai.models.generateContent', 'await genericAi.models.generateContent')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
