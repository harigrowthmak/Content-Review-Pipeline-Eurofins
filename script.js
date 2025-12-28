document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reviewForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');
    const statusMessage = document.getElementById('statusMessage');

    const WEBHOOK_URL = 'https://n8n.srv896372.hstgr.cloud/webhook/content-review-pipeline-eurofins';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (submitBtn.disabled) return;

        // Validation
        const docUrl = document.getElementById('docUrl').value.trim();
        const contentType = document.getElementById('contentType').value;

        if (!docUrl || !contentType) {
            showStatus('Please fill in all fields.', 'error');
            return;
        }

        // Show Processing Overlay
        const overlay = document.getElementById('processingOverlay');
        const steps = document.querySelectorAll('.step');
        overlay.classList.remove('hidden');
        // Force reflow
        void overlay.offsetWidth;
        overlay.classList.add('visible');

        const payload = {
            docUrl,
            contentType,
            timestamp: new Date().toISOString()
        };

        try {
            // Animate steps to simulate backend processing
            updateStep(steps, 0); // Connect
            await wait(1500);

            updateStep(steps, 1); // Analyze

            const fetchPromise = fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            // Ensure at least some time passes for the animation
            const [response] = await Promise.all([
                fetchPromise,
                wait(2000) // Minimum wait for "Analyze" step
            ]);

            updateStep(steps, 2); // Finalize
            await wait(800);

            if (response.ok) {
                // Parse JSON response from webhook
                let data = {};
                try {
                    const responseData = await response.json();
                    console.log('Webhook response:', responseData);

                    // Handle different response formats
                    // The response might be nested or direct
                    if (Array.isArray(responseData)) {
                        // If it's an array, take the first element
                        data = responseData[0] || {};
                    } else if (typeof responseData === 'object') {
                        data = responseData;
                    }

                    // Extract fields with fallbacks
                    // Check for common field names (documentUrl, docUrl, url, link)
                    data.documentUrl = data.documentUrl || data.docUrl || data.url || data.link || docUrl;
                    data.status = data.status || 'success';
                    data.message = data.message || 'Your request has been processed successfully.';

                } catch (e) {
                    console.log('No JSON response, using defaults', e);
                    data = {
                        status: 'success',
                        message: 'Your request has been processed successfully.',
                        documentUrl: docUrl
                    };
                }

                // Success
                overlay.classList.remove('visible');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    resetSteps(steps);

                    // Switch to Success View
                    form.classList.add('hidden');
                    const successView = document.getElementById('successView');
                    const successLink = document.getElementById('successLink');
                    const successMessage = document.querySelector('.success-message');
                    const successTitle = document.querySelector('.success-title');
                    const statusBadge = document.getElementById('statusBadge');

                    // Update success view with dynamic data
                    successLink.href = data.documentUrl;
                    successMessage.textContent = data.message;

                    // Update status badge
                    statusBadge.textContent = data.status;
                    statusBadge.className = 'status-badge'; // Reset classes

                    // Add appropriate class based on status
                    if (data.status && data.status.toLowerCase() !== 'success') {
                        if (data.message && data.message.toLowerCase().includes('no changes')) {
                            statusBadge.classList.add('status-info');
                        } else {
                            statusBadge.classList.add('status-warning');
                        }
                    }

                    // Update title based on status
                    if (data.status === 'success') {
                        successTitle.textContent = 'Review Completed';
                    } else if (data.message && data.message.toLowerCase().includes('no changes')) {
                        successTitle.textContent = 'Document Perfect';
                    } else {
                        successTitle.textContent = 'Processing Complete';
                    }

                    successView.classList.remove('hidden');
                }, 500);
            } else {
                throw new Error('Server returned an error');
            }

        } catch (error) {
            console.error('Submission error:', error);
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.classList.add('hidden');
                resetSteps(steps);
                showStatus('Unable to connect to the review server. Please try again.', 'error');
            }, 500);
        } finally {
            setLoading(false);
        }
    });

    function updateStep(steps, index) {
        steps.forEach((step, i) => {
            if (i <= index) step.classList.add('active');
        });
    }

    function resetSteps(steps) {
        steps.forEach((step, i) => {
            if (i === 0) step.classList.add('active');
            else step.classList.remove('active');
        });
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            btnText.classList.add('invisible');
            loader.classList.remove('hidden');
        } else {
            btnText.classList.remove('invisible');
            loader.classList.add('hidden');
        }
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
        statusMessage.classList.remove('hidden');
    }

    function hideStatus() {
        statusMessage.classList.add('hidden');
    }

    // Reset view handler
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('successView').classList.add('hidden');
        form.classList.remove('hidden');
        form.reset();
        document.getElementById('docUrl').focus();
    });
});
