const express = require('express');
const cors = require('cors');
const methodOverride = require('method-override');

const users = require('./routes/users');
const grupos = require('./routes/grupos');

const app = express();
const PORT = 3000;

app.use(methodOverride('X-HTTP-Method-Override'));

app.use(cors({
    origin: ["http://localhost:3000","http://localhost:5173", "http://localhost:3001", "http://localhost:8080", "http://localhost:8081", "https://ivan-front.vercel.app", "http://127.0.0.1:5500", "https://ivan-tfg-web.web.app"],
    methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],  
    credentials: true
}));

app.use(express.json());

app.use('/v1/users', users);
app.use('/v1/grupos', grupos);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
