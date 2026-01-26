const express = require('express');
const router = express.Router();
const taskController = require('./TaskUser');

router.post('/groups', taskController.createGroup);
router.post('/groups/:groupId/addUser', taskController.addUserToGroup);
router.post('/groups/:groupId/removeUser', taskController.removeUserFromGroup);
router.post('/createTasks', taskController.createTask);
router.get('/getTasks', taskController.getTasks);
router.patch('/updateTaskStatus', taskController.updateTaskStatus);
router.delete('/deleteTasks/:task_id', taskController.deleteTask);
router.post('/assignTaskToUser', taskController.assignTaskToUser);
router.post('/sendDeletePolicityTask', taskController.sendDeletePolicityTask);

module.exports = router;