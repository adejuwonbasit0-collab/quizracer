const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QuizRacer API is running!' });
});

// Get questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await prisma.question.findMany();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
app.get('/api/users/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        coins: true,
        totalGames: true,
        totalWins: true,
        totalCorrect: true,
        totalAnswers: true,
        bestWpm: true,
        createdAt: true
      }
    });
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Submit answer endpoint
app.post('/api/game/submit', async (req, res) => {
  const { userId, questionId, answer, gameMode } = req.body;
  
  try {
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) }
    });
    
    const isCorrect = question && question.correctAnswer === answer;
    
    if (isCorrect && userId) {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          totalCorrect: { increment: 1 },
          totalAnswers: { increment: 1 },
          coins: { increment: 10 }
        }
      });
    } else if (userId) {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          totalAnswers: { increment: 1 }
        }
      });
    }
    
    res.json({ 
      correct: isCorrect, 
      points: isCorrect ? 10 : 0,
      correctAnswer: question?.correctAnswer 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create admin user if not exists
async function createAdmin() {
  try {
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@quizracer.com' }
    });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@quizracer.com',
          password: hashedPassword,
          username: 'Admin',
          role: 'admin',
          coins: 1000
        }
      });
      console.log('Admin user created: admin@quizracer.com / admin123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin:', error.message);
  }
}

// Start server
app.listen(PORT, async () => {
  await createAdmin();
  console.log('');
  console.log('QuizRacer API Server Running!');
  console.log('URL: http://localhost:' + PORT);
  console.log('Health: http://localhost:' + PORT + '/api/health');
  console.log('Login: admin@quizracer.com / admin123');
  console.log('');
});
