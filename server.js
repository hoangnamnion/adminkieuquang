const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors({
    origin: '*', // Cho phép tất cả các domain truy cập
    methods: ['GET', 'POST'], // Cho phép các phương thức GET và POST
    allowedHeaders: ['Content-Type'] // Cho phép header Content-Type
}));

app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// In-memory storage for maintenance state
let maintenanceState = {
    isMaintenance: false,
    lastUpdated: null
};

// In-memory storage for codes and links
let codesAndLinks = [];

// In-memory storage for visit statistics
let visitStats = {
    totalVisits: 0,
    todayVisits: 0,
    uniqueVisitors: new Set(),
    onlineUsers: new Set(),
    visitHistory: []
};

// Initialize visit tracking
function initializeVisitTracking() {
    // Reset today's visits at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow - now;
    setTimeout(() => {
        visitStats.todayVisits = 0;
        initializeVisitTracking(); // Schedule next reset
    }, timeUntilMidnight);
}

// Start visit tracking
initializeVisitTracking();

// Routes
app.get('/api/maintenance', (req, res) => {
    try {
        res.json(maintenanceState);
    } catch (error) {
        console.error('Error in GET /api/maintenance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/maintenance', (req, res) => {
    try {
        const { isMaintenance } = req.body;
        if (typeof isMaintenance !== 'boolean') {
            return res.status(400).json({ error: 'isMaintenance must be a boolean' });
        }
        
        maintenanceState = {
            isMaintenance: isMaintenance,
            lastUpdated: new Date().toISOString()
        };
        res.json(maintenanceState);
    } catch (error) {
        console.error('Error in POST /api/maintenance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to retrieve all codes and links
app.get('/api/codelink', (req, res) => {
    try {
        res.json(codesAndLinks);
    } catch (error) {
        console.error('Error in GET /api/codelink:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST endpoint to save new code and link
app.post('/api/codelink', (req, res) => {
    try {
        const { code } = req.body;
        
        // Validation
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }
        
        if (typeof code !== 'string') {
            return res.status(400).json({ error: 'Code must be a string' });
        }
        
        // Create new entry
        const newEntry = {
            id: Date.now().toString(),
            code: code.trim(),
            createdAt: new Date().toISOString()
        };
        
        // Add to storage
        codesAndLinks.push(newEntry);
        
        // Keep only last 100 entries to prevent memory overflow
        if (codesAndLinks.length > 100) {
            codesAndLinks = codesAndLinks.slice(-100);
        }
        
        console.log('Saved new code and link:', newEntry);
        res.json({ 
            success: true, 
            message: 'Code saved successfully',
            data: newEntry 
        });
    } catch (error) {
        console.error('Error in POST /api/codelink:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE endpoint to remove a specific code and link
app.delete('/api/codelink/:id', (req, res) => {
    try {
        const { id } = req.params;
        const initialLength = codesAndLinks.length;
        
        codesAndLinks = codesAndLinks.filter(entry => entry.id !== id);
        
        if (codesAndLinks.length === initialLength) {
            return res.status(404).json({ error: 'Code and link not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Code and link deleted successfully' 
        });
    } catch (error) {
        console.error('Error in DELETE /api/codelink:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to retrieve visit statistics
app.get('/api/statistics', (req, res) => {
    try {
        const stats = {
            totalVisits: visitStats.totalVisits,
            todayVisits: visitStats.todayVisits,
            uniqueVisitors: visitStats.uniqueVisitors.size,
            onlineUsers: visitStats.onlineUsers.size,
            lastUpdated: new Date().toISOString()
        };
        res.json(stats);
    } catch (error) {
        console.error('Error in GET /api/statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST endpoint to track a visit
app.post('/api/track-visit', (req, res) => {
    try {
        const { timestamp, userAgent, referrer, path } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Increment total visits
        visitStats.totalVisits++;
        visitStats.todayVisits++;
        
        // Add to unique visitors (using IP as identifier)
        visitStats.uniqueVisitors.add(clientIP);
        
        // Add to online users (will be cleaned up after 5 minutes)
        visitStats.onlineUsers.add(clientIP);
        setTimeout(() => {
            visitStats.onlineUsers.delete(clientIP);
        }, 5 * 60 * 1000); // 5 minutes
        
        // Add to visit history (keep last 100 visits)
        visitStats.visitHistory.push({
            timestamp: timestamp || new Date().toISOString(),
            ip: clientIP,
            userAgent: userAgent,
            referrer: referrer,
            path: path
        });
        
        // Keep only last 100 visits
        if (visitStats.visitHistory.length > 100) {
            visitStats.visitHistory = visitStats.visitHistory.slice(-100);
        }
        
        console.log('Visit tracked:', { ip: clientIP, path, timestamp });
        res.json({ success: true, message: 'Visit tracked successfully' });
    } catch (error) {
        console.error('Error in POST /api/track-visit:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to retrieve recent visit history
app.get('/api/visit-history', (req, res) => {
    try {
        const history = visitStats.visitHistory.slice(-20); // Last 20 visits
        res.json(history);
    } catch (error) {
        console.error('Error in GET /api/visit-history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop the server');
}); 
