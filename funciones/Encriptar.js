const bcrypt = require("bcrypt");

// Función para encriptar una contraseña
async function encriptarContrasena(contrasena) {
  try {
    // Generar un salt (valor aleatorio)
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    // Hash de la contraseña con el salt
    const hash = await bcrypt.hash(contrasena, salt);

    return hash;
  } catch (error) {
    throw error;
  }
}

async function DetectarPasswords(passwordFromUser, hashedPasswordFromDatabase) {
  try {
    const result = await bcrypt.compare(
      passwordFromUser,
      hashedPasswordFromDatabase);
      return result
  } catch (err) {
    throw err;
  }
}

module.exports = {
  encriptarContrasena,
  DetectarPasswords
};
