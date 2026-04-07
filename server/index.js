const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const droneRoutes = require('./routes/droneRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const orderRoutes = require('./routes/orderRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const activationRoutes = require('./routes/activationRoutes');
const prebookingRoutes = require('./routes/prebookingRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

// Handle Socket connections
io.on('connection', (socket) => {
  console.log('New client connected via socket:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const path = require('path');

// Trace incoming requests before body parsers
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/users')) {
    console.log(`[TRACE] Incoming POST /users, length: ${req.headers['content-length']}`);
  }
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/drones', droneRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/activations', activationRoutes);
app.use('/api/prebooking', prebookingRoutes);

// Debug route to see registered routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods)} ${middleware.regexp} ${handler.route.path}`);
        }
      });
    }
  });
  res.json(routes);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.message // Always expose error message for now
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebrospark');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;
