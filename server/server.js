import express from 'express'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'
import * as dotenv from 'dotenv'
import Filter from 'bad-words'
import { rateLimitMiddleware } from './middlewares/rateLimitMiddleware.js'

const allowedOrigins = ['https://chat.zz.sd', 'https://gpt.sd', 'http://localhost']

const filter = new Filter()

// Load environment variables from .env file
try {
  dotenv.config()
} catch (error) {
  console.error('Error loading environment variables:', error)
  process.exit(1)
}

// Create OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create OpenAI API client
const openai = new OpenAIApi(configuration)

// Create Express app
const app = express()


// Parse JSON in request body
app.use(express.json())

// Enable CORS
app.use(cors())

// ratelimiter middleware function
app.use('/davinci', rateLimitMiddleware)
app.use('/dalle', rateLimitMiddleware)

/**
 * GET /
 * Returns a simple message.
 */
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Hello World!',
  })
})

/**
 * POST /davinci
 * Returns a response from OpenAI's text completion model.
 */
app.post('/davinci', async (req, res) => {
  // Validate request body
  if (!req.body.prompt) {
    return res.status(400).send({
      error: 'Missing required field "prompt" in request body',
    })
  }

  try {
    // Call OpenAI API
    const { prompt, user } = req.body
    const cleanPrompt = filter.isProfane(prompt) ? filter.clean(prompt) : prompt
    console.log(cleanPrompt)

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {"role": "system", "content": "You are a chatbot called “Travo”, you are designed to assist travelers in planning their vacations. Your goal is to provide personalized recommendations to users based on their preferences, budget, and travel style. You should be able to suggest destinations, hotels, activities, and transportation options, as well as provide practical information such as visa requirements, weather conditions, and local customs.However, there are some restrictions to ensure that you maintain your role as a travel advisor and provide useful information to users:1. Stick to travel-related topics: Your responses should focus on travel-related topics such as flights, accommodations, activities, and sightseeing. Avoid topics that are not related to travel, such as politics, religion, or personal opinions.2. Be knowledgeable but not overwhelming: Your responses should be informative and helpful, but not overwhelming. Provide the necessary information, but avoid bombarding users with irrelevant details.3. Personalize your responses: Your responses should be tailored to each user's preferences, budget, and travel style. Ask questions to gather more information and provide recommendations accordingly.4. Use proper grammar and spelling: Your responses should be grammatically correct and free of spelling errors. This will help users understand your recommendations and build trust in your expertise.5. Be polite and professional: Your responses should be polite and professional, reflecting the demeanor of a travel advisor. Avoid using slang or informal language that may detract from your professional image.Remember, your goal is to provide helpful recommendations to users and make their travel planning process easier. Keep these restrictions in mind, and you'll be on your way to becoming a successful travel advisor chatbot!"},
        {"role": "user", "content": "hi, what is your name?"},
        {"role": "assistant", "content": "Hi, I am Travo! How can I help you?"},
        {"role": "user", "content": `${cleanPrompt}?`}
    ],
      user: user,
      temperature: 0.5,
      max_tokens: 500,
      top_p: 0.5,
      frequency_penalty: 0.5,
      presence_penalty: 0.2,
    })

    console.log(response.data.choices[0].message.content)
    console.log(user)
    // Return response from OpenAI API
    res.status(200).send({
      bot: response.data.choices[0].message.content,
      limit: res.body.limit
    })
  } catch (error) {
    // Log error and return a generic error message
    console.error(error)
    res.status(500).send({
      error: 'Something went wrong',
    })
  }
})

/**
 * POST /dalle
 * Returns a response from OpenAI's image generation model.
 */
app.post('/dalle', async (req, res) => {
  const { prompt, user } = req.body

  try {
    const response = await openai.createImage({
      prompt: `${prompt}`,
      user: user,
      n: 1,
      size: "256x256",
    })

    console.log(response.data.data[0].url)
    res.status(200).send({
      bot: response.data.data[0].url,
      limit: res.body.limit
    })
  } catch (error) {
    // Log error and return a generic error message
    console.error(error)
    res.status(500).send({
      error: 'Something went wrong',
    })
  }
})

// Start server
const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Server listening on port ${port}`))
