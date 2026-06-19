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
app.use(cors());
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// DB configuration
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'tickets.json');

const DEFAULT_TICKETS = [
  {
    ticketId: 'SSS-1001',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    brand: 'Dell',
    deviceType: 'Laptop',
    problem: 'Laptop Not Powering On (Motherboard Failure)',
    date: '2026-06-15',
    status: 'Repairing',
    notes: 'IC power management chip replacement in progress. Sourcing spare parts.'
  },
  {
    ticketId: 'SSS-1002',
    name: 'Priya Dharshini',
    phone: '8765432109',
    brand: 'Apple MacBook',
    deviceType: 'Laptop',
    problem: 'Liquid Spill & Keypad Malfunction',
    date: '2026-06-16',
    status: 'Ready',
    notes: 'Keyboard replaced, motherboard ultrasonically cleaned. Device fully functional and tested.'
  },
  {
    ticketId: 'SSS-1003',
    name: 'Vikram Singh',
    phone: '7654321098',
    brand: 'HP',
    deviceType: 'Desktop',
    problem: 'Slow Performance & HDD replacement',
    date: '2026-06-17',
    status: 'Diagnosis',
    notes: 'Technical diagnosis underway. Testing RAM and analyzing motherboard heat dissipation.'
  }
];

// Initialize database file synchronously on startup
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(DB_PATH)) {
  writeFileSync(DB_PATH, JSON.stringify(DEFAULT_TICKETS, null, 2), 'utf-8');
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
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.req ? req.req.body : req.body; // fallback if needed
  const user = req.body.username;
  const pass = req.body.password;

  if (user === 'admin' && pass === 'password123') {
    return res.status(200).json({
      success: true,
      token: 'admin-secret-session-token-sakthi'
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid Username or Password'
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
  if (token === 'admin-secret-session-token-sakthi') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
  }
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
