const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const JWT_SECRET = 'super_secret_key_aura';

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Tasks Table
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
        )`);

        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                // Safely add columns if they do not exist
                const addColumn = (colName, colType, defaultVal) => {
                    db.run(`ALTER TABLE users ADD COLUMN ${colName} ${colType} DEFAULT ${defaultVal}`, (alterErr) => {
                        if (alterErr && !alterErr.message.includes('duplicate column name')) {
                            console.error(`Error adding column ${colName}:`, alterErr.message);
                        }
                    });
                };
                addColumn('data_shards', 'INTEGER', '100');
                addColumn('high_score', 'INTEGER', '0');
                addColumn('equipped_chassis', 'TEXT', "'sleek'");
                addColumn('equipped_glow', 'TEXT', "'cyan'");
                addColumn('equipped_trail', 'TEXT', "'streak'");
                addColumn('unlocked_items', 'TEXT', `'["chassis_sleek","glow_cyan","trail_streak"]'`);
            }
        });
    }
});

// Auth Routes

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.userId = verified.userId;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// API Routes

app.get('/api/tasks', authMiddleware, (req, res) => {
    db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ tasks: rows });
    });
});

app.post('/api/tasks', authMiddleware, (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    db.run('INSERT INTO tasks (title, description, user_id) VALUES (?, ?, ?)', [title, description, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, description, status: 'pending' });
    });
});

app.put('/api/tasks/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    db.get('SELECT status FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId], (err, task) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        db.run('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [status, id, req.userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            
            // If task is completed and wasn't before, award 25 shards!
            if (task.status !== 'completed' && status === 'completed') {
                db.run('UPDATE users SET data_shards = data_shards + 25 WHERE id = ?', [req.userId], function(shardErr) {
                    if (shardErr) console.error('Error awarding shards for task completion:', shardErr);
                    res.json({ changes: this.changes, shardsAwarded: 25 });
                });
            } else {
                res.json({ changes: this.changes });
            }
        });
    });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// User Profile, Shop, and Game Sync Routes

app.get('/api/user/profile', authMiddleware, (req, res) => {
    db.get('SELECT id, username, data_shards, high_score, equipped_chassis, equipped_glow, equipped_trail, unlocked_items FROM users WHERE id = ?', [req.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        
        try {
            row.unlocked_items = JSON.parse(row.unlocked_items || '[]');
        } catch (e) {
            row.unlocked_items = [];
        }
        res.json({ user: row });
    });
});

app.post('/api/user/shop/buy', authMiddleware, (req, res) => {
    const { itemId, price } = req.body;
    if (!itemId || price === undefined) {
        return res.status(400).json({ error: 'itemId and price are required' });
    }

    db.get('SELECT data_shards, unlocked_items FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let unlocked;
        try {
            unlocked = JSON.parse(user.unlocked_items || '[]');
        } catch (e) {
            unlocked = [];
        }

        if (unlocked.includes(itemId)) {
            return res.status(400).json({ error: 'Item already purchased' });
        }

        if (user.data_shards < price) {
            return res.status(400).json({ error: 'Insufficient Data Shards' });
        }

        unlocked.push(itemId);
        const updatedShards = user.data_shards - price;

        db.run('UPDATE users SET data_shards = ?, unlocked_items = ? WHERE id = ?', 
            [updatedShards, JSON.stringify(unlocked), req.userId], 
            function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true, data_shards: updatedShards, unlocked_items: unlocked });
            }
        );
    });
});

app.post('/api/user/shop/equip', authMiddleware, (req, res) => {
    const { category, itemId } = req.body;
    if (!category || !itemId) {
        return res.status(400).json({ error: 'category and itemId are required' });
    }

    if (!['chassis', 'glow', 'trail'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    db.get('SELECT unlocked_items FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let unlocked;
        try {
            unlocked = JSON.parse(user.unlocked_items || '[]');
        } catch (e) {
            unlocked = [];
        }

        if (!unlocked.includes(itemId)) {
            return res.status(400).json({ error: 'Item is not unlocked' });
        }

        const columnMap = {
            chassis: 'equipped_chassis',
            glow: 'equipped_glow',
            trail: 'equipped_trail'
        };

        const columnName = columnMap[category];
        const rawItemValue = itemId.split('_')[1] || itemId;

        db.run(`UPDATE users SET ${columnName} = ? WHERE id = ?`, [rawItemValue, req.userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.json({ success: true, [columnName]: rawItemValue });
        });
    });
});

app.post('/api/user/game/sync', authMiddleware, (req, res) => {
    const { shardsCollected, score } = req.body;
    if (shardsCollected === undefined || score === undefined) {
        return res.status(400).json({ error: 'shardsCollected and score are required' });
    }

    db.get('SELECT data_shards, high_score FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newShards = user.data_shards + shardsCollected;
        const newHighScore = score > user.high_score ? score : user.high_score;
        const isNewHighScore = score > user.high_score;

        db.run('UPDATE users SET data_shards = ?, high_score = ? WHERE id = ?', [newShards, newHighScore, req.userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.json({ 
                success: true, 
                data_shards: newShards, 
                high_score: newHighScore,
                isNewHighScore
            });
        });
    });
});

app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT username, high_score FROM users ORDER BY high_score DESC LIMIT 10', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ leaderboard: rows });
    });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
