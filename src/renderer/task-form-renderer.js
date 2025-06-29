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

    // EDICIÓN
    window.electronAPI.onLoadTaskForEdit(async (taskId) => {
        formTitle.textContent = 'Editar Tarea';
        saveButton.textContent = 'Actualizar Tarea';
        taskIdInput.value = taskId;

        try {
            const response = await window.electronAPI.getTasks();
            if (!response.success) throw new Error(response.message);

            const allTasks = [...response.data.today, ...response.data.upcoming, ...response.data.overdue];
            const taskToEdit = allTasks.find(task => task.id === taskId);

            if (taskToEdit) {
                document.getElementById('task-title').value = taskToEdit.title;
                document.getElementById('task-description').value = taskToEdit.description || '';
                document.getElementById('task-date').value = taskToEdit.date;
                document.getElementById('task-time').value = taskToEdit.time;
                document.getElementById('task-priority').value = taskToEdit.priority || 'medium';
            } else {
                Swal.fire({ icon: 'error', title: 'Tarea no encontrada', text: 'No se pudo cargar la tarea para edición.' });
                window.close();
            }
        } catch (error) {
            console.error('Error al cargar tarea para edición:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarea para edición.' });
            window.close();
        }
    });

    // CREACIÓN O ACTUALIZACIÓN
    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const taskId = taskIdInput.value;
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value;
        const date = document.getElementById('task-date').value;
        const time = document.getElementById('task-time').value;
        const priority = document.getElementById('task-priority').value;

        if (!title) {
            Swal.fire({ icon: 'warning', title: 'Título requerido', text: 'Debes ingresar un título para la tarea.' });
            return;
        }

        const taskData = { title, description, date, time, priority };

        try {
            let result;
            if (taskId) {
                result = await window.electronAPI.updateTask(taskId, taskData);
            } else {
                result = await window.electronAPI.addTask(taskData);
            }

            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Tarea guardada',
                    text: taskId ? 'Tarea actualizada correctamente.' : 'Tarea añadida correctamente.',
                    timer: 1600,
                    showConfirmButton: false
                });
                window.close();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Hubo un problema al guardar la tarea.' });
            }

        } catch (error) {
            console.error('Error al guardar tarea:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al guardar la tarea.' });
        }
    });

    // Prellenar fecha y hora si es nueva
    if (!taskIdInput.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('task-date').value = `${year}-${month}-${day}`;
        document.getElementById('task-time').value = '09:00';
    }
});
