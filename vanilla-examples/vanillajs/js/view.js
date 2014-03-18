/*global qs, qsa, $on, $parent, $live */

(function (window) {
    'use strict';

    /**
     * View that abstracts away the browser's DOM completely.
     * It has two simple entry points:
     *
     *   - bind(eventName, handler)
     *     Takes a todo application event and registers the handler
     *   - render(command, parameterObject)
     *     Renders the given command with the options
     */
    function View(template) {
        this.template = template;

        this.ENTER_KEY = 13;
        this.ESCAPE_KEY = 27;

        this.$todoList = qs('#todo-list');
        this.$todoItemCounter = qs('#todo-count');
        this.$clearCompleted = qs('#clear-completed');
        this.$main = qs('#main');
        this.$footer = qs('#footer');
        this.$toggleAll = qs('#toggle-all');
        this.$newTodo = qs('#new-todo');
    }

    View.prototype._removeItem = function (id) {
        var elem = qs('[data-id="' + id + '"]');

        if (elem) {
            this.$todoList.removeChild(elem);
        }
    };

    View.prototype._clearCompletedButton = function (completedCount, visible) {
        this.$clearCompleted.innerHTML = this.template.clearCompletedButton(completedCount);
        this.$clearCompleted.style.display = visible ? 'block' : 'none';
    };

    View.prototype._setFilter = function (currentPage) {
        qs('#filters .selected').classList.remove('selected');
        qs('#filters [href="#/' + currentPage + '"]').classList.add('selected');
    };

    View.prototype._elementComplete = function (id, completed) {
        var listItem = qs('[data-id="' + id + '"]');

        if (!listItem) {
            return;
        }

        listItem.classList.remove('completed');

        // In case it was toggled from an event and not by clicking the checkbox
        qs('input', listItem).checked = completed;
    };

    View.prototype._editItem = function (id, title) {
        var listItem = qs('[data-id="' + id + '"]');

        if (!listItem) {
            return;
        }

        listItem.classList.add('editing');

        var input = document.createElement('input');
        input.classList.add('edit');

        listItem.appendChild(input);
        input.focus();
        input.value = title;
    };

    View.prototype._editItemDone = function (id, title) {
        var listItem = qs('[data-id="' + id + '"]');

        if (!listItem) {
            return;
        }

        var input = qs('input.edit', listItem);
        listItem.removeChild(input);

        listItem.classList.remove('editing');

        qsa('label', listItem).forEach(function (label) {
            label.textContent = title;
        });
    };

    View.prototype._showEntries = function (todos) {
        var i, l;
        var listItem;
        var assignedTo;
        var assignedToggle;

        this.$todoList.innerHTML = this.template.show(todos);

        for (i = 0, l = todos.length; i < l; i++) {
            listItem = qs('[data-id="' + todos[i].id + '"]');
            if (!listItem)
                continue;

            assignedTo = todos[i].assignedTo || 'none';
            assignedToggle = qs('#' + assignedTo, listItem);
            assignedToggle.checked = true;
        }
    };

    View.prototype._itemAssignedDone = function (id, assignedTo) {
        var listItemLabel = qs('[data-id="' + id + '"]' + ' label');

        if (!listItemLabel) {
            return;
        }

        listItemLabel.className = assignedTo;
    }

    View.prototype.render = function (viewCmd, parameter) {
        var that = this;
        var viewCommands = {
            showEntries: function () {
                that._showEntries(parameter);
            },
            removeItem: function () {
                that._removeItem(parameter);
            },
            updateElementCount: function () {
                that.$todoItemCounter.innerHTML = that.template.itemCounter(parameter);
            },
            clearCompletedButton: function () {
                that._clearCompletedButton(parameter.completed, parameter.visible);
            },
            contentBlockVisibility: function () {
                that.$main.style.display = that.$footer.style.display = parameter.visible ? 'block' : 'none';
            },
            toggleAll: function () {
                that.$toggleAll.checked = parameter.checked;
            },
            setFilter: function () {
                that._setFilter(parameter);
            },
            clearNewTodo: function () {
                that.$newTodo.value = '';
            },
            elementComplete: function () {
                that._elementComplete(parameter.id, parameter.completed);
            },
            editItem: function () {
                that._editItem(parameter.id, parameter.title);
            },
            editItemDone: function () {
                that._editItemDone(parameter.id, parameter.title);
            },
            itemAssignedDone: function () {
                that._itemAssignedDone(parameter.id, parameter.assignedTo);
            }
        };

        viewCommands[viewCmd]();
    };

    View.prototype._itemId = function (element) {
        var li = $parent(element, 'li');
        return parseInt(li.dataset.id, 10);
    };

    View.prototype._bindItemEditDone = function (handler) {
        var that = this;
        $live('#todo-list li .edit', 'blur', function () {
            if (!this.dataset.iscanceled) {
                handler({
                    id: that._itemId(this),
                    title: this.value
                });
            }
        });

        $live('#todo-list li .edit', 'keypress', function (event) {
            if (event.keyCode === that.ENTER_KEY) {
                // Remove the cursor from the input when you hit enter just like if it
                // were a real form
                this.blur();
            }
        });
    };

    View.prototype._bindItemEditCancel = function (handler) {
        var that = this;
        $live('#todo-list li .edit', 'keyup', function (event) {
            if (event.keyCode === that.ESCAPE_KEY) {
                this.dataset.iscanceled = true;
                this.blur();

                handler({id: that._itemId(this)});
            }
        });
    };

    View.prototype.bind = function (event, handler) {
        var that = this;
        if (event === 'newTodo') {
            $on(that.$newTodo, 'change', function () {
                handler(that.$newTodo.value);
            });

        } else if (event === 'removeCompleted') {
            $on(that.$clearCompleted, 'click', function () {
                handler();
            });

        } else if (event === 'toggleAll') {
            $on(that.$toggleAll, 'click', function () {
                handler({completed: this.checked});
            });

        } else if (event === 'itemEdit') {
            $live('#todo-list li label', 'dblclick', function () {
                handler({id: that._itemId(this)});
            });

        } else if (event === 'itemRemove') {
            $live('#todo-list .destroy', 'click', function () {
                handler({id: that._itemId(this)});
            });

        } else if (event === 'itemToggle') {
            $live('#todo-list .toggle', 'click', function () {
                handler({
                    id: that._itemId(this),
                    completed: this.checked
                });
            });

        } else if (event === 'itemEditDone') {
            that._bindItemEditDone(handler);

        } else if (event === 'itemEditCancel') {
            that._bindItemEditCancel(handler);

        } else if (event === 'itemAssigned') {
            $live('#todo-list .assign-btn-grp .toggle-btn input', 'click', function () {
                handler({
                    id: that._itemId(this),
                    assignedTo: this.id
                });
            });
        }
    };

    // Export to window
    window.app = window.app || {};
    window.app.View = View;
}(window));
