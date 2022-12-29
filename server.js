if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
//above line loads all env variables and set them inside our process.env.. if we are not currently in production mode

const express = require('express')
const app = express()

const bcrypt = require('bcrypt')
const bodyparser = require('body-parser')
const passport = require('passport')
const initializePassport = require('./passport-config')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride= require('method-override')

const users = []

app.use(bodyparser.urlencoded({extended:false}))
app.use(bodyparser.json())

initializePassport(
    passport,
    email => users.find(user => user.email === email),      //the function getUserByEmail
    id => users.find(user => user.id === id)                //the function getUserById
)

app.use(flash())

app.use(session({
    secret: process.env.SESSION_SECRET, //session secret that is unique
    resave: false,                      //should we resave our session variables if nothing is changed?
    saveUninitialized: false            //do we want to save an empty value in the session if there is no value
}))

app.use(passport.initialize())      //sets up the basics
app.use(passport.session())     //store our variables to be persisted entire session that the user has

//to override POST method, as DELETE method
app.use(methodOverride('_method'))

app.set('view-engine', 'ejs')

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', {name: req.user.name})
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true          //flash messages if wrong login, the messages are provided in passport-config.js
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
})

//there is no such method as delete, so we use method-override library to make an explicit method delete
app.delete('/logout', (req, res) => {
    req.logOut(()=>{return })        //set up by passport js. this clears our session and logs user out
    res.redirect('/login')
})

//if user is not logged in, we do not allow them to visit home page, they will be redirected to login page
function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next()
    }
    else{
        res.redirect('/login')
    }
}

//if user is logged in, we do not allow them to visit login page, they will be remain in to home page
function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/')
    }

    next()
}

app.listen(3000)