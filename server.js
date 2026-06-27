const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const existsSync = require('fs').existsSync;
const mkdirSync = require('fs').mkdirSync;
const writeFileSync = require('fs').writeFileSync;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors({
  origin: [
    "https://sakthisystemsandservices.in",
    "http://localhost:3000"
  ]
}));
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// DB configuration
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'tickets.json');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');

const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'password123',
    role: 'admin'
  }
];

const DEFAULT_TICKETS = [];

// Initialize database file synchronously on startup
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(DB_PATH)) {
  writeFileSync(DB_PATH, JSON.stringify(DEFAULT_TICKETS, null, 2), 'utf-8');
}
if (!existsSync(USERS_DB_PATH)) {
  writeFileSync(USERS_DB_PATH, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
}

// Helper to read users database file asynchronously
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users database file:', error);
    return [];
  }
}

// Helper functions for reading/writing tickets asynchronously
async function readTickets() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return [];
  }
}

async function writeTickets(tickets) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(tickets, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// --- API ENDPOINTS ---

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  const user = req.body && req.body.username ? req.body.username.trim().toLowerCase() : '';
  const pass = req.body && req.body.password ? req.body.password.trim() : '';

  console.log(`[Auth] Login attempt for username: "${user}"`);

  try {
    const users = await readUsers();
    const matchedUser = users.find(u => u.username.toLowerCase() === user && u.password === pass);

    if (matchedUser) {
      console.log(`[Auth] Login successful for user: "${user}"`);
      return res.status(200).json({
        success: true,
        token: `admin-token-sakthi-${matchedUser.username}`
      });
    } else {
      console.warn(`[Auth] Login failed for user: "${user}" - Invalid username or password.`);
      return res.status(401).json({
        success: false,
        message: 'Invalid Username or Password'
      });
    }
  } catch (error) {
    console.error(`[Auth] Login route error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login validation'
    });
  }
});

// Middleware for Admin Authorization
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  if (token.startsWith('admin-token-sakthi-')) {
    const usernameFromToken = token.replace('admin-token-sakthi-', '');
    try {
      const users = await readUsers();
      const userExists = users.some(u => u.username.toLowerCase() === usernameFromToken.toLowerCase());
      if (userExists) {
        next();
        return;
      }
    } catch (e) {
      console.error('requireAdmin validation error:', e);
    }
  }

  return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
}

// Fetch all tickets (Admin only)
app.get('/api/admin/tickets', requireAdmin, async (req, res) => {
  const tickets = await readTickets();
  res.status(200).json(tickets);
});

// Update ticket status/notes (Admin only)
app.put('/api/admin/tickets/:ticketId', requireAdmin, async (req, res) => {
  const { ticketId } = req.params;
  const { status, notes } = req.body;

  const tickets = await readTickets();
  const ticketIndex = tickets.findIndex(t => t.ticketId.toUpperCase() === ticketId.toUpperCase());

  if (ticketIndex === -1) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  // Update fields
  tickets[ticketIndex].status = status;
  tickets[ticketIndex].notes = notes;

  const success = await writeTickets(tickets);
  if (success) {
    res.status(200).json({ success: true, ticket: tickets[ticketIndex] });
  } else {
    res.status(500).json({ success: false, message: 'Failed to update database' });
  }
});

// Public: Create a new booking
app.post('/api/tickets', async (req, res) => {
  const { name, phone, brand, deviceType, problem, date } = req.body;

  if (!name || !phone || !brand || !deviceType || !problem || !date) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const tickets = await readTickets();

  // Calculate next ticket ID number atomically on the server
  let nextIdNum = 1004;
  if (tickets.length > 0) {
    // Find the max number dynamically
    const numbers = tickets.map(t => {
      const match = t.ticketId.match(/SSS-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    nextIdNum = Math.max(...numbers) + 1;
  }
  const ticketId = `SSS-${nextIdNum}`;

  const newTicket = {
    ticketId,
    name,
    phone,
    brand,
    deviceType,
    problem,
    date,
    status: 'Received',
    notes: 'Pre-booked online. Device waiting drop-off or collection.'
  };

  tickets.push(newTicket);
  const success = await writeTickets(tickets);

  if (success) {
    res.status(201).json({ success: true, ticket: newTicket });
  } else {
    res.status(500).json({ success: false, message: 'Failed to create booking in database' });
  }
});

// Public: Track a repair ticket
app.get('/api/tickets/track', async (req, res) => {
  const { ticketId, phone } = req.query;

  if (!ticketId || !phone) {
    return res.status(400).json({ success: false, message: 'Ticket ID and Phone number are required' });
  }

  const tickets = await readTickets();
  const matchedTicket = tickets.find(
    t => t.ticketId.toUpperCase() === ticketId.trim().toUpperCase() && t.phone.trim() === phone.trim()
  );

  if (matchedTicket) {
    res.status(200).json(matchedTicket);
  } else {
    res.status(404).json({ success: false, message: 'No matching ticket found' });
  }
});

// Fallback index.html route for SPA behaviour or main page loading
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Sakthi Systems & Services backend is running!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Admin URL: http://localhost:${PORT}/#admin`);
  console.log(`==================================================`);
});
