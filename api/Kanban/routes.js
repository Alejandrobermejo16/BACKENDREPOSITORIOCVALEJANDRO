// api/task/routes.js
const express = require('express');
const router = express.Router();
const taskController = require('./TaskUser');

// Crear grupo
router.post('/groups', taskController.createGroup);

// Añadir usuario a grupo
router.post('/groups/:groupId/addUser', taskController.addUserToGroup);

// Quitar usuario de grupo
router.post('/groups/:groupId/removeUser', taskController.removeUserFromGroup);

// Crear tarea
router.post('/createTasks', taskController.createTask);

// Obtener tareas
router.get('/getTasks', taskController.getTasks);

router.patch('/updateTaskStatus', taskController.updateTaskStatus);

module.exports = router;