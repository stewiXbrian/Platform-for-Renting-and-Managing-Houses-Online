import { useState, useEffect, useRef } from 'react';
import {
  ActionIcon,
  TextInput,
  Paper,
  Text,
  ScrollArea,
  Group,
  Box,
} from '@mantine/core';
import { IconMessage, IconX, IconSend, IconTrash } from '@tabler/icons-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Replace with your actual Gemini API key (securely, e.g., via environment variables)
const API_KEY = 'AIzaSyD00v-wtQt5-Np2j90eLMO3Qlkfs97Njlk'; // WARNING: Use env variables in production

const ChatBot = ({ chatData }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef(null); // Ref for ScrollArea

  // Function to query Gemini API with stringified listings
  const runGeminiQuery = async (userInput) => {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      // Stringify the listings array
      const stringifiedListings = JSON.stringify(chatData);

      // Construct the prompt with stringified listings
  const prompt = `
        You are a chatbot that answers questions about a list of property listings.
         Below is the JSON data for the listings:
        \`\`\`json
        ${stringifiedListings}
        \`\`\`
        Prompt: Analyze and Answer Questions About Listing Data

   Tone: Answer smartly and concisely, ensuring relevance to the listing data.
    Scope: Only respond to questions related to fields in the listings (e.g., id, location, price, amenities,  etc...).
   
    Response Guidelines:
        if i ask you about price of a listing ,give me the price always with the 'TND' sign. 
        Provide clear, concise, and accurate answers based solely on the listing data.
        Answer questions about listing fields in the format or manner requested by the user.
        If a user asks about a random field without specifying a listing but previously mentioned one, assume they’re referring to the last mentioned listing.
        For questions involving multiple listings, separate each answer with a horizontal line (e.g., ---) and return to line  for visual clarity.
      Greetings and Thanks: Acknowledge user greetings (e.g., "Hi") or thanks (e.g., "Thank you") and invite them to ask questions about the listing but dont greet every time the user asks you a question.

      Off-Topic Questions: If a question is unrelated to listing fields, respond with: "Sorry, I can only answer questions about listing fields like id, location, price, amenities, etc. Please ask about those!"
        User's question: "${userInput}"
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini API error:', error);
      return '';
    }
  };

  // Handle user messages
  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { content: input, isBot: false };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Get bot response from Gemini with stringified listings
    const botResponse = await runGeminiQuery(input);
    setIsTyping(false);

    // Only add bot message if response is non-empty
    if (botResponse) {
      const botMessage = { content: botResponse, isBot: true };
      setMessages((prev) => [...prev, botMessage]);
    }
  };

  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Auto-scroll to the bottom when messages or isTyping change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <Box style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {isOpen ? (
        <Paper
          shadow="md"
          radius="md"
          style={{ width: '350px', height: '500px', display: 'flex', flexDirection: 'column' }}
        >
          <Group p="md" position="apart" style={{ borderBottom: '1px solid #ddd' }}>
            <Text fw={500}>Chat Bot</Text>
            <Group spacing="xs">
              <ActionIcon onClick={clearMessages} title="Clear all messages">
                <IconTrash size={18} />
              </ActionIcon>
              <ActionIcon onClick={() => setIsOpen(false)}>
                <IconX size={18} />
              </ActionIcon>
            </Group>
          </Group>

          <ScrollArea style={{ flex: 1, padding: '16px' }} viewportRef={scrollAreaRef}>
            {messages.map((message, index) => (
              <Group
                key={index}
                position={message.isBot ? 'left' : 'right'}
                spacing="xs"
                mb="md"
              >
                {message.isBot && (
                  <Box
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#228be6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="xs" color="white">
                      RB
                    </Text>
                  </Box>
                )}
                <Paper
                  p="sm"
                  style={{
                    maxWidth: '80%',
                    backgroundColor: message.isBot ? '#f1f3f5' : '#228be6',
                    color: message.isBot ? 'inherit' : 'white',
                  }}
                >
                  <Text size="sm">{message.content}</Text>
                </Paper>
              </Group>
            ))}
            {isTyping && (
              <Group position="left" spacing="xs">
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#f1f3f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="xs">RB</Text>
                </Box>
                <Paper p="sm" style={{ backgroundColor: '#f1f3f5' }}>
                  <Text size="sm">...</Text>
                </Paper>
              </Group>
            )}
          </ScrollArea>

          <Group p="md" spacing="sm" style={{ borderTop: '1px solid #ddd' }}>
            <TextInput
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              style={{ flex: 1 }}
            />
            <ActionIcon
              color="blue"
              variant="filled"
              size="lg"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <IconSend size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      ) : (
        <ActionIcon
          color="blue"
          variant="filled"
          size="xl"
          radius="xl"
          onClick={() => setIsOpen(true)}
        >
          <IconMessage size={24} />
        </ActionIcon>
      )}
    </Box>
  );
};

export default ChatBot;