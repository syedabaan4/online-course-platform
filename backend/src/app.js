const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/courses', require('./routes/course.routes'));
app.use('/api/modules', require('./routes/module.routes'));
app.use('/api/lectures', require('./routes/lecture.routes'));
app.use('/api/resources', require('./routes/resource.routes'));
app.use('/api/enrollments', require('./routes/enrollment.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
// app.use('/api/quizzes', require('./routes/quiz.routes'));
// app.use('/api/certificates', require('./routes/certificate.routes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;