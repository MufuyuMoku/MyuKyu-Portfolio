document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.window-dir')) return;

    const windows = document.querySelectorAll('.terminal-window');
    let highestZIndex = 10;
    let activeWindow = null;
    let cascadeOffset = 20;

    const STORAGE_KEY = 'myukyu_os_state';

    function saveState() {
        const osState = {};
        windows.forEach(win => {
            osState[win.id] = {
                display: win.style.display,
                top: win.style.top,
                left: win.style.left,
                zIndex: win.style.zIndex,
                isMinimized: win.classList.contains('minimized'),
                isMaximized: win.classList.contains('maximized')
            };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(osState));
    }

    function loadState() {
        const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!savedState) return;

        let maxZ = 10;
        windows.forEach(win => {
            const state = savedState[win.id];
            if (state) {
                win.style.display = state.display;
                if (!state.isMaximized) {
                    win.style.top = state.top;
                    win.style.left = state.left;
                }
                win.style.zIndex = state.zIndex;
                
                if (state.isMinimized) win.classList.add('minimized');
                if (state.isMaximized) win.classList.add('maximized');

                const currentZ = parseInt(state.zIndex) || 10;
                if (currentZ > maxZ) maxZ = currentZ;
            }
        });
        highestZIndex = maxZ;
    }
    loadState();

    windows.forEach(win => {
        const header = win.querySelector('.terminal-header');
        if (!header) return;

        const bringToFront = () => {
            highestZIndex++;
            win.style.zIndex = highestZIndex;
            activeWindow = win;
            saveState();
        };

        win.addEventListener('mousedown', bringToFront);

        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('term-btn') || e.target.tagName === 'A') return;
            if (win.classList.contains('maximized')) return;

            isDragging = true;
            win.classList.add('is-dragging');
            offsetX = e.clientX - win.getBoundingClientRect().left;
            offsetY = e.clientY - win.getBoundingClientRect().top;
            win.style.opacity = '0.85';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${e.clientX - offsetX}px`;
            win.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                win.classList.remove('is-dragging');
                win.style.opacity = '1';
                saveState();
            }
        });

        const closeBtn = win.querySelector('.btn-close');
        const minBtn = win.querySelector('.btn-min');
        const maxBtn = win.querySelector('.btn-max');

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (win.id === 'win-sysinfo' || win.id === 'win-dir') {
                    win.classList.toggle('minimized');
                } else {
                    win.style.display = 'none';
                    if (activeWindow === win) activeWindow = null;
                    const typed = win.querySelector('.typed-text');
                    if (typed) {
                        typed.textContent = '';
                        typed.setAttribute('data-typed', '');
                    }
                }
                saveState();
            });
        }
        if (minBtn) {
            minBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                win.classList.toggle('minimized');
                if (win.classList.contains('minimized')) win.classList.remove('maximized');
                saveState();
            });
        }
        if (maxBtn) {
            maxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                win.classList.toggle('maximized');
                if (win.classList.contains('maximized')) win.classList.remove('minimized');
                saveState();
            });
        }
    });

    const projectLinks = document.querySelectorAll('.project-link');
    const contextMenu = document.getElementById('os-context-menu');
    let targetIdForContext = null;

    const openTerminalWindow = (targetId) => {
        const targetWin = document.getElementById(targetId);
        if (targetWin) {
            targetWin.style.display = 'flex';
            targetWin.classList.remove('minimized');
            highestZIndex++;
            targetWin.style.zIndex = highestZIndex;
            activeWindow = targetWin;
            
            if (!targetWin.style.top || targetWin.style.top === '180px') {
                targetWin.style.top = `calc(150px + ${cascadeOffset}px)`;
                targetWin.style.left = `calc(20vw + ${cascadeOffset}px)`;
                cascadeOffset = (cascadeOffset + 30) % 150;
            }
            saveState();
        }
    };

    projectLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openTerminalWindow(link.getAttribute('data-target'));
        });
        link.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            targetIdForContext = link.getAttribute('data-target');
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('os-menu-item') && contextMenu) {
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('menu-open-win').addEventListener('click', () => {
        if (targetIdForContext) openTerminalWindow(targetIdForContext);
        contextMenu.style.display = 'none';
    });
    document.getElementById('menu-cancel').addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    function highlightText(container, keyword) {
        const oldMarks = container.querySelectorAll('mark.grep-highlight');
        oldMarks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });

        if (!keyword.trim()) return;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach(node => {
            const text = node.nodeValue;
            const regex = new RegExp(`(${keyword})`, 'gi');
            if (regex.test(text)) {
                const fragment = document.createDocumentFragment();
                let lastIdx = 0;
                text.replace(regex, (match, p1, offset) => {
                    fragment.appendChild(document.createTextNode(text.slice(lastIdx, offset)));
                    const mark = document.createElement('mark');
                    mark.className = 'grep-highlight';
                    mark.style.backgroundColor = 'var(--accent-pink)';
                    mark.style.color = '#fff';
                    mark.style.borderRadius = '3px';
                    mark.style.padding = '0 2px';
                    mark.textContent = match;
                    fragment.appendChild(mark);
                    lastIdx = offset + match.length;
                });
                fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
                node.parentNode.replaceChild(fragment, node);
            }
        });
    }

    let dirSearchText = "";

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey || !activeWindow) return;

        if (e.key === " " && activeWindow) e.preventDefault();

        if (activeWindow.id === 'win-dir') {
            const searchTarget = activeWindow.querySelector('.search-text');
            if (!searchTarget) return;

            if (e.key === "Backspace") {
                dirSearchText = dirSearchText.slice(0, -1);
            } else if (e.key === "Enter" || e.key === "Escape") {
                dirSearchText = ""; 
            } else if (e.key.length === 1) {
                dirSearchText += e.key.toLowerCase();
            }

            searchTarget.textContent = dirSearchText;

            const items = activeWindow.querySelectorAll('.project-list li');
            items.forEach(item => {
                const title = item.querySelector('.project-link').textContent.toLowerCase();
                item.style.display = title.includes(dirSearchText) ? 'flex' : 'none';
            });
            return;
        }

        if (activeWindow.classList.contains('window-content')) {
            const typeTarget = activeWindow.querySelector('.typed-text');
            const contentContainer = activeWindow.querySelector('.markdown-content');
            if (!typeTarget || !contentContainer) return;

            let currentText = typeTarget.getAttribute('data-typed') || "";

            if (e.key === "Backspace") {
                currentText = currentText.slice(0, -1);
            } else if (e.key === "Enter") {
                if (currentText.trim() === "cd ..") {
                    activeWindow.style.display = 'none';
                    activeWindow = null;
                    currentText = "";
                    typeTarget.textContent = "";
                    typeTarget.setAttribute('data-typed', "");
                    highlightText(contentContainer, ""); 
                    saveState();
                    return;
                } else if (currentText.trim() !== "") {
                    let oldText = currentText;
                    currentText = `bash: ${oldText}: command not found`;
                    typeTarget.textContent = currentText;
                    setTimeout(() => { 
                        typeTarget.textContent = ""; 
                        typeTarget.setAttribute('data-typed', "");
                    }, 1200);
                    return;
                }
            } else if (e.key.length === 1) { 
                currentText += e.key;
            }

            typeTarget.textContent = currentText;
            if (!currentText.startsWith("bash:")) {
                typeTarget.setAttribute('data-typed', currentText);
                
                if (currentText !== "cd .." && currentText !== "cd " && currentText !== "cd") {
                    highlightText(contentContainer, currentText);
                } else {
                    highlightText(contentContainer, ""); 
                }
            }
        }
    });
});