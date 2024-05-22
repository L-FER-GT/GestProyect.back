function generarCodigoAleatorio() {
  const caracteres =
    "ABCDEFGHIJKLMNOPQRS0123456789TUVWXY0123456789Zabcdefghijkl0123456789mnopqrstuvwxyz0123456789";
  let codigo = "";

  for (let i = 0; i < 10; i++) {
    const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres.charAt(indiceAleatorio);
  }

  return codigo;
}

module.exports = { generarCodigoAleatorio };
