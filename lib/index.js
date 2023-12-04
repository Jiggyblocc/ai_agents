require("dotenv").config();
const { OpenAI } = require("openai");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const pretty = require("pretty");

const OUTPUT_FOLDER = "summaries";

const fileSystemSetup = () => {
  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER);
  }

  const dayString = new Date().toISOString().substring(0, 10);
  if (!fs.existsSync(`${OUTPUT_FOLDER}/${dayString}`)) {
    fs.mkdirSync(`${OUTPUT_FOLDER}/${dayString}`);
  }

  const hourString = new Date().toISOString().substring(11, 13);
  if (!fs.existsSync(`${OUTPUT_FOLDER}/${dayString}/${hourString}`)) {
    fs.mkdirSync(`${OUTPUT_FOLDER}/${dayString}/${hourString}`);
  }

  return { dayString, hourString };
};

function saveToFile(summary) {
  summary = summary.trim();

  const { dayString, hourString } = fileSystemSetup();

  const rand = Math.floor(Math.random() * 1000000);
  const timestamp = new Date().toISOString();
  const fileName = `${OUTPUT_FOLDER}/${dayString}/${hourString}/${timestamp}-${rand}.md`;

  fs.writeFile(fileName, summary, (err) => {
    if (err) {
      console.error("Error saving summary to file:", err);
    } else {
      console.info(`Summary saved to ${fileName} successfully.`);
    }
  });
}

async function fetchNews() {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=cats&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching news:", error.message);

    return null;
  }
}

async function summarizeText(text) {
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const gptResponse = await openaiClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
          - You are the world's most advanced AI news analyst.
          - Parse and summarise your reading of the article in less than 6 sentences.
          - IMPORTANT: Use appropriate line breaks, punctuation, and grammar.
          
          - IMPORTANT: Format the summary in Markdown format.
          - IMPORTANT: Use the following format for your summary:
          ----
          Example summary:
          # Title of the summary
          
          This is the first sentence of the summary (paragraph)
          \n (line break)

          This is the second sentence of the summary (paragraph)
          \n (line break)

          This is the third sentence of the summary (paragraph)
          \n (line break)

          ... and so on.
          ---
      
          - You are given the following news article html to parse summarize:
          ${text}
          `,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    const summary = gptResponse.choices[0].message.content;
    return summary;
  } catch (error) {
    console.error("Error summarizing text:", error.message);

    return "";
  }
}

async function visitNewsArticle(url) {
  try {
    const response = await axios.get(url);

    const $ = cheerio.load(response.data);
    const article = $("article");
    const articleTextContent = article.children("div").text();
    const prettyArticle = pretty(articleTextContent);

    return prettyArticle;
  } catch (error) {
    console.error("Error fetching news:", error.message);
    return null;
  }
}

async function runBot() {
  try {
    fileSystemSetup();

    while (true) {
      console.info("Fetching news...");

      const news = await fetchNews();

      if (news) {
        const newsArticlesHTMLPromises = [];
        for (const newsArticle of news.articles) {
          console.info(`Visiting news article... ${newsArticle.url}`);

          const newsArticleHTMLPromise = visitNewsArticle(newsArticle.url);
          newsArticlesHTMLPromises.push(newsArticleHTMLPromise);
        }

        let newsArticlesHTMLs = await Promise.all(newsArticlesHTMLPromises);
        newsArticlesHTMLs = newsArticlesHTMLs.filter((html) => html.length > 0);

        const newsArticlesSummaryPromises = [];
        for (const newsArticleHTML of newsArticlesHTMLs) {
          console.info("Summarizing news article...");

          const summarizedNewsPromise = summarizeText(newsArticleHTML).then((summary) => {
            console.info("Saving summarized news article to file...");

            saveToFile(summary);
          });
          newsArticlesSummaryPromises.push(summarizedNewsPromise);
        }

        await Promise.all(newsArticlesSummaryPromises);
      }

      console.info("Sleeping for 12 hours...");
      await new Promise((resolve) => setTimeout(resolve, 12 * 60 * 60 * 1000));
    }
  } catch (error) {
    console.error("Bot encountered an error:", error.message);
  }
}

runBot();
