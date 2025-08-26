(function () {
    const view = document.getElementById('view');

    // global state shared by partials and app.js
    window.__state = window.__state || { streams: [], activeStreamId: null };

    // Highlight active nav item
    function highlight(route) {
        document.querySelectorAll('#sidebar a[data-link]').forEach(a => {
            if (a.getAttribute('href') === route) { a.parentElement.classList.add('active'); }
            else { a.parentElement.classList.remove('active'); }
        });
    }

    // Map routes to partial names
    function partialFor(route) {
        if (route === '/labs') return 'labs_request';
        if (route === '/camera-request') return 'camera_request';
        return 'dashboard';
    }

    async function render(path) {
        const route = (!path || path === '/') ? '/dashboard' : path;
        highlight(route);
        try {
            const html = await fetch(`/partials/${partialFor(route)}`).then(r => {
                if (!r.ok) throw new Error('Partial not found');
                return r.text();
            });
            view.innerHTML = html;
            // Notify others that a view mounted
            window.dispatchEvent(new CustomEvent('spa:view-loaded', { detail: { route } }));
        } catch (err) {
            view.innerHTML = `<div class="card">Error: ${err.message}</div>`;
        }
    }

    // Intercept SPA links
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-link]');
        if (!a) return;
        e.preventDefault();
        navigate(a.getAttribute('href'));
    });

    function navigate(path) {
        history.pushState({}, '', path);
        render(path);
    }

    // Expose router
    window.router = { navigate };

    // Back/forward
    window.addEventListener('popstate', () => render(location.pathname));

    // Initial render
    render(location.pathname || '/dashboard');
})();
