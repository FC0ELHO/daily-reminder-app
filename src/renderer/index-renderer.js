// src/renderer/index-renderer.js
console.log('index-renderer.js loaded.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired in renderer.');
    updateCurrentDate();
    loadTasks();

    document.getElementById('close-btn').addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });
    document.getElementById('minimize-btn').addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });
    document.getElementById('maximize-btn').addEventListener('click', () => {
        window.electronAPI.maximizeWindow();
    });

    document.getElementById('add-task-button').addEventListener('click', () => {
        window.electronAPI.createStickyWindow();
    });

    window.electronAPI.onTasksUpdated(() => {
        console.log('Tareas actualizadas, recargando dashboard...');
        const container = document.getElementById('today-tasks-container');
        if (container) container.innerHTML = '';
        loadTasks();
    });

    const draggableHeader = document.getElementById('draggable-header');
    let isDragging = false;
    let initialX, initialY;

    draggableHeader.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            isDragging = true;
            initialX = e.clientX;
            initialY = e.clientY;
            window.electronAPI.moveWindow({ x: initialX, y: initialY, isMoving: true });
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            window.electronAPI.moveWindow({ isMoving: false });
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - initialX;
            const deltaY = e.clientY - initialY;
            window.electronAPI.moveWindow({ x: deltaX, y: deltaY, isMoving: true });
        }
    });

    // Nuevo: selector semanal
    const dayButtons = document.querySelectorAll('.day-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            dayButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const offset = parseInt(btn.dataset.offset);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + offset);

            const response = await window.electronAPI.getTasks();
            if (!response.success) return;

            const allTasks = [
                ...response.data.today,
                ...response.data.upcoming,
                ...response.data.overdue
            ];

            const filtered = allTasks.filter(task => {
                const taskDate = new Date(task.date);
                return taskDate.toDateString() === targetDate.toDateString();
            });

            const container = document.getElementById('today-tasks-container');
            container.innerHTML = '';
            if (filtered.length > 0) {
                filtered.forEach(task => container.appendChild(createTaskElement(task)));
                document.getElementById('no-today-tasks').style.display = 'none';
            } else {
                document.getElementById('no-today-tasks').style.display = 'flex';
            }
        });
    });

    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) todayBtn.classList.add('active');
});

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const weekdayElement = document.getElementById('current-weekday');
    const now = new Date();

    const optionsDate = { day: '2-digit', month: 'short' };
    const optionsWeekday = { weekday: 'long' };

    dateElement.textContent = now.toLocaleDateString('es-ES', optionsDate).toUpperCase();
    weekdayElement.textContent = now.toLocaleDateString('es-ES', optionsWeekday).toUpperCase();
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item';
    taskElement.dataset.id = task.id;

    const now = new Date();
    const taskDateTime = new Date(`${task.date}T${task.time}`);

    if (task.completed) {
        taskElement.classList.add('task-completed');
    } else if (taskDateTime < now) {
        taskElement.classList.add('task-overdue');
    }

    const formattedTime = task.time.substring(0, 5);

    taskElement.innerHTML = `
        <div class="task-info">
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-time">${formattedTime}</span>
            </div>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            ${task.priority ? `<span class="task-priority ${task.priority}">Prioridad: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>` : ''}
        </div>
        <div class="task-actions">
            <button class="action-button complete-button" title="Marcar como completada">
                <i class="fas fa-check"></i>
            </button>
            <button class="action-button delete-button" title="Eliminar tarea">
                <i class="fas fa-trash"></i>
            </button>
            <button class="action-button edit-button" title="Editar tarea">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;

    taskElement.querySelector('.complete-button').addEventListener('click', async () => {
        try {
            await window.electronAPI.updateTask(task.id, { completed: !task.completed });
        } catch (error) {
            console.error('Error al actualizar tarea:', error);
            alert('Error al actualizar la tarea');
        }
    });

    taskElement.querySelector('.delete-button').addEventListener('click', async () => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Eliminar la tarea "${task.title}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await window.electronAPI.deleteTask(task.id);
            }
        });
    });

    taskElement.querySelector('.edit-button').addEventListener('click', () => {
        window.electronAPI.createStickyWindow(task.id);
    });

    return taskElement;
}

async function loadTasks() {
    const todayContainer = document.getElementById('today-tasks-container');
    const upcomingContainer = document.getElementById('upcoming-tasks-container');
    const overdueContainer = document.getElementById('overdue-tasks-container');

    todayContainer.innerHTML = '';
    upcomingContainer.innerHTML = '';
    overdueContainer.innerHTML = '';

    try {
        const response = await window.electronAPI.getTasks();
        if (!response.success) throw new Error(response.message);

        const tasks = response.data;
        let hasToday = false;
        let hasUpcoming = false;
        let hasOverdue = false;

        tasks.today.forEach(task => {
            todayContainer.appendChild(createTaskElement(task));
            hasToday = true;
        });
        tasks.upcoming.forEach(task => {
            upcomingContainer.appendChild(createTaskElement(task));
            hasUpcoming = true;
        });
        tasks.overdue.forEach(task => {
            overdueContainer.appendChild(createTaskElement(task));
            hasOverdue = true;
        });

        document.getElementById('no-today-tasks').style.display = hasToday ? 'none' : 'flex';
        document.getElementById('no-upcoming-tasks').style.display = hasUpcoming ? 'none' : 'flex';
        document.getElementById('no-overdue-tasks').style.display = hasOverdue ? 'none' : 'flex';

    } catch (error) {
        console.error('Error al cargar tareas:', error);
        todayContainer.innerHTML = '<p class="error">Error al cargar tareas</p>';
    }
}
