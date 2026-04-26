let runner = null;

export function registerConfirmRunner(fn) {
	runner = fn;
}

export async function confirmAction(title, text, options = {}) {
	if (!runner) {
		console.warn('ConfirmProvider not mounted; confirmation denied.');
		return false;
	}
	return runner({ title, text, ...options });
}
