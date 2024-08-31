(function() {
    const vscode = acquireVsCodeApi();

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateSection':
                updateSection(message.section, message.content, message.description, message.error);
                break;
            case 'saveComplete':
                showNotification('Configuration saved successfully');
                break;
        }
    });

    function updateSection(sectionId, content, description, error) {
        const sectionElement = document.getElementById(sectionId);
        const contentElement = sectionElement.querySelector('.content-section-content');
        const descriptionElement = contentElement.querySelector('.content-section-description');
        const bodyElement = contentElement.querySelector('.content-section-body');
        
        descriptionElement.textContent = description;
    
        if (error) {
            bodyElement.innerHTML = `<div class="error"><span class="error-icon">⚠️</span> ${error}</div>`;
        } else {
            bodyElement.innerHTML = `<textarea id="${sectionId}Text" rows="10">${content}</textarea>`;
        }
    
        // Add click event to the section header for expanding/collapsing
        const headerElement = sectionElement.querySelector('.content-section-header');
        headerElement.addEventListener('click', (event) => {
            // Prevent click on buttons from toggling the section
            if (!event.target.closest('.content-section-buttons')) {
                toggleSection(sectionId);
            }
        });
    }
    

    function toggleSection(sectionId) {
        const sectionElement = document.getElementById(sectionId);
        const headerElement = sectionElement.querySelector('.content-section-header');
        const contentElement = sectionElement.querySelector('.content-section-content');
        
        const isExpanded = headerElement.getAttribute('aria-expanded') === 'true';
        headerElement.setAttribute('aria-expanded', !isExpanded);
        contentElement.hidden = isExpanded;
    
        vscode.postMessage({
            command: 'toggleSection',
            section: sectionId,
            expanded: !isExpanded
        });
    }

    function saveSection(sectionId) {
        const content = document.getElementById(`${sectionId}Text`).value;
        vscode.postMessage({
            command: 'saveSection',
            section: sectionId,
            content: content
        });
    }
        

    function expandAll() {
        document.querySelectorAll('.content-section-header').forEach(header => {
            header.setAttribute('aria-expanded', 'true');
        });
        document.querySelectorAll('.content-section-content').forEach(content => {
            content.hidden = false;
        });
        vscode.postMessage({ command: 'expandAll' });
    }
        

    function collapseAll() {
        document.querySelectorAll('.content-section-header').forEach(header => {
            header.setAttribute('aria-expanded', 'false');
        });
        document.querySelectorAll('.content-section-content').forEach(content => {
            content.hidden = true;
        });
        vscode.postMessage({ command: 'collapseAll' });
    }


    function saveAll() {
        const config = {};
        document.querySelectorAll('.content-section').forEach(section => {
            const sectionId = section.id;
            const textarea = document.getElementById(`${sectionId}Text`);
            if (textarea) {
                config[sectionId] = textarea.value;
            }
        });
        vscode.postMessage({
            command: 'saveConfig',
            config: config
        });
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
    
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
    
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300); // Wait for fade out animation
        }, 3000);
    }
        
    // Add event listeners for save buttons
    document.querySelectorAll('.save-btn').forEach(button => {
        button.addEventListener('click', () => saveSection(button.dataset.section));
    });

    // Add event listeners for section headers
    document.querySelectorAll('.content-section-header').forEach(header => {
        header.addEventListener('click', (event) => {
            // Prevent click on buttons from toggling the section
            if (!event.target.closest('.content-section-buttons')) {
                toggleSection(header.closest('.content-section').id);
            }
        });
    });

})();