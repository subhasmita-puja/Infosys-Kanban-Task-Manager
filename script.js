// ========== Global Variables ==========
let tasks = [];
let editingTaskId = null;
let draggedTaskId = null;

// ========== Initialize Application ==========
document.addEventListener('DOMContentLoaded', function() {
    showLoading();
    loadTasksFromStorage();
    renderAllTasks();
    updateAllCounts();
    hideLoading();
});

// ========== Local Storage Functions ==========
function loadTasksFromStorage() {
    try {
        const storedTasks = localStorage.getItem('kanban-tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            // Convert date strings back to Date objects
            tasks = tasks.map(task => ({
                ...task,
                createdAt: new Date(task.createdAt),
                updatedAt: new Date(task.updatedAt)
            }));
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
        tasks = [];
    }
}

function saveTasksToStorage() {
    try {
        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks:', error);
        showToast('Error saving tasks', 'error');
    }
}

function clearStorage() {
    try {
        localStorage.removeItem('kanban-tasks');
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
}

// ========== Task CRUD Operations ==========
function createTask(title, description, priority, status = 'todo') {
    const newTask = {
        id: generateId(),
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    tasks.push(newTask);
    saveTasksToStorage();
    return newTask;
}

function updateTask(taskId, updates) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updates,
            updatedAt: new Date()
        };
        saveTasksToStorage();
        return tasks[taskIndex];
    }
    return null;
}

function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        saveTasksToStorage();
        return deletedTask;
    }
    return null;
}

function getTaskById(taskId) {
    return tasks.find(t => t.id === taskId);
}

function getTasksByStatus(status) {
    return tasks.filter(t => t.status === status);
}

// ========== Modal Functions ==========
function openTaskModal(status = 'todo', taskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle').querySelector('span');
    const submitBtnText = document.getElementById('submitBtnText');
    
    // Reset form
    form.reset();
    clearFormErrors();
    
    if (taskId) {
        // Edit mode
        const task = getTaskById(taskId);
        if (task) {
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskId').value = task.id;
            
            modalTitle.textContent = 'Edit Task';
            submitBtnText.textContent = 'Update Task';
            editingTaskId = taskId;
        }
    } else {
        // Create mode
        document.getElementById('taskStatus').value = status;
        modalTitle.textContent = 'Create New Task';
        submitBtnText.textContent = 'Create Task';
        editingTaskId = null;
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    editingTaskId = null;
}

function saveTask(event) {
    event.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;
    
    // Validation
    if (!validateForm(title, description)) {
        return;
    }
    
    if (editingTaskId) {
        // Update existing task
        const updatedTask = updateTask(editingTaskId, {
            title,
            description,
            priority
        });
        
        if (updatedTask) {
            showToast(`Task "${updatedTask.title}" updated successfully!`, 'success');
            renderAllTasks();
            updateAllCounts();
        }
    } else {
        // Create new task
        const newTask = createTask(title, description, priority, status);
        showToast(`Task "${newTask.title}" created successfully!`, 'success');
        renderAllTasks();
        updateAllCounts();
    }
    
    closeTaskModal();
}

// ========== Form Validation ==========
function validateForm(title, description) {
    clearFormErrors();
    let isValid = true;
    
    if (title.trim().length < 3) {
        showFormError('titleError', 'Title must be at least 3 characters');
        isValid = false;
    }
    
    if (description.trim().length < 5) {
        showFormError('descError', 'Description must be at least 5 characters');
        isValid = false;
    }
    
    return isValid;
}

function showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

// ========== Drag and Drop Functions ==========
function allowDrop(event) {
    event.preventDefault();
    const container = event.currentTarget;
    container.classList.add('drag-over');
}

function drag(event, taskId) {
    draggedTaskId = taskId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
    event.target.classList.add('dragging');
}

function drop(event) {
    event.preventDefault();
    const container = event.currentTarget;
    container.classList.remove('drag-over');
    
    if (!draggedTaskId) return;
    
    const newStatus = container.dataset.status;
    const task = getTaskById(draggedTaskId);
    
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        updateTask(draggedTaskId, { status: newStatus });
        
        // Get column names for display
        const statusNames = {
            'todo': 'To Do',
            'inprogress': 'In Progress',
            'done': 'Done'
        };
        
        showToast(
            `Task "${task.title}" moved to ${statusNames[newStatus]}`,
            'success'
        );
        
        renderAllTasks();
        updateAllCounts();
    }
    
    draggedTaskId = null;
}

function dragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.classList.remove('drag-over');
    });
}

// ========== Render Functions ==========
function renderAllTasks() {
    renderTasksByStatus('todo');
    renderTasksByStatus('inprogress');
    renderTasksByStatus('done');
}

function renderTasksByStatus(status) {
    const container = document.getElementById(`${status}-tasks`);
    const statusTasks = getTasksByStatus(status);
    
    // Clear container
    container.innerHTML = '';
    
    if (statusTasks.length === 0) {
        // Show empty state
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No tasks yet</p>
                <small>Drag tasks here or click + to add</small>
            </div>
        `;
    } else {
        // Render tasks
        statusTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            container.appendChild(taskCard);
        });
    }
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.id = `task-${task.id}`;
    
    // Priority icon
    const priorityIcons = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🔴'
    };
    
    card.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <span class="priority-badge ${task.priority}">
                ${priorityIcons[task.priority]} ${task.priority}
            </span>
        </div>
        <p class="task-description">${escapeHtml(task.description)}</p>
        <div class="task-footer">
            <div class="task-meta">
                <span>
                    <i class="far fa-clock"></i>
                    ${formatTimeAgo(task.createdAt)}
                </span>
                <span title="Task ID: ${task.id}">
                    #${task.id.substring(0, 8)}
                </span>
            </div>
            <div class="task-actions">
                <button class="icon-btn edit-btn" onclick="openTaskModal('${task.status}', '${task.id}')" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete-btn" onclick="confirmDeleteTask('${task.id}')" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add drag event listeners
    card.addEventListener('dragstart', (e) => drag(e, task.id));
    card.addEventListener('dragend', dragEnd);
    
    return card;
}

// ========== Delete Functions ==========
function confirmDeleteTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        const deletedTask = deleteTask(taskId);
        if (deletedTask) {
            showToast(`Task "${deletedTask.title}" deleted successfully!`, 'success');
            renderAllTasks();
            updateAllCounts();
        }
    }
}

function clearAllTasks() {
    if (tasks.length === 0) {
        showToast('No tasks to clear!', 'info');
        return;
    }
    
    if (confirm(`Are you sure you want to delete all ${tasks.length} tasks? This action cannot be undone.`)) {
        tasks = [];
        clearStorage();
        renderAllTasks();
        updateAllCounts();
        showToast('All tasks cleared successfully!', 'success');
    }
}

// ========== Count Update Functions ==========
function updateAllCounts() {
    updateTaskCount('todo');
    updateTaskCount('inprogress');
    updateTaskCount('done');
    updateTotalCount();
}

function updateTaskCount(status) {
    const count = getTasksByStatus(status).length;
    const badge = document.getElementById(`${status}-count`);
    if (badge) {
        badge.textContent = count;
    }
}

function updateTotalCount() {
    const totalElement = document.getElementById('taskCount');
    if (totalElement) {
        totalElement.textContent = tasks.length;
    }
}

// ========== Utility Functions ==========
function generateId() {
    return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// ========== Toast Notification ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    
    // Set message and type
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== Loading Indicator ==========
function showLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.classList.add('active');
    }
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        setTimeout(() => {
            loader.classList.remove('active');
        }, 500);
    }
}

// ========== Keyboard Shortcuts ==========
document.addEventListener('keydown', function(event) {
    // ESC to close modal
    if (event.key === 'Escape') {
        closeTaskModal();
    }
    
    // Ctrl/Cmd + K to open new task modal
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openTaskModal();
    }
});

// ========== Close modal on background click ==========
document.getElementById('taskModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeTaskModal();
    }
});
