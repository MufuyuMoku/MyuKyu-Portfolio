document.addEventListener("DOMContentLoaded", () => {
    const tracks = Array.from(document.querySelectorAll('.marquee-track'));
    if (tracks.length === 0) return;

    const trackData = [];
    
    // Global tracking variables for drag
    let activeDragNode = null;
    let activePlaceholder = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // --- 1. INITIALIZE TRACKS ---
    tracks.forEach(track => {
        const speed = parseFloat(track.dataset.speed || 1);
        const contentWrappers = track.querySelectorAll('.marquee-content');
        
        // Ensure accurate width measurement by waiting a frame
        setTimeout(() => {
            const contentWidth = contentWrappers[0].offsetWidth;
            const nodes = Array.from(track.querySelectorAll('.visual-node'));

            nodes.forEach(node => {
                if (!node.classList.contains('is-placeholder')) {
                    const randRotation = (Math.random() * 10) - 5;
                    node.style.setProperty('--rand-rotation', `${randRotation}deg`);
                    node.style.transform = `rotate(${randRotation}deg)`;
                }
            });

            const data = {
                el: track,
                speed: speed,
                currentX: speed < 0 ? -contentWidth : 0,
                contentWidth: contentWidth
            };

            // --- 2. THE DRAG LOGIC ---
            nodes.forEach(node => {
                // Ignore cloned set for interactions to prevent duplicates
                if (node.closest('[aria-hidden="true"]')) return;

                node.addEventListener('mousedown', (e) => {
                    if (activeDragNode) return;
                    e.preventDefault(); // Prevent default link behavior while dragging

                    const rect = node.getBoundingClientRect();
                    
                    // A. Setup Placeholder
                    activePlaceholder = node.cloneNode(true);
                    activePlaceholder.classList.add('is-placeholder');
                    node.parentNode.insertBefore(activePlaceholder, node);

                    // B. Setup Lifted Node (Append to body so it breaks out of the moving track)
                    activeDragNode = node;
                    activeDragNode.classList.add('is-lifted');
                    document.body.appendChild(activeDragNode);

                    // Calculate offset where user clicked relative to the element
                    dragOffsetX = e.clientX - rect.left;
                    dragOffsetY = e.clientY - rect.top;

                    // Set initial fixed position
                    activeDragNode.style.position = 'fixed';
                    activeDragNode.style.left = `${e.clientX - dragOffsetX}px`;
                    activeDragNode.style.top = `${e.clientY - dragOffsetY}px`;
                    activeDragNode.style.margin = '0';
                });
            });

            trackData.push(data);
        }, 50);
    });

    // --- 3. MOUSE MOVE & DROP LOGIC ---
    document.addEventListener('mousemove', (e) => {
        if (!activeDragNode) return;
        
        // Update position in real-time
        activeDragNode.style.left = `${e.clientX - dragOffsetX}px`;
        activeDragNode.style.top = `${e.clientY - dragOffsetY}px`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!activeDragNode || !activePlaceholder) return;

        // Snap back! 
        // We move the actual node back into the original DOM position right before the placeholder
        activeDragNode.classList.remove('is-lifted');
        activeDragNode.style.position = '';
        activeDragNode.style.left = '';
        activeDragNode.style.top = '';
        activeDragNode.style.margin = '';
        activeDragNode.style.transform = `rotate(${activeDragNode.style.getPropertyValue('--rand-rotation')})`;

        activePlaceholder.parentNode.insertBefore(activeDragNode, activePlaceholder);
        activePlaceholder.remove();

        // If they barely moved it, treat it as a click to open the image
        // (Since we prevented default on mousedown)
        const moveDistance = Math.abs(parseFloat(activeDragNode.style.left || 0)); // very simplified check
        if(!activeDragNode.classList.contains('is-lifted')){
           //  window.location.href = activeDragNode.getAttribute('href'); 
           // Uncomment above to enable click-through if drag was minimal
        }

        activeDragNode = null;
        activePlaceholder = null;
    });


    // --- 4. 60FPS BACKGROUND LOOP ---
    function animateTracks() {
        trackData.forEach(data => {
            if(!data.contentWidth) return; // skip until measured

            data.currentX -= data.speed;

            if (data.speed > 0) { 
                if (data.currentX <= -data.contentWidth) data.currentX = 0;
            } else { 
                if (data.currentX >= 0) data.currentX = -data.contentWidth;
            }

            data.el.style.transform = `translateX(${data.currentX}px) translateZ(0)`;
        });

        requestAnimationFrame(animateTracks);
    }

    animateTracks();
});