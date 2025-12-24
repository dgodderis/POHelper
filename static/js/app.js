document.addEventListener('DOMContentLoaded', () => {
    const taskColumns = {
        "To Do": document.getElementById('todo-cards'),
        "In Progress": document.getElementById('inprogress-cards'),
        "Done": document.getElementById('done-cards')
    };
    const statusByColumnId = {
        "todo-cards": "To Do",
        "inprogress-cards": "In Progress",
        "done-cards": "Done"
    };
    const newTaskForm = document.getElementById('newTaskForm');
    const quickTaskForm = document.getElementById('quickTaskForm');
    const editTaskForm = document.getElementById('editTaskForm');
    const newTaskModalElement = document.getElementById('newTaskModal');
    const quickTaskModalElement = document.getElementById('quickTaskModal');
    const editTaskModalElement = document.getElementById('editTaskModal');
    const newTaskModal = newTaskModalElement ? new bootstrap.Modal(newTaskModalElement) : null;
    const quickTaskModal = quickTaskModalElement ? new bootstrap.Modal(quickTaskModalElement) : null;
    const editTaskModal = editTaskModalElement ? new bootstrap.Modal(editTaskModalElement) : null;
    const board = document.querySelector('.row.mt-3');
    const tagPickerContainers = document.querySelectorAll('.tag-picker');
    const filterInput = document.getElementById('filter_input');
    const clearFiltersButton = document.getElementById('clear_filters');
    const filterStatus = document.getElementById('filter_status');
    let draggedTaskId = null;
    let draggedFromStatus = null;
    let currentTasks = [];
    const sortState = {};
    let availableTags = [];
    const statusOrder = ["To Do", "In Progress", "Done"];
    const filterState = {
        input: ''
    };

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeTagClass = (tag) => {
        const normalized = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return normalized ? `tag-${normalized}` : '';
    };

    const addTagToInput = (input, tag) => {
        if (!input || !tag) {
            return;
        }
        const existingTags = input.value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        const tagLower = tag.toLowerCase();
        if (!existingTags.some(item => item.toLowerCase() === tagLower)) {
            existingTags.push(tag);
        }
        input.value = existingTags.join(', ');
    };

    const parseTagsValue = (value) => {
        if (!value) {
            return [];
        }
        return value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
    };

    const refreshTagPickers = () => {
        tagPickerContainers.forEach((container) => {
            const select = container.querySelector('.tag-picker-select');
            if (!select) {
                return;
            }
            const selectedValue = select.value;
            select.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select saved tag';
            select.appendChild(placeholder);
            availableTags.forEach((tag) => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                select.appendChild(option);
            });
            select.value = availableTags.includes(selectedValue) ? selectedValue : '';
        });
    };

    const fetchTags = async () => {
        try {
            const response = await fetch('/tags/');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const tags = await response.json();
            availableTags = Array.isArray(tags) ? tags : [];
            refreshTagPickers();
        } catch (error) {
            logError('Failed to load tags:', error);
        }
    };

    const normalizeTokens = (tokens) => tokens.map(token => token.toLowerCase());

    const getFilterTokens = () => {
        const rawValue = filterState.input || '';
        const tokens = rawValue
            .split(',')
            .map(token => token.trim())
            .filter(Boolean);
        return normalizeTokens(tokens.length ? tokens : rawValue.trim() ? [rawValue.trim()] : []);
    };

    const taskMatchesFilters = (task) => {
        const tokens = getFilterTokens();
        if (tokens.length === 0) {
            return true;
        }
        const title = (task.title || '').toLowerCase();
        const description = (task.description || '').toLowerCase();
        const taskTags = normalizeTokens(parseTagsValue(task.tags || ''));
        return tokens.every((token) => {
            if (title.includes(token) || description.includes(token)) {
                return true;
            }
            return taskTags.some(tag => tag.includes(token));
        });
    };

    const getFilteredTasks = () => currentTasks.filter(taskMatchesFilters);

    const updateFilterStatus = () => {
        if (!filterStatus) {
            return;
        }
        const filteredCount = getFilteredTasks().length;
        const totalCount = currentTasks.length;
        const hasFilters = Boolean(filterState.input && filterState.input.trim());
        filterStatus.textContent = hasFilters
            ? `Showing ${filteredCount} of ${totalCount}`
            : '';
    };

    const updateFiltersFromInputs = () => {
        if (filterInput) {
            filterState.input = filterInput.value || '';
        }
        renderTasks(getFilteredTasks());
        updateFilterStatus();
    };

    const parseDateValue = (value) => {
        if (!value) {
            return null;
        }
        const time = Date.parse(value);
        return Number.isNaN(time) ? null : time;
    };

    const compareNullableNumbers = (aValue, bValue, direction) => {
        if (aValue == null && bValue == null) {
            return 0;
        }
        if (aValue == null) {
            return 1;
        }
        if (bValue == null) {
            return -1;
        }
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
    };

    const compareNullableStrings = (aValue, bValue, direction) => {
        const aEmpty = !aValue;
        const bEmpty = !bValue;
        if (aEmpty && bEmpty) {
            return 0;
        }
        if (aEmpty) {
            return 1;
        }
        if (bEmpty) {
            return -1;
        }
        return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
    };

    const compareManualOrder = (a, b) => {
        const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        const aCreated = parseDateValue(a.created_at);
        const bCreated = parseDateValue(b.created_at);
        const createdCompare = compareNullableNumbers(aCreated, bCreated, 'asc');
        if (createdCompare !== 0) {
            return createdCompare;
        }
        return (a.id || 0) - (b.id || 0);
    };

    const getLogTimestamp = () => new Date().toISOString();

    const logError = (message, error) => {
        console.error(`[${getLogTimestamp()}] ${message}`, error);
    };

    const sortTasksForStatus = (tasks, status) => {
        const sortMode = sortState[status] || 'manual';
        return [...tasks].sort((a, b) => {
            if (sortMode === 'manual') {
                return compareManualOrder(a, b);
            }
            if (sortMode.startsWith('due-')) {
                const direction = sortMode.endsWith('asc') ? 'asc' : 'desc';
                const dueCompare = compareNullableNumbers(
                    parseDateValue(a.due_date),
                    parseDateValue(b.due_date),
                    direction
                );
                return dueCompare || compareManualOrder(a, b);
            }
            if (sortMode.startsWith('entry-')) {
                const direction = sortMode.endsWith('asc') ? 'asc' : 'desc';
                const entryCompare = compareNullableNumbers(
                    parseDateValue(a.created_at),
                    parseDateValue(b.created_at),
                    direction
                );
                return entryCompare || compareManualOrder(a, b);
            }
            if (sortMode.startsWith('tag-')) {
                const direction = sortMode.endsWith('asc') ? 'asc' : 'desc';
                const aTag = (a.tags || '').trim().toLowerCase();
                const bTag = (b.tags || '').trim().toLowerCase();
                const tagCompare = compareNullableStrings(aTag, bTag, direction);
                return tagCompare || compareManualOrder(a, b);
            }
            return compareManualOrder(a, b);
        });
    };

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
            currentTasks = tasks;
            renderTasks(getFilteredTasks());
            updateFilterStatus();
        } catch (error) {
            logError('There has been a problem with your fetch operation:', error);
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

        const tasksByStatus = {
            "To Do": [],
            "In Progress": [],
            "Done": []
        };

        tasks.forEach(task => {
            if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
            }
        });

        Object.entries(taskColumns).forEach(([status, column]) => {
            if (!column) {
                return;
            }
            const sortedTasks = sortTasksForStatus(tasksByStatus[status] || [], status);
            sortedTasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'card task-card mb-2';
                taskCard.setAttribute('draggable', 'true');
                taskCard.setAttribute('data-task-id', task.id);
                taskCard.setAttribute('data-task-status', task.status);

                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';

                const headerRow = document.createElement('div');
                headerRow.className = 'task-card-header';

                const titleEl = document.createElement('h5');
                titleEl.className = 'card-title';
                titleEl.textContent = task.title;

                const tagsWrap = document.createElement('div');
                tagsWrap.className = 'task-tags';

                const rawTags = task.tags ? task.tags.split(',') : [];
                const tagsList = rawTags.map(tag => tag.trim()).filter(Boolean);

                if (tagsList.length === 0) {
                    const emptyBadge = document.createElement('span');
                    emptyBadge.className = 'task-tag task-tag-empty';
                    emptyBadge.textContent = 'None';
                    tagsWrap.appendChild(emptyBadge);
                } else {
                    tagsList.forEach((tag) => {
                        const tagBadge = document.createElement('span');
                        const tagClass = normalizeTagClass(tag);
                        tagBadge.className = `task-tag${tagClass ? ` ${tagClass}` : ''}`;
                        tagBadge.textContent = tag;
                        tagsWrap.appendChild(tagBadge);
                    });
                }

                headerRow.appendChild(titleEl);
                headerRow.appendChild(tagsWrap);

                const descriptionEl = document.createElement('p');
                descriptionEl.className = 'card-text';
                descriptionEl.textContent = task.description || '';

                const footerRow = document.createElement('div');
                footerRow.className = 'task-card-footer';

                const dueDateEl = document.createElement('div');
                dueDateEl.className = 'task-card-due';
                const smallDueDate = document.createElement('small');
                smallDueDate.className = 'text-muted';
                smallDueDate.textContent = `Due: ${task.due_date || 'N/A'}`;
                dueDateEl.appendChild(smallDueDate);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger delete-task';
                deleteButton.setAttribute('data-task-id', task.id);
                deleteButton.textContent = 'X';

                const editButton = document.createElement('button');
                editButton.className = 'btn btn-sm btn-outline-secondary edit-task';
                editButton.setAttribute('data-task-id', task.id);
                editButton.textContent = 'Edit';

                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'task-card-actions';
                actionsWrap.appendChild(editButton);
                actionsWrap.appendChild(deleteButton);

                footerRow.appendChild(dueDateEl);
                footerRow.appendChild(actionsWrap);
                cardBody.appendChild(headerRow);
                cardBody.appendChild(descriptionEl);
                cardBody.appendChild(footerRow);
                taskCard.appendChild(cardBody);
                column.appendChild(taskCard);
            });
        });
    };

    const createTask = async (taskData, form, modal) => {
        try {
            const response = await fetch('/tasks/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });
            if (!response.ok) {
                let errorDetail = 'Network response was not ok';
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch (parseError) {
                    // Keep the default error detail when parsing fails.
                }
                throw new Error(errorDetail);
            }
            if (form) {
                form.reset();
            }
            if (modal) {
                modal.hide();
            }
            fetchTasks();
            fetchTags();
        } catch (error) {
            logError('Failed to create task:', error);
        }
    };

    const updateTask = async (taskId, taskData, form, modal) => {
        try {
            const response = await fetch(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });
            if (!response.ok) {
                let errorDetail = 'Network response was not ok';
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch (parseError) {
                    // Keep the default error detail when parsing fails.
                }
                throw new Error(errorDetail);
            }
            if (form) {
                form.reset();
            }
            if (modal) {
                modal.hide();
            }
            fetchTasks();
            fetchTags();
        } catch (error) {
            logError('Failed to update task:', error);
        }
    };

    const openEditModal = (task) => {
        if (!task || !editTaskModal) {
            return;
        }
        const idField = document.getElementById('edit_task_id');
        const titleField = document.getElementById('edit_title');
        const descriptionField = document.getElementById('edit_description');
        const tagsField = document.getElementById('edit_tags');
        const dueDateField = document.getElementById('edit_due_date');
        const statusField = document.getElementById('edit_status');

        if (idField) {
            idField.value = task.id;
        }
        if (titleField) {
            titleField.value = task.title || '';
        }
        if (descriptionField) {
            descriptionField.value = task.description || '';
        }
        if (tagsField) {
            tagsField.value = task.tags || '';
        }
        if (dueDateField) {
            dueDateField.value = task.due_date || '';
        }
        if (statusField) {
            statusField.value = task.status || 'To Do';
        }

        editTaskModal.show();
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

        createTask(taskData, newTaskForm, newTaskModal);
    });

    /**
     * Handles the submission of the quick task form.
     * Uses today's date as the due date.
     */
    const handleQuickTaskSubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('quick_title').value.trim();
        if (!title) {
            return;
        }
        const tagsInput = document.getElementById('quick_tags');
        const tagsValue = tagsInput ? tagsInput.value.trim() : '';

        const taskData = {
            title,
            description: null,
            tags: tagsValue || null,
            due_date: getTodayDate(),
            status: 'To Do'
        };

        createTask(taskData, quickTaskForm, quickTaskModal);
    };

    const sortSelects = document.querySelectorAll('.task-sort');
    sortSelects.forEach((select) => {
        const status = select.getAttribute('data-status');
        if (!status) {
            return;
        }
        sortState[status] = select.value;
        select.addEventListener('change', () => {
            sortState[status] = select.value;
            renderTasks(getFilteredTasks());
        });
    });

    if (filterInput) {
        filterInput.addEventListener('input', updateFiltersFromInputs);
    }

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            if (filterInput) {
                filterInput.value = '';
            }
            updateFiltersFromInputs();
        });
    }

    document.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'quickTaskForm') {
            handleQuickTaskSubmit(e);
        }
    });

    document.addEventListener('click', (e) => {
        const addButton = e.target.closest('.tag-picker-add');
        if (!addButton) {
            return;
        }
        const container = addButton.closest('.tag-picker');
        if (!container) {
            return;
        }
        const inputId = container.getAttribute('data-tag-input');
        const input = inputId ? document.getElementById(inputId) : null;
        const select = container.querySelector('.tag-picker-select');
        const tagValue = select ? select.value : '';
        if (tagValue) {
            addTagToInput(input, tagValue);
        }
    });

    if (editTaskForm) {
        editTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('edit_task_id').value;
            const title = document.getElementById('edit_title').value.trim();
            if (!title) {
                return;
            }
            const descriptionValue = document.getElementById('edit_description').value.trim();
            const tagsValue = document.getElementById('edit_tags').value.trim();
            const dueDateValue = document.getElementById('edit_due_date').value;
            const statusValue = document.getElementById('edit_status').value;

            const taskData = {
                title,
                description: descriptionValue || null,
                tags: tagsValue || null,
                due_date: dueDateValue || null,
                status: statusValue
            };

            updateTask(taskId, taskData, editTaskForm, editTaskModal);
        });
    }

    /**
     * Handles click events on the board, specifically for deleting tasks.
     * @param {Event} e - The click event object.
     */
    board.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-task')) {
            const taskId = e.target.getAttribute('data-task-id');
            const task = currentTasks.find(item => item.id === Number(taskId));
            openEditModal(task);
            return;
        }
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
                logError('Failed to delete task:', error);
            }
        }
    });

    board.addEventListener('dblclick', (e) => {
        if (e.target.closest('.edit-task, .delete-task')) {
            return;
        }
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) {
            return;
        }
        const currentStatus = taskCard.getAttribute('data-task-status');
        const nextStatus = getNextStatus(currentStatus);
        if (!nextStatus) {
            return;
        }
        moveTaskToStatus(taskCard, nextStatus, currentStatus);
    });

    const getColumnStatus = (columnElement) => {
        if (!columnElement) {
            return null;
        }
        return statusByColumnId[columnElement.id] || null;
    };

    const getNextStatus = (status) => {
        const currentIndex = statusOrder.indexOf(status);
        if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) {
            return null;
        }
        return statusOrder[currentIndex + 1];
    };

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    };

    const updateOrderForColumn = async (columnElement, status) => {
        if (!columnElement || !status) {
            return;
        }
        const orderedIds = [...columnElement.querySelectorAll('.task-card')]
            .map(card => Number(card.getAttribute('data-task-id')))
            .filter(Boolean);
        if (orderedIds.length === 0) {
            return;
        }
        try {
            const response = await fetch('/tasks/reorder', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status, ordered_ids: orderedIds }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
        } catch (error) {
            logError('Failed to reorder tasks:', error);
        }
    };

    const moveTaskToStatus = async (taskCard, newStatus, sourceStatus, taskIdOverride = null) => {
        const taskId = taskCard ? taskCard.getAttribute('data-task-id') : taskIdOverride;
        if (!taskId || !newStatus) {
            return;
        }

        try {
            const response = await fetch(`/tasks/${taskId}`, {
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

            const destinationColumn = taskColumns[newStatus];
            if (destinationColumn && sortState[newStatus] === 'manual') {
                destinationColumn.appendChild(taskCard);
            }
            if (taskCard) {
                taskCard.setAttribute('data-task-status', newStatus);
            }

            const sourceColumn = sourceStatus ? taskColumns[sourceStatus] : null;
            if (sourceStatus && sortState[sourceStatus] === 'manual' && sourceColumn) {
                await updateOrderForColumn(sourceColumn, sourceStatus);
            }
            if (destinationColumn && sortState[newStatus] === 'manual') {
                await updateOrderForColumn(destinationColumn, newStatus);
            }
            fetchTasks();
        } catch (error) {
            logError('Failed to update task status:', error);
            fetchTasks();
        }
    };

    /**
     * Handles the start of a drag operation for a task card.
     * Sets the dragged task ID and adds a 'dragging' class.
     * @param {Event} e - The dragstart event object.
     */
    board.addEventListener('dragstart', (e) => {
        const taskCard = e.target.closest('.task-card');
        if (taskCard) {
            draggedTaskId = taskCard.getAttribute('data-task-id');
            draggedFromStatus = taskCard.getAttribute('data-task-status');
            e.dataTransfer.setData('text/plain', draggedTaskId);
            e.dataTransfer.effectAllowed = 'move';
            // Add a class to show it's being dragged
            setTimeout(() => {
                taskCard.classList.add('dragging');
            }, 0);
        }
    });

    /**
     * Handles the end of a drag operation for a task card.
     * Resets the dragged task ID and removes the 'dragging' class.
     * @param {Event} e - The dragend event object.
     */
    board.addEventListener('dragend', (e) => {
        const taskCard = e.target.closest('.task-card');
        if (taskCard) {
            draggedTaskId = null;
            draggedFromStatus = null;
            taskCard.classList.remove('dragging');
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
            const status = getColumnStatus(column);
            if (status && sortState[status] === 'manual') {
                const afterElement = getDragAfterElement(column, e.clientY);
                const dragging = document.querySelector('.task-card.dragging');
                if (dragging) {
                    e.dataTransfer.dropEffect = 'move';
                    if (afterElement == null) {
                        column.appendChild(dragging);
                    } else {
                        column.insertBefore(dragging, afterElement);
                    }
                }
            }
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
            const newStatus = getColumnStatus(columnElement);
            const sourceStatus = draggedFromStatus;

            if (!newStatus) {
                return;
            }

            try {
                if (sortState[newStatus] === 'manual') {
                    const dragging = document.querySelector('.task-card.dragging');
                    const afterElement = getDragAfterElement(columnElement, e.clientY);
                    if (dragging) {
                        if (afterElement == null) {
                            columnElement.appendChild(dragging);
                        } else {
                            columnElement.insertBefore(dragging, afterElement);
                        }
                    }
                }

                if (sourceStatus && newStatus !== sourceStatus) {
                    await moveTaskToStatus(
                        document.querySelector('.task-card.dragging'),
                        newStatus,
                        sourceStatus,
                        draggedTaskId
                    );
                } else {
                    if (sourceStatus && sortState[sourceStatus] === 'manual') {
                        const sourceColumn = taskColumns[sourceStatus];
                        if (sourceColumn) {
                            await updateOrderForColumn(sourceColumn, sourceStatus);
                        }
                    }
                    if (sortState[newStatus] === 'manual') {
                        await updateOrderForColumn(columnElement, newStatus);
                    }
                    fetchTasks();
                }

            } catch (error) {
                logError('Failed to update task status:', error);
                fetchTasks();
            }
        }
    });

    fetchTags();
    fetchTasks();
});
