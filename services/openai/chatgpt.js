import { Configuration, OpenAIApi } from "openai";

/**
 * 
 * @returns 
 */
const completion = async (dataIn = '') => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "text-embedding-3-small",
    prompt: dataIn,
    max_tokens: 256,
    temperature: 0,
  });

  return response
}

export default { completion };
