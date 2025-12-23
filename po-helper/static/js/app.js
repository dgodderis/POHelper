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

    /**
     * Fetches tasks from the API and renders them on the board.
     */
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

    /**
     * Renders a list of tasks onto the respective columns on the board.
     * @param {Array<Object>} tasks - An array of task objects to render.
     */
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

                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';

                const titleEl = document.createElement('h5');
                titleEl.className = 'card-title';
                titleEl.textContent = task.title;

                const descriptionEl = document.createElement('p');
                descriptionEl.className = 'card-text';
                descriptionEl.textContent = task.description || '';

                const dueDateEl = document.createElement('p');
                dueDateEl.className = 'card-text';
                const smallDueDate = document.createElement('small');
                smallDueDate.className = 'text-muted';
                smallDueDate.textContent = `Due: ${task.due_date || 'N/A'}`;
                dueDateEl.appendChild(smallDueDate);

                const tagsEl = document.createElement('p');
                tagsEl.className = 'card-text';
                const smallTags = document.createElement('small');
                smallTags.className = 'text-muted';
                smallTags.textContent = `Tags: ${task.tags || 'None'}`;
                tagsEl.appendChild(smallTags);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger delete-task float-end';
                deleteButton.setAttribute('data-task-id', task.id);
                deleteButton.textContent = 'X';

                cardBody.appendChild(titleEl);
                cardBody.appendChild(descriptionEl);
                cardBody.appendChild(dueDateEl);
                cardBody.appendChild(tagsEl);
                cardBody.appendChild(deleteButton);
                taskCard.appendChild(cardBody);
                column.appendChild(taskCard);
            }
        });
    };

    /**
     * Handles the submission of the new task form.
     * Prevents default form submission, gathers input, sends it to the API, and refreshes tasks.
     */
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

    /**
     * Handles click events on the board, specifically for deleting tasks.
     * @param {Event} e - The click event object.
     */
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

    /**
     * Handles the start of a drag operation for a task card.
     * Sets the dragged task ID and adds a 'dragging' class.
     * @param {Event} e - The dragstart event object.
     */
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

    /**
     * Handles the end of a drag operation for a task card.
     * Resets the dragged task ID and removes the 'dragging' class.
     * @param {Event} e - The dragend event object.
     */
    board.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-card')) {
            draggedTaskId = null;
            e.target.classList.remove('dragging');
        }
    });

    /**
     * Handles a task being dragged over a potential drop target.
     * Prevents default to allow dropping and adds a 'drag-over' class to valid columns.
     * @param {Event} e - The dragover event object.
     */
    board.addEventListener('dragover', (e) => {
        e.preventDefault();
        const column = e.target.closest('#todo-cards, #inprogress-cards, #done-cards');
        if (column) {
            // Add a class to show it's a valid drop target
            column.classList.add('drag-over');
        }
    });

    /**
     * Handles a dragged task leaving a potential drop target.
     * Removes the 'drag-over' class from columns.
     * @param {Event} e - The dragleave event object.
     */
    board.addEventListener('dragleave', (e) => {
        const column = e.target.closest('#todo-cards, #inprogress-cards, #done-cards');
        if (column) {
            column.classList.remove('drag-over');
        }
    });

    /**
     * Handles a task being dropped onto a new column.
     * Updates the task's status via the API and refreshes the task list.
     * @param {Event} e - The drop event object.
     */
    board.addEventListener('drop', async (e) => {
        e.preventDefault();
        const columnElement = e.target.closest('#todo-cards, #inprogress-cards, #done-cards');
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
