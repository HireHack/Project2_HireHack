const Company = require('../models/company.model');
const Candidate = require('../models/candidate.model');

module.exports.home = (req, res, next) => {
    res.render('home');
}

module.exports.mainLogin = (req, res, next) => {
    res.render('main-login');
}