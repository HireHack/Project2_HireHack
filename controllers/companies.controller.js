const mongoose = require('mongoose')
const passport = require('passport');
const flash = require('connect-flash');
const Company = require('../models/company.model');
const Offer = require('../models/offer.model');
const { sendCompanyActivationEmail } = require('../config/mailer.config');
const { sendDeleteCompanyEmail } = require('../config/mailer.config');
const { sendCompanyEmailUpdateEmail } = require('../config/mailer.config');
const { sendCompanyPasswordUpdateEmail } = require('../config/mailer.config');
const { v4: uuidv4 } = require('uuid');

module.exports.companyProfile = (req, res, next) => {
    Offer.find({'offers_publishedByCompany': req.currentCompany.id})
        .then ( offers => 
            res.render('companies/companyProfile', { offers })
        )
    // console.log('req.user company', req.user) 
} 

module.exports.login = (req, res, next) => {
    // console.log('req.user login controller', req.user)
    res.render('companies/login')
};

module.exports.doLogin = (req, res, next) => {
    passport.authenticate('local-auth-companies', (error, company, validations) => {
    if (error) {
      next(error);
    } else if (!company) {
      res.status(400).render('companies/login', { company: req.body, errors: validations.error });
    } else if (!company.active) {
        req.flash('flashMessage', 'Tu cuenta no ha sido verificada todavía. Por favor, ve a tu email para activarla');
        res.redirect('/company-login');
    } else {
      req.login(company, loginErr => {
          if (loginErr) {
              next(loginErr)
          } else {
            res.redirect('/company-profile')
          }
      })
    }
  })(req, res, next);
}

module.exports.doLoginGoogle = (req, res, next) => {
    passport.authenticate('google-auth-companies', (error, company, validations) => {
        if (error) {
            next(error)
        } else if (!company) {
            res.status(400).render('companies/login', {company: req.body, errors: validations.error})
        } else {
            req.login(company, (loginErr) => {
                if (!loginErr) {
                    res.redirect('/company-profile')
                    
                } else {
                    next(loginErr)
                }
            })
        }
    })(req, res, next)
}

module.exports.signup = (req, res, next) => res.render('companies/signup');

module.exports.doSignup = (req, res, next) => {
    console.log('req.body signup', req.body)

    function renderWithErrors(errors) {
        console.log(errors)
        res.status(400).render('companies/signup', {
            errors: errors,
            company: req.body
        })
        console.log('req.body signup', req.body)
    }
    
    Company.findOne({ email: req.body.email })
        .then((company) => {
            if (company) {
                renderWithErrors({
                    email: "Ya existe un usuario con este email"
                })
            } else {
                Company.create(req.body)
                    .then((createdCompany) => {
                        req.flash('flashMessage', '¡Perfil creado con éxito! - Por favor, ve a tu email para finalizar el registro')
                        sendCompanyActivationEmail(createdCompany.email, createdCompany.token);
                        res.redirect('/company-login')
                    })
                    .catch((err) => {
                        if (err instanceof mongoose.Error.ValidationError) {
                            renderWithErrors(err.errors)
                        } else {
                            next(err)
                        }
                    })
            }
        })
        .catch((err) => next(err));
}

module.exports.activate = (req, res, next) => {
    Company.findOneAndUpdate (
        { token: req.params.token, active: false },
        { active: true, token: uuidv4() }
    )
        .then((company) => {
            if(company) {
                //company.generateToken();
                req.flash('flashMessage', 'Tu cuenta ha sido activada - ¡Ya puedes iniciar sesión!');
                res.redirect('/company-login');
            } else {
                req.flash('flashMessage', 'Error al activar tu cuenta, por favor, inténtalo de nuevo.');
                res.redirect('/company-signup');
            }
        })
        .catch((err) => next(err));
}


module.exports.logout = (req, res, next) => {
    req.logout();
    res.redirect('/');
}

module.exports.edit = (req, res, next) => {
     Company.findById(req.params.id)
         .then((companyToEdit) => res.render('companies/signup', companyToEdit))
         .catch((err) => console.error(err))
}


module.exports.doEdit = (req, res, next) => {

    if (req.file) {
        req.body.picture = req.file.path
    }

    Company.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(() => {
        res.redirect('/company-profile')
        })
        .catch((err) => next(err))
}

module.exports.updateEmail = (req, res, next) => {
    Company.findById({_id: req.currentCompany.id})
        .then((companyToUpdate) => {
            //console.log('candidateToDelete', candidateToDelete)
            req.flash('flashMessage', 'Solicitud de actualización de email realizada correctamente - Por favor, ve a tu email para confirmar el cambio');
            sendCompanyEmailUpdateEmail(companyToUpdate.email, companyToUpdate.token);
            res.redirect('/company-profile');
        })
        .catch((err) => next(err));
}

module.exports.editEmail = (req, res, next) => res.render('companies/newEmailForm');

module.exports.doEditEmail = (req, res, next) => {
    function renderWithErrors(errors) {
        res.status(400).render('companies/signup', {
            errors: errors,
            company: req.body
        })
    }
    
    if (req.body.newEmail != req.body.confirmEmail) {
        renderWithErrors({
            email: "Los emails no coindiden."
        })
    } else {
        Company.findOneAndUpdate(
            {email: req.body.email}, 
            {email: req.body.newEmail, token: uuidv4()}
        )
        .then((updatedCompany) => {
            if (updatedCompany) {
                req.flash('flashMessage', '¡Tu email ha sido actualizado correctamente!');
                res.redirect('/company-profile')
            } else {
                req.flash('flashMessage', 'Error al actualizar tu email, por favor, inténtalo de nuevo.');
                next();
            }
        })
        .catch((err) => next(err));
    }
}

module.exports.updatePassword = (req, res, next) => {
    Company.findById({_id: req.currentCompany.id})
        .then((companyToUpdate) => {
            //console.log('candidateToDelete', candidateToDelete)
            req.flash('flashMessage', 'Solicitud de actualización de contraseña realizada correctamente - Por favor, ve a tu email para confirmar el cambio');
            sendCompanyPasswordUpdateEmail(companyToUpdate.email, companyToUpdate.token);
            res.redirect('/company-profile');
        })
        .catch((err) => next(err));
}

module.exports.editPassword = (req, res, next) => res.render('companies/newPasswordForm');

module.exports.doEditPassword = (req, res, next) => {
    function renderWithErrors(errors) {
        res.status(400).render('companies/signup', {
            errors: errors,
            company: req.body
        })
    }
    
    if (req.body.newPassword != req.body.confirmPassword) {
        renderWithErrors({
            password: "Las contraseñas no coindiden."
        })
    } else {
        Company.findOneAndUpdate(
            {email: req.body.email}, 
            {password: req.body.newPassword, token: uuidv4()}
        )
        .then((updatedCompany) => {
            if (updatedCompany) {
                req.flash('flashMessage', '¡Tu contraseña ha sido actualizado correctamente!');
                res.redirect('/company-profile');
            } else {
                req.flash('flashMessage', 'Error al actualizar tu contraseña, por favor, inténtalo de nuevo.');
                next();
            }
        })
        .catch((err) => next(err));
    }
}


module.exports.delete = (req, res, next) => {
    Company.findById({_id: req.currentCompany.id})
        .then((companyToDelete) => {
            //console.log('companyToDelete', companyToDelete)
            req.flash('flashMessage', 'Solicitud de baja realizada correctamente - Por favor, ve a tu email para finalizar el proceso');
            sendDeleteCompanyEmail(companyToDelete.email, companyToDelete.token);
            res.redirect('/');
        })
        .catch((err) => next(err));
}

module.exports.doDelete = (req, res, next) => {
    Company.findOneAndRemove({token: req.params.token})
        .then(() => {
            req.flash('flashMessage', 'Tu cuenta ha sido borrada correctamente');
            res.redirect('/');
        })
        .catch((err) => next(err));
}