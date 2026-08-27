import re

with open('server.ts', 'r') as f:
    content = f.read()

replacement = """
    try {
      // Remove any markdown code block wrappers
      const cleanText = text.replace(/^```json/m, '').replace(/^```/m, '').trim();
      let parsed = JSON.parse(cleanText);
      parsed.success = true;
      if (defaultResponse && defaultResponse.result && !parsed.result) {
        // If Gemini omitted the 'result' wrapper, wrap it
        const newResult = { ...parsed };
        delete newResult.success;
        parsed = { success: true, result: newResult };
      }
      return res.json(parsed);
    } catch {
"""

content = re.sub(
    r'try \{\s*const parsed = JSON\.parse\(text\);\s*parsed\.success = true;\s*return res\.json\(parsed\);\s*\} catch \{',
    replacement,
    content
)

with open('server.ts', 'w') as f:
    f.write(content)
