const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function missingFields(body, required) {
  return required.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });
}

module.exports = { isValidEmail, isValidPassword, missingFields };
