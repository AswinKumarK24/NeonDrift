const API_URL = '/api/tasks';

const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-desc');
const tasksContainer = document.getElementById('tasks-container');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', fetchTasks);

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    if (!title) return;
    
    try {
        const btn = taskForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span style="opacity:0.7">Adding...</span>';
        btn.disabled = true;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });
        
        if (response.ok) {
            titleInput.value = '';
            descInput.value = '';
            fetchTasks();
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (error) {
        console.error('Error adding task:', error);
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        fetchTasks();
    });
});

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        renderTasks(data.tasks || []);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        tasksContainer.innerHTML = '<div class="empty-state">Failed to load tasks. Verify your connection.</div>';
    }
}

async function toggleTaskStatus(id, currentStatus) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) fetchTasks();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) fetchTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

function renderTasks(tasks) {
    tasksContainer.innerHTML = '';
    
    let filteredTasks = tasks;
    if (currentFilter !== 'all') {
        filteredTasks = tasks.filter(task => task.status === currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                ${currentFilter === 'all' 
                    ? "Your space is clear. Add a task to begin." 
                    : `No ${currentFilter} tasks found.`}
            </div>
        `;
        return;
    }
    
    filteredTasks.forEach((task, index) => {
        const isCompleted = task.status === 'completed';
        const card = document.createElement('div');
        card.className = `task-card ${isCompleted ? 'completed' : ''}`;
        card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.05}s both`;
        
        card.innerHTML = `
            <div class="checkbox" onclick="toggleTaskStatus(${task.id}, '${task.status}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="task-content">
                <div class="task-title">${escapeHTML(task.title)}</div>
                ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn-icon delete" onclick="deleteTask(${task.id})" title="Delete task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        tasksContainer.appendChild(card);
    });
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}
