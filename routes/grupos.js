// v1/grupos/create/:userID 
// v1/grupos/all
// v1/grupos/ind/:groupID
// v1/grupos/user/:userID
// v1/grupos/user/:userID/details
// v1/grupos/ind/:groupID/add/user/
// v1/grupos/ind/:groupID/remove/user/:userID

// v1/grupos/ind/:groupID/add/gasto/
// v1/grupos/ind/:groupID/gastos/
// v1/grupos/ind/edit/gasto/:gastoID
// v1/grupos/ind/:groupID/gastos/user/:userID
// v1/grupos/ind/:groupID/gastos/:gastoID

// v1/grupos/gastos/user/:userID/total
// v1/grupos/gastos/user/:userID/paid
// v1/grupos/gastos/user/:userID/un-paid

const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = 'iY3kUpqt9ItTKvwi9YfGoJOotucVtbQtR5qOYGlqM1CBU253kWW8zejSWmHt7p8m';

const GroupsFilePath = './data/grupos.json';
const GastosFilePath = './data/gastos.json';

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

function readGroupsFromFile() {
    try {
        const data = fs.readFileSync(GroupsFilePath, 'utf8');
        if (data.trim().length === 0) {
            return [];
        }
        return JSON.parse(data);
    } catch (err) {
        console.error('Error al leer o parsear el archivo grupos.json:', err);
        return [];
    }
}

function saveGroupsToFile(grupos) {
    fs.writeFileSync(GroupsFilePath, JSON.stringify(grupos, null, 2), 'utf8');
}

function readGastosFromFile() {
    try {
        const data = fs.readFileSync(GastosFilePath, 'utf8');
        if (data.trim().length === 0) {
            return [];
        }
        return JSON.parse(data);
    } catch (err) {
        console.error('Error al leer o parsear el archivo gastos.json:', err);
        fs.writeFileSync(GastosFilePath, JSON.stringify([], null, 2), 'utf8');
        return [];
    }
}

function saveGastosToFile(gastos) {
    fs.writeFileSync(GastosFilePath, JSON.stringify(gastos, null, 2), 'utf8');
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

router.post('/create/:ownerId', (req, res) => {
    const { nombre, password, duracion } = req.body;
    const usuarios = req.body.usuarios || [];
    const ownerId = req.params.ownerId;

    const ownerAlreadyIncluded = usuarios.some(user => user.id === ownerId);
    if (!ownerAlreadyIncluded) {
        usuarios.unshift({
            id: ownerId,
            owner: true
        });
    }

    const nuevoGrupo = {
        id: uuidv4(),
        nombre,
        password,
        duracion,
        token: generateToken(102),
        usuarios,
        gastos_id: uuidv4()
    };

    const grupos = readGroupsFromFile();
    grupos.push(nuevoGrupo);
    saveGroupsToFile(grupos);

    res.status(201).json(nuevoGrupo);
});

router.get('/ind/:groupId', verifyToken, (req, res) => {
    const groupId = req.params.groupId;
    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupId);

    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    res.json(grupo);
});

router.get('/user/:userId', verifyToken, (req, res) => {
    const userId = req.params.userId;
    const grupos = readGroupsFromFile();
    const gruposDelUsuario = grupos.filter(g => g.usuarios.some(u => u.id === userId)).map(g => g.id);

    res.json({ userId: userId, grupos: gruposDelUsuario });
});

router.get('/user/:userId/details', verifyToken, (req, res) => {
    const userId = req.params.userId;
    const grupos = readGroupsFromFile();
    const detallesDeGrupos = grupos.filter(g => g.usuarios.some(u => u.id === userId));

    const detalles = detallesDeGrupos.map(g => {
        return {
            id: g.id,
            nombre: g.nombre,
            duracion: g.duracion,
            usuarios: g.usuarios,
            gastos_id: g.gastos_id
        };
    });

    res.json({ userId: userId, grupos: detalles });
})

router.get('/all', verifyToken,(req, res) => {
    const grupos = readGroupsFromFile();
    res.json(grupos);
});

router.post('/ind/:groupID/add/user', verifyToken, (req, res) => {
    const groupID = req.params.groupID;
    const { userID } = req.body;

    const grupos = readGroupsFromFile();
    const grupoIndex = grupos.findIndex(g => g.id === groupID);

    if (grupoIndex === -1) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const usuarioExiste = grupos[grupoIndex].usuarios.some(u => u.id === userID);
    if (usuarioExiste) {
        return res.status(409).send('El usuario ya pertenece al grupo.');
    }

    grupos[grupoIndex].usuarios.push({ id: userID, owner: false });

    saveGroupsToFile(grupos);

    res.status(201).send('Usuario añadido al grupo exitosamente.');
});

router.post('/ind/:groupID/remove/user/:userID', verifyToken, (req, res) => {
    const { groupID, userID } = req.params;

    const grupos = readGroupsFromFile();
    const grupoIndex = grupos.findIndex(g => g.id === groupID);

    if (grupoIndex === -1) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const usuarioIndex = grupos[grupoIndex].usuarios.findIndex(u => u.id === userID);
    if (usuarioIndex === -1) {
        return res.status(404).send('Usuario no encontrado en el grupo.');
    }

    grupos[grupoIndex].usuarios.splice(usuarioIndex, 1);

    saveGroupsToFile(grupos);

    res.status(200).send('Usuario eliminado del grupo exitosamente.');
});


router.post('/ind/:groupID/add/gasto', verifyToken, (req, res) => {
    const { groupID } = req.params;
    const { userID, cantidad, dia, descripcion, pagado } = req.body;

    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupID);
    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const nuevoGasto = {
        id: uuidv4(),
        gastos_id: grupo.gastos_id, 
        user_id: userID,
        cantidad,
        dia,
        descripcion,
        pagado
    };

    const gastos = readGastosFromFile();
    gastos.push(nuevoGasto);
    saveGastosToFile(gastos);

    res.status(201).json({ message: 'Gasto añadido con éxito.', gasto: nuevoGasto });
});

router.get('/ind/:groupID/gastos', verifyToken, (req, res) => {
    const { groupID } = req.params;
    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupID);
    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const gastos = readGastosFromFile();
    const gastosDelGrupo = gastos.filter(gasto => gasto.gastos_id === grupo.gastos_id);

    res.json(gastosDelGrupo);
});


router.get('/ind/:groupID/gastos/user/:userID', verifyToken, (req, res) => {
    const { groupID, userID } = req.params;

    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupID);
    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const gastos = readGastosFromFile();
    const gastosDelUsuario = gastos
        .filter(gasto => gasto.gastos_id === grupo.gastos_id && gasto.pagado.some(pago => pago.id === userID))
        .map(gasto => ({
            ...gasto,
            pagado: gasto.pagado.find(pago => pago.id === userID)
        }));

    res.json(gastosDelUsuario);
});


router.get('/ind/:groupID/gastos/un-paid', verifyToken, (req, res) => {
    const { groupID } = req.params;

    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupID);
    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const gastos = readGastosFromFile();
    const gastosNoPagadosPorUsuario = gastos.filter(gasto => gasto.gastos_id === grupo.gastos_id)
        .flatMap(gasto => 
            gasto.pagado.filter(pago => !pago.pagado).map(pago => ({
                user_id: pago.id,
                gasto_id: gasto.id,
                cantidad: gasto.cantidad,
                dia: gasto.dia,
                descripcion: gasto.descripcion,
                pagado: pago.pagado
            }))
        );

    res.json(gastosNoPagadosPorUsuario);
});

router.get('/ind/:groupID/gastos/:gastoID', verifyToken, (req, res) => {
    const { groupID, gastoID } = req.params;

    const grupos = readGroupsFromFile();
    const grupo = grupos.find(g => g.id === groupID);
    if (!grupo) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const gastos = readGastosFromFile();
    const gastoEspecifico = gastos.find(gasto => gasto.id === gastoID && gasto.gastos_id === grupo.gastos_id);

    if (!gastoEspecifico) {
        return res.status(404).send('Gasto no encontrado en el grupo especificado.');
    }

    res.json(gastoEspecifico);
});

router.get('/gastos/user/:userID/total', verifyToken, (req, res) => {
    const userID = req.params.userID;
    const gastos = readGastosFromFile();
    const totalGastos = gastos.reduce((acc, gasto) => {
        const isUserInvolved = gasto.pagado.some(p => p.id === userID);
        if (isUserInvolved) {
            const amountPerUser = gasto.cantidad / gasto.pagado.length;
            return acc + amountPerUser;
        }
        return acc;
    }, 0);

    res.json({ userID: userID, value: totalGastos.toFixed(2) });
});

router.get('/gastos/user/:userID/paid', verifyToken, (req, res) => {
    const userID = req.params.userID;
    const gastos = readGastosFromFile();
    const paidGastos = gastos.reduce((acc, gasto) => {
        const paymentInfo = gasto.pagado.find(p => p.id === userID && p.pagado);
        if (paymentInfo) {
            const amountPerUser = gasto.cantidad / gasto.pagado.length;
            return acc + amountPerUser;
        }
        return acc;
    }, 0);

    res.json({ userID: userID, value: paidGastos.toFixed(2) });
});

router.get('/gastos/user/:userID/un-paid', verifyToken, (req, res) => {
    const userID = req.params.userID;
    const gastos = readGastosFromFile();
    const unpaidGastos = gastos.reduce((acc, gasto) => {
        const paymentInfo = gasto.pagado.find(p => p.id === userID && !p.pagado);
        if (paymentInfo) {
            const amountPerUser = gasto.cantidad / gasto.pagado.length;
            return acc + amountPerUser;
        }
        return acc;
    }, 0);

    res.json({ userID: userID, value: unpaidGastos.toFixed(2) });
});

router.put('/ind/edit/gasto/:gastoID', verifyToken, (req, res) => {
    const { gastoID } = req.params;
    const { cantidad, dia, descripcion, pagado } = req.body;

    const gastos = readGastosFromFile();
    const gastoIndex = gastos.findIndex(g => g.id === gastoID);
    if (gastoIndex === -1) {
        return res.status(404).send('Gasto no encontrado.');
    }

    const updatedGasto = {
        ...gastos[gastoIndex],
        cantidad,
        dia,
        descripcion,
        pagado
    };

    gastos[gastoIndex] = updatedGasto;
    saveGastosToFile(gastos);

    res.json({ message: 'Gasto actualizado con éxito.', gasto: updatedGasto });
});

router.delete('/ind/delete/gasto/:gastoID', verifyToken, (req, res) => {
    const { gastoID } = req.params;

    let gastos = readGastosFromFile();
    const initialLength = gastos.length;
    gastos = gastos.filter(g => g.id !== gastoID);

    if (gastos.length === initialLength) {
        return res.status(404).send('Gasto no encontrado.');
    }

    saveGastosToFile(gastos);

    res.json({ message: 'Gasto eliminado con éxito.' });
});

router.put('/edit/:groupID', verifyToken, (req, res) => {
    const { groupID } = req.params;
    const { nombre, password, duracion, usuarios } = req.body;

    const grupos = readGroupsFromFile();
    const grupoIndex = grupos.findIndex(g => g.id === groupID);

    if (grupoIndex === -1) {
        return res.status(404).send('Grupo no encontrado.');
    }

    const grupoActualizado = {
        ...grupos[grupoIndex],
        nombre,
        password,
        duracion,
        usuarios
    };

    grupos[grupoIndex] = grupoActualizado;
    saveGroupsToFile(grupos);

    res.json({ message: 'Grupo actualizado con éxito.', grupo: grupoActualizado });
});


module.exports = router;