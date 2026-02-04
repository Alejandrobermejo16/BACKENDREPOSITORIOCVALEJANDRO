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
  const { title, description, userEmail, groupId, status, priority } = req.body;
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
      createdAt: createdAt,
      priority
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
  const { taskId, status, title, description } = req.body;

  if (!taskId) {
    return res.status(400).json({ message: 'taskId is required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    
    const updateFields = {};
    if (status) updateFields.status = status;
    if (title !== undefined && title !== null) updateFields.title = title;
    if (description !== undefined && description !== null) updateFields.description = description;

    // Si no hay campos para actualizar
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'At least one field (status, title, or description) is required' });
    }

    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ 
      message: 'Task updated successfully',
      updatedFields: Object.keys(updateFields),
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
}

async function deleteTask(req, res) {
  const { task_id } = req.params;
  let { taskIds } = req.body;

  logger.info('deleteTask params:', JSON.stringify(req.params));
  logger.info('deleteTask body:', JSON.stringify(req.body));

  try {
    const db = req.dbClient.db('abmUsers');
    let result;

    // Normalizar distintas formas de recibir taskIds
    if (typeof taskIds === 'string') {
      try {
        const parsed = JSON.parse(taskIds);
        if (Array.isArray(parsed)) taskIds = parsed;
        else taskIds = taskIds.split(',').map(s => s.trim()).filter(Boolean);
      } catch {
        taskIds = taskIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      // Filtrar solo ids válidos de 24 hex chars
      const validIds = taskIds.filter(id => typeof id === 'string' && ObjectId.isValid(id));
      const invalidIds = taskIds.filter(id => !(typeof id === 'string' && ObjectId.isValid(id)));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          message: 'Invalid task ids provided',
          invalidIds
        });
      }

      logger.info(`Deleting multiple tasks: ${validIds.join(', ')}`);
      const objectIds = validIds.map(id => new ObjectId(id));
      result = await db.collection('tasks').deleteMany({ _id: { $in: objectIds } });

      return res.status(200).json({
        message: 'Tasks deleted',
        deletedCount: result.deletedCount,
        taskIds: validIds
      });
    }

    // Modo single id por params
    else if (task_id) {
      if (!ObjectId.isValid(task_id)) {
        return res.status(400).json({ message: 'Invalid task_id param' });
      }

      logger.info(`Deleting single task: ${task_id}`);
      result = await db.collection('tasks').deleteOne({ _id: new ObjectId(task_id) });

      return res.status(200).json({
        message: 'Task deleted',
        deletedCount: result.deletedCount,
        taskId: task_id
      });
    }

    else {
      return res.status(400).json({
        message: 'Either task_id param or taskIds body array is required'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting task(s)', error: error.message });
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