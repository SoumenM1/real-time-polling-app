const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose.connect('mongodb+srv://maitysoumen8101:LySVMMzyiYkP8bXl@cluster0.reeifkp.mongodb.net/pollingChatApp?retryWrites=true&w=majority&appName=Cluster0');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/pollingChatApp' })
}));

// Authentication routes
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    try {
        await user.save();
        req.session.userId = user._id;
        res.redirect('/');
    } catch (error) {
        res.redirect('/');
        res.status(400).send('User already exists');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/');
    } else {
        res.redirect('/');
        res.status(400).send('Invalid credentials');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

// Add this route before the io.on('connection', ...) block
app.get('/api/user', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.json({ username: user.username });
});

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

let pollData = {
    options: ['Vote 1', 'Vote 2', 'Vote 3'],
    votes: [0, 0, 0]
};

let chatMessages = [];

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Send initial poll and chat data
    socket.emit('pollData', pollData);
    socket.emit('chatMessages', chatMessages);

    // Handle voting
    socket.on('vote', (index) => {
        pollData.votes[index]++;
        io.emit('pollData', pollData); // Broadcast updated poll data
    });

    // Handle chat messages
    socket.on('chatMessage', ({ username, message }) => {
        const formattedMessage = { username, message };
        chatMessages.push(formattedMessage);
        io.emit('chatMessages', chatMessages); // Broadcast updated chat messages
    });

    // Handle typing indicator
    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username); // Notify other users
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));