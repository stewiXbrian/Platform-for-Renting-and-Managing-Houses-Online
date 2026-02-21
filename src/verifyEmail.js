// Backend: server.js
import Fastify from 'fastify';
import { MongoClient } from 'mongodb';
import { randomUUID as cryptoRandomUUID } from 'crypto';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// Initialize Fastify server with logging
const fastify = Fastify({
  logger: true
});

// MongoDB connection URI
const uri = 'mongodb+srv://chaiebayoub4:bioshock1@cluster0.6juyl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

// Simulated database for verification tokens
const verificationTokens = new Map();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Register CORS for frontend compatibility
fastify.register(fastifyCors, {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
});

// Register multipart for file uploads
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 6 // Allow up to 6 files per request
  }
});

// Configure MailerSend
const mailerSend = new MailerSend({
  apiKey: 'mlsn.1be2051170044997f13f3fe9befe8dde8d2ae5c48a77c6be24cf3bd5ccbb92f3',
});

const SENDER_EMAIL = 'noreply@test-r6ke4n11kw3gon12.mlsender.net';

// Function to generate a 6-character alphanumeric code
function generateVerificationCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Route to send verification email with code
fastify.post('/sendVerification', async (request, reply) => {
  const { email, password, firstName, lastName } = request.body;

  try {
    const client = await connectToDatabase();
    const db = client.db('PFE');
    const usersCollection = db.collection('users');

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Store code and user data
    verificationTokens.set(email, { token: verificationCode, password, firstName, lastName });

    // Configure email
    const sentFrom = new Sender(SENDER_EMAIL, 'Sign up Verification');
    const recipients = [new Recipient(email)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Verify Your Email')
      .setHtml(`<p>Your verification code is: <strong>${verificationCode}</strong></p>`)
      .setText(`Your verification code is: ${verificationCode}`);

    await mailerSend.email.send(emailParams);
    reply.status(200).send({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    reply.status(500).send({ 
      error: 'Failed to send verification email',
      details: error.message 
    });
  }
});

// Route to handle verification
fastify.post('/verify', async (request, reply) => {
  const { token, email } = request.body;

  if (!token || !email) {
    return reply.status(400).send({ error: 'Invalid verification data' });
  }

  // Validate token
  const storedData = verificationTokens.get(email);
  if (storedData && storedData.token === token) {
    const { password, firstName, lastName } = storedData;
    verificationTokens.delete(email); // Remove all fields associated with the email

    try {
      const client = await connectToDatabase();
      const db = client.db('PFE');
      const usersCollection = db.collection('users');
      const profilesCollection = db.collection('profiles');

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({ error: 'Email already registered' });
      }

      const userId = cryptoRandomUUID();
      const now = new Date();

      await usersCollection.insertOne({
        userId,
        email,
        password, // In production, hash the password
        first_name: firstName,
        last_name: lastName,
        created_at: now
      });

      await profilesCollection.insertOne({
        userId,
        host: `${firstName} ${lastName}`,
        email,
        bio: '',
        avatar: null,
        location: '',
        languages: [],
        interests: [],
        notifications: [],
        created_at: now,
        updated_at: now
      });

      return reply.status(201).send({ success: true, userId });
    } catch (error) {
      fastify.log.error('Registration error:', error);
      return reply.status(500).send({ error: error.message || 'Registration failed' });
    }
  } else {
    return reply.status(400).send({ error: 'Invalid or incorrect verification code' });
  }
});

// Start the server
const start = async () => {
  try {
    await connectToDatabase();
    await fastify.listen({ port: 5000 });
    console.log('Server running on http://localhost:5000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();