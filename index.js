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
require("dotenv").config();
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
  const { Gmail, Nombres, Apellidos, Contacto, User, Password } = nuevoUsuario;

  encriptarContrasena(Password)
    .then((hash) => {
      const consulta = `INSERT INTO T_Usuario (Gmail, Nombres, Apellidos, Informacion_Contacto, User_Name, User_Pass)
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
    Cod_Image_Perfil,
  } = nuevosDatos;
  const setValues = {
    Gmail: Gmail,
    Nombres: Nombres,
    Apellidos: Apellidos,
    Informacion_Contacto: Contacto,
    Cod_Image_Perfil: Cod_Image_Perfil,
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

  // Insertar el archivo y otros datos en la base de datos
  const sql = "INSERT INTO T_Archivos (Nombre, Archivo) VALUES (?, ?)";
  db.query(sql, [nombre, fileBuffer], (error, results, fields) => {
    if (error) {
      console.error("Error al insertar en la base de datos:", error);
      return res
        .status(500)
        .json({ error: "Error al insertar en la base de datos" });
    }

    // Obtener el ID_File del archivo insertado
    const idFile = results.insertId;

    res.json({
      success: true,
      idFile,
      message: "Archivo subido correctamente",
    });
  });
});

app.get("/getIdNamesFile", (req, res) => {
  const sql = "SELECT ID_File, Nombre FROM T_Archivos";
  db.query(sql, (error, results, fields) => {
    if (error) {
      console.error(
        "Error al obtener IDs y nombres de la base de datos:",
        error
      );
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

//-------CONTROL DE PROYECTOS---------------
app.post("/addProject", (req, res) => {
  const { idAdministrador, descripcion, fechaInicial, fechaFinal, titulo } =
    req.body;

  // Validar los datos recibidos
  if (
    !idAdministrador ||
    !fechaInicial ||
    !fechaFinal ||
    !titulo
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  // Convertir las fechas al formato 'YYYY-MM-DD'
  const formattedFechaInicial = new Date(fechaInicial).toISOString().split('T')[0];
  const formattedFechaFinal = new Date(fechaFinal).toISOString().split('T')[0];

  const sqlInsertProject = `
    INSERT INTO T_Proyecto (ID_Administrador, Descripcion, Fecha_Inicial, Fecha_Final,Titulo)
    VALUES (?, ?, ?, ?,?)
  `;

  db.query(
    sqlInsertProject,
    [idAdministrador, descripcion, formattedFechaInicial, formattedFechaFinal, titulo],
    (error, results) => {
      if (error) {
        console.error(
          "Error al agregar el proyecto a la base de datos:",
          error
        );
        return res
          .status(500)
          .json({ error: "Error al agregar el proyecto a la base de datos" });
      }

      const projectId = results.insertId;

      // Asociar el administrador con el proyecto en la tabla T_Proyecto_User
      const sqlAssociateAdmin = `
      INSERT INTO T_Proyecto_User (ID_proyecto, ID_user)
      VALUES (?, ?)
    `;

      db.query(sqlAssociateAdmin, [projectId, idAdministrador], (error) => {
        if (error) {
          console.error(
            "Error al asociar el administrador con el proyecto:",
            error
          );
          return res
            .status(500)
            .json({
              error: "Error al asociar el administrador con el proyecto",
            });
        }

        res
          .status(201)
          .json({ message: "Proyecto agregado con éxito", projectId });
      });
    }
  );
});

app.post("/getProjectsByUserId", (req, res) => {
  const { idUsuario } = req.body;

  if (!idUsuario) {
    return res.status(400).json({ error: "ID de usuario es obligatorio" });
  }

  const sqlGetProjects = `
    SELECT p.ID_Proyecto, p.Descripcion, p.Fecha_Inicial, p.Fecha_Final, p.Titulo 
    FROM T_Proyecto p
    INNER JOIN T_Proyecto_User pu ON p.ID_Proyecto = pu.ID_proyecto
    WHERE pu.ID_user = ?
  `;

  db.query(sqlGetProjects, [idUsuario], (error, results) => {
    if (error) {
      console.error(
        "Error al obtener los proyectos de la base de datos:",
        error
      );
      return res
        .status(500)
        .json({ error: "Error al obtener los proyectos de la base de datos" });
    }

    res.json({ proyecto: results });
  });
});

app.put("/updateProject", (req, res) => {
  const { idProyecto, idAdministrador, descripcion, fechaInicial, fechaFinal,titulo } =
    req.body;

  // Validar los datos recibidos
  if (
    !idProyecto ||
    !idAdministrador ||
    !descripcion ||
    !fechaInicial ||
    !fechaFinal ||
    !titulo
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const sqlUpdateProject = `
    UPDATE T_Proyecto 
    SET ID_Administrador = ?, Descripcion = ?, Fecha_Inicial = ?, Fecha_Final = ?, Titulo = ?
    WHERE ID_Proyecto = ?
  `;

  db.query(
    sqlUpdateProject,
    [idAdministrador, descripcion, fechaInicial, fechaFinal, titulo, idProyecto],
    (error, results) => {
      if (error) {
        console.error(
          "Error al actualizar el proyecto en la base de datos:",
          error
        );
        return res
          .status(500)
          .json({
            error: "Error al actualizar el proyecto en la base de datos",
          });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }

      res.status(200).json({ message: "Proyecto actualizado con éxito" });
    }
  );
});

//-----------------------------SUBIR AL SERvIDOR-------------------------//
app.listen(port, () => {
  console.log(`Servidor backend en ejecución en http://localhost:${port}`);
});
