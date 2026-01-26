// api/task/task.js
const { ObjectId } = require('mongodb');
const logger = require('../../logger/logger');

async function createGroup(req, res) {
  const { name, members } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  try {
    const db = req.dbClient.db('abmUsers');
    const result = await db.collection('groups').insertOne({
      name,
      members: members || []
    });

    if (members && members.length > 0) {
      await db.collection('users').updateMany(
        { email: { $in: members } },
        { $set: { groupId: result.insertedId.toString() } }
      );
    }

    res.status(201).json({ message: 'Group created', groupId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
}

async function addUserToGroup(req, res) {
  const { groupId } = req.params;
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ message: 'userEmail is required' });

  try {
    const db = req.dbClient.db('abmUsers');
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: userEmail } }
    );
    await db.collection('users').updateOne(
      { email: userEmail },
      { $set: { groupId } }
    );
    res.status(200).json({ message: 'User added to group' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding user to group', error: error.message });
  }
}

async function removeUserFromGroup(req, res) {
  const { groupId } = req.params;
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ message: 'userEmail is required' });

  try {
    const db = req.dbClient.db('abmUsers');
    await db.collection('groups').updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: userEmail } }
    );
    await db.collection('users').updateOne(
      { email: userEmail },
      { $unset: { groupId: "" } }
    );
    res.status(200).json({ message: 'User removed from group' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing user from group', error: error.message });
  }
}

async function createTask(req, res) {
  const { title, description, userEmail, groupId, status } = req.body;
  if (!title || !userEmail) return res.status(400).json({ message: 'title and userEmail required' });
  try {
    const db = req.dbClient.db('abmUsers');
    const createdAt = new Date();
    const newTask = {
      title,
      description: description || '',
      userEmail,
      groupId: groupId || null,
      status: status,
      createdAt: createdAt
    };
    const result = await db.collection('tasks').insertOne(newTask);
    
    res.status(201).json({
      _id: result.insertedId,
      title,
      description: description || '',
      userEmail,
      groupId: groupId || null,
      status: status,
      createdAt: createdAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
}

async function getTasks(req, res) {
  const { userEmail, groupId } = req.query;
  if (!userEmail) return res.status(400).json({ message: 'userEmail required' });

  try {
    const db = req.dbClient.db('abmUsers');
    const user = await db.collection('tasks').findOne({ userEmail: userEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let filter = { userEmail };
    if (groupId) {
      filter = {
        $or: [
          { userEmail },
          { groupId }
        ]
      };
    }

    const tasks = await db.collection('tasks').find(filter).toArray();
    res.status(200).json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
}

async function updateTaskStatus(req, res) {
  const { taskId, status } = req.body;

  if (!taskId || !status) {
    return res.status(400).json({ message: 'taskId and status are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');

    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Task not found or status unchanged' });
    }

    res.status(200).json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating task status', error: error.message });
  }
}

async function deleteTask(req, res) {
  const { task_id } = req.params;
  try {
    const db = req.dbClient.db('abmUsers');
    const result = await db.collection('tasks').deleteOne({
      _id: new ObjectId(task_id)
    });
    res.status(200).json({ message: 'Task deleted', taskId: task_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
}

async function assignTaskToUser(req, res) {
  logger.info('assignTaskToUser req.body:', JSON.stringify(req.body));
  const { task_id, usermail } = req.body;
  try {
    logger.info(`Assigning task ${task_id} to user ${usermail}`);
    const db = req.dbClient.db('abmUsers');
    
    const taskExists = await db.collection('tasks').findOne({ _id: new ObjectId(task_id) });
    if (taskExists) {
      logger.info(`Task details: ${JSON.stringify(taskExists)}`);
    }
    
    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(task_id) },
      { $set: { assignedUserEmail: usermail } }
    );
    logger.info(`Modified count: ${result.modifiedCount}`);
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    res.status(200).json({ message: 'Persona asignada correctamente a la tarea', taskId: task_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error asignando persona a la tarea', error: error.message });
  }
}

async function sendDeletePolicityTask(req, res) {
  logger.info('sendDeletePolicityTask req.body:', JSON.stringify(req.body));
  const { userEmail, deletedDays } = req.body;
  
  try {
    const db = req.dbClient.db('abmUsers');
    
    const now = new Date();
    const autoDeleteDate = new Date(now.getTime() + deletedDays * 24 * 60 * 60 * 1000);
    
    // Actualizar TODAS las tareas deployed del usuario
    const result = await db.collection('tasks').updateMany(
      { 
        userEmail: userEmail,
        status: 'Deployed'
      },
      { $set: { autoDeleteDate: autoDeleteDate.toISOString() } }
    );
    
    logger.info(`Modified ${result.modifiedCount} tasks`);
    
    res.status(200).json({ 
      message: 'Política de borrado automático aplicada', 
      tasksUpdated: result.modifiedCount,
      autoDeleteDate: autoDeleteDate.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error guardando política de borrado', error: error.message });
  }
}

async function disabledPolicityDeleteTask(req, res) {
  logger.info('disabledPolicityDeleteTask req.body:', JSON.stringify(req.body));
  const { userEmail } = req.body;
  
  try {
    const db = req.dbClient.db('abmUsers');
    const result = await db.collection('tasks').updateMany(
      { 
        userEmail: userEmail,
        status: 'Deployed'
      },
      { $unset: { autoDeleteDate: "" } }
    );
    
    logger.info(`Modified ${result.modifiedCount} tasks`);
    
    res.status(200).json({ 
      message: 'Política de borrado automático aplicada', 
      tasksUpdated: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error quitar política de borrado', error: error.message });
  }
}

module.exports = {
  createGroup,
  addUserToGroup,
  removeUserFromGroup,
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask,
  assignTaskToUser,
  sendDeletePolicityTask,
  disabledPolicityDeleteTask
};