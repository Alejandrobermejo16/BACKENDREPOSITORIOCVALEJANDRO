const express = require('express');
const router = express.Router();
const taskController = require('./TaskUser');

router.post('/groups', taskController.createGroup);
router.post('/groups/:groupId/addUser', taskController.addUserToGroup);
router.post('/groups/:groupId/removeUser', taskController.removeUserFromGroup);
router.post('/subscribeToGroup', taskController.subscribeToGroup);
router.post('/unsubscribeFromGroup', taskController.unsubscribeFromGroup);
router.get('/getUserGroups', taskController.getUserGroups);
router.get('/searchGroups', taskController.searchGroups);
router.post('/createTasks', taskController.createTask);
router.get('/getTasks', taskController.getTasks);
router.patch('/updateTaskStatus', taskController.updateTaskStatus);
router.delete('/deleteTasks/:task_id', taskController.deleteTask);
router.post('/recoverTask', taskController.recoverTask);
router.get('/getDeletedTasks', taskController.getDeletedTasks);
router.post('/assignTaskToUser', taskController.assignTaskToUser);
router.post('/sendDeletePolicityTask', taskController.sendDeletePolicityTask);
router.post('/disabledPolicityDeleteTask', taskController.disabledPolicityDeleteTask);
router.get('/getLabels', taskController.getLabels);
router.post('/createLabel', taskController.createLabel);

module.exports = router;