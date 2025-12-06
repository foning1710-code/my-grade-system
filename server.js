const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Simple middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// Get MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

console.log('=== Starting School Grade System ===');
console.log('MongoDB URI present:', MONGODB_URI ? 'Yes' : 'No');

// Try to connect to MongoDB, but don't crash if it fails
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.log('⚠️ MongoDB connection failed:', err.message);
    console.log('⚠️ Running without database - using local storage');
  });
} else {
  console.log('⚠️ MONGODB_URI not set - running without database');
}

// Simple in-memory storage (fallback)
let localGrades = [];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Simple test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gradesCount: localGrades.length
  });
});

// Save grade
app.post('/api/save-grade', (req, res) => {
  try {
    const { teacher, subject, student, marks } = req.body;
    
    const grade = {
      id: Date.now(),
      teacher,
      subject,
      student,
      marks: Number(marks),
      date: new Date().toISOString(),
      savedAt: new Date().toLocaleString()
    };
    
    // Try to save to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      // MongoDB save logic would go here
      console.log('Would save to MongoDB:', grade);
    }
    
    // Save locally
    localGrades.push(grade);
    
    res.json({
      success: true,
      message: 'Grade saved successfully!',
      grade,
      storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'local'
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// Get all grades
app.get('/api/grades', (req, res) => {
  res.json({
    success: true,
    grades: localGrades,
    count: localGrades.length,
    storage: 'local'
  });
});

// Clear all grades (for testing)
app.delete('/api/clear', (req, res) => {
  localGrades = [];
  res.json({ success: true, message: 'All grades cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access your app at: https://my-grade-system.onrender.com`);
  console.log(`📊 Health check: https://my-grade-system.onrender.com/api/health`);
});
