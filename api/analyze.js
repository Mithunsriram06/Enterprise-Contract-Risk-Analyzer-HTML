const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `
You are a Senior Commercial Legal Analyst AI specialising in contract risk assessment.
Your task is to audit the provided contract text for commercial vulnerabilities.
Return ONLY a valid JSON object. Do not include any markdown fences or explanations.

{
  "overall_risk_score": 75,
  "summary": "Executive summary here",
  "risks": [
    {
      "clause_name": "Name",
      "severity": "High",
      "extracted_text": "Exact text",
      "risk_explanation": "Why it's risky",
      "revised_text": "Better alternative"
    }
  ]
}`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contractText } = req.body;

  if (!contractText || contractText.trim() === "") {
    return res.status(400).json({ error: "No contract text provided." });
  }

  try {
    // Initialize Gemini using the secure environment variable
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `${SYSTEM_PROMPT}\n\n---CONTRACT TEXT START---\n${contractText.substring(0, 50000)}\n---CONTRACT TEXT END---`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "AI processing failed." });
  }
};
