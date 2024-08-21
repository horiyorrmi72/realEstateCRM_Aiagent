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
          - email: the email address of the client
          - propertyMarketType: the market type of the property the client is intrested in (secondary market or off-plan)
          - propertyDescription: the description of the property that interests the client
          - propertyLocation: the location of the property
          - propertyPurpose: the purpose of the property (for investment purpose or personal use)
          - propertySizes: the size of the property
          - budget: the client's budget for the listing they are interested in
          - isLead: if the client is a potential lead.
          - leadQualityScore: the quality of the lead on a scale of 1 to 10
          - userHasBookedAppointment: if the user has booked an appointment
          - userWantsToBuyProperty: if the client wants to buy the property
          - userWantsToSellProperty: if the client wants to sell the property
          - userNationality: the client's nationality
          - appointmentTime: the appointment time and date strictly in ISO8601 format (YYYYMMDDTHH:MM:SS:msmsmsZ, [2023-05-25T09:30:00.000Z]).
          - otherRequirements: any other requirements made by the client regarding the listing or their request
          - callBack: if the client requests for a call back

  	and all key values provided above are to follow javascript camelCase approach when returning the data and their value are to remain normal.the lead quality score is scaled from 1 to 10 so it value should always be a number, your response should be concise and in a json format

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
