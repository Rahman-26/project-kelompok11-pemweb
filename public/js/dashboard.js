let activeWorkspaceId = null;
let activeWorkspace = null;
let tasks = [];

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden', 'bg-red-600', 'bg-emerald-600');
  toast.classList.add(isError ? 'bg-red-600' : 'bg-emerald-600');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function toggleSidebar(forceOpen) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = forceOpen ?? sidebar.classList.contains('-translate-x-full');

  if (isOpen) {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    toggleSidebar(false);
  }
}

function statusBadgeClass(status) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function priorityBadgeClass(priority) {
  if (priority === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (priority === 'medium') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function formatStatusLabel(status) {
  return status.replace('_', ' ');
}

function renderWorkspaces(workspaces) {
  const list = document.getElementById('workspace-list');
  list.innerHTML = '';

  if (!workspaces.length) {
    list.innerHTML = '<p class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No workspaces yet</p>';
    return;
  }

  workspaces.forEach((workspace) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `w-full rounded-lg px-3 py-2 text-left text-sm transition ${
      activeWorkspaceId === workspace.id
        ? 'bg-indigo-600 text-white'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
    }`;
    button.textContent = workspace.name;
    button.addEventListener('click', () => selectWorkspace(workspace.id));
    list.appendChild(button);
  });
}

function renderTasks() {
  const container = document.getElementById('task-list');
  container.innerHTML = '';

  if (!activeWorkspaceId) {
    container.innerHTML = '<p class="text-slate-500 dark:text-slate-400">Select a workspace to view tasks.</p>';
    return;
  }

  if (!tasks.length) {
    container.innerHTML = '<p class="text-slate-500 dark:text-slate-400">No tasks match your filters.</p>';
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement('article');
    card.className = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900';
    card.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-semibold text-slate-900 dark:text-white">${escapeHtml(task.title)}</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">${escapeHtml(task.description || 'No description')}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}">${formatStatusLabel(task.status)}</span>
            <span class="rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityBadgeClass(task.priority)}">${task.priority}</span>
            ${task.assignedTo ? `<span class="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">${escapeHtml(task.assignedTo.name)}</span>` : ''}
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <button type="button" data-action="edit" data-id="${task.id}" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Edit</button>
          <button type="button" data-action="delete" data-id="${task.id}" class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => openTaskModal('edit', btn.dataset.id));
  });
  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function populateAssigneeOptions() {
  const filterSelect = document.getElementById('filter-assignee');
  const taskSelect = document.getElementById('task-assignedTo');
  const members = activeWorkspace?.members || [];

  filterSelect.innerHTML = '<option value="">All assignees</option>';
  taskSelect.innerHTML = '<option value="">Unassigned</option>';

  members.forEach((member) => {
    if (!member.user) return;
    const option = `<option value="${member.user.id}">${escapeHtml(member.user.name)}</option>`;
    filterSelect.insertAdjacentHTML('beforeend', option);
    taskSelect.insertAdjacentHTML('beforeend', option);
  });
}

async function loadWorkspaces() {
  const result = await api.getWorkspaces();
  renderWorkspaces(result.data.workspaces);
  return result.data.workspaces;
}

async function selectWorkspace(workspaceId) {
  activeWorkspaceId = workspaceId;
  const result = await api.getWorkspace(workspaceId);
  activeWorkspace = result.data.workspace;
  document.getElementById('workspace-title').textContent = activeWorkspace.name;
  document.getElementById('workspace-subtitle').textContent = activeWorkspace.description || 'Collaborate on tasks together.';
  populateAssigneeOptions();
  await loadWorkspaces();
  await loadTasks();
  closeSidebarOnMobile();
}

function getFilterParams() {
  const params = { workspaceId: activeWorkspaceId };
  const search = document.getElementById('filter-search').value.trim();
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const assignee = document.getElementById('filter-assignee').value;

  if (search) params.search = search;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (assignee) params.assignee = assignee;

  return params;
}

async function loadTasks() {
  if (!activeWorkspaceId) return;

  try {
    const result = await api.getTasks(getFilterParams());
    tasks = result.data.tasks;
    renderTasks();
  } catch (err) {
    showToast(err.message, true);
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function handleCreateWorkspace(event) {
  event.preventDefault();
  const form = event.target;

  try {
    const name = form.name.value.trim();
    const description = form.description.value.trim();
    await api.createWorkspace({ name, description });
    form.reset();
    closeModal('workspace-modal');
    const workspaces = await loadWorkspaces();
    if (workspaces.length) {
      await selectWorkspace(workspaces[0].id);
    }
    showToast('Workspace created');
  } catch (err) {
    showToast(err.message, true);
  }
}

function openTaskModal(mode, taskId = null) {
  const form = document.getElementById('task-form');
  form.reset();
  form.dataset.mode = mode;
  form.dataset.taskId = taskId || '';

  document.getElementById('task-modal-title').textContent = mode === 'edit' ? 'Edit Task' : 'New Task';

  if (mode === 'edit') {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    form.title.value = task.title;
    form.description.value = task.description || '';
    form.status.value = task.status;
    form.priority.value = task.priority;
    form.assignedTo.value = task.assignedTo?.id || '';
  }

  openModal('task-modal');
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const mode = form.dataset.mode;

  const body = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    status: form.status.value,
    priority: form.priority.value,
    workspaceId: activeWorkspaceId,
    assignedTo: form.assignedTo.value || null,
  };

  try {
    if (mode === 'edit') {
      const updateBody = { ...body };
      delete updateBody.workspaceId;
      await api.updateTask(form.dataset.taskId, updateBody);
      showToast('Task updated');
    } else {
      await api.createTask(body);
      showToast('Task created');
    }
    closeModal('task-modal');
    await loadTasks();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteTask(taskId) {
  if (!window.confirm('Delete this task?')) return;

  try {
    await api.deleteTask(taskId);
    showToast('Task deleted');
    await loadTasks();
  } catch (err) {
    showToast(err.message, true);
  }
}

function logout() {
  api.clearToken();
  window.location.href = '/index.html';
}

async function initDashboard() {
  if (!api.getToken()) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const me = await api.getMe();
    api.setUser(me.data.user);
    document.getElementById('user-name').textContent = me.data.user.name;
    document.getElementById('user-email').textContent = me.data.user.email;
  } catch {
    logout();
    return;
  }

  const workspaces = await loadWorkspaces();
  if (workspaces.length) {
    await selectWorkspace(workspaces[0].id);
  } else {
    renderTasks();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menu-toggle').addEventListener('click', () => toggleSidebar(true));
  document.getElementById('sidebar-overlay').addEventListener('click', () => toggleSidebar(false));
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('new-workspace-btn').addEventListener('click', () => openModal('workspace-modal'));
  document.getElementById('new-task-btn').addEventListener('click', () => openTaskModal('create'));
  document.getElementById('workspace-form').addEventListener('submit', handleCreateWorkspace);
  document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
  document.getElementById('apply-filters-btn').addEventListener('click', loadTasks);
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-assignee').value = '';
    loadTasks();
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  let searchTimer;
  document.getElementById('filter-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTasks, 350);
  });
  document.getElementById('filter-status').addEventListener('change', loadTasks);
  document.getElementById('filter-priority').addEventListener('change', loadTasks);
  document.getElementById('filter-assignee').addEventListener('change', loadTasks);

  initDashboard();
});
