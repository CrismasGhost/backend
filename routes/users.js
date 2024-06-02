// v1/users/login
// v1/users/register
// v1/users/me (Token)
// v1/users/all (Token)

const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = 'iY3kUpqt9ItTKvwi9YfGoJOotucVtbQtR5qOYGlqM1CBU253kWW8zejSWmHt7p8m';

const UsersfilePath = './data/users.json';
const saltRounds = 10;

function readUsersFromFile() {
    try {
        const data = fs.readFileSync(UsersfilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        return [];
    }
}

function generateToken(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.uid; 
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
}

router.post('/login', async (req, res) => {
    const { correo, password, rememberMe } = req.body;
    if (!correo || !password) {
        return res.status(400).json({ error: 'correo and password are required' });
    }

    try {
        const users = readUsersFromFile();
        const user = users.find(user => user.correo === correo);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessTokenExpiration = rememberMe ? '30d' : '5h';
        const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: accessTokenExpiration });
        const userWithoutPassword = (({ password, ...rest }) => rest)(user); // Elimina la contraseña del objeto usuario antes de enviarlo de vuelta
        res.json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/register', async (req, res) => {
    const { nombre, apellido, correo, dni, password } = req.body;

    let usuarios;
    try {
        const data = fs.readFileSync(UsersfilePath);
        usuarios = JSON.parse(data.toString() || '[]');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Archivo no encontrado, creando uno nuevo.');
            usuarios = [];
        } else {
            console.error('Error al leer el archivo de usuarios:', error);
            return res.status(500).send('Error al procesar el archivo de usuarios.');
        }
    }

    const usuarioExistente = usuarios.some(user => user.correo === correo || user.dni === dni);
    if (usuarioExistente) {
        return res.status(409).send('El correo electrónico o DNI ya están registrados.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const nuevoUsuario = {
            id: uuidv4(),
            nombre,
            apellido,
            correo,
            dni,
            creada: new Date().toISOString(),
            actualizada: new Date().toISOString(),
            token: generateToken(64),
            password: hashedPassword,
        };

        fs.readFile(UsersfilePath, (err, data) => {
            if (err) {
                res.status(500).send('Error al leer el archivo de usuarios.');
                return;
            }

            let usuarios;
            try {
                usuarios = JSON.parse(data.toString() || '[]');
            } catch (parseError) {
                console.error('Error al parsear el archivo de usuarios:', parseError);
                res.status(500).send('Error al procesar el archivo de usuarios.');
                return;
            }

            usuarios.push(nuevoUsuario);

            fs.writeFile(UsersfilePath, JSON.stringify(usuarios, null, 2), (err) => {
                if (err) {
                    res.status(500).send('Error al guardar el nuevo usuario.');
                    return;
                }
                res.status(201).send('Usuario creado con éxito.');
            });
        });
    } catch (error) {
        console.error('Error al hashear la contraseña:', error);
        res.status(500).send('Error al registrar el usuario.');
    }
});

router.get('/me', verifyToken, (req, res) => {
    const users = readUsersFromFile();
    const user = users.find(user => user.id === req.userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const userWithoutPassword = (({ password, ...rest }) => rest)(user);
    res.json(userWithoutPassword);
});

router.get('/all', verifyToken, (req, res) => {
    const users = readUsersFromFile();

    const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
});

module.exports = router;