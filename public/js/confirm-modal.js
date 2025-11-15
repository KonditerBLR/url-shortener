// Custom confirm modal to replace browser confirm()
function confirmModal(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay confirm-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <h3 style="margin-bottom: 16px; color: var(--text-dark);">${title}</h3>
                <p style="color: var(--text-gray); margin-bottom: 24px; line-height: 1.6;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn-danger" id="confirmBtn">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('#confirmBtn');
        const cancelBtn = modal.querySelector('#cancelBtn');

        const cleanup = () => {
            modal.remove();
        };

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });

        // ESC key support
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Auto-focus confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    });
}
