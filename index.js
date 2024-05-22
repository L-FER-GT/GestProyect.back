const {
  encriptarContrasena,
  DetectarPasswords,
} = require("./funciones/Encriptar");
const { generarCodigoAleatorio } = require("./funciones/CodAleatorio");
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
require('dotenv').config();
// Ahora puedes acceder a tus variables de entorno
const app = express();
const port = process.env.PORT;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const portConnection = process.env.PORT_CONNECTION;
const name_database = process.env.DB_NAME;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: name_database,
  port: portConnection,
});

db.connect((err) => {
  if (err) {
    console.error("Error de conexión a la base de datos: ", err);
  } else {
    console.log("Conexión exitosa a la base de datos");
  }
});


app.get("/listUsuarios", (req, res) => {
  db.query("SELECT User_Name FROM T_Usuario;", (err, result) => {
    if (err) {
      console.error("Error al consultar la base de datos: ", err);
      res.status(500).send("Error del servidor");
    } else {
      res.status(200).json(result);
    }
  });
});

//Agregar una nuevo ususario
app.post("/newUser", (req, res) => {
  const nuevoUsuario = req.body;
  const {
    Gmail,
    Nombres,
    Apellidos,
    Contacto,
    User,
    Password,
  } = nuevoUsuario;

  encriptarContrasena(Password)
    .then((hash) => {
      const consulta = `INSERT INTO Empleado (Gmail, Nombres, Apellidos, Informacion_Contacto, Usuario, Contrasena)
  VALUES ('${Gmail}', '${Nombres}', '${Apellidos}', '${Contacto}', '${User}', '${hash}');`;
      db.query(consulta, (err, result) => {
        if (err) {
          console.error("Error al agregar un nuevo dueño: ", err);
          res.status(500).send("Error del servidor");
        } else {
          res.status(200).send("Usuario Agregado Correctamente");
        }
      });
    })
    .catch((error) =>
      console.error("Error al encriptar la contraseña:", error)
    );
});

//Modificar Usuario
app.post("/modUser", (req, res) => {
  const nuevosDatos = req.body;
  const {
    Gmail,
    Nombres,
    Apellidos,
    Contacto,
    User,
    Password,
    idUser,
  } = nuevosDatos;
  const setValues = {
    Gmail: Gmail,
    Nombres: Nombres,
    Apellidos: Apellidos,
    Informacion_Contacto: Contacto,
  };
  const consulta = "UPDATE T_Usuario SET ? WHERE ID_User = ?";
  db.query(consulta, [setValues, idUser], (err, result) => {
    if (err) {
      res.status(500).send("Error del servidor");
    } else {
      res.status(200).send("Usuario Editado Correctamente");
    }
  });
});

//Validar la contraseña al iniciar sesion
app.post("/validateUser", (req, res) => {
  const loginUser = req.body;
  const { User, Password } = loginUser;
  const consulta = `select ID_User, User_Pass from T_Usuario where User_Name = '${User}'`;
  db.query(consulta, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error del servidor");
    } else {
      const claveHash = result[0].User_Pass;
      DetectarPasswords(Password, claveHash)
        .then((veredict) => {
          res
            .status(200)
            .send({ isCorrect: veredict, idUser: result[0].ID_User });
        })
        .catch((err) => {
          res.status(500).send("Error del servidor");
        });
    }
  });
});

app.post("/dataUsuario", (req, res) => {
  const { idUser } = req.body;
  const consulta = `
    SELECT 
      Gmail, 
      Nombres, 
      Apellidos, 
      Informacion_Contacto, 
      User_Name, 
      Cod_Image_Perfil 
    FROM T_Usuario 
    WHERE ID_User = ${idUser};
  `;
  db.query(consulta, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error del servidor");
    } else {
      res.status(200).send(result[0]);
    }
  });
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
//GESTION DE IMAGENES
// GESTIÓN DE ARCHIVOS
app.post("/newFile", upload.single("file"), (req, res) => {
  const { nombre } = req.body;
  const fileBuffer = req.file.buffer;

  // Aquí deberías insertar el archivo y otros datos en tu base de datos
  const sql = "INSERT INTO T_Archivos (Nombre, Archivo) VALUES (?, ?)";
  db.query(sql, [nombre, fileBuffer], (error, results, fields) => {
    if (error) {
      console.error("Error al insertar en la base de datos:", error);
      return res
        .status(500)
        .json({ error: "Error al insertar en la base de datos" });
    }

    res.json({ success: true, message: "Archivo subido correctamente" });
  });
});

app.get("/getIdNamesFile", (req, res) => {
  const sql = "SELECT ID_File, Nombre FROM T_Archivos";
  db.query(sql, (error, results, fields) => {
    if (error) {
      console.error("Error al obtener IDs y nombres de la base de datos:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener IDs y nombres de la base de datos" });
    }

    res.json(results);
  });
});

app.post("/getFileById", (req, res) => {
  const { id } = req.body;

  const sql = "SELECT Archivo FROM T_Archivos WHERE ID_File = ?";
  db.query(sql, [id], (error, results, fields) => {
    if (error) {
      console.error("Error al obtener el archivo de la base de datos:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener el archivo de la base de datos" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    const { Archivo } = results[0];
    res.json({ archivo: Archivo });
  });
});

