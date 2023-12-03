const axios = require('axios');
const { OpenAIAPI } = require('openai');

// Your OpenAI API key
const OPENAI_API_KEY = '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';

// Function to fetch news from an API
async function fetchNews() {
  try {
    const response = await axios.get('e7c721fcfe844a448340d1a7d1e7fac7');
    return response.data; // Assuming the API returns JSON data
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return null;
  }
}

// Function to summarize text using OpenAI
async function summarizeText(text) {
  const openaiClient = new OpenAIAPI(OPENAI_API_KEY);

  try {
    const gptResponse = await openaiClient.complete({
      engine: 'davinci',
      prompt: text,
      max_tokens: 150, // Adjust the number of tokens for your desired summary length
      temperature: 0.5,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    return gptResponse.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error summarizing text:', error.message);
    return null;
  }
}

// Function to save the summarized text to a file
const fs = require('fs');

function saveToFile(summary) {
  const fileName = 'summary.md';

  fs.writeFile(fileName, summary, (err) => {
    if (err) {
      console.error('Error saving summary to file:', err);
    } else {
      console.log(`Summary saved to ${fileName} successfully.`);
    }
  });
}


// Main function to run the bot
async function runBot() {
    try {
      while (true) {
        const news = await fetchNews();
        if (news) {
          const summarizedNews = await summarizeText(news);
          if (summarizedNews) {
            saveToFile(summarizedNews);
          }
        }
        // Sleep for 12 hours (in milliseconds)
        await new Promise((resolve) => setTimeout(resolve, 12 * 60 * 60 * 1000));
      }
    } catch (error) {
      console.error('Bot encountered an error:', error.message);
      // Handle the error here or log it as needed
    }
  }
  
  runBot();
  