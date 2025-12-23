document.addEventListener('DOMContentLoaded', () => {
    const taskColumns = {
        "To Do": document.getElementById('todo-cards'),
        "In Progress": document.getElementById('inprogress-cards'),
        "Done": document.getElementById('done-cards')
    };
    const newTaskForm = document.getElementById('newTaskForm');
    const newTaskModal = new bootstrap.Modal(document.getElementById('newTaskModal'));
    const board = document.querySelector('.row.mt-3');
    let draggedTaskId = null;

    const fetchTasks = async () => {
        try {
            const response = await fetch('/tasks/');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
        }
    };

    const renderTasks = (tasks) => {
        Object.values(taskColumns).forEach(column => {
            if (column) {
                column.innerHTML = '';
            }
        });

        tasks.forEach(task => {
            const column = taskColumns[task.status];
            if (column) {
                const taskCard = document.createElement('div');
                taskCard.className = 'card task-card mb-2';
                taskCard.setAttribute('draggable', 'true');
                taskCard.setAttribute('data-task-id', task.id);
                taskCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        <p class="card-text">${task.description || ''}</p>
                        <p class="card-text"><small class="text-muted">Due: ${task.due_date || 'N/A'}</small></p>
                        <p class="card-text"><small class="text-muted">Tags: ${task.tags || 'None'}</small></p>
                        <button class="btn btn-sm btn-danger delete-task float-end" data-task-id="${task.id}">X</button>
                    </div>
                `;
                column.appendChild(taskCard);
            }
        });
    };

    newTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const tags = document.getElementById('tags').value;
        const due_date = document.getElementById('due_date').value;

        const taskData = {
            title,
            description,
            tags,
            due_date: due_date || null,
            status: 'To Do'
        };

        try {
            const response = await fetch('/tasks/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            newTaskForm.reset();
            newTaskModal.hide();
            fetchTasks();
        } catch (error) {
            console.error('Failed to create task:', error);
        }
    });

    board.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-task')) {
            const taskId = e.target.getAttribute('data-task-id');
            try {
                const response = await fetch(`/tasks/${taskId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                fetchTasks();
            } catch (error) {
                console.error('Failed to delete task:', error);
            }
        }
    });

    board.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-card')) {
            draggedTaskId = e.target.getAttribute('data-task-id');
            e.dataTransfer.setData('text/plain', draggedTaskId);
            // Add a class to show it's being dragged
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
        }
    });

    board.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-card')) {
            draggedTaskId = null;
            e.target.classList.remove('dragging');
        }
    });

    board.addEventListener('dragover', (e) => {
        e.preventDefault();
        const column = e.target.closest('.card-body');
        if (column) {
            // Add a class to show it's a valid drop target
            column.classList.add('drag-over');
        }
    });

    board.addEventListener('dragleave', (e) => {
        const column = e.target.closest('.card-body');
        if (column) {
            column.classList.remove('drag-over');
        }
    });

    board.addEventListener('drop', async (e) => {
        e.preventDefault();
        const columnElement = e.target.closest('.card-body');
        if (columnElement && draggedTaskId) {
            columnElement.classList.remove('drag-over');
            const newStatus = Object.keys(taskColumns).find(key => taskColumns[key] === columnElement);

            if (newStatus) {
                try {
                    const response = await fetch(`/tasks/${draggedTaskId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ status: newStatus }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Network response was not ok');
                    }
                    // Optimistically move the card for better UX
                    const draggedCard = document.querySelector(`[data-task-id="${draggedTaskId}"]`);
                    if(draggedCard) {
                        columnElement.appendChild(draggedCard);
                    }
                    // Fetch all tasks to ensure consistency
                    fetchTasks();

                } catch (error) {
                    console.error('Failed to update task status:', error);
                    // If the update fails, refresh to revert to the server state
                    fetchTasks();
                }
            }
        }
    });

    fetchTasks();
});