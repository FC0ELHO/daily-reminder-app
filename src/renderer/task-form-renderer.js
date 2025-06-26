// src/renderer/task-form-renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const formTitle = document.getElementById('form-title');
    const taskForm = document.getElementById('task-form');
    const closeButton = document.getElementById('close-form-btn');
    const cancelButton = document.getElementById('cancel-task-btn');
    const saveButton = document.getElementById('save-task-btn');

    const taskIdInput = document.createElement('input');
    taskIdInput.type = 'hidden';
    taskIdInput.id = 'task-id';
    taskForm.appendChild(taskIdInput);

    closeButton.addEventListener('click', () => {
        window.close();
    });

    cancelButton.addEventListener('click', () => {
        window.close();
    });

    window.electronAPI.onLoadTaskForEdit(async (taskId) => {
        formTitle.textContent = 'Editar Tarea';
        saveButton.textContent = 'Actualizar Tarea';
        taskIdInput.value = taskId;

        try {
            const response = await window.electronAPI.getTasks();
            if (!response.success) {
                throw new Error(response.message);
            }
            const allTasks = [...response.data.today, ...response.data.upcoming, ...response.data.overdue];
            const taskToEdit = allTasks.find(task => task.id === taskId);
            if (taskToEdit) {
                document.getElementById('task-title').value = taskToEdit.title;
                document.getElementById('task-description').value = taskToEdit.description || '';
                document.getElementById('task-date').value = taskToEdit.date;
                document.getElementById('task-time').value = taskToEdit.time;
                document.getElementById('task-priority').value = taskToEdit.priority || 'medium';
            } else {
                alert('Tarea no encontrada para edición.');
                window.close();
            }
        } catch (error) {
            console.error('Error al cargar tarea para edición:', error);
            alert('Error al cargar la tarea para edición.');
            window.close();
        }
    });

    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const taskId = taskIdInput.value;
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const date = document.getElementById('task-date').value;
        const time = document.getElementById('task-time').value;
        const priority = document.getElementById('task-priority').value;

        const taskData = {
            title,
            description,
            date,
            time,
            priority
        };

        try {
            let result;
            if (taskId) {
                result = await window.electronAPI.updateTask(taskId, taskData);
                if (result.success) {
                    alert('Tarea actualizada correctamente.');
                } else {
                    alert('Error al actualizar la tarea: ' + result.message);
                }
            } else {
                result = await window.electronAPI.addTask(taskData);
                if (result.success) {
                    alert('Tarea añadida correctamente.');
                } else {
                    alert('Error al añadir la tarea: ' + result.message);
                }
            }
            window.close();
        } catch (error) {
            console.error('Error al guardar tarea:', error);
            alert('Hubo un error al guardar la tarea.');
        }
    });

    if (!taskIdInput.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('task-date').value = `${year}-${month}-${day}`;
        document.getElementById('task-time').value = '09:00';
    }
});