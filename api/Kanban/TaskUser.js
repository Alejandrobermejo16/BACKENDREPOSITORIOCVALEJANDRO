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

async function subscribeToGroup(req, res) {
  const { userEmail, group } = req.body;
  if (!userEmail || !group) return res.status(400).json({ message: 'userEmail and group are required' });

  try {
    const db = req.dbClient.db('abmUsers');
    const result = await db.collection('groups').updateOne(
      { email: userEmail },
      { 
        $addToSet: { userGroups: group },
        $setOnInsert: { email: userEmail, createdAt: new Date() }
      },
      { upsert: true }
    );
    
    res.status(200).json({ 
      message: 'Subscribed to group successfully', 
      group,
      wasNew: result.upsertedCount > 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error subscribing to group', error: error.message });
  }
}

async function getUserGroups(req, res) {
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ message: 'userEmail is required' });

  try {
    const db = req.dbClient.db('abmUsers');
    const user = await db.collection('groups').findOne({ email: userEmail });
    
    const groups = user?.userGroups || [];
    res.status(200).json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user groups', error: error.message });
  }
}

async function unsubscribeFromGroup(req, res) {
  const { userEmail, group } = req.body;
  if (!userEmail || !group) return res.status(400).json({ message: 'userEmail and group are required' });

  try {
    const db = req.dbClient.db('abmUsers');
    
    // Eliminar el grupo del array userGroups en la colección groups
    await db.collection('groups').updateOne(
      { email: userEmail },
      { $pull: { userGroups: group } }
    );
    
    res.status(200).json({ message: 'Unsubscribed from group successfully', group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error unsubscribing from group', error: error.message });
  }
}

async function searchGroups(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'query is required' });

  try {
    const db = req.dbClient.db('abmUsers');
    
    const users = await db.collection('users').find(
      { userGroups: { $regex: query, $options: 'i' } },
      { projection: { userGroups: 1 } }
    ).toArray();
    
    const allGroups = users.flatMap(u => u.userGroups || []);
    const uniqueGroups = [...new Set(allGroups)];
    
    const filtered = uniqueGroups.filter(g => 
      g.toLowerCase().includes(query.toLowerCase())
    );
    
    res.status(200).json({ groups: filtered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching groups', error: error.message });
  }
}



async function createTask(req, res) {
  const { title, description, userEmail, taskGroups, status, priority } = req.body;
  if (!title || !userEmail) return res.status(400).json({ message: 'title and userEmail required' });
  try {
    const db = req.dbClient.db('abmUsers');
    const createdAt = new Date();
    const newTask = {
      title,
      description: description || '',
      userEmail,
      taskGroups: taskGroups || [],
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
      taskGroups: taskGroups || [],
      status: status,
      createdAt: createdAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
}

async function getTasks(req, res) {
  const { userEmail, group } = req.query;
  if (!userEmail) return res.status(400).json({ message: 'userEmail required' });

  try {
    const db = req.dbClient.db('abmUsers');

    let filter = { userEmail };
    
    // Si se proporciona un grupo, filtrar tareas del usuario O que contengan ese grupo en taskGroups
    if (group) {
      filter = {
        $or: [
          { userEmail },
          { taskGroups: group }
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

async function getLabels(req, res) {
  try {
    const db = req.dbClient.db('abmUsers');    const docs = await db.collection('labels').find({}).toArray();

    const labels = (docs || []).map(doc => {
      if (!doc) return null;
      if (typeof doc === 'string') return doc;
      return doc.label || doc.name || doc.value || doc;
    }).filter(Boolean);

    return res.status(200).json({ labels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cargar combos', error: error.message });
  }
}

async function createLabel(req, res) {
  const { label } = req.body;
  const labelStr = (label || '').toString().trim();
  if (!labelStr) return res.status(400).json({ message: 'label is required' });

  try {
    const db = req.dbClient.db('abmUsers');

    // Check duplicate (case-insensitive)
    const existing = await db.collection('labels').findOne({ label: { $regex: `^${labelStr}$`, $options: 'i' } });
    if (existing) {
      return res.status(409).json({ message: 'Label already exists', label: existing.label || existing });
    }

    const doc = { label: labelStr, value: labelStr, createdAt: new Date().toISOString() };
    const result = await db.collection('labels').insertOne(doc);

    return res.status(201).json({ message: 'Label created', label: labelStr, value: labelStr, _id: result.insertedId });
  } catch (error) {
    console.error('createLabel error:', error);
    return res.status(500).json({ message: 'Error creating label', error: error.message });
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
  disabledPolicityDeleteTask,
  createLabel,
  getLabels,
  subscribeToGroup,
  getUserGroups,
  unsubscribeFromGroup,
  searchGroups
};