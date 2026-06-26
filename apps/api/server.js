const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'QuizRacer API is running!',
    timestamp: new Date().toISOString()
  });
});

// Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await prisma.question.findMany();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        role: user.role, 
        coins: user.coins 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: username || email.split('@')[0],
        role: 'player',
        coins: 100
      }
    });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        role: user.role, 
        coins: user.coins 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Submit answer endpoint
app.post('/api/game/submit', async (req, res) => {
  const { questionId, answer, userId } = req.body;
  
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const isCorrect = question.correctAnswer === answer;
    let points = 0;
    
    if (isCorrect) {
      points = 10;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalCorrect: { increment: 1 },
            totalAnswers: { increment: 1 },
            coins: { increment: points }
          }
        });
      }
    } else if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalAnswers: { increment: 1 }
        }
      });
    }
    
    res.json({ correct: isCorrect, points });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('QuizRacer API Server Started');
  console.log('========================================');
  console.log('Server running on: http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/api/health');
  console.log('Questions API: http://localhost:' + PORT + '/api/questions');
  console.log('========================================');
});
