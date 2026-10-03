const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const NOT_CONFIGURED_MESSAGE = 'The AI advisor is not configured on this server (missing GEMINI_API_KEY).';

class AIService {
    constructor(apiKey) {
        // Without a key the rest of the API still works; only AI features are disabled
        this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
        if (!this.genAI) {
            logger.warn('GEMINI_API_KEY is not set; AI features are disabled');
        }
    }

    isConfigured() {
        return this.genAI !== null;
    }

   async generateResponse(userMessage, context = {}, studentProfile = {}) {
    if (!this.isConfigured()) return NOT_CONFIGURED_MESSAGE;

    try {
        logger.debug(`Generating AI response (message length: ${userMessage.length})`);

        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build course context from actual data
        let coursesContext = '';
        if (context.courses && context.courses.length > 0) {
            coursesContext = '\n\nCourse Database:\n';
            context.courses.forEach(course => {
                coursesContext += `${course.id}: ${course.name}, ${course.credits}cr, Prereq: ${course.prerequisites}\n`;
            });
        }

        // Add minor information if available
        const minorContext = context.minorInfo || '';

        const prompt = `You are a concise academic advisor for Al Akhawayn University. 

CRITICAL RULES:
1. ONLY use information from the provided data below
2. DO NOT make up or guess prerequisites or requirements
3. Format responses with proper spacing and line breaks for readability
4. Use bullet points (•) or numbered lists when listing multiple items
5. Keep responses SHORT but well-formatted (2-5 sentences)
6. Be accurate and cite actual course codes

FORMATTING RULES:
- Put each course on a new line
- Use "Required:" and "Electives:" headers
- Add blank lines between sections
- Make it easy to read

Student Profile:
- Major: ${studentProfile.major || 'Not specified'}
- Year: ${studentProfile.year || 'Not specified'}
${coursesContext}
${minorContext}

Student Question: ${userMessage}

Provide accurate, well-formatted course planning advice based on the data above.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean up formatting - ensure proper line breaks
        text = text.replace(/\n\n+/g, '\n\n'); // Remove excessive line breaks
        text = text.trim();

        logger.debug(`Generated response length: ${text.length}`);
        return text;

    } catch (error) {
        logger.error(`AI Error: ${error.message}`);
        return `I can help you with course planning! Ask me about course recommendations, prerequisites, or semester planning.`;
    }
}

    async recommendCourses(studentProfile = {}, completedCourses = []) {
        if (!this.isConfigured()) return NOT_CONFIGURED_MESSAGE;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            
            const prompt = `As an academic advisor, recommend 3-5 courses for a ${studentProfile.major} student in year ${studentProfile.year}. They have completed: ${completedCourses.join(', ') || 'introductory courses'}. Be concise.`;
            
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            logger.error(`Recommendation Error: ${error.message}`);
            return `Focus on core courses in your major.`;
        }
    }
}

module.exports = new AIService(process.env.GEMINI_API_KEY);
