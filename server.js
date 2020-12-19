const express = require('express')

const port = parseInt(process.env.PORT, 10) || 3000
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const ACCESSTOKENSECRET = 'youraccesstokensecret'
const REFRESHTOKENSECRET = 'yourrefreshtokensecrethere'
let refreshTokenlist = Array()
const axios = require("axios")
const userEndPoint = "http://localhost:3030/users"
const getUsersDB = async () => (await axios.get(userEndPoint)).data
// const usersDB = [
//     {
//         username: 'john',
//         password: 'password123admin',
//         role: 'admin'
//     }, {
//         username: 'anna',
//         password: 'password123member',
//         role: 'member'
//     }, {
//         username: 'test',
//         password: 'test1234',
//         role: 'admin'
//     }
// ];
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, ACCESSTOKENSECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
}
const permit = (...permittedRoles) => {
    // return a middleware
    return (request, response, next) => {
        const {user} = request

        console.log({permittedRoles})
        console.log("user.role", user.role)
        if (user && permittedRoles.includes(user.role)) {
            next(); // role is allowed, so continue on the next middleware
        } else {
            response.status(403).json({message: "Forbidden. Role level is not enough"}); // user is forbidden
        }
    }
}

const server = express()
server.use(bodyParser.json());

server.post('/signup', async (req, res) => {
    // Read username and password from request body
    const {username, password} = req.body;
    try {
        const {data} = await axios.post(userEndPoint, {username, password, role: 1})
        return res.json(data)
    } catch (e) {
        return res.status(400).send(e);
    }

});

server.post('/login', async (req, res) => {
    // Read username and password from request body
    const {username, password} = req.body;
    const usersDB = await getUsersDB()
    console.log({usersDB})
    // Filter user from the users array by username and password
    const user = usersDB.find(u => u.username === username && u.password === password);

    if (user) {
        // Generate an access token
        const accessToken = jwt.sign({username: user.username, role: user.role}, ACCESSTOKENSECRET, {expiresIn: '20m'});
        const refreshToken = jwt.sign({username: user.username, role: user.role}, REFRESHTOKENSECRET);
        res.json({accessToken, refreshToken});
    } else {
        res.send('Username or password incorrect');
    }
});

server.post('/token', (req, res) => {
    // user refreshTokens to generate accessToken
    const {token} = req.body;

    if (!token) {
        return res.sendStatus(401);
    }

    if (!refreshTokenlist.includes(token)) {
        return res.sendStatus(403);
    }

    jwt.verify(token, REFRESHTOKENSECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }

        const accessToken = jwt.sign({username: user.username, role: user.role}, ACCESSTOKENSECRET, {expiresIn: '20m'});

        res.json({
            accessToken
        });
    });
});

server.post('/logout', (req, res) => {
    const {token} = req.body;
    refreshTokenlist = refreshTokenlist.filter(token => t !== token);

    res.send("Logout successful");
});

server.get('/admin', authenticateJWT, permit(9), (req, res) => {
    // return app.render(req, res, '/a', req.query)
    return res.send("<h1>hello world admin</h1>")
})

server.get('/a', authenticateJWT, permit(1, 2, 3, 4, 5, 6, 7, 8, 9), (req, res) => {
    // return app.render(req, res, '/a', req.query)
    return res.send("<h1>hello world A</h1>")
})

server.get('/b', (req, res) => {
    // return app.render(req, res, '/b', req.query)
    return res.send("<h1>hello world B</h1>")
})

server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
})
