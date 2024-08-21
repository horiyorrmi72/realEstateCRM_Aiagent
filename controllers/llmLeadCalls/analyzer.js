const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeCall(query) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Analyze the following transcript query to extract the following information:
          - name: the name of the client
          
  	and all key values provided above are to follow javascript camelCase approach when returning the data and their value are to remain normal. your response should be concise and in a json format

          Query: ${query}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const customAnalysis = JSON.parse(
      response.choices[0].message.content.trim()
    );
    return customAnalysis;
  } catch (error) {
    console.error("Error analyzing call:", error.message);
    return null;
  }
}

module.exports = {
  analyzeCall,
};
